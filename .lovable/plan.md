Change the permanent post-catch tint in `src/vr/Animals.tsx` from blue to bright teal.

- Update `CAUGHT_BLUE` constant (rename to `CAUGHT_TEAL`) to `#00e5c8` (bright teal).
- Update the emissive tint in `tintCaught` to a matching teal glow (e.g. `setRGB(0.0, 0.35, 0.3)`).
- Rename the internal material guard flag `__caughtBlue` → `__caughtTeal` so existing sessions re-tint cleanly.
- Bump `APP_VERSION` in `src/vr/Minimap.tsx` to `0.36.0`.

No changes to catch logic, celebration, or game flow.