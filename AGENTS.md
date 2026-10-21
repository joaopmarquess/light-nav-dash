# Project rules
- Keep hospital institutional content in a typed data object passed into its Timeline presentation; missing media must render placeholders so future data integration never requires replacing the layout.
- Compose the simplified Timeline study maps by reusing the geographic and Uberaba map screens; use container-aware presentation options instead of duplicating map logic.
- Keep Uberaba credentialing reference selection and supplied summary values in a tested helper, separate from summary presentation, so visual changes cannot alter quantities or source precedence.
- Keep MAA geometry and area classification in a focused helper, with tests, so map presentation does not change beneficiary counts or geographic membership.
- Simplify only the projected display outline; classify municipalities using the original outer ring to preserve geographic membership.
- Derive the MAA locator rectangle from the main projection's inverse viewport corners, so the overview always represents the displayed region.
- Apply explicit MAA municipality inclusions in the geometry helper before boundary generation; keep disconnected exterior rings and omit enclosed holes so all included municipalities receive an external outline.
- Reuse the MAA geometry for both the outline-only inline toggle and focused magnifier; only focused mode changes projection, colors and labels, so the eye toggle preserves the original map.
- Render the MAA magnifier within the geographic screen's shared date/total layout rather than a fullscreen overlay, so opening and returning preserve the selected date and inline map state.