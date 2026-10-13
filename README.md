# ISOLE - Resin island / interactive prototype

A fullscreen, procedurally generated miniature cliff island in a transparent water/resin block. Move the pointer to make waves and deform the block, drag to orbit, and adjust the scene controls.

## Two editions - important distinction

| Edition | Start | Implementation | Verification |
| --- | --- | --- | --- |
| **Portable, ready to open** | `portable/Interactive_Island.html` | Native WebGL 2, inline JavaScript/CSS/shaders. No installation or network requests. | Browser-tested, strict TypeScript check, geometry/math tests. |
| **Requested-stack source project** | `npm install` then `npm run dev` | Vite + React 19 + TypeScript + Three.js + R3F 9 + Drei + React Three Postprocessing + Leva. | Source syntax checked. Dependency installation, full React type checking, Vite build and R3F runtime were **not verified** in this environment because npm could not be reached. |

The portable renderer is NOT a bundled R3F application. It is a separate, tested renderer sharing the same procedural geometry, terrain, wave solver, and deformation formulas with the React source. The React version uses MeshTransmissionMaterial and Leva; the portable version uses custom GLSL transmission and an HTML control panel.

This is a functional first prototype, not a photorealistic reproduction of the reference image. It does not contain the reference image as a background or a texture.

## Open the working model

1. Open `portable/Interactive_Island.html` in a browser with WebGL 2 and hardware acceleration enabled.
2. No account, server, API key, npm packages, downloaded models or internet connection are required for this edition.
3. On slower devices select **Lite**. **Auto** reduces render resolution after sustained low measured FPS. Lite also disables depth-of-field blur.

If a previewer only displays the HTML source, save the file and open it directly in a browser. If a managed browser blocks local HTML by policy, serve the folder through a local HTTP server; the file itself makes no remote requests.

## Controls

- Move over the water: ripples and spring-driven jelly deformation.
- Click/tap the water, or use the left-hand wave button: stronger ripple.
- Drag: orbit the camera. Wheel or two-finger pinch: zoom.
- Top-right button: show/hide settings; mobile starts with the panel hidden.
- Sliders: water color, ambient wave height, ripple strength, sun elevation, tide level, jelly stiffness, depth of field.
- Bottom-left buttons: island, lagoon, profile camera presets (portable edition).
- Bottom-right: automatic rotation, pause, PNG capture, fullscreen (portable edition).
- `Space`: pause/resume simulation. `R`: reset controls, camera and waves (portable edition).

The React reset control resets its settings and OrbitControls view; it does not currently clear an already-propagating height field. The portable export captures the 3D canvas, not the HTML controls.

## Run the React source

Requires Node.js **20.19 or newer** and npm. Dependencies need internet access on first installation.

```sh
cd resin-island
npm install
npm run dev
```

Open the local address printed by Vite, normally `http://localhost:5173`.

```sh
npm run check
npm run build
npm run preview
```

A successful production build creates `dist/`. `base: './'` supports deployment under a subdirectory. Publish `dist/` to a static web host after a successful build and browser test. No hosted URL has been created as part of this delivery.

There is intentionally **no fabricated package-lock.json**: dependency resolution was unavailable. Run `npm install`, check the result, and commit the generated lockfile before using the project for a production deployment. Do not treat the source archive as an already-built production R3F release.

## Architecture

```text
src/
  App.tsx                  React page, Leva controls, quality state, error boundary
  components/
    Diorama.tsx            Composition, camera, performance monitor
    Terrain.tsx            Shared procedural terrain and substrate
    Scatter.tsx            Instanced rocks, trunks, crowns and palm leaves
    Water.tsx              Shared transmission capture and water materials
    Studio.tsx             Lighting, environment, floor, contact shadow, effects
  hooks/
    useHeightField.ts      Independent GPU ping-pong height/velocity solver
    useJelly.ts            Stable spring uniforms, updated in useFrame
  core/
    math.ts               Seeded random, noise and matrix utilities
    terrain.ts            Height, slope color, plants, rocks, terrain texture
    geometry.ts           Rounded grids, sides, rocks, cylinders, leaf geometry
    shaders.ts            Shared height-field and jelly GLSL + native shaders
  lib/
    materials.ts          Deformation/caustics patches; matching depth material
    threeGeometry.ts      Shared geometry to THREE.BufferGeometry
  standalone/
    engine.ts             Native WebGL 2 renderer, simulation, input and cleanup
    bootstrap.ts          Accessible HTML controls and shortcuts
    shell.html            Portable page template
scripts/
  build-portable.cjs       Inline single-file bundler using TypeScript
  test-core.cjs            Deterministic terrain/geometry/math checks
  check-syntax.cjs         Source transpilation check, not a dependency type check
portable/
  Interactive_Island.html  The tested, ready-to-open edition
```

