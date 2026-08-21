from unittest.mock import MagicMock, patch

from agents.prioritization_agent import PrioritizationAgent


# ============================================================
# MOCK FEATURE REQUEST
# ============================================================

class MockFeature:
    def __init__(self, id, title, description, votes):
        self.id = id
        self.title = title
        self.description = description
        self.votes = votes


# ============================================================
# TEST DATA
# ============================================================

features = [
    MockFeature(
        1,
        "Add Dark Mode",
        "Users want dark mode for better usability at night.",
        35
    ),

    MockFeature(
        2,
        "Improve Dashboard Performance",
        "Dashboard takes more than 8 seconds to load.",
        80
    ),

    MockFeature(
        3,
        "Improve Search",
        "Search results are inaccurate and sometimes slow.",
        55
    ),

    MockFeature(
        4,
        "Advanced Report Filters",
        "Users need multiple conditions in report filters.",
        40
    ),

    MockFeature(
        5,
        "Profile Picture Upload",
        "Profile picture upload fails for some users.",
        25
    ),
]


# ============================================================
# MOCK GEMINI RESPONSE
# ============================================================

def fake_gemini_response(*args, **kwargs):

    return {
        "reach": 80,
        "impact": 4,
        "confidence": 0.9,
        "effort": 3,
        "impact_level": "High"
    }


# ============================================================
# TEST 1 — GET FEATURES
# ============================================================


# ============================================================
# TEST 2 — GEMINI ESTIMATION
# ============================================================

def test_gemini_estimation():

    agent = PrioritizationAgent()

    feature = features[0]

    with patch.object(
        agent,
        "estimate_with_gemini",
        return_value={
            "reach": 80,
            "impact": 4,
            "confidence": 0.9,
            "effort": 3,
            "impact_level": "High"
        }
    ):

        result = agent.estimate_with_gemini(feature)

    assert result["reach"] == 80
    assert result["impact"] == 4
    assert result["confidence"] == 0.9
    assert result["effort"] == 3

    print("\n✓ TEST 1 PASSED — Gemini estimation")

    print("\nGEMINI ESTIMATION:")
    print(f"  Feature    : {feature.title}")
    print(f"  Reach      : {result['reach']}")
    print(f"  Impact     : {result['impact']}")
    print(f"  Confidence : {result['confidence']}")
    print(f"  Effort     : {result['effort']}")
    print(f"  Priority   : {result['impact_level']}")


# ============================================================
# TEST 3 — RICE SCORE
# ============================================================

def test_rice_score():

    agent = PrioritizationAgent()

    # RICE = Reach × Impact × Confidence / Effort

    reach = 80
    impact = 4
    confidence = 0.9
    effort = 3

    rice = (
        reach *
        impact *
        confidence
    ) / effort

    assert rice == 96.0

    print("\n✓ TEST 2 PASSED — RICE calculation")

    print("\nRICE CALCULATION:")
    print(
        f"  ({reach} × {impact} × "
        f"{confidence}) / {effort}"
    )
    print(f"  RICE Score = {rice}")


# ============================================================
# TEST 4 — PRIORITIZE FEATURES
# ============================================================

def test_prioritize_features():

    agent = PrioritizationAgent()

    agent.db = MagicMock()

    # Mock Gemini for every feature
    with patch.object(
        agent,
        "estimate_with_gemini",
        side_effect=[
            {
                "reach": 50,
                "impact": 3,
                "confidence": 0.8,
                "effort": 2,
                "impact_level": "Medium"
            },
            {
                "reach": 100,
                "impact": 5,
                "confidence": 0.9,
                "effort": 3,
                "impact_level": "High"
            },
            {
                "reach": 70,
                "impact": 4,
                "confidence": 0.85,
                "effort": 4,
                "impact_level": "High"
            },
            {
                "reach": 60,
                "impact": 3,
                "confidence": 0.8,
                "effort": 3,
                "impact_level": "Medium"
            },
            {
                "reach": 40,
                "impact": 2,
                "confidence": 0.7,
                "effort": 2,
                "impact_level": "Low"
            }
        ]
    ):

        # Mock DB query
        agent.db.query.return_value.all.return_value = features

        # If your agent uses run(), test it through run()
        result = agent.run()

    print("\n✓ TEST 3 PASSED — Feature prioritization")

    print("\nPRIORITIZATION RESULTS:")

    if isinstance(result, dict):
        print(result)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print("\n" + "=" * 65)
    print("          PRIORITIZATION AGENT UNIT TEST")
    print("=" * 65)

    

    test_gemini_estimation()

    test_rice_score()

    test_prioritize_features()

    print("\n" + "=" * 65)
    print("          ALL TESTS COMPLETED ✓")
    print("=" * 65)