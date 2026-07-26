## Plan to fix blank VR mode

1. **Make VR startup safer**
   - Add a Quest/VR-safe rendering mode that activates when an immersive VR session starts.
   - In that mode, remove the highest-risk expensive scene features from the headset render path: HDR environment, volumetric clouds, heavy shadows, and very high pixel density.

2. **Keep desktop quality intact**
   - Preserve the richer forest visuals for normal browser/desktop play.
   - Only simplify rendering while inside the VR headset session, where the current scene can overload or fail to render.

3. **Harden the XR session entry**
   - Set conservative WebGL options for headset compatibility.
   - Clamp the VR device pixel ratio to reduce Quest GPU pressure.
   - Add a visible headset-safe fallback background/light setup so the screen is never black if optional assets fail.

4. **Improve diagnostics for this exact failure**
   - Add lightweight console messages around XR session start/end and WebGL context loss.
   - Add a recovery message if the WebGL context is lost instead of leaving the user with a silent blank screen.

5. **Verify**
   - Check the browser preview still renders.
   - Verify the scene can start without relying on network HDRI/cloud assets or deprecated shadow mode paths.