### Water and deformation

The GPU solver uses two floating-point render targets with fixed-size integration steps. Red stores height and green stores vertical velocity. Wet-cell masking uses the same terrain function as the visible geometry. Shoreline and outer-edge damping limit oscillation. The shader adds low-amplitude analytic ambient waves even without pointer input.

If floating-point render targets are unavailable, the portable version and React hook use an analytic ripple fallback. WebGL 2 itself is required. This is a 2D height-field surface, not a full fluid-volume simulation.

Jelly deformation is height-weighted: the bottom is anchored while upper vertices move more. Instanced vegetation and rocks are deformed in the same coordinate system. Springs are damped and frame-time bounded. Water uses depth tint, Fresnel reflection, refraction approximation, procedural shoreline foam, and moving light patterns on the seabed.

The React water component shares one offscreen opaque-scene capture between its two MeshTransmissionMaterials and hides both water meshes during capture. It avoids sampling the same render target being written. The native renderer similarly separates opaque and water render targets.

### Assets, lighting and privacy

All scene geometry is code-generated. No GLB, GLTF, OBJ or model files are loaded. No texture photographs or font files are included. Native caustics and environment reflection are procedural approximations.

The React edition uses Drei's `Environment preset="sunset"`, which requests an HDR environment from an external service. A procedural Lightformer environment is supplied as a loading/error fallback. For an entirely self-hosted production React edition, replace the preset with a separately licensed, self-hosted environment or the generated fallback.

The portable edition contains no analytics, remote calls or external assets. PNG export saves locally.

## Performance and limitations

The requested **60 FPS desktop / 30 FPS mobile** figures remain targets, not verified guarantees. Tests ran in Chromium with **SwiftShader software rendering**, not a physical desktop GPU or phone. The software-rendered full-size High scene was slow (approximately 2-3 FPS at 1440 x 960). That result cannot establish hardware-accelerated frame rates; measure on the intended devices before acceptance.

The portable renderer uses instancing, a small GPU simulation texture, bounded device pixel ratio, mobile geometry reduction, shared render passes and automatic downward quality adaptation. Its Lite mode reduces render resolution but does not rebuild all desktop geometry. This preserves the scene during adaptation but limits the speedup on geometry-bound devices.

Real-world follow-up checks should include the target Mac, iPhone/Android Safari/Chrome, high-DPI resizing, sustained thermal load, GPU memory, and frame-time percentiles rather than only a momentary FPS label. Browser tests here use touch/viewport emulation; that is not a real-device performance test.

Other limitations: rounded geometry and optical effects are approximations; no physically traced caustics, volumetric fluid motion or exact face-to-face refraction; there are no huts from the reference image; the contact-shadow treatment is simplified. Shader simulation and caustics are visual effects, not scientific outputs.

## Verification and reproducibility

`tests/desktop-results.json` and `tests/mobile-results.json` record actual browser checks. The desktop suite checks GPU height readback before/after a splash, pointer deformation, camera orbit, zoom, camera presets, sliders, pause, reset, dialog, quality reduction, PNG export, WebGL error state, and network silence. The mobile suite checks initialization, GPU readback, touch panel access, viewport overflow and WebGL errors.

`tests/syntax-results.json` records the scope of the React/TypeScript syntax-only check. `TEST_REPORT.json` summarizes what was and was not verified. Screenshots in `tests/` are captures of the actual portable runtime, not concept art.

After dependency installation:

```sh
npm run test:core
node scripts/check-syntax.cjs
npm run build:portable
npm run check
npm run build
```

Browser test scripts use Python Playwright and Chromium at `/usr/bin/chromium`; adapt that executable path on another OS. The delivered tests were run on Linux under an X display with SwiftShader:

```sh
xvfb-run -a python tests/interactive_test.py
xvfb-run -a python tests/interactive_test.py --mobile
```

`TYPESCRIPT_PATH` can point the small Node scripts at an existing TypeScript installation; normal npm installs do not need that override. A portable strict type check can be run separately:

```sh
npx tsc --noEmit --strict --target ES2022 --lib DOM,DOM.Iterable,ES2022 \
  --module ESNext --moduleResolution Bundler src/standalone/bootstrap.ts
```

## GitHub Pages publishing

A ready-made workflow is included at `.github/workflows/pages.yml`. It publishes the verified standalone file as `index.html` on pushes to `main`, without installing npm packages. GitHub Pages must be configured to use **GitHub Actions** as publishing source in the repository settings. See [`PUBLISH_GITHUB_RU.md`](PUBLISH_GITHUB_RU.md) for Russian instructions.
