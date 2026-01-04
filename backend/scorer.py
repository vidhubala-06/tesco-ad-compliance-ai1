def calculate_score(results):
    score = 100

    for r in results:
        if r["severity"] == "Hard Fail":
            score -= 25
        elif r["severity"] == "Warning":
            score -= 10

    return max(score, 0)
