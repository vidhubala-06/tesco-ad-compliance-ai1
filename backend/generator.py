def generate_ad_copy(data):
    headline = data.get("headline", "").strip()
    subhead = data.get("subhead", "").strip()
    cta = data.get("cta", "").strip()
    category = data.get("category", "default")

    if not headline:
        headline = "Discover Quality Products"

    if not subhead:
        subhead = "Designed for everyday needs"

    if not cta:
        cta = "Shop Now"

    disclaimer = ""
    if category == "alcohol":
        disclaimer = "Please drink responsibly. Visit drinkaware.co.uk"
    elif category == "lep":
        disclaimer = "This product complies with applicable regulations."

    return {
        "headline": headline,
        "subhead": subhead,
        "cta": cta,
        "disclaimer": disclaimer
    }
