import re

BANNED_KEYWORDS = ["discount", "save", "deal", "best", "£", "$", "%"]

def check_rules(ad):
    results = []

    headline = ad.get("headline", "").lower()
    subhead = ad.get("subhead", "").lower()
    cta = ad.get("cta", "").lower()
    image = ad.get("image_url", "") or ad.get("image", "")
    clubcard = ad.get("clubcard", False)
    clubcard_end = ad.get("clubcard_end", "")
    alcohol = ad.get("alcohol", False)

    logo_present = ad.get("logo_present", True)
    cta_overlap = ad.get("cta_overlap", False)
    font_readable = ad.get("font_readable", True)
    contrast_ok = ad.get("contrast_ok", True)

    value_tile = ad.get("value_tile", "None")

    full_text = f"{headline} {subhead} {cta}"

    # ===== COPY RULES =====
    for word in BANNED_KEYWORDS:
        if word in full_text:
            results.append({
                "rule": "Banned Copy",
                "message": f"Banned keyword detected: '{word}'",
                "severity": "Hard Fail"
            })

    if len(headline) > 30:
        results.append({
            "rule": "Headline Length",
            "message": "Headline exceeds 30 characters",
            "severity": "Warning"
        })

    if cta not in ["shop today", "view offer", "buy online", "shop now"]:
        results.append({
            "rule": "Weak CTA",
            "message": "CTA should clearly indicate an action",
            "severity": "Warning"
        })

    if not image:
        results.append({
            "rule": "Missing Image",
            "message": "Product image is missing",
            "severity": "Warning"
        })

    # ===== CLUBCARD =====
    if clubcard and not re.match(r"^\d{2}/\d{2}$", clubcard_end):
        results.append({
            "rule": "Clubcard End Date",
            "message": "Clubcard ads must include end date in DD/MM format",
            "severity": "Hard Fail"
        })

    # ===== ALCOHOL =====
    if alcohol:
        results.append({
            "rule": "Alcohol Compliance",
            "message": "Drinkaware responsibility message required",
            "severity": "Hard Fail"
        })

    # ===== DESIGN =====
    if not logo_present:
        results.append({
            "rule": "Logo Presence",
            "message": "Tesco logo must be present",
            "severity": "Hard Fail"
        })

    if cta_overlap:
        results.append({
            "rule": "CTA Placement",
            "message": "CTA must not overlap image or value tile",
            "severity": "Hard Fail"
        })

    # ===== ACCESSIBILITY (FINAL ADDITION) =====
    if not font_readable:
        results.append({
            "rule": "Accessibility: Font Size",
            "message": "Font size is too small for accessibility",
            "severity": "Hard Fail"
        })

    if not contrast_ok:
        results.append({
            "rule": "Accessibility: Contrast",
            "message": "Text contrast does not meet accessibility standards",
            "severity": "Warning"
        })

    # ===== VALUE TILE =====
    if value_tile == "Price Tile":
        results.append({
            "rule": "Price Tile Usage",
            "message": "Price tiles are not allowed in retail media ads",
            "severity": "Hard Fail"
        })

    if value_tile == "Clubcard Tile" and not re.match(r"^\d{2}/\d{2}$", clubcard_end):
        results.append({
            "rule": "Clubcard Tile",
            "message": "Clubcard tile must display an end date",
            "severity": "Hard Fail"
        })

    if value_tile == "Only at Tesco" and not cta:
        results.append({
            "rule": "Tesco Tag CTA",
            "message": "CTA required when using 'Only at Tesco' tag",
            "severity": "Warning"
        })

    return results
