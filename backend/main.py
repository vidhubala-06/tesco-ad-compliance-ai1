from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

try:
    from . import rules
    from . import scorer
    from . import generator
except Exception as e:
    # Raise a clearer import error to help debugging when uvicorn starts
    raise ImportError(f"Failed to import backend modules (rules/scorer/generator): {e}") from e

app = FastAPI(title="Retail Media Creative Tool API")

# CORS (required for React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# Root health check
# -----------------------
@app.get("/")
def root():
    return {"message": "Retail Media Creative Tool backend running"}


# -----------------------
# Request model
# -----------------------
class CreativeInput(BaseModel):
    headline: Optional[str] = ""
    subhead: Optional[str] = ""
    cta: Optional[str] = ""
    image_url: Optional[str] = None
    category: Optional[str] = "Default"
    layout: Optional[str] = "Instagram Square"
    # Optional flags used by rules
    logo_present: Optional[bool] = True
    clubcard: Optional[bool] = False
    clubcard_end: Optional[str] = ""
    alcohol: Optional[bool] = False


def _analyze(ad_dict):
    # run rule checks and compute score
    issues = rules.check_rules(ad_dict)
    score = scorer.calculate_score(issues)
    status = "Approved" if score >= 70 else "Rejected"
    return {"status": status, "score": score, "issues": issues}


@app.post("/analyze")
def analyze_creative(data: CreativeInput):
    ad = data.dict()
    analysis = _analyze(ad)
    # generate fallback copy if missing
    generated = generator.generate_ad_copy(ad)
    creative = {
        "headline": generated.get("headline", ad.get("headline")),
        "subhead": generated.get("subhead", ad.get("subhead")),
        "cta": generated.get("cta", ad.get("cta")),
        "image_url": ad.get("image_url"),
        "disclaimer": generated.get("disclaimer"),
        "layout": ad.get("layout"),
        "category": ad.get("category"),
    }
    return {**analysis, "creative": creative}


@app.post("/fix")
def fix_creative(data: CreativeInput):
    ad = data.dict()
    original_issues = rules.check_rules(ad)
    applied_fixes = []

    # Defensive copies
    fixed = ad.copy()

    # Apply deterministic fixes for known rules
    for issue in original_issues:
        rule = issue.get("rule", "")

        if rule == "Banned Copy":
            # remove banned keywords from text fields
            for field in ["headline", "subhead", "cta"]:
                if fixed.get(field):
                    # simple remove banned words
                    text = fixed[field]
                    for bad in rules.BANNED_KEYWORDS:
                        text = text.replace(bad, "")
                    fixed[field] = text.strip()
            applied_fixes.append("Removed banned keywords from text fields")

        if rule == "Headline Length":
            if fixed.get("headline"):
                fixed["headline"] = fixed["headline"][:30]
                applied_fixes.append("Truncated headline to 30 chars")

        if rule == "Weak CTA":
            fixed["cta"] = fixed.get("cta") or "Shop Now"
            applied_fixes.append("Set CTA to 'Shop Now'")

        if rule == "Missing Image":
            # cannot auto-supply an image; add suggestion
            applied_fixes.append("Missing image - user should upload a product image")

        if rule == "Clubcard End Date" or rule == "Clubcard Tile":
            fixed["clubcard_end"] = fixed.get("clubcard_end") or "31/12"
            applied_fixes.append("Set Clubcard end date to 31/12")

        if rule == "Alcohol Compliance":
            fixed["alcohol"] = True
            applied_fixes.append("Marked as alcohol and added disclaimer suggestion")

        if rule == "Logo Presence":
            # cannot add logo automatically, but flag suggestion
            applied_fixes.append("Logo missing - please add the Tesco logo to the creative")

        if rule == "CTA Placement":
            applied_fixes.append("Adjust CTA placement in editor to avoid overlap")

        if rule.startswith("Accessibility"):
            # assume we can adjust font/contrast settings
            fixed["font_readable"] = True
            fixed["contrast_ok"] = True
            applied_fixes.append("Adjusted font/contrast recommendations")

        if rule == "Price Tile Usage":
            fixed["value_tile"] = None
            applied_fixes.append("Removed disallowed price tile")

        if rule == "Tesco Tag CTA":
            if not fixed.get("cta"):
                fixed["cta"] = "Shop Now"
                applied_fixes.append("Added CTA for Tesco tag")

    # Generate fallback copy if required
    generated = generator.generate_ad_copy(fixed)
    fixed_creative = {
        "headline": generated.get("headline", fixed.get("headline")),
        "subhead": generated.get("subhead", fixed.get("subhead")),
        "cta": generated.get("cta", fixed.get("cta")),
        "image_url": fixed.get("image_url"),
        "disclaimer": generated.get("disclaimer"),
        "layout": fixed.get("layout"),
        "category": fixed.get("category"),
    }

    # Re-run analysis on fixed creative
    analysis_after = _analyze({**fixed, **fixed_creative})

    return {
        "original_issues": original_issues,
        "applied_fixes": applied_fixes,
        "fixed_creative": fixed_creative,
        "analysis_after": analysis_after,
    }


class OptimizeRequest(BaseModel):
    image_data: str  # data URL or base64
    output_format: Optional[str] = "jpeg"  # jpeg or png
    max_kb: Optional[int] = 500


@app.post("/optimize")
def optimize_image(req: OptimizeRequest):
    import base64
    from io import BytesIO
    try:
        data = req.image_data
        # strip data URL prefix if present
        if data.startswith("data:"):
            parts = data.split(",", 1)
            if len(parts) == 2:
                data = parts[1]

        raw = base64.b64decode(data)
    except Exception as e:
        return {"error": "Invalid base64 image data", "detail": str(e)}

    try:
        from PIL import Image
    except Exception as e:
        return {"error": "Pillow is required on the server. Install pillow package.", "detail": str(e)}

    img = Image.open(BytesIO(raw)).convert("RGB")

    max_bytes = int((req.max_kb or 500) * 1024)

    # Try compressing by quality first (for JPEG)
    quality = 95
    buffer = BytesIO()
    img.save(buffer, format="JPEG", quality=quality)
    data_out = buffer.getvalue()

    # reduce quality loop
    while len(data_out) > max_bytes and quality >= 30:
        quality -= 5
        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=quality)
        data_out = buffer.getvalue()

    # if still too big, progressively resize
    w, h = img.size
    while len(data_out) > max_bytes and (w > 200 and h > 200):
        w = int(w * 0.9)
        h = int(h * 0.9)
        resized = img.resize((w, h), Image.LANCZOS)
        buffer = BytesIO()
        resized.save(buffer, format="JPEG", quality=quality)
        data_out = buffer.getvalue()

    encoded = base64.b64encode(data_out).decode("utf-8")
    data_url = f"data:image/jpeg;base64,{encoded}"
    return {"data_url": data_url, "size_bytes": len(data_out), "quality": quality}
