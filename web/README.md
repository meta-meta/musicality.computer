# musicality.computer web

## Public arrangements and private collections

Your hand-made arrangements (S’Wonderful, Stella by Starlight, This Will Be Our
Year, and the ukulele charts) are public app source. Stella's melody also powers
the public practice and XR views. Dustin Getz’s nine exercise collections and
source PDFs are also public, with attribution in the exercise view. These all work
without any private checkout.

Imported OpenBook, Effendi, and Wikifonia catalogs, their lyrics and reports remain
in the private `meta-meta/musicality-arrangements` repository. To use them locally, from the app root:

```powershell
git clone git@github.com:meta-meta/musicality-arrangements.git arrangements.local
cd web
npm run dev -- --port 5180 --strictPort
```

Vite overlays catalog modules and serves score JSON from `arrangements.local/web/`
only during development. Production builds include your arrangements and the
credited exercises, and exclude imported catalogs even with the private checkout
installed. Private copies cannot override public arrangement modules. Imported
scores still load on demand, rather than downloading the entire collection.

Imported catalog data paths below are relative to the private
checkout's `web/` directory; hand-made arrangement and exercise paths refer to this frontend. Import commands run from this frontend and use ignored caches;
`publish-practice.py` writes only into `../arrangements.local/web/`. Commit data
changes from the private checkout and app changes from the public repository.
Never copy private scores into this frontend's `public/` folder. Private storage
does not grant reuse rights. Catalog integration tests require the private checkout;
generic algorithm tests work without it. Run `node scripts/test-public-arrangements.cjs`
to check that authored charts, Stella practice, and credited exercises are available
without the private checkout, while imported catalogs remain excluded.

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
Space) to hear its written voicing with the same chord sound as monophone practice.
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

### Monophone practice

