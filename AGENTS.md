# Project rules
- Keep MAA geometry and area classification in a focused helper, with tests, so map presentation does not change beneficiary counts or geographic membership.
- Simplify only the projected display outline; classify municipalities using the original outer ring to preserve geographic membership.
- Derive the MAA locator rectangle from the main projection's inverse viewport corners, so the overview always represents the displayed region.
- Apply explicit MAA municipality inclusions in the geometry helper before boundary generation; keep disconnected exterior rings and omit enclosed holes so all included municipalities receive an external outline.