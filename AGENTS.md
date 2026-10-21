# Project rules
- Keep MAA geometry and area classification in a focused helper, with tests, so map presentation does not change beneficiary counts or geographic membership.
- Simplify only the projected display outline; classify municipalities using the original outer ring to preserve geographic membership.
- Derive the MAA locator rectangle from the main projection's inverse viewport corners, so the overview always represents the displayed region.