The **Instrument** selector under Monophone input displays melody, chords, tuner notes,
and analysis in written pitch for flute, piccolo, alto/bass flute, B♭ or A clarinet,
trumpet, saxophones, and F horn. It saves the choice locally. **Concert key** and
Register control the sounding music; changing instrument preserves guide/chord
sound, microphone judging/following, and saved history in concert pitch. Clicking
written note/chord cells auditions their concert equivalents. MIDI feedback maps
concert MIDI notes into the same written layout. The reference label follows
Jazz/Dozenal mode: for B♭ instruments, **D = concert C** (written C sounds B♭).
Octave-transposing instruments also show their octave displacement.
The **Concert key** and **Register** choices show green `✓ fits` or amber
`⚠ too low/high`. Each key is checked with the current register, and each register
with the current key. A warning beside Concert key gives the full melody's written
bounds and the instrument's typical written range. Chord accompaniment and the
optional octave-up acceptance do not change this full-melody range check.
Ranges are defaults, not a player's comfortable limits: C-foot flutes; piccolo
D4–C7; clarinets E3–C7; trumpet F♯3–C6; saxophones B♭3–F♯6 (baritone A3–F♯6);
and F horn F♯2–C6. Saxophone altissimo and brass extended techniques are excluded.
B♭ clarinet, trumpet, and soprano sax have separate instrument choices.
References: [Yamaha saxophone fingering chart](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play002.html),
[VSL flute](https://www.vsl.co.at/academy/woodwinds/concert-flute),
[VSL piccolo](https://www.vsl.co.at/academy/woodwinds/piccolo),
[VSL clarinet](https://preview.vsl.co.at/academy/woodwinds/clarinet),
and [VSL horn](https://www.vsl.co.at/academy/brass/horn-f).

Run `node scripts/test-instruments.cjs` to check notation and concert-pitch judging.
Microphone tracking covers 50–5000 Hz so low saxophone fundamentals are accepted.
The YIN analysis window scales with sample rate (2048 samples at 44.1/48 kHz,
4096 at 96 kHz), with matching capture timestamps and calibration windows.
Run `node scripts/test-pitch-range.cjs` to check low-register and harmonic-rich tones.


Play/pause and back controls sit beside the playhead. Pausing suspends the
playback audio clock and preserves the current pass and count-in; resuming
continues from there. In monophone-follow mode, the follower's clock pauses too.
In timed playback each dashed cue outline closes onto its hex with a single animation
scheduled from the audio clock to end at the attack, so it stays smooth and lands on
time when the page is busy. The bar on the target hex that empties over the note's
length is scheduled the same way, to finish when the note ends. In free time, where the playhead waits for the player,
the outline still follows the playhead on each update.
Space toggles play/pause whatever has focus (a button, checkbox, menu, slider or
note hex), except in a text field, where it types a space; `[` / `]` move to the previous/next melody note;
`Shift+[` / `Shift+]` (`{` / `}`) move through the configured loop points and
the beginning/end of the track; Left/Right move to adjacent bar boundaries.
M turns the metronome on or off from any focus except a text field (not in free
time, where the metronome is unavailable). R turns looping on or off the same way.
Looping can be changed while practice is playing, by key, button or checkbox. Turned
on, the current pass ends at the loop end (if the playhead has not passed it) and
repeats; turned off, it plays on to the end of the tune, or through the remaining
sections when one is selected. A new history session starts with the new setting.
? shows or hides a panel listing every assigned key (from any focus except a text
field, and with the board maximized); Esc or its Close button dismisses it. The list
is `PRACTICE_SHORTCUTS` in `usePracticeShortcuts.ts`, kept beside the handlers.
Changes made with M, R, Up/Down and the section arrows are confirmed by a brief
message at the bottom of the window (for example "Loop off" or "84 BPM"), which
also says when a key is ignored ("Pause to change tempo"). It shows with the board
maximized too.
Up/Down change the tempo by 1 BPM, or 10 with Shift, landing on whole BPM; holding
a key repeats. Tempo can be changed while practice is playing, by key or with the
tempo dial: the playhead keeps its place and continues at the new tempo about 30 ms
later, notes already sounding ring to their original length, and a new history
session starts at the new tempo. C auditions the current chord without moving the playhead
(this was Down Arrow); holding the key does not repeatedly retrigger it.
The back button goes to the previous loop point or beginning. While timed
playback runs, navigation queues on the next beat, as strip clicks do; seeking
to the end stops playback. For the other shortcuts, inputs, menus, sliders and
editable text retain their own keyboard behavior. Space no longer activates a
focused button or note hex on the practice page; use Enter for that.

The practice page's **Key** selector transposes Stella's melody and harmony
together into any of the 12 keys (B♭ major by default). Playback, audition,
monophone targets, hex positions, chord labels, and analysis follow the chosen key.
**Register** independently shifts the melody by octaves. Key names follow the
Dozenal/Jazz label setting; pause playback before changing key or register.
Saved practice sessions include their key, and older history imports retain
their original B♭ context. **Show melody** hides the melody strip and board
cues independently of guide sound, harmony, and live input highlights.

The practice page also has a collapsible **MIDI configuration** section. Select
**Lumatone In** to show held MIDI notes and chords on the hex board with a
contrasting border and played-note fill. Highlights clear on release, MIDI
all-notes-off/all-sound-off, device changes, or disconnection. MIDI highlights
are independent of microphone input and do not create monophone judgements or
trigger guide audio.

**Tune** and **Find a tune** select from the original Stella arrangement and
153 imported OpenBook tunes, 471 Effendi arrangements, and 5,439 Wikifonia arrangements. **Collection** filters
the selection; volume/instrument variants retain their source filenames. Links
to both OpenBook and Effendi are beside the selector. The Effendi set includes
39 explicitly marked melody-only arrangements; their chord controls are
disabled. Fifteen other Effendi files need source review and are listed in
import notes. See `src/lumatone/practice/effendi/README.md` for provenance,
conversion details, limitations, and refresh commands.

Selecting a tune resets its transport, microphone,
loop points, and practice settings. Source links, typesetter/composer credits,
copyright metadata, and interpretation notes appear below the timeline.
Cheek to Cheek and Waltz for Debby are listed as needing source correction;
their upstream melody/harmony data is incomplete or inconsistent. Imported
chord voicings are generated; the manual Roman-numeral/phrase analysis remains
specific to the original Stella arrangement. Imported tunes still have melodic
roles, key changes, MIDI highlights, monophone judging/following, and practice history.
History defaults to the selected tune, with an option to review all tunes.

To regenerate the OpenBook conversion, download the OpenBook source and portable LilyPond
2.24.4 into an ignored `*.local` folder. From `web/`, run (adjust local paths):

```powershell
python -X utf8 scripts/import-openbook.py --source openbook-import.local/book-openbook-master --lilypond openbook-import.local/tools/lilypond-2.24.4/bin/lilypond.exe --out openbook-import.local/catalog.json --work openbook-import.local/compiled
python -X utf8 scripts/publish-practice.py openbook-import.local/catalog.json --collection OpenBook
node scripts/test-openbook.cjs
```

The importer compiles each default version, resolves relative pitches, tuplets,
and repeat endings, joins tied melody segments, and checks both streams have
the same length with ordered, non-overlapping events. Grace notes are omitted;
melody chords use their upper note. D.S./D.C. jumps are kept in written order
and flagged in the tune's notes. Full provenance and known limitations are in
`src/lumatone/practice/openbook/README.md`. The compiler and upstream source are
build-time tools only; users need neither to practice with the generated data.

**Practice history** below the timeline records judgements locally under
`musicality.practice-history.v1`. Sessions begin with a fresh practice run;
pausing/resuming keeps the same session. Judgements are batched to localStorage
every 750 ms and flushed when leaving. Runs without judgements are not saved.
No microphone audio is recorded. Continuous monophone-follow samples are deduplicated
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
Playback has a three-beat count-in, tempo, register, looping, guide sound, and
metronome controls. Click any hex (or focus it
and press Enter or Space) to audition its guide tone, including when playback is
stopped or guide sound is disabled. The microphone can also
run alone as a live note and tuning display. It starts only after pressing
**Listen to monophone**, or starting practice with **Follow monophone** enabled, and
requires localhost or HTTPS plus browser permission.

**Follow monophone (free time)** gates each melody entrance on a stable matching
instrument note (including register, within ±35 cents). It continuously checks held
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
Starting this mode opens the mic if needed. Both this and **Listen to monophone**
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
with it off, playback continues to the end of the tune. Each start has a three-beat
count-in. Seeking and looping cut the previous voices at the boundary and resume
any held melody/chord for the remainder of its duration. Entrance scoring uses
the same transport segments and gives each new pass its own results.

Microphone samples are analyzed locally with a monophonic YIN pitch estimator;
audio is neither recorded nor sent to a server. A small monochrome indicator at the top of the hex shows the heard
pitch; its dot moves above center when sharp and below when flat, over a ±50-cent range. Entrance feedback compares separately against tuning (35 cents) and
timing (120 ms) tolerances, with adjustable input timing correction. Sustained
notes do not automatically satisfy repeated attacks: this first version needs
a pitch change or a brief break in sound to detect another entrance. Repeated
instrument articulation and room noise still need real-instrument validation. Listening
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

### On-demand practice collections

The practice page bundles only `catalog.index.json` (search metadata). Each selected
score is fetched from `public/practice/scores/` and the eight most recently opened
scores are cached in memory. Selecting a different tune stops/unmounts the previous
practice session immediately. Failed requests show a retry button. Score filenames
include a content hash so updated scores get a new URL. Static hosting is sufficient;
no MusicXML parsing or music compiler runs in the browser. Tune searches show at most
200 matches; narrow the collection/title/composer search to see more specific results.

For Effendi, convert into a local cache and publish the results:

```powershell
python -X utf8 scripts/fetch-effendi.py effendi-import.local/source
python -X utf8 scripts/import-effendi.py --source effendi-import.local/source --out effendi-import.local/catalog.json
python -X utf8 scripts/publish-practice.py effendi-import.local/catalog.json --collection Effendi
```

For ChoCo's Wikifonia archive (run from `web/`):

```powershell
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/smashub/choco.git wikifonia-import.local/choco
python -X utf8 scripts/fetch-wikifonia.py --repo wikifonia-import.local/choco --out wikifonia-import.local/source
python -X utf8 scripts/import-wikifonia.py --source wikifonia-import.local/source --limit 30
python -X utf8 scripts/import-wikifonia.py --source wikifonia-import.local/source
python -X utf8 scripts/test-effendi.py
node scripts/test-openbook.cjs
```

The fetcher pins source URLs to the clone's revision and uses blob hashes as cache
filenames to support source titles containing Windows-incompatible characters.
Conversion reuses the Effendi MusicXML parser; the sample command writes a report
without publishing. Full conversion publishes individual scores, search metadata,
and `src/lumatone/practice/wikifonia/catalog.report.json`. Unsupported/ambiguous
sources are excluded with a reason; source links, rights, and credits are retained.
Imported voicings are generated from chord symbols, not original piano arrangements.

### Timed lyrics

MusicXML imports preserve note-aligned lyric syllables, verse numbers, source line
breaks, ties, melismas, and expanded bar repeats. Tunes with timed lyrics show a
`lyrics` marker in the selector and a **Show lyrics** display setting. The lyric
panel follows the playhead (including seeks, loops and free-time monophone following),
underlines the active syllable, and keeps two equal-sized lyric rows. The rows
alternate karaoke-style: the upcoming line stays in place as it becomes current,
and the finished row refreshes with the following phrase. Upcoming syllables use
the **Upcoming attacks** count, shared note-cue colors/opacity, and last-beat outline
contraction. Cues follow playback, pause, count-in and loop timing; wraps preview
the loop's first lyric line. These outlines are independent of Show melody. Multiple source verses
have a manual verse selector; repeats do not guess which verse should be sung.
Lines follow source breaks where present, with short readable groups otherwise.
Lyrics are loaded only with their selected score. Tunes without lyrics have no
lyric panel or lyric setting. This adds lyrics from MusicXML sources (Wikifonia
and Effendi); the LilyPond/OpenBook pipeline does not yet export timed lyric events.

### Suggested practice loops

The practice page offers a balanced mix, near-miss polishing, recurring trouble
spots, and confidence passages. Suggestions use the most recent 5/10/20 matching
sessions for the selected tune. Users can choose pitch, timing, or both and a
1/2/4-bar loop. Settings match key/register, free-time mode, low-note octave
acceptance, and tempo within 10 BPM by default; the filter can be broadened.

Only the first chronological judgement per note/pass is counted; corrections and
continuous detector readings do not inflate evidence. Each note contributes at
most its latest 12 attempts. Notes with no judgement are unknown; free-time
attempts never contribute timing errors. Snapshot pitches/start/duration must
still match the current score, or the old judgement is excluded. At least two
passes are required. Confidence uses >=85% success; polishing 65–99%; both need
at least half of the passage's attacks observed. Trouble spots require <65%
success with errors across at least three passes. Balanced suggestions do not
overlap, and can yield fewer than three loops. These thresholds are heuristics,
not established psychological prescriptions.

Ranking refreshes when paused/stopped, outside the playback clock. **Use loop**
finishes the current session, enables the chosen loop, and cues its start without
starting playback. Existing transport controls/loop markers are used. History
stays in the browser and is not changed by the ranking itself.

Validate with `node scripts/test-practice-suggestions.cjs` from `web/`.

### Aligned history map

Practice history combines a session progress line with whole-piece cross sections
on the same session columns. All sessions for the selected tune appear newest to oldest, with horizontal
scrolling to keep each session column readable; the graph stays on that tune even when the history table
shows all tunes. Switch between first-try pitch, on-time entrances, and full hits;
the line and bar cells always use the same metric. Each row represents a bar (with
beat-proportional height, including pickups and meter changes). Cells aggregate
attack judgements, not sustained-note duration. Colours indicate >=85%, 65–84%,
and <65% success. Unjudged cells are grey; free-time attempts have no timing score.
Missing timing values create gaps in the line rather than zero-percent points.

Click a point to review a session or a cell to filter its detail log to that bar.
Tab to a session column, use up/down arrows to select a bar, and Enter to review.
The detail log retains corrections; map statistics count only the earliest
judgement for each note/pass. Judgements whose pitch/start/duration no longer
match the selected score are excluded from the map. Session results are cached
by immutable history object, and the graph mounts only when history is expanded.

Validate with `node scripts/test-history-review.cjs` from `web/`.

**Show individual passes** expands the history graph into one column per recorded
pass, grouped by session with session/pass labels and separators. Sessions and
their passes are displayed newest first; original pass numbers are preserved. Both the line
and bar map use that pass alone, keeping the first judgement per note; corrections
remain in the detail log. Clicking a pass point/cell filters the review to that
pass (and optionally its bar). **Review entire session** clears both filters.
Pass timestamps use their earliest judgement. Empty/unrecorded passes cannot be
reconstructed and are not invented; stored transport pass numbers are preserved.
Expansion changes only the view, not saved sessions or the suggestion algorithm.

### Automatic input timing calibration

In **Monophone input**, open **Auto-calibrate**, then choose **Start calibration**.
Use the same output setup as practice. Let the microphone hear the speakers, or
hold a headphone earcup near it, stay quiet, and keep the tab visible. Ten short
sine tones play over roughly 13 seconds. The regular monophone listener and paused
transport stop before the test; calibration never records practice judgements.
Click **Listen to monophone** afterward to resume normal input.

The test uses the same 2048-sample pitch window, 30 ms polling, YIN detector,
stabilizer, entrance tracker, and center-of-window timestamps as live input.
Offsets are measured against scheduled playback on the transport's clock
convention: they include output, microphone, and residual detection delay rather
than claiming to isolate microphone latency. One detection is accepted per tone.
At least six consistent detections are required; median/MAD filtering removes
outliers. Excessive timing spread or offsets outside the existing -300 to 500 ms
range produce an error and leave the correction unchanged. Results are rounded
to the manual control's 10 ms step and require **Apply and save correction**.

Only device metadata and numeric results are saved, never microphone audio.
Profiles live under `musicality.timing-calibration.v1` in localStorage. The last applied/used calibration restores immediately on page load. Starting
normal microphone input verifies the browser-reported device/output and sample
rate while stopped. A matching profile is restored and remembered as last used;
a different uncalibrated setup resets a previously restored correction to zero
with a notice. Default-output identification is best effort;
recalibrate after device/routing changes even if the browser reports the same
name. Manual adjustments remain available and do not rewrite the saved measured
profile. Malformed stored data is not silently overwritten. Storage failures
still allow applying the result for the current page.

Cancellation, unmount, hidden tabs, disconnected devices, and interrupted audio
release test capture/playback resources. Calibration is unavailable during
practice or free-time mode. Validate with
`node scripts/test-timing-calibration.cjs` from `web/`; its synthetic loopback
feeds the actual pitch pipeline with 0/120/240 ms delays. Physical microphone,
speaker/headphone routing and permission prompts require a real-device test.

### Transport preferences and coverage filtering

The playhead controls include loop, tempo (10–420 BPM), and monophone listening next
to play/pause. Both tempo controls and both loop toggles share the same state.
Tempo and loop-enabled preferences persist across reloads/tunes in localStorage
under `musicality.practice-settings.v1`; loop boundaries remain tune-specific and
are not carried into another piece. These settings keep the existing restriction
on editing tempo/loop while playing. Listening retains the current sound options.

In the history graph, **Hide sessions/passes with <50% judged** filters the active
session or pass view. Coverage is distinct valid melody attacks judged divided by
all melody attacks in the piece, independent of success and timing mode. Repeated
attempts/passes through a short loop do not inflate coverage. Exactly 50% remains
visible. The full saved history/detail table remains available, and an empty state
allows turning the filter off when no columns qualify.

Validate with `node scripts/test-practice-settings.cjs` and
`node scripts/test-history-review.cjs` from `web/`.

### Instrument and key in practice history

New sessions save the selected instrument, the source key quality, and the key
transposition. History rows and review details show instrument, concert key, and
written key; both key spellings follow Jazz/Dozenal mode. Saved notes/judgements
remain in concert pitch. Changing instruments during a pause ends that session;
the next practice run starts a session with the newly selected instrument.

The history graph includes aligned **Instrument** and **Concert key** lanes between
the line graph and bar map, including in individual-pass view. Hover or focus a
column for the full instrument name and written key. Key cells use pitch colors.
Older sessions remain intact and show **Instrument not recorded** (`?` in the lane)
because their instrument cannot be inferred. Older imported-tune key quality is
left unspecified when it was not recorded. Export/import preserves new metadata. An import can fill a previously unrecorded
instrument on the same session ID; older exports cannot erase it, and conflicting
known instruments are rejected.
Run `node scripts/test-history-context.cjs` to check compatibility and graph labels.

Instrument labels use inline monochrome SVG drawings for flute, saxophone,
clarinet, trumpet, and horn; variants retain their names, and unknown instruments
use a question-mark icon. They do not depend on emoji or system font support.
Consecutive visible graph columns with the same instrument and concert key share
one span in both metadata lanes (×N counts columns in the current view). Changes
in instrument, tonic, or key quality start a new span; non-adjacent matches remain
separate. Only metadata is grouped: sessions, raw passes, points, bar cells, hover
information, and review interactions retain their original columns.

Grouped instrument and key labels center over the part of their span intersecting
the graph viewport. They track horizontal scrolling and resizing, stay inside
span boundaries, and hide when their entire span is offscreen. Scroll updates
move only label transforms without re-rendering the bar map.

### Reusable viewport-centered SVG labels

`src/components/ViewportCenteredLabel.tsx` exports `ViewportCenteredLabels` and
`ViewportCenteredLabel`. Wrap the scroll container and SVG in the plural component,
passing refs to both. Inside the SVG, give each label `start`, `end`, and
`labelWidth` in that SVG's horizontal coordinate system. Draw children centered
around x=0; their y coordinates stay unchanged. The component controls the group's
horizontal translation and visibility. Use unrotated SVGs and label ancestors
without additional transforms. SVG viewBox scaling and nonzero origins are supported.

The wrapper shares scroll/resize listeners across all its labels. Scroll events
update labels immediately to avoid an extra frame of lag, skipping unchanged
positions; resize, viewBox, and label-registration work use one shared animation
frame scheduler; each label registers directly, without chart-specific selectors.
It observes viewBox changes, removes observers/listeners on unmount, and doesn't
update React state during scrolling. The history graph uses it for both lanes.

`ViewportCenteredLabel` accepts optional `smoothingMs` (default 0). History uses
200 ms linear CSS transform transitions to soften uneven scroll events without a
React animation loop. Mounting and offscreen re-entry snap into place; reduced
motion disables transitions. Target positions still update immediately on scroll.

The tune picker constrains its label and select widths, and collection controls
wrap on narrow screens. Wide timelines/history plots scroll in their own panels
rather than widening the page.

### Restoring the last monophone practice session

On page load, Concert key, Register, Tempo, and Instrument default to the session
with the latest recorded activity (`updatedAt`, then `startedAt`). Empty sessions
are ignored. The concert key is restored as an absolute pitch class, and Register
is recovered by subtracting key transposition from total melody transposition.
These controls are owned by the page, so switching tunes keeps their current
values. Looping remains a separate saved preference.

Saved preferences are the fallback when there is no usable history, or an older
session lacks an instrument or has an unsupported register. A recorded session
takes priority over control edits that were never practiced. History is only read,
never changed by restoration. Generic practice UI, microphone input, and follower
code now use **monophone** naming; actual flute profiles/IDs remain unchanged.

The hex board shows a flowing arrow from the current note toward the next attack
during its final beat of approach. Repeated notes and count-in use a pointer from
above the destination. Reduced-motion preferences keep the arrow static. Count-in
clicks are three beats before the entry, spaced relative to pickups even when
they begin between beats; normal metronome clicks remain on the bar beat grid.

The next-note arrow backing uses the pitch palette for the directed interval
from current to next melody note, modulo 12, using the richer octave-3 palette (C color = unison/octave, C♯ = up
one semitone, B = down one semitone). This stays consistent across keys, registers,
and transposing instruments. During count-in, with no current note, it is neutral.

### Seven-string guitar practice

Select **Guitar (7 string)** for a standard B–E–A–D–G–B–E guitar with 24 frets.
The range check covers concert B1–E6 (written B2–E7); guitar notation sounds
one octave below written pitch. The hex board adds two lower rows so the low B
is accessible while retaining the existing isomorphic axes and pitch colors.
The guitar choice is saved with sessions and appears with its own SVG history icon.
The microphone listener continues to judge individual melody notes.
Range assumption: [Ibanez RGMS7 tuning and 24-fret specification](https://www.ibanez.com/usa/products/detail/rgms7_1p_04.html).

### Pitch colors in low registers

Pitch-class hues follow the circle of fifths. Higher notes become less saturated
and slightly lighter. Below C3, saturation stays rich and lightness now approaches
an OKHSL floor of 0.08 exponentially, instead of falling linearly through black.
The curve joins the existing C3 color and slope smoothly; C3 and higher colors
are preserved. This shared mapping applies to the board, chord cards, MIDI mapping,
and other pitch-colored views. Octave labels still identify the precise register.

Detected microphone pitches start at the fully visible matching hex nearest the
board's center. Subsequent pitches choose the closest equivalent on the isomorphic
lattice to preserve spatial continuity, including across silence between notes.
If that continuation would leave a hex clipped by the board edge, the indicator
returns to the centermost visible match. Resizing follows the same rule.

### Experimental built-in polyphonic guitar input

Under **Instrument input → Audio detection**, choose **Guitar / polyphonic
(experimental)**, then **Listen to guitar** (or **Listen** by the playhead).
Choose the Guitar instrument profile separately for written octave/range display.
The single-note detector remains available for precise tuning and wind instruments.

This mode uses `@markusstrasser/pitchplease` 3.1.0's `piano` streaming model,
selected for its guitar accuracy/latency tradeoff. Its published benchmark is the
author's result, not an app guarantee: https://github.com/markusstrasser/pitchplease.
This is a streaming Basic-Pitch-style model rather than Spotify's windowed
`@spotify/basic-pitch` implementation. Detection runs in an AudioWorklet, with
WASM when supported and a JavaScript fallback. The package is dynamically imported
on first listen; model/worklet assets are served locally by Vite
in development and emitted as separate files in the production build. Audio is never uploaded.
No desktop MIDI converter or external service is required.

Detected notes highlight together on the hex board. Melody judging considers
newly active pitches as a set so other chord tones do not mask a matching melody
note. Free-time mode accepts a matching held pitch. Full chord voicings are not
currently graded. The model reports discrete MIDI pitches, not reliable cents,
so polyphonic mode shows a detected-note list instead of a tuning needle.
Rearticulations of the same pitch require the detector to release it first.
Use a clean direct guitar input or a quiet microphone, and headphones when guide
or harmony sound is enabled to prevent the app hearing itself.

The displayed detector delay is the model's capture-to-output interval, not an
end-to-end measured latency guarantee. Judgement timestamps use the model capture
clock; manual input timing correction still applies. Automatic sine-tone timing
calibration is offered only with the precise single-note detector.

Run `node scripts/test-polyphonic-input.cjs` from `web/` for note lifecycle checks
and a real-model synthetic pluck/silence smoke test. Synthetic audio does not
establish accuracy on a particular guitar, interface, microphone or room.

Polyphonic microphone highlights follow the same placement principle as the
single-note indicator. A voicing begins near the board center; common tones stay
on their hexes and new tones appear near the preceding voicing's center. If a
continuation would clip any note, the entire detected voicing recenters together.
Silence preserves the last voicing's anchor. Detected audio notes are positioned
separately from MIDI input and the score's authored harmony diagrams.

### Experimental polyphonic tuning

Polyphonic listening now shares one unprocessed microphone stream between the
note detector and a Web Audio spectrum analyser. Roughly every 100 ms, it estimates
cents from isolated fundamental/harmonic peaks near each detected MIDI note,
rejects partials shared with other detected notes, and requires agreement across
partials and two readings. The analyser uses about 0.3–0.7 seconds of audio,
depending on sample rate; this feedback settles later than note detection.

Confident estimates appear beside the detected note names and as small top-of-hex
markers: above center is sharp, below is flat. A dash/no marker means insufficient
evidence. Shared octave harmonics, string inharmonicity, attacks, and microphone
noise can make estimates unavailable or inaccurate. These are experimental visual
tuning estimates; the existing polyphonic melody judgements still use note identity.
The extra analyser is disconnected and its stream/context released on stop, error,
cancellation, or page unmount. No audio is uploaded or saved.

Frequency data follows the [Web Audio spectrum/windowing specification](https://webaudio.github.io/web-audio-api/#fft-windowing-and-smoothing-over-time).
Validate with `node scripts/test-polyphonic-tuning.cjs`; the fixtures use synthesized
detuned strings and chords, not recordings or a real-guitar accuracy benchmark.

### Input note-off trails

Under **Display → Input note trails**, live MIDI and microphone highlights share
a configurable two-stage release: by default, 120 ms down to 70% highlight strength,
then a 10-second fade to zero. The fill overlay and outline fade together, leaving
a temporary spatial landmark; labels and score overlays retain their own state.
Replaying the same tile cancels its old fade and restores full input highlighting.
Overlapping MIDI/audio input keeps a tile held until both sources release it.

Enable/disable, release level, both durations, and independent easing curves are
saved in `musicality.note-trails.v1` in localStorage. Zero durations are supported.
Animations run through the Web Animations API without a React frame loop and are
cancelled when a tile unmounts. Changing controls during a fade uses its current
opacity and remaining duration. Existing MIDI, audio tuning, score and judgement
lifecycles do not depend on a trail's animation.

Validate with `node scripts/test-note-trails.cjs` for envelopes, persistence,
retriggering, mid-fade edits, disabling, and zero-duration behavior.

### Melodic note groups

While Note groups is on, every hex outside the current group is dimmed, as for a
selected section, and the group's own cells are drawn without the inset outline.
Played and held notes are never dimmed. A group of one note dims the board too, and
at a rest or during the count-in, where there is no current group, the whole board
is dimmed.

The melody strip draws written rest symbols in the silences between notes, at the
height of the note values: whole, half, quarter, eighth and sixteenth rests, dotted
where needed, split at bar lines (4-beat bars are assumed, as for tied notes). A gap
shorter than a sixteenth is not drawn.

**Display → Note groups** shows every note of the group around the current target
on the hex board: its cells left bright against the dimmed board and one arrow per move, so the shape
of the gesture is visible before it is played. Moves already passed are dimmed, a
repeated pitch adds no arrow, and a move that is retraced in the opposite direction
is drawn beside its counterpart. Brackets above the melody strip mark the same
groups. The option is off by default and is saved with the other display settings;
a single-note group has no arrows.
With a grouping on, `,` and `.` move to the previous/next group start (single-note
groups included); `,` inside a group first returns to that group's start.

- **Beams (as written)** uses the source notation's primary beams. `import-effendi.py`
  keeps each melody note's beam state (`beam: begin | continue | end`); a tied note
  that leads into a beam joins that beam group. Scores imported before this field
  existed, and LilyPond-derived scores, have no beam data: the option then reads
  **Beats (no beam data)** and joins notes shorter than a beat that start in the same
  beat of the same bar. Re-import a MusicXML score to get its written beams.
- **Contour (direction)** groups one sweep in a single melodic direction. A group
  ends at a rest, after a note that is at least a beat long and twice its successor,
  or where the direction reverses; the turning note stays with the sweep that reached
  it, and repeated pitches keep the direction.

Both are display heuristics, not phrase analysis. They can disagree usefully: where
three-note figures run against four-note beams, beams show the metre and contour
shows the figure. Run `node scripts/test-note-groups.cjs` to check both groupings,
the beat fallback, and the hex-board group layer.

### EWI / MIDI wind controller input

**MIDI configuration → EWI In** selects a wind controller, saved with the other
MIDI selections. Under **Instrument input → Instrument**, choose **EWI / MIDI wind
controller** to use it in place of the microphone; Audio detection then shows the
wind controller and cannot be changed until another instrument is chosen. If EWI In
is empty or its device is not connected, a connected port whose name looks like a
wind controller (EWI, Aerophone, NuRAD, Sylphyo, Travel Sax, WX5/WX7, YDS, Elefue,
Robkoo) is selected. That is a guess from the port name; change it under MIDI
configuration if it is wrong. The EWI instrument is treated as concert pitch, and
its 24–108 range is a nominal span for the octave rollers, not a measured limit;
transposition set on the controller is not known to the page. Note-ons are judged as
entrances, held notes drive monophone-follow mode, and the tuner, judgements and
history work as they do for microphone input. No microphone is opened, and the
microphone timing correction is not applied to MIDI timestamps.

On the hex board the fingered note is highlighted, with a round marker on its cell:

- **Breath** sets the marker's size and strength. It is read from breath (CC 2),
  volume (CC 7), expression (CC 11) or channel pressure, whichever arrived last;
  before any of those arrives, the attack velocity stands in.
- **Pitch bend** slides the marker sideways, with a line back to the cell centre.
  One cell to the right is two semitones in this layout, so the slide is to scale:
  a two-semitone bend reaches the neighbouring cell.

The controller does not transmit its bend range, so **Bend range** (±1, ±2 or ±12
semitones, saved in `musicality.ewi-bend-range.v1`) must match the instrument;
±2 is the default. Judging and the tuner use the sounding pitch (fingered note plus
bend, twelve-tone equal temperament at A4 = 440 Hz), so a bent note can read as out
of tune or as its neighbour. MIDI channels are merged. A slurred note is an entrance;
releasing a note while an earlier one is still held returns to that note.

The live reading is not React state. The board and the tuner subscribe to it
directly (`WindSource` in `ewi.ts`), so a breath stream redraws only the marker, a
new note redraws only the cells that changed, and the practice page itself is not
re-rendered by the controller. A note is shown as its MIDI message arrives; breath
and bend are coalesced to one update per frame.

Run `node scripts/test-ewi.cjs` for note, legato, breath and bend handling and the
hex-board marker. The fixtures are synthetic MIDI messages, not a real controller.

### Radial tempo dial

Both tempo controls (Playback and beside the playhead) are a button showing the
current BPM that opens the radial rate picker from the MusicalityVR interface lab
(`musicality.meta/web`). One turn of the dial doubles the tempo (log₂), 12 o'clock
is 60 BPM by default, and the range is 10–420 BPM. Dragging on the track snaps to
whole BPM; pulling outward gives finer steps, so tempos can now be fractional. Arrow
keys step, Page Up/Down and the ÷ 2 / × 2 buttons halve or double within the range,
clicking the value allows direct entry, and scrolling over a digit adjusts its place.
The BPM/Hz unit and the dial's mapping and landmark settings are saved in
`musicality.tempo-picker.v1`. The dial is unavailable while practice is running.

The picker lives in `src/components/ratePicker/` as a copy of the lab's `RatePicker`,
`PickerConfiguration`, `landmarks` and `frequency` modules, with the lab's theme
variables mapped to Chakra tokens in `ratePicker.css`. Behaviour changes should be
made in both places.

### The board follows the music

The board normally shows a fixed part of the layout. When the notes being practised
would fall outside it (after a change of key, register or instrument, in a narrow
window, or for a wide-ranging tune), the view moves the smallest distance that brings
them all in, with a margin. If they are larger than the view, it zooms out, up to
1.7× (hexes at about 60% size), and centres on them; past that the edges can still be
cut off. "The notes being practised" are the selected section's, or the whole melody
at the current transposition. The view is re-fitted when the section, transposition
or board size changes, not as the playhead moves. Because the layout is isomorphic
this changes only which part of it is on screen, so a pitch is not always at the same
place on screen from one tune or section to the next. Chord voicings are not part of
the fit.

### Full-window board (focus mode)

F toggles it from any focus except a text field, and a brief message announces
entering and leaving it however that happens (F, the button or Esc). On the way out
"Leaving focus mode…" is shown before the full page is rebuilt, which takes a
moment, and "Focus mode off" once it is back.

The button at the top right of the hex board maximizes it: the board fills the
browser window and nothing else on the practice page is rendered (controls, tuner,
judgement, sections, timeline, history and the tune picker). Playback, instrument
input and the keyboard shortcuts keep working. The same button, or Esc, returns to
the page. The choice is not saved; a reload opens the normal page.

### Sections, notes and timing in the history graph

A session played with a practice section selected records that section's id and name
(`settings.sectionId`, `settings.sectionName`; the name as it was then). All sessions
stay in one timeline. A **Section** lane under Instrument and Concert key marks the
sessions played in a section; consecutive sessions in the same section share a span.
Sessions recorded before this, or without a section, are unmarked.

**Rows** chooses what a map row stands for:

- **Bars**: every bar of the piece, as before, drawn to the bars' lengths.
- **Sections**: one row per saved section, in tune order. A note counts in every
  section it starts in, so overlapping sections each get it.
- **Notes**: one row per melody note of one section, numbered in order with its
  pitch. The section defaults to the one selected for practice and can be changed
  beside the Rows menu; "Whole tune" lists every note, capped at 160 rows.

In Sections and Notes, sessions that never touched the rows shown are left out.

**Cells** defaults to **Pitch + timing**, which shows both in one cell:

- on a note row, the fill is first-try pitch (the usual green/orange/red) and a white
  tick is the mean signed timing error of the timed first judgements: left of centre
  early, right late, with the cell edge at 150 ms or more;
- on a bar or section row, the left half is first-try pitch and the right half is
  on-time entrances.

The progress line above uses full hits in that mode. The three single measures remain
available. Rows and Cells are saved with the other view preferences. Clicking a cell
opens the review of the bar that row starts in.

History can now be saved and read back for a tune from any collection. Before, the
reader accepted only Stella, OpenBook, Effendi and Wikifonia ids, so one recorded
session for another tune (for example a MuseScore import) made the whole saved
history unreadable on the next visit and blocked further saving. Data saved in that
state was left untouched and loads again.

### Collapsible page sections

Each part of the practice page has a header that collapses it: Tune, the four
settings groups (Playback, Instrument input, Sound, Display), Analysis, Tuner and
judgement, Board, Lyrics, Sections, Transport and timeline, Suggested loops, Practice
history, Source and credits, and Help. A collapsed part is not rendered at all, so it
costs nothing while practising; playback, input and shortcuts do not depend on any of
them being open. Open/closed is remembered per part in `musicality.practice-view.v1`.
Source and Help start collapsed. MIDI configuration keeps its existing accordion,
which stays mounted while closed. The Start and Listen buttons above the settings are
always shown; the transport beside the playhead is part of Transport and timeline.

Esc steps out one level: it leaves the full-window board first, then the selected
section. Selecting or saving a section no longer turns looping on; looping stays as
you set it, so with it off the sections play through in order.

### Loop lane and practice sections

A **Loop** lane sits above the melody on the same beat scale. Drag across it to set
both loop points; drag either end to move just that end; double-click to clear. Points
snap to bar lines and to the starts and ends of melody notes. The lane is locked while
practice is running. The loop selects, "Set start/end here" buttons and Shift+[ / ]
shortcuts still work, and remain the keyboard route: the lane itself is pointer-only.

**Save loop as section** keeps the current loop as a named section of the tune. Saved
sections appear as a row of cards, each a small drawing of the section on the
isomorphic layout: one hexagon per distinct cell, one arrow per move, and a dot on
the first note. Arrows, here and in note groups on the board, are colored in
order: the hue wheel (OKHSL, light and mid-saturated) is divided into as many steps
as there are arrows, so the first arrow is pink-red and the colors run once around. Choosing a card:

- loads that section as the loop and moves the playhead to its start;
- draws every note of the section on the hex board with arrows, like a note group,
  and dims every other cell. Played and held notes are never dimmed;
- shows a played pitch on the section's own cell for that pitch when it has one.

This is free play: nothing is judged or recorded until **Start practice** is pressed,
which then practises the section as an ordinary judged loop with the section still
drawn. With a section selected, Left/Right move to the previous or next card instead
of the adjacent bar, stopping at either end of the row. Sections can be switched
while practice is playing, by key or by clicking a card: the new section is cued,
playback jumps to its start on the next beat (at once in free time) and loops there,
and its judgements begin a new history session. With looping turned off, or while
paused, switching stops playback first, as before.

With **Loop playback** off and a section selected, practice plays the sections in
card order: it starts in the selected section and, as each one ends, moves straight
on to the start of the next, selecting its card. It stops after the last section.
Sections need not be adjacent in the tune; a gap between them is skipped. Each
section's judgements go to their own history session. Cue outlines look ahead only
within the current section.
Choose the card again or **Leave free play** to return to the whole tune.
Moving a loop point by hand also leaves the section; the saved section keeps its own
range. A section contains the notes that begin inside its range. Sections can be
renamed and deleted, and are stored per tune with the tune's loop points in
`musicality.practice-sections.v1`. They are not part of the practice-history export.

### Saved settings

Practice controls are restored on the next visit:

- tempo, loop on/off, instrument, concert key and register in
  `musicality.practice-settings.v1`. The newer of a recorded practice session and a
  later edit to these controls wins; before, a recorded session always won, so an
  instrument chosen without practising was lost on reload;
- the chosen tune and collection filter, sound and display options, labels, upcoming
  attacks, note groups, analysis lanes, free time, octave acceptance, audio
  detection and input timing correction in `musicality.practice-view.v1`;
- loop points and sections per tune (above), and, as before, MIDI selections, EWI
  bend range, tempo dial, note trails, timing calibration and practice history.

Chord options stay saved while a tune without chords is open. Phrase starts for the
Stella analysis are not saved. Everything is kept in this browser only.

Run `node scripts/test-practice-sections.cjs` for section ranges, loop snapping,
storage, saved preferences, the EWI instrument, section cards and board dimming.
