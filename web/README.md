# musicality.computer web

The Lumatone MIDI editor, transcriptions, and chord composer are available at
`/lumatone`, linked from the home page. MIDI device configuration is available on
both pages, with collapsible configuration and editor sections on `/lumatone`.
Device selection lives in MIDI configuration. MIDI initializes across routes so
the Lumatone page can be opened directly.

### Exercise transcriptions

The transcription picker on `/lumatone` includes nine exercise collections
by Dustin Getz, transcribed from the supplied PDFs: the basic ii–V–I–vi, voicing variations, twelve-key
vibraphone set, six colours, line clichés, moving shapes, pedals and slides,
finishing touches, and modes. The 61 original sections contain 539 attacks.
Each card preserves the written notes, octaves, source bar/beat, and duration;
rootless voicings do not gain an extra root. Mode scale passages include both
the drone and the moving thirds. Upper-structure triads retain their annotations.

Choose a collection, then its section. Dozenal/Jazz labels and previous-voicing
overlays are independent controls. Click a card (or focus it and press Enter or
Space) to hear its written voicing with the same chord sound as flute practice.
Click an individual note hex, or focus it and press Enter/Space, to hear only
that note. Clicking its pitch or octave label has the same effect.
This also works for the original song transcriptions. Previous-voicing overlays
are not sounded, and each audition replaces the previous one.
Source PDF links open the relevant page;
the supplied originals live in `public/lumatone-exercises/`. Checked pitch data
is stored in `src/lumatone/exercises/scores.json`, one attack per line, and
`exerciseScores.ts` maps exact MIDI intervals onto the existing hex lattice.
The shared chord renderer's optional root-omission flags default off, retaining
the existing song transcription behavior.
Run `node scripts/validate-exercise-scores.mjs` from `web/` to check measure
coverage, open/closed voicing relationships, and twelve-key transpositions.

### Flute practice

Play/pause and back controls sit beside the playhead. Pausing suspends the
playback audio clock and preserves the current pass and count-in; resuming
continues from there. In flute-follow mode, the follower's clock pauses too.
Space toggles play/pause; `[` / `]` move through the configured loop points and
the beginning/end of the track; Left/Right move to adjacent bar boundaries.
Down Arrow auditions the current chord without moving the playhead; holding
the key does not repeatedly retrigger it.
The back button goes to the previous loop point or beginning. While timed
playback runs, navigation queues on the next beat, as strip clicks do; seeking
to the end stops playback. Inputs, sliders, and editable text retain their own
keyboard behavior. Focused buttons and note hexes retain native Space actions.

**Practice history** below the timeline records judgements locally under
`musicality.practice-history.v1`. Sessions begin with a fresh practice run;
pausing/resuming keeps the same session. Judgements are batched to localStorage
every 750 ms and flushed when leaving. Runs without judgements are not saved.
No microphone audio is recorded. Continuous flute-follow samples are deduplicated
by note, pass, articulation, stable pitch, and pitch-result changes.

Session summaries separate first-try pitch, pitch after corrections, and timing
within ±120 ms. Only notes with detected judgements are counted. A recent-session
pitch chart and paginated detail log show dates, tempo/mode, target/played notes,
tuning, and early/late results. Historical pitches are snapshots, so score edits
do not rewrite old results. Labels follow the current Dozenal/Jazz setting.

Pause to export or import versioned JSON backups. Import validates the complete
file, merges session/judgement IDs, and skips duplicates; conflicting IDs and
malformed files leave existing results unchanged. Storage failures are visible
and in-memory results remain exportable. Corrupt saved data is left untouched
and can be downloaded as a recovery copy. Storage belongs to the browser/origin;
use export/import to move between localhost, the deployed site, or browsers.

Live pitch labels require two consistent readings before changing notes,
with a 120ms settling period near semitone midpoints. The settling period
expires so the label cannot latch indefinitely onto the wrong neighbor.
Display and entrance scoring share this stabilization; measured frequency and
cents remain unsnapped, including during settling.

The combined pitch/target tuner shows a needle from flat to sharp, centered
on the current target (or the detected note when no target is active). Wrong
notes pin the needle at the edge while the numeric cents readout keeps the
full interval. Green marks ±5 cents; accepted practice tuning remains ±35.
Allowed octave-up low notes use their playable octave as the tuner reference.
The meter keeps a fixed height through silence, listening, and detected notes.

Melody feedback separates pitch from timing visually: a check/cross shows the
pitch result, and a dot on an early/beat/late scale shows the last entrance's
timing with the ±120ms acceptance window shaded. Free-time mode uses a hex
pitch-result badge and omits timing grades. Note names and exact milliseconds
remain available beside the graphics.

