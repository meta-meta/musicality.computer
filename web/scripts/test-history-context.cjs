const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const built=esbuild.buildSync({stdin:{contents:`
  export * from './src/lumatone/practice/practiceHistory.ts';
  export * from './src/lumatone/practice/historyContext.ts';
  export * from './src/components/visibleSpanLabelCenter.ts';
  export * from './src/components/ViewportCenteredLabel.tsx';
  export {InstrumentIcon} from './src/lumatone/practice/InstrumentIcon.tsx';
  export {PracticeHistoryGraph} from './src/lumatone/practice/PracticeHistoryGraph.tsx';
  export {PracticeHistoryPanel} from './src/lumatone/practice/PracticeHistoryPanel.tsx';
  export {system} from './src/theme.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'cjs',platform:'node',external:['react','react-dom/*','react/jsx-runtime','@chakra-ui/react','@emotion/react','next-themes'],
  define:{'import.meta.env.BASE_URL':JSON.stringify('/')}});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const api=mod.exports;
const base={id:'legacy',piece:'stella-by-starlight',tonic:10,startedAt:'2026-11-02T12:00:00.000Z',updatedAt:'2026-11-02T12:01:00.000Z',endedAt:'2026-11-02T12:01:00.000Z',
  settings:{bpm:80,transpose:2,keyTranspose:2,freeTime:false,allowLowOctaveUp:true,loop:false,loopStart:null,loopEnd:null,latencyMs:0},judgements:[]};
const legacy={...api.emptyHistory(),sessions:[base]};
const restored=api.parsePracticeHistory(JSON.stringify(legacy));
assert.equal(restored.sessions[0].settings.instrumentId,undefined);
assert.equal(api.historySessionContext(restored.sessions[0],'jazz').instrumentLabel,'Instrument not recorded');
assert.equal(api.historySessionContext(restored.sessions[0],'jazz').writtenKey,null);
assert.equal(api.mergePracticeHistories(legacy,restored).sessions.length,1,'Older exports merge without changing unknown instrument metadata');
const modern={...base,id:'tenor',quality:'major',settings:{...base.settings,instrumentId:'tenor-sax'}};
const history={...api.emptyHistory(),sessions:[modern,base]};
const imported=api.parsePracticeHistory(JSON.stringify(history));
assert.equal(imported.sessions[0].settings.instrumentId,'tenor-sax');
assert.equal(imported.sessions[0].quality,'major');
const context=api.historySessionContext(imported.sessions[0],'jazz');
assert.equal(context.concertKey,'C major');
assert.equal(context.writtenKey,'D major');
assert.equal(context.shortInstrument,'Tenor');
assert.equal(api.historySessionContext(modern,'dozenal').concertKey,'0 major');
assert.equal(api.historySessionContext(modern,'dozenal').writtenKey,'2 major');
assert.equal(api.mergePracticeHistories(history,imported).sessions.length,2);
assert.throws(()=>api.mergePracticeHistories(history,{...imported,sessions:[{...modern,settings:{...modern.settings,instrumentId:'flute'}}]}),/conflicts/);
const future={...modern,settings:{...modern.settings,instrumentId:'future-instrument'}};
assert.ok(api.historySessionContext(api.parsePracticeHistory(JSON.stringify({...history,sessions:[future]})).sessions[0],'jazz').instrumentLabel.includes('Unknown instrument'));
assert.throws(()=>api.parsePracticeHistory(JSON.stringify({...history,sessions:[{...modern,settings:{...modern.settings,instrumentId:42}}]})),/Invalid history text/);
const minor={...modern,piece:'openbook-fixture',tonic:9,quality:'minor',settings:{...modern.settings,keyTranspose:0,instrumentId:'alto-sax'}};
assert.equal(api.historySessionContext(minor,'jazz').concertKey,'A minor');
assert.equal(api.historySessionContext(minor,'jazz').writtenKey,'F♯ minor');
const noQuality={...minor,quality:undefined};
assert.equal(api.historySessionContext(noQuality,'jazz').concertKey,'A','Do not invent major/minor for old imported sessions');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {ChakraProvider}=require('@chakra-ui/react');
const html=renderToStaticMarkup(React.createElement(ChakraProvider,{value:api.system},React.createElement(api.PracticeHistoryGraph,
  {sessions:imported.sessions,selected:null,selectedPass:null,mode:'jazz',onReview:()=>{}})));
assert.ok(html.includes('data-history-instrument="tenor"'));
assert.ok(html.includes('data-history-key="tenor"'));
assert.ok(html.includes('Instrument not recorded'));
assert.ok(html.includes('concert C major'));
assert.ok(html.includes('written D major'));
assert.ok(html.includes('Tenor'));
const panel=renderToStaticMarkup(React.createElement(ChakraProvider,{value:api.system},React.createElement(api.PracticeHistoryPanel,
  {data:imported,error:'',recovery:'',activeId:null,running:false,mode:'jazz',onExport:()=>'',onImport:()=>({sessions:0,total:0})})));
assert.ok(panel.includes('data-history-context="tenor"'));
assert.ok(panel.includes('Tenor saxophone in B♭'));
assert.ok(panel.includes('Concert C major'));
assert.ok(panel.includes('Written D major'));
console.log('History instrument/key metadata passes round-trip, legacy compatibility, merge conflicts, unknown instruments, minor keys, Jazz/Dozenal labels, and graph lane rendering.');

const enriched={...base,settings:{...base.settings,instrumentId:'tenor-sax'}};
const mergedLegacy=api.mergePracticeHistories(legacy,{...legacy,sessions:[enriched]});
assert.equal(mergedLegacy.sessions[0].settings.instrumentId,'tenor-sax','Import may identify an instrument missing from an older session');
assert.deepEqual(mergedLegacy.sessions[0].judgements,base.judgements);
assert.equal(api.mergePracticeHistories(mergedLegacy,legacy).sessions[0].settings.instrumentId,'tenor-sax','Older exports must not erase instrument metadata');
assert.equal(api.mergePracticeHistories(mergedLegacy,{...legacy,sessions:[enriched]}).sessions.length,1,'Metadata enrichment is idempotent');
console.log('Missing-instrument enrichment imports without duplicate sessions or loss of existing instrument metadata.');

const identical={...modern,id:'tenor-2',settings:{...modern.settings,transpose:14}};
const changedKey={...modern,id:'different-key',settings:{...modern.settings,keyTranspose:1}};
const changedInstrument={...modern,id:'flute',settings:{...modern.settings,instrumentId:'flute'}};
const groups=api.consecutiveHistoryContexts([modern,identical,changedKey,modern,changedInstrument].map(session=>({session})));
assert.deepEqual(groups.map(group=>[group.start,group.end]),[[0,2],[2,3],[3,4],[4,5]]);
assert.deepEqual(api.consecutiveHistoryContexts([]),[]);
assert.equal(api.consecutiveHistoryContexts([{session:base},{session:{...base,id:'legacy2'}}]).length,1,'Consecutive unknown instruments may share a label');
assert.equal(api.consecutiveHistoryContexts([{session:modern},{session:{...modern,quality:'minor'}}]).length,2,'Major/minor must not collapse together');
const groupedHtml=renderToStaticMarkup(React.createElement(ChakraProvider,{value:api.system},React.createElement(api.PracticeHistoryGraph,
  {sessions:[modern,identical,changedKey,changedInstrument],selected:null,selectedPass:null,mode:'jazz',onReview:()=>{}})));
assert.equal((groupedHtml.match(/data-history-column=/g)||[]).length,4,'Every judgement column remains intact');
assert.equal((groupedHtml.match(/data-history-context-group=/g)||[]).length,3,'Only adjacent matching metadata collapses');
assert.ok(groupedHtml.includes('Tenor ×2'));
const families={flute:'flute',piccolo:'flute','bass-flute':'flute','alto-flute':'flute',bb:'clarinet','a-clarinet':'clarinet',
  'alto-sax':'saxophone','tenor-sax':'saxophone','soprano-sax':'saxophone','baritone-sax':'saxophone','bb-trumpet':'trumpet',horn:'horn'};
for(const [id,family] of Object.entries(families)) {
  const icon=renderToStaticMarkup(React.createElement(api.InstrumentIcon,{instrumentId:id}));
  assert.ok(icon.includes(`data-instrument-icon="${family}"`));
  assert.ok(icon.includes('aria-hidden="true"'));
  assert.ok(icon.includes('<path'));
  assert.ok(!icon.includes('<text'),'Instrument drawings must not rely on font glyphs');
}
assert.ok(renderToStaticMarkup(React.createElement(api.InstrumentIcon,{instrumentId:'future-instrument'})).includes('data-instrument-icon="unknown"'));
console.log('SVG instrument families and consecutive metadata spans pass, with original session/pass columns preserved.');

const center=api.visibleSpanLabelCenter;
assert.equal(center(100,1000,0,600,80),350,'Center the intersecting part when the group extends off the right');
assert.equal(center(100,1000,400,800,80),600,'Track the viewport through a long group');
assert.equal(center(100,1000,800,1200,80),900,'Center the visible tail');
assert.equal(center(100,200,0,600,80),150,'Fully visible labels retain their natural midpoint');
assert.equal(center(100,200,195,600,80),160,'A nearly hidden label stays inside its group');
assert.equal(center(100,200,0,105,80),140,'Clamp the leading edge without bleeding into the previous group');
assert.equal(center(100,200,200,600,80),null,'Offscreen groups have no label');
assert.equal(center(100,200,0,100,80),null);
assert.equal(center(100,120,0,600,80),110,'Narrow groups remain centered');
assert.ok(groupedHtml.includes('data-history-centered-label="instrument"'));
assert.ok(groupedHtml.includes('data-history-centered-label="key"'));
console.log('Viewport-centered metadata labels pass: visible intersections, scrolling, clipped edges, narrow groups and offscreen groups.');

const {useRef}=React;
function ReusableLabelExample() {
  const viewportRef=useRef(null),svgRef=useRef(null);
  return React.createElement(api.ViewportCenteredLabels,{viewportRef,svgRef},
    React.createElement('div',{ref:viewportRef},React.createElement('svg',{ref:svgRef,viewBox:'100 0 600 100'},
      React.createElement(api.ViewportCenteredLabel,{start:200,end:500,labelWidth:60},
        React.createElement('text',{x:0,y:20,textAnchor:'middle'},'Any label')))));
}
const reusable=renderToStaticMarkup(React.createElement(ReusableLabelExample));
assert.ok(reusable.includes('data-viewport-centered-label=""'));
assert.ok(reusable.includes('translate(350,0)'));
assert.ok(reusable.includes('Any label'));
assert.throws(()=>renderToStaticMarkup(React.createElement(api.ViewportCenteredLabel,{start:0,end:100,labelWidth:20})),/requires ViewportCenteredLabels/);
console.log('Reusable viewport-centered SVG labels render independently of practice history.');
