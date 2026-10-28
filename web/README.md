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

The practice page's **Key** selector transposes Stella's melody and harmony
together into any of the 12 keys (B♭ major by default). Playback, audition,
flute targets, hex positions, chord labels, and analysis follow the chosen key.
**Register** independently shifts the melody by octaves. Key names follow the
Dozenal/Jazz label setting; pause playback before changing key or register.
Saved practice sessions include their key, and older history imports retain
their original B♭ context. **Show melody** hides the melody strip and board
cues independently of guide sound, harmony, and live input highlights.

The practice page also has a collapsible **MIDI configuration** section. Select
**Lumatone In** to show held MIDI notes and chords on the hex board with a
contrasting border and played-note fill. Highlights clear on release, MIDI
all-notes-off/all-sound-off, device changes, or disconnection. MIDI highlights
are independent of microphone input and do not create flute judgements or
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
roles, key changes, MIDI highlights, flute judging/following, and practice history.
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
panel follows the playhead (including seeks, loops and free-time flute following),
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

In **Flute input**, open **Auto-calibrate**, then choose **Start calibration**.
Use the same output setup as practice. Let the microphone hear the speakers, or
hold a headphone earcup near it, stay quiet, and keep the tab visible. Ten short
sine tones play over roughly 13 seconds. The regular flute listener and paused
transport stop before the test; calibration never records practice judgements.
Click **Listen to flute** afterward to resume normal input.

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

The playhead controls include loop, tempo (40–180 BPM), and flute listening next
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
