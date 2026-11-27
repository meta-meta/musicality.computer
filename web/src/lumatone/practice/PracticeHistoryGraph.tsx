import {Box, Flex, Text} from '@chakra-ui/react';
import {memo, useMemo, useRef, useState} from 'react';
import {ViewportCenteredLabel, ViewportCenteredLabels} from '../../components/ViewportCenteredLabel.tsx';
import {InstrumentIcon} from './InstrumentIcon.tsx';
import {consecutiveHistoryContexts, historySessionContext} from './historyContext.ts';
import {pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import {getNoteColorHsl} from '../colors.ts';
import {usePracticeScore} from './PracticeScoreContext.tsx';
import type {PracticeSession} from './practiceHistory.ts';
import type {PracticeSection} from './practiceSections.ts';
import {historyBarRanges, historyCoverage, historyMeanError, historyMetricCounts, historyRate, reviewHistoryPasses, reviewHistorySession} from './historyReview.ts';
import type {HistoryBar, HistoryMetric, HistoryRange, SessionReview} from './historyReview.ts';
import type {PracticeScore} from './scores.ts';
import {oneOf, useSavedState} from './useSavedState.ts';

// What one row of the map stands for. Bars cover the whole piece; sections are
// the saved practice sections; notes are the melody notes of one section.
type Resolution = 'section' | 'bar' | 'note';
// 'split' shows pitch and timing together in each cell.
type CellMetric = HistoryMetric | 'split';
const keyColors = Array.from({length:12},(_,note)=>getNoteColorHsl(60+note).range('white')(.35).toString({format:'hex'}));
type Cached = {score:PracticeScore;rows:HistoryRange[];review:SessionReview;passes?:ReturnType<typeof reviewHistoryPasses>};
const cached = new WeakMap<PracticeSession,Cached>();
function review(score:PracticeScore,session:PracticeSession,rows:HistoryRange[]) {
  const hit=cached.get(session);
  if (hit?.score===score && hit.rows===rows) return hit.review;
  const value=reviewHistorySession(score,session,rows);cached.set(session,{score,rows,review:value});return value;
}
function passReviews(score:PracticeScore,session:PracticeSession,rows:HistoryRange[]) {
  review(score,session,rows);
  const entry=cached.get(session)!;
  entry.passes??=reviewHistoryPasses(score,session,rows);
  return entry.passes;
}
const dateLabel=(value:string)=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
const color=(rate:number|null)=>rate===null?'var(--chakra-colors-bg-muted)':rate>=.85?'var(--chakra-colors-green-600)':rate>=.65?'var(--chakra-colors-orange-500)':'var(--chakra-colors-red-500)';
const metricLabel={pitch:'First-try pitch',timing:'On-time entrances',both:'Full hits',split:'Full hits'};
const rateLabel=(rate:number|null)=>rate===null?'No judged attempts':`${Math.round(rate*100)}%`;
const timingLabel=(row:HistoryBar)=>{
  const mean=historyMeanError(row);
  return mean===null?'timing not scored':Math.abs(mean)<5?'on the beat on average':`${Math.round(Math.abs(mean))} ms ${mean<0?'early':'late'} on average`;
};
// Timing error that puts the tick at the edge of a note cell.
const TICK_RANGE_MS=150;

export const PracticeHistoryGraph=memo(function PracticeHistoryGraph({sessions,selected,selectedPass,mode = 'dozenal',onReview,sections = [],selectedSection = null}: {
  mode?:LabelMode; sessions:PracticeSession[];selected:string|null;selectedPass:number|null;onReview:(id:string,bar:number|null,cycle?:number|null)=>void;
  // Saved sections of this tune, and the one selected for practice, if any.
  sections?:PracticeSection[]; selectedSection?:string|null;
}) {
  const {score}=usePracticeScore();
  const [hideIncomplete,setHideIncomplete]=useState(false);
  const [expandPasses,setExpandPasses]=useState(false);
  const [metric,setMetric]=useSavedState<CellMetric>('historyMetric','split',oneOf('pitch','timing','both','split'));
  const [wanted,setResolution]=useSavedState<Resolution>('historyRows','bar',oneOf('section','bar','note'));
  // '' follows the section selected for practice; 'whole' is every note of the tune.
  const [noteRange,setNoteRange]=useState('');
  const [hover,setHover]=useState<{column:number;bar:number|null}|null>(null);
  const lineMetric:HistoryMetric=metric==='split'?'both':metric;
  const ordered=useMemo(()=>[...sections].sort((a,b)=>a.start-b.start||a.end-b.end),[sections]);
  const resolution:Resolution=wanted==='section'&&!ordered.length?'bar':wanted;
  const noteSection=noteRange==='whole'?null:ordered.find(section=>section.id===(noteRange||selectedSection))??ordered[0]??null;
  const barRanges=useMemo(()=>historyBarRanges(score),[score]);
  const allRows=useMemo(():(HistoryRange&{short:string})[]=>resolution==='bar'
    ? barRanges.map(bar=>({...bar,short:bar.start<0?'Pickup':bar.label.replace('Bar ','')}))
    : resolution==='section' ? ordered.map(section=>({start:section.start,end:section.end,label:section.name,short:section.name}))
    : score.melody.filter(note=>!noteSection||(note.start>=noteSection.start-1e-7&&note.start<noteSection.end-1e-7)).map((note,index)=>{
      // Dozenal pitch names are digits, so the octave stays out of the short label.
      const name=pitchLabel(note.note,mode);
      return {start:note.start,end:note.start+note.duration,label:`Note ${index+1}: ${name}, octave ${Math.floor(note.note/12)-1}, at ${note.location}`,short:`${index+1} · ${name}`};
    }),[resolution,barRanges,ordered,score.melody,noteSection,mode]);
  // A whole tune of notes would be unreadable; show the first rows and say so.
  const rows=useMemo(()=>allRows.length>160?allRows.slice(0,160):allRows,[allRows]);
  const orderedSessions=useMemo(()=>sessions.filter(session=>session.piece===score.id)
    .sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)),[sessions,score.id]);
  const contexts=useMemo(()=>new Map(orderedSessions.map(session=>[session.id,historySessionContext(session,mode)])),[orderedSessions,mode]);
  const allColumns=useMemo(()=>orderedSessions.flatMap((session,i)=>expandPasses
    ? passReviews(score,session,rows).slice().reverse().map(pass=>({session,sessionNumber:orderedSessions.length-i,id:`${session.id}:pass:${pass.cycle}`,cycle:pass.cycle as number|null,startedAt:pass.startedAt,review:pass.review}))
    : [{session,sessionNumber:orderedSessions.length-i,id:session.id,cycle:null as number|null,startedAt:session.startedAt,review:review(score,session,rows)}]),[orderedSessions,score,expandPasses,rows]);
  // Outside the whole-piece view, a session that never touched these rows is left out.
  const relevant=useMemo(()=>resolution==='bar'?allColumns:allColumns.filter(column=>column.review.bars.some(bar=>bar.attempts>0)),[allColumns,resolution]);
  const columns=useMemo(()=>hideIncomplete?relevant.filter(column=>historyCoverage(column.review)>=.5):relevant,[relevant,hideIncomplete]);
  const contextGroups=useMemo(()=>consecutiveHistoryContexts(columns),[columns]);
  const sectionGroups=useMemo(()=>{
    const groups:{start:number;end:number;id:string;name:string}[]=[];
    columns.forEach((column,i)=>{
      const {sectionId,sectionName}=column.session.settings;
      if (!sectionId) return;
      const last=groups[groups.length-1];
      if (last&&last.end===i&&last.id===sectionId) last.end=i+1;
      else groups.push({start:i,end:i+1,id:sectionId,name:sectionName??'Section'});
    });
    return groups;
  },[columns]);
  const left=resolution==='bar'?72:112;
  const width=Math.max(640,columns.length*44+left+22);
  const viewportRef=useRef<HTMLDivElement>(null),svgRef=useRef<SVGSVGElement>(null);
  if (!orderedSessions.length) return null;
  const step=(width-left-20)/Math.max(1,columns.length);
  const proportional=resolution==='bar';
  const rowHeight=resolution==='note'?16:30;
  const mapTop=250,mapHeight=proportional?Math.min(600,Math.max(240,rows.length*11)):Math.max(48,rows.length*rowHeight),bottom=mapTop+mapHeight;
  const x=(index:number)=>left+(index+.5)*step;
  const y=(beat:number)=>mapTop+(beat-score.start)/(score.end-score.start)*mapHeight;
  const rowTop=(index:number)=>proportional?y(rows[index].start):mapTop+index*rowHeight;
  const rowBottom=(index:number)=>proportional?y(rows[index].end):mapTop+(index+1)*rowHeight;
  const barOf=(index:number)=>resolution==='bar'?index:Math.max(0,barRanges.findIndex(bar=>rows[index].start>=bar.start-1e-7&&rows[index].start<bar.end-1e-7));
  const paths:string[]=[];let path='';
  columns.forEach((column,i)=>{
    const value=historyRate(column.review.total,lineMetric);
    if (value===null) {if(path)paths.push(path);path='';return;}
    path+=`${path?' L':'M'} ${x(i)} ${110-value*90}`;
  });
  if(path)paths.push(path);
  const active=hover && columns[hover.column];
  const activeRow=active && hover.bar!==null ? active.review.bars[hover.bar] : null;
  const activeCounts=active && (activeRow??active.review.total);
  const rowKind=resolution==='bar'?'bar of the whole piece':resolution==='section'?'saved section':noteSection?`note of ${noteSection.name}`:'melody note';
  return <Box data-testid="practice-history-graph" data-history-resolution={resolution}>
    <Flex gap={3} wrap="wrap" align="center" mb={2}>
      <label>Rows <select aria-label="History rows" value={resolution} onChange={event=>{setResolution(event.target.value as Resolution);setHover(null);}}>
        <option value="section" disabled={!ordered.length}>Sections{ordered.length?'':' (none saved)'}</option><option value="bar">Bars</option><option value="note">Notes</option>
      </select></label>
      {resolution==='note' && <label>of <select aria-label="Notes of section" value={noteSection?noteSection.id:'whole'} onChange={event=>{setNoteRange(event.target.value);setHover(null);}}>
        {ordered.map(section=><option key={section.id} value={section.id}>{section.name}</option>)}<option value="whole">Whole tune</option>
      </select></label>}
      <label>Cells <select aria-label="History graph metric" value={metric} onChange={event=>setMetric(event.target.value as CellMetric)}>
        <option value="split">Pitch + timing</option><option value="pitch">First-try pitch</option><option value="timing">On-time entrances</option><option value="both">Full hits</option>
      </select></label>
      <Text fontSize="xs" color="fg.muted">{score.title} · {orderedSessions.length} sessions{expandPasses ? ` · ${columns.length} of ${allColumns.length} recorded passes shown` : columns.length!==orderedSessions.length ? ` · ${columns.length} shown` : ""} · newest → oldest</Text>
      <label><input type="checkbox" checked={expandPasses} onChange={event=>{setExpandPasses(event.target.checked);setHover(null);}}/> Show individual passes</label>
      <label><input aria-label="Hide history below 50% judged" type="checkbox" checked={hideIncomplete} onChange={event=>{setHideIncomplete(event.target.checked);setHover(null);}}/> Hide sessions/passes with &lt;50% judged</label>
    </Flex>
    <Text fontSize="xs" color="fg.muted">{expandPasses ? 'Each column is one recorded pass, grouped by session, aligned with its point above. First judgements are shown without averaging passes together; passes with no judgements are not recorded.' : 'Each column is one session, aligned with its point above.'} Consecutive columns with the same instrument and concert key share one label span in both lanes; the Section lane marks sessions played in a saved section; session/pass columns stay separate; hover or focus for the written key. ? means the instrument was not recorded. Each map row is a {rowKind}.{resolution==='bar'?'':' Sessions that did not touch these rows are left out.'} Scroll horizontally through the full history. Click a point for the session review, or a cell to review its bar.</Text>
    {allRows.length>rows.length&&<Text fontSize="xs" color="orange.500">Showing the first {rows.length} of {allRows.length} notes. Choose a section to see its notes.</Text>}
    {hideIncomplete&&<Text fontSize="xs" color="fg.muted">Coverage counts distinct melody attacks judged across the rows shown, regardless of success. Repeating a small loop doesn’t increase coverage. This filters chart columns; the history table remains available.</Text>}
    {!columns.length&&<Text fontSize="sm" mt={3}>{hideIncomplete ? `No ${expandPasses?'passes':'sessions'} have at least 50% of these rows judged. Turn off the coverage filter to see partial practice.` : 'No recorded practice touches these rows yet.'}</Text>}
    <ViewportCenteredLabels viewportRef={viewportRef} svgRef={svgRef}>
    <Box ref={viewportRef} data-testid="history-graph-viewport" overflowX="auto" mt={2} display={columns.length?'block':'none'}>
      <svg ref={svgRef} role="group" aria-label="Session progress and judgement map" viewBox={`0 0 ${width} ${bottom+46}`}
        style={{width:'100%',minWidth:width,display:'block',fontFamily:'inherit'}}>
        <style>{'.history-session:focus {outline: none} .history-session:focus-visible .history-column-frame {stroke: currentColor; stroke-width:2}'}</style>
        <text x={8} y={24} style={{fontSize:11}} fill="currentColor">100%</text><text x={22} y={114} style={{fontSize:11}} fill="currentColor">0%</text>
        {[20,65,110].map(at=><path key={at} d={`M ${left} ${at} H ${width-20}`} stroke="currentColor" opacity={.12}/>)}
        {paths.map((d,i)=><path key={i} d={d} fill="none" stroke="var(--chakra-colors-cyan-600)" strokeWidth={2}/>)}
        <text x={6} y={169} style={{fontSize:9}} fill="currentColor">Instrument</text>
        <text x={6} y={193} style={{fontSize:9}} fill="currentColor">Concert key</text>
        <text x={6} y={219} style={{fontSize:9}} fill="currentColor">Section</text>
        <text x={6} y={mapTop-12} style={{fontSize:11}} fill="currentColor">{resolution==='bar'?'Bar':resolution==='section'?'Section':'Note'}</text>
        {rows.map((row,i)=><g key={`${row.start}:${row.end}:${i}`}>
          <path d={`M ${left} ${rowTop(i)} H ${width-20}`} stroke="currentColor" opacity={.1}/>
          {(!proportional || i%Math.ceil(rows.length/26)===0 || row.start<0) && <text data-history-row-label={i} x={left-8} y={proportional?rowTop(i)+Math.min(10,(rowBottom(i)-rowTop(i))/2+4):(rowTop(i)+rowBottom(i))/2+3.5} textAnchor="end" style={{fontSize:10}} fill="currentColor">
            <title>{row.label}</title>{row.short.length>16?`${row.short.slice(0,15)}…`:row.short}</text>}
        </g>)}
        {columns.map((column,i)=>{
          const rate=historyRate(column.review.total,lineMetric);
          const context=contexts.get(column.session.id)!;
          const section=column.session.settings.sectionName;
          const label=`${context.label}, Session ${column.sessionNumber}${column.cycle===null?'':`, Pass ${column.cycle}`}, ${dateLabel(column.startedAt)}, ${column.session.settings.bpm} BPM, ${column.session.settings.freeTime?'free time':'timed'}${section?`, section ${section}`:''}, ${metricLabel[metric]} ${rateLabel(rate)}`;
          const activeColumn=(column.session.id===selected && (!expandPasses || selectedPass===null || selectedPass===column.cycle)) || hover?.column===i;
          const cellLeft=x(i)-step/2+3,cellWidth=step-6;
          return <g key={column.id} role="button" tabIndex={0} className="history-session"
            aria-label={`Review ${label}`} data-history-column={column.id} data-history-pass={column.cycle??undefined} data-history-session-id={column.session.id}
            onMouseEnter={()=>setHover({column:i,bar:null})} onMouseLeave={()=>setHover(null)}
            onFocus={()=>setHover({column:i,bar:null})} onBlur={()=>setHover(null)}
            onClick={()=>onReview(column.session.id,null,column.cycle)}
            onKeyDown={event=>{
              if(event.key==='ArrowDown'||event.key==='ArrowUp') {
                event.preventDefault();event.stopPropagation();
                setHover(previous=>({column:i,bar:Math.max(0,Math.min(rows.length-1,(previous?.column===i?previous.bar??-1:-1)+(event.key==='ArrowDown'?1:-1)))}));
              } else if(event.key==='Enter'||event.key===' ') {
                event.preventDefault();event.stopPropagation();onReview(column.session.id,hover?.column===i&&hover.bar!==null?barOf(hover.bar):null,column.cycle);
              }
            }} style={{cursor:'pointer'}}>
            <title>{label}</title>
            {expandPasses && i>0 && columns[i-1].session.id!==column.session.id && <path d={`M ${x(i)-step/2} 10 V ${bottom+35}`} stroke="currentColor" opacity={.3} strokeDasharray="3 3" pointerEvents="none"/>}
            <rect className="history-column-frame" x={x(i)-step/2+1} y={10} width={step-2} height={bottom-8} rx={3}
              fill={activeColumn?'var(--chakra-colors-cyan-600)':'transparent'} fillOpacity={activeColumn ? 0.08 : 0}
              stroke={activeColumn?'var(--chakra-colors-cyan-600)':'transparent'} pointerEvents="all"/>
            {rate!==null && <circle data-history-point={column.id} cx={x(i)} cy={110-rate*90} r={4} fill="var(--chakra-colors-cyan-600)"/>}
            <text x={x(i)} y={140} textAnchor="middle" style={{fontSize:10}} fill="currentColor">{expandPasses ? `P${column.cycle}` : column.sessionNumber}</text>
            {column.review.bars.map((bar,j)=>{
              const [success,total]=historyMetricCounts(bar,lineMetric);
              const detail=`${label}. ${bar.label}: ${success}/${total} successful attempts; pitch ${bar.pitch}/${bar.attempts}, ${timingLabel(bar)}; ${bar.observed}/${bar.notes} melody attacks judged.`;
              const top=rowTop(j)+.5,height=Math.max(.3,rowBottom(j)-rowTop(j)-1);
              const mean=historyMeanError(bar);
              return <g key={`${bar.start}:${j}`} data-history-cell={`${column.id}:${j}`} data-cell-pitch={bar.attempts?bar.pitch/bar.attempts:undefined} data-cell-timing={mean??undefined}
                onMouseEnter={event=>{event.stopPropagation();setHover({column:i,bar:j});}}
                onClick={event=>{event.stopPropagation();onReview(column.session.id,barOf(j),column.cycle);}}>
                <title>{detail}</title>
                {metric!=='split' || !bar.attempts
                  ? <rect x={cellLeft} y={top} width={cellWidth} height={height} rx={1} fill={color(historyRate(bar,lineMetric))}/>
                  : resolution==='note'
                    // One note: the fill is pitch, and a tick shows how early or late it was.
                    ? <>
                      <rect x={cellLeft} y={top} width={cellWidth} height={height} rx={1} fill={color(historyRate(bar,'pitch'))}/>
                      {mean!==null && <>
                        <path d={`M ${x(i)} ${top+1} V ${top+height-1}`} stroke="#fff" strokeOpacity={.35} strokeWidth={1}/>
                        <rect data-history-tick={mean} x={x(i)+Math.max(-1,Math.min(1,mean/TICK_RANGE_MS))*(cellWidth/2-2.5)-1.5} y={top+1} width={3} height={Math.max(.3,height-2)} rx={1} fill="#fff" stroke="#111" strokeWidth={.6}/>
                      </>}
                    </>
                    // Many notes: pitch on the left half, timing on the right.
                    : <>
                      <rect data-history-half="pitch" x={cellLeft} y={top} width={cellWidth/2-.5} height={height} rx={1} fill={color(historyRate(bar,'pitch'))}/>
                      <rect data-history-half="timing" x={cellLeft+cellWidth/2+.5} y={top} width={cellWidth/2-.5} height={height} rx={1} fill={color(historyRate(bar,'timing'))}/>
                    </>}
                {hover?.column===i && hover.bar===j && <rect x={cellLeft} y={top} width={cellWidth} height={height} rx={1} fill="none" stroke="currentColor"/>}
              </g>;
            })}
            <text x={x(i)} y={bottom+18} textAnchor="middle" style={{fontSize:10}} fill="currentColor">{expandPasses ? `S${column.sessionNumber}/P${column.cycle}` : column.sessionNumber}</text>
            <text x={x(i)} y={bottom+33} textAnchor="middle" style={{fontSize:9}} fill="currentColor">{new Date(column.startedAt).toLocaleDateString(undefined,{month:'numeric',day:'numeric'})}</text>
          </g>;
        })}
        <g pointerEvents="none" aria-hidden="true">
          {contextGroups.map(group=>{
            const context=contexts.get(group.session.id)!;
            const start=x(group.start)-step/2+3, span=(group.end-group.start)*step-6;
            const count=group.end-group.start;
            const name=context.shortInstrument==='?'?'Not recorded':context.shortInstrument;
            const label=count>1?`${name} ×${count}`:name;
            const showText=span>=label.length*5+28;
            const contentWidth=showText?label.length*5+20:16;
            const id=columns[group.start].id;
            return <g key={id} data-history-context-group={id} data-group-start={group.start} data-group-end={group.end}>
              <g data-history-instrument={id}>
                <rect x={start} y={153} width={span} height={22} rx={2} fill="var(--chakra-colors-bg-muted)"/>
                <ViewportCenteredLabel smoothingMs={200} data-history-centered-label="instrument" start={start} end={start+span} labelWidth={contentWidth}>
                  <InstrumentIcon instrumentId={group.session.settings.instrumentId} size={16} x={-contentWidth/2} y={156}/>
                  {showText&&<text x={-contentWidth/2+20} y={168} style={{fontSize:9}} fill="currentColor">{label}</text>}
                </ViewportCenteredLabel>
              </g>
              <g data-history-key={id}>
                <rect x={start} y={179} width={span} height={22} rx={2} fill={keyColors[context.concertTonic]} fillOpacity={.25}/>
                <ViewportCenteredLabel smoothingMs={200} data-history-centered-label="key" start={start} end={start+span} labelWidth={context.shortKey.length*5.5}>
                  <text x={0} y={194} textAnchor="middle" style={{fontSize:9}} fill="currentColor">{context.shortKey}</text>
                </ViewportCenteredLabel>
              </g>
            </g>;
          })}
          {sectionGroups.map(group=>{
            const start=x(group.start)-step/2+3, span=(group.end-group.start)*step-6;
            const room=Math.max(1,Math.floor(span/5.5));
            const text=group.name.length>room?`${group.name.slice(0,Math.max(1,room-1))}…`:group.name;
            return <g key={`${group.start}:${group.id}`} data-history-section={group.id} data-group-start={group.start} data-group-end={group.end}>
              <rect x={start} y={205} width={span} height={22} rx={2} fill="var(--chakra-colors-cyan-600)" fillOpacity={.22} stroke="var(--chakra-colors-cyan-600)" strokeOpacity={.6}/>
              <ViewportCenteredLabel smoothingMs={200} data-history-centered-label="section" start={start} end={start+span} labelWidth={text.length*5.5}>
                <text x={0} y={220} textAnchor="middle" style={{fontSize:9}} fill="currentColor">{text}</text>
              </ViewportCenteredLabel>
            </g>;
          })}
        </g>
      </svg>
    </Box>
    </ViewportCenteredLabels>
    <Flex gap={3} wrap="wrap" fontSize="xs" mt={2}>
      {[[.9,'85–100%'],[.75,'65–84%'],[.3,'Below 65%'],[null,'No judgements / timing not scored']].map(([value,label])=><Flex key={String(label)} gap={1} align="center"><Box width="10px" height="10px" bg={color(value as number|null)} borderWidth="1px"/>{label}</Flex>)}
      {metric==='split' && <Text color="fg.muted">{resolution==='note' ? `Fill: pitch. White tick: timing, left of centre early, right late; the cell edge is ${TICK_RANGE_MS} ms or more.` : 'Left half: pitch. Right half: on-time entrances.'}</Text>}
    </Flex>
    <Text fontSize="xs" minHeight="3em" mt={2} data-testid="history-map-detail">
      {active && activeCounts && hover ? `${dateLabel(active.startedAt)} · ${contexts.get(active.session.id)!.label} · ${active.session.settings.bpm} BPM · ${active.session.settings.freeTime?'Free time':'Timed'} ${active.session.settings.sectionName?`· ${active.session.settings.sectionName} `:''}${active.cycle===null?'':`· Pass ${active.cycle} `}· ${activeRow?activeRow.label:(expandPasses?'Whole pass':'Whole session')} · ${historyMetricCounts(activeCounts,lineMetric).join('/')} ${metricLabel[metric].toLowerCase()} (${rateLabel(historyRate(activeCounts,lineMetric))})${activeRow?` · pitch ${activeRow.pitch}/${activeRow.attempts} · ${timingLabel(activeRow)}`:''}`
        : 'Hover for details. Tab to a session; ↑/↓ chooses a row, Enter opens its review. Grey is unjudged, never a failed attempt. Cells summarize first judgements per note/pass, not held-note duration.'}
    </Text>
    {columns.some(column=>column.review.stale>0) && <Text fontSize="xs" color="fg.muted">Judgements that no longer match the current score are omitted from this graph.</Text>}
  </Box>;
});
