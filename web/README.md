# musicality.computer web

The Lumatone MIDI editor, transcriptions, and chord composer are available at
`/lumatone`, linked from the home page. MIDI device configuration is available on
both pages, with collapsible configuration and editor sections on `/lumatone`.
Device selection lives in MIDI configuration. MIDI initializes across routes so
the Lumatone page can be opened directly.

### 3D / WebXR lead sheet

`/lumatone/xr` shows Stella's pickup and full 32-bar form as a spatial lead sheet.
The hex plane preserves the chart's interval layout and pitch colors; the third
axis represents elapsed beats, with tied melody notes shown as continuous columns.
Chord voicings come from the existing Stella chart. Drag to orbit, scroll to zoom,
or select attacks with the buttons. A bar selector jumps through the tune. The
camera follows each selected attack along the composition's time (local z) axis,
preserving orbit and zoom. The score stays in place, with nearby bars rendered at
their original scale. The headset origin and its controls travel with the selected
attack too. The 3D dependencies load only on this route.

Enable **Whole composition** (or **View: follow / whole** in the scene) to see
all 32 bars together as a centered miniature. Overview mode keeps past layers
fully visible and stops camera following; turning it off returns to the selected
attack at the normal scale. Orbit, zoom, and note selection work in either view.

The scene uses React Three Fiber 8 (for React 18) and `@react-three/xr`.
The explicit Zustand 4 dependency satisfies the XR emulator's state-library import;
Fiber 8 retains its own compatible Zustand 3 dependency.
On a compatible browser/headset, use **Enter VR** or **Enter AR**. Headset entry
requires a secure context: `localhost` works on the same device; a headset opening
the dev server over the LAN needs an HTTPS address with a trusted certificate.
The scene includes selectable notes and Previous, Next, Chords, Melody, spelling,
and Exit XR controls inside the headset, so it does not depend on the desktop
toolbar during immersion. Both toolbars can independently hide chords or melody
and switch all musical labels between dozenal pitch/interval notation and jazz
spellings. Text uses the bundled JetBrains Mono font. Chord notes fill grid cells;
melody durations use thinner columns.
Melody pitches and rhythms follow the linked score in `src/lumatone/leadSheet/stella.ts`;
the harmony retains this project's chart changes and voicings. Split bars change
chords on beat three. Only note-cell and harmony labels appear in the scene;
there are no floating attack labels. Arrows connect successive chord roots.
Note labels lie in the hex plane. Time progresses along negative local z;
completed notes and bars fade as the selected attack advances, while held notes
and active harmonies stay visible. Stepping back restores earlier layers.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
