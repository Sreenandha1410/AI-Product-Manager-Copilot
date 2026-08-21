from unittest.mock import MagicMock

from agents.clustering_agent import ClusteringAgent


class MockTheme:
    def __init__(self, id, theme_label, frequency):
        self.id = id
        self.theme_label = theme_label
        self.frequency = frequency
        self.cluster_id = None


def test_clustering_with_sample_feedback():

    print("\n" + "=" * 65)
    print("              CLUSTERING AGENT TEST")
    print("=" * 65)

    agent = ClusteringAgent()

    # -------------------------------------------------
    # Sample themes generated from customer feedback
    # -------------------------------------------------

    themes = [
        MockTheme(1, "Dark Mode", 5),
        MockTheme(2, "Night Mode", 3),
        MockTheme(3, "Dark Theme Support", 4),

        MockTheme(4, "Slow Application", 6),
        MockTheme(5, "Application Performance", 4),
        MockTheme(6, "Long Loading Time", 3),

        MockTheme(7, "Delayed Notifications", 5),
        MockTheme(8, "Notification Failure", 3),

        MockTheme(9, "Profile Picture Upload", 2),
    ]

    print("\nINPUT THEMES")
    print("-" * 65)

    for theme in themes:
        print(
            f"{theme.id}. {theme.theme_label}"
            f"  | Frequency: {theme.frequency}"
        )

    # -------------------------------------------------
    # Mock embeddings
    # Similar themes have similar vectors
    # -------------------------------------------------

    fake_embeddings = [
        # Dark Mode cluster
        [1.00, 0.00, 0.00],
        [0.95, 0.05, 0.00],
        [0.90, 0.10, 0.00],

        # Performance cluster
        [0.00, 1.00, 0.00],
        [0.05, 0.95, 0.00],
        [0.10, 0.90, 0.00],

        # Notification cluster
        [0.00, 0.00, 1.00],
        [0.05, 0.00, 0.95],

        # Separate theme
        [0.30, 0.30, 0.40],
    ]

    agent.create_embeddings = MagicMock(
        return_value=fake_embeddings
    )

    # -------------------------------------------------
    # Perform clustering
    # -------------------------------------------------

    clusters = agent.cluster_themes(themes)

    # -------------------------------------------------
    # Display clusters
    # -------------------------------------------------

    print("\n")
    print("=" * 65)
    print("                    CLUSTERS")
    print("=" * 65)

    for i, cluster in enumerate(clusters, start=1):

        print(f"\nCluster {i}")
        print("-" * 40)

        for theme in cluster:
            print(
                f"  • {theme.theme_label}"
                f"  (Frequency: {theme.frequency})"
            )

    # -------------------------------------------------
    # Validation
    # -------------------------------------------------

    total_themes = sum(len(cluster) for cluster in clusters)

    assert total_themes == len(themes)

    assert len(clusters) >= 3

    print("\n")
    print("=" * 65)
    print("✓ CLUSTERING TEST PASSED")
    print(f"✓ Input themes  : {len(themes)}")
    print(f"✓ Clusters found: {len(clusters)}")
    print(f"✓ Themes grouped: {total_themes}")
    print("=" * 65)


if __name__ == "__main__":
    test_clustering_with_sample_feedback()