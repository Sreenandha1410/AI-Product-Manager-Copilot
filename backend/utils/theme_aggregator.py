from ai_schemas.theme_schema import Theme, ThemeAnalysis


def aggregate_theme_results(
    results: list[ThemeAnalysis]
) -> ThemeAnalysis:
    """
    Combine theme results from multiple batches.

    Themes with the same name are combined and their
    feedback counts are added together.
    """

    theme_map: dict[str, Theme] = {}

    for result in results:

        for theme in result.themes:

            key = theme.theme.strip().lower()

            if key not in theme_map:
                theme_map[key] = Theme(
                    theme=theme.theme,
                    feedback_count=theme.feedback_count,
                    feedback=theme.feedback.copy(),
                )

            else:
                existing_theme = theme_map[key]

                existing_theme.feedback.extend(theme.feedback)

                existing_theme.feedback_count = len(
                    existing_theme.feedback
                )

    return ThemeAnalysis(
        themes=list(theme_map.values())
    )