The melody strip uses pitch-colored hexes, duration lines with beat ticks,
and per-note check/cross results. Timed practice adds a miniature early/late
marker with the same shaded timing window; a dashed minus marks a missed
entrance. Free time omits timing markers. Hover or focus a cell for its full
note, duration, and result description; auditioning and cueing still work.
Each cell also has a rhythm-symbol row: filled/open noteheads, stems, flags,
augmentation dots, and triplet markings show standard note values. Durations
crossing bar lines are tied. The separate row keeps half-beat and triplet
symbols readable without widening cells or changing their time alignment.

**Melody roles** adds chord-relative interval badges beneath each melody cell
and a current-role readout beside the playhead. Held notes split into separate
role segments at harmony changes (the opening A is 11 over Eø7, then the root
over A7). R means root; other labels use standard intervals such as ♭3, ♭7,
9, and ♯11. Chord quality distinguishes ♭3/♯9 and ♭5/♯11. Cyan means the pitch
class is present in the displayed voicing; amber means it is outside that
voicing. This is interval analysis, not a claim that every outside note is an
available tension. Hover/focus descriptions follow the Dozenal/Jazz toggle for
pitch/chord names. Jazz mode uses conventional harmonic-role labels. Dozenal
mode uses octave-independent semitone intervals from the chord root:
`+5` is five semitones within the octave and `+0` is the root pitch class.
The `+` marks an interval, as in chord names, rather than direction.
Octave transposition leaves these labels unchanged. The option works independently of hiding
the harmony diagrams.
Hover, focus, or tap a melody-role badge for the chord/root context, exact
octave-and-semitone distance, harmonic role, and voicing membership. Popovers
follow the label mode and explain the octave-independent dozenal notation. Their controls
are separate from the melody audition/cue button.

Open **Analysis overlays** for the remaining optional layers (off by default):

- **Common tones** outlines notes shared with the previous voicing at the same
  pitch and octave. **Voice leading** adds connection popovers with a minimum
  total-semitone-motion pairing, holding common tones; added/released voices
  are explicit. Neither analysis invents octave substitutions.
- **Guide tones** emphasizes thirds and sevenths with gold dots in chord
  diagrams and the main hex map. Other diagram tones are dimmed, while common
  tones remain visible when both overlays are enabled.
- **Harmonic destinations** brackets local dominant/ii–V/backdoor groups.
  These extend the existing interpretive function reading. ✓ means the very
  next chord contains the expected major/minor target triad; ↪ means it
  redirects. This test describes chord content, not a guarantee of cadential
  closure. Hover for the next chord and destination in the selected label mode.
- **Melodic intervals** shows motion from the previous attack: signed octaved
  semitones in Dozenal mode, directional interval names in Jazz mode. Tritones
  use TT because enharmonic spelling can change their diatonic name.
- **Phrases & motifs** starts with editable four-bar groups, not inferred breath
  phrasing. Enabling the overlay shows the groups immediately; valid edits to
  phrase-start bar numbers update the brackets automatically. Separate M labels
  identify exact non-overlapping four-attack contour/rhythm matches, allowing
  transposition; they do not assert identical harmony or phrase boundaries.

All layers share the existing beat scale. Chord connections and motif/destination
analyses are built once; editable phrase groups and interval lanes are memoized.

`/lumatone/practice` pairs a fixed 2q + 7r hex layout with Stella's pickup and
full 32-bar form. **Display → Upcoming attacks** selects 0–8 future attacks
(three by default). Each dashed outline tracks an exact
upcoming attack occurrence, including its loop pass. Positions and countdowns
always come from the current melody queue; the brightest outline is the next
attack. New outlines enter at the far end; repeated notes remain separate attacks.
Position, size, and opacity ease between stages; reduced-motion settings
disable these transitions.
The nearest outline contracts smoothly, retaining 24 dashes. Lookahead follows loop boundaries and
includes a note sustained across a loop start. The active
note's small bottom bar shortens over its duration.
The active note outline turns green for confirmed correct pitch, matching the
pitch checkmark. Early/late timing is judged separately. Feedback is matched
to the current attack and pass, so it does not carry into another note or loop.
Within that attack, a pitch correction can upgrade an earlier miss; later
readings do not clear a confirmed green outline.
Playback has a four-beat count-in, tempo, register, looping, guide sound, and
metronome controls. Click any hex (or focus it
and press Enter or Space) to audition its guide tone, including when playback is
stopped or guide sound is disabled. The microphone can also
run alone as a live note and tuning display. It starts only after pressing
**Listen to flute**, or starting practice with **Follow flute** enabled, and
requires localhost or HTTPS plus browser permission.

**Follow flute (free time)** gates each melody entrance on a stable matching
flute note (including register, within ±35 cents). It continuously checks held
notes, so a note begun during count-in or corrected into tune can advance
without another attack. Each articulation can advance only one melody note,
including across loop boundaries. After the count-in, the
playhead moves at the selected tempo until the next entrance, then waits as
long as needed. Playing the next note early advances to it immediately.
Wrong notes do not advance it; repeated pitches require a new articulation
with a detectable break. Pitch results remain visible without early/late
grades. Chords follow the score position, with sound lengths based on tempo;
pads fade naturally rather than sustaining indefinitely while waiting.
Loop points still apply, and strip/ruler seeks are immediate in free time.
Starting this mode opens the mic if needed. Both this and **Listen to flute**
preserve guide sound, chord sound, and metronome settings. Headphones help keep
playback out of the microphone.

**Accept octave up below C4** is enabled by default: a low target such as B♭3
also accepts B♭4, with the same tuning tolerance. It applies after the Register
setting in both timed and free-time practice, including live pitch feedback.
Targets C4 and above still require the written octave. The score, guide tones,
and detected-note marker retain their actual pitches. Disable the option for
strict octave matching throughout.

**Show chords** adds a harmony strip aligned below the melody strip
on a shared beat scale and horizontal scroll area, including the pickup space.
Each harmony cell reuses the transcription card's chord diagram: colored
hexes with pitch/octave labels, root outline, faded previous voicing, and a
root-motion arrow. Compact diagrams fit half-bar cells, while chord headings
and note labels follow the dozenal/jazz toggle. Cell width still encodes time.
Disable **Previous voicing & root arrows** to show only the current voicing
in each harmony cell.
Harmony cells also show a B♭-centered Roman numeral analysis. Applied functions
use slash notation (for example, `iiø7/iii → V7/iii`); these are harmonic
interpretations and do not require every tonicization to resolve directly.
Hover, focus, or tap a dotted-underlined Roman numeral for a concise function
explanation, including the local key and the slash meaning “of.” Popover note
names, key names, and chord symbols follow the Dozenal/Jazz toggle. Analysis
controls are separate from chord audition/cue buttons, so opening help does
not play a chord or move the playhead.
The current chart voicing has thin gold borders on each hex, with a double
border on its root. Chord changes
follow the beat independently of sustained melody notes. **Chord sound** plays
the same voicings as quiet sine pads, with an independent volume control that
also works on held chords. Register changes move the melody by octaves while
the accompaniment stays in its original register. Harmony display and sound
can be toggled separately; they reuse the transcription chart's octave edits.
When playback is stopped, harmony cells audition their full voicing and select
it on the hex map; melody cells audition their note in the chosen register.
These previews work even with the corresponding playback sound toggle off.
During playback, clicking either strip queues a seek on the next quarter-note
beat. The whole-piece ruler and playhead slider cue any bar or beat; stopped
seeks apply immediately. The detailed strips follow the active bar while playing.
Queued destinations appear in orange, and the cyan playhead shows current time.

Optional loop start/end selectors default to the pickup and end of the piece.
While stopped, choose bar boundaries or use **Set start/end here** at the current
playhead (rounded to a sixth of a beat, accommodating triplets). **Clear points**
restores whole-piece bounds. **Loop playback** enables repeating those bounds;
with it off, playback continues to the end of the tune. Each start has a four-beat
count-in. Seeking and looping cut the previous voices at the boundary and resume
any held melody/chord for the remainder of its duration. Entrance scoring uses
the same transport segments and gives each new pass its own results.

Microphone samples are analyzed locally with a monophonic YIN pitch estimator;
audio is neither recorded nor sent to a server. A small monochrome indicator at the top of the hex shows the heard
pitch; its dot moves above center when sharp and below when flat, over a ±50-cent range. Entrance feedback compares separately against tuning (35 cents) and
timing (120 ms) tolerances, with adjustable input timing correction. Sustained
notes do not automatically satisfy repeated attacks: this first version needs
a pitch change or a brief break in sound to detect another entrance. Repeated
flute tonguing and room noise still need real-instrument validation. Listening
preserves guide sound, chord sound, and metronome settings; headphones help isolate playback.
Leaving the page releases the microphone, audio contexts, and playback timers.

Strip cells are memoized and role segments are cached independently of the
moving playhead. Visual transport updates run at up to 30fps as lower-priority
React transitions; microphone analysis and the Web Audio clock remain separate.
Audio is scheduled 250ms ahead, with a 25ms scheduler tick. If a tick is delayed,
notes still in progress resume for their remaining duration without shifting
the score clock.

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
