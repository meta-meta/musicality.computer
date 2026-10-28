import {Box, Flex, Text} from '@chakra-ui/react';
import {memo, useMemo, useState} from 'react';
import {usePracticeScore} from './PracticeScoreContext.tsx';
import type {PracticeSession} from './practiceHistory.ts';
import {historyMetricCounts, historyRate, reviewHistoryPasses, reviewHistorySession} from './historyReview.ts';
import type {HistoryMetric, SessionReview} from './historyReview.ts';
import type {PracticeScore} from './scores.ts';

const cached = new WeakMap<PracticeSession,{score:PracticeScore;review:SessionReview;passes?:ReturnType<typeof reviewHistoryPasses>}>();
function review(score:PracticeScore,session:PracticeSession) {
  const hit=cached.get(session);
  if (hit?.score===score) return hit.review;
  const value=reviewHistorySession(score,session);cached.set(session,{score,review:value});return value;
}
function passReviews(score:PracticeScore,session:PracticeSession) {
  review(score,session);
  const entry=cached.get(session)!;
  entry.passes??=reviewHistoryPasses(score,session);
  return entry.passes;
}
const dateLabel=(value:string)=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
const color=(rate:number|null)=>rate===null?'var(--chakra-colors-bg-muted)':rate>=.85?'var(--chakra-colors-green-600)':rate>=.65?'var(--chakra-colors-orange-500)':'var(--chakra-colors-red-500)';
const metricLabel={pitch:'First-try pitch',timing:'On-time entrances',both:'Full hits'};
const rateLabel=(rate:number|null)=>rate===null?'No judged attempts':`${Math.round(rate*100)}%`;

export const PracticeHistoryGraph=memo(function PracticeHistoryGraph({sessions,selected,selectedPass,onReview}: {
  sessions:PracticeSession[];selected:string|null;selectedPass:number|null;onReview:(id:string,bar:number|null,cycle?:number|null)=>void;
}) {
  const {score}=usePracticeScore();
  const [expandPasses,setExpandPasses]=useState(false);
  const [metric,setMetric]=useState<HistoryMetric>('pitch');
  const [hover,setHover]=useState<{column:number;bar:number|null}|null>(null);
  const orderedSessions=useMemo(()=>sessions.filter(session=>session.piece===score.id)
    .sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)),[sessions,score.id]);
  const columns=useMemo(()=>orderedSessions.flatMap((session,i)=>expandPasses
    ? passReviews(score,session).slice().reverse().map(pass=>({session,sessionNumber:orderedSessions.length-i,id:`${session.id}:pass:${pass.cycle}`,cycle:pass.cycle as number|null,startedAt:pass.startedAt,review:pass.review}))
    : [{session,sessionNumber:orderedSessions.length-i,id:session.id,cycle:null as number|null,startedAt:session.startedAt,review:review(score,session)}]),[orderedSessions,score,expandPasses]);
  if (!orderedSessions.length) return null;
  const bars=columns[0]?.review.bars??review(score,orderedSessions[0]).bars;
  const width=Math.max(640,columns.length*44+94),left=72,step=(width-left-20)/Math.max(1,columns.length);
  const mapTop=160,mapHeight=Math.min(600,Math.max(240,bars.length*11)),bottom=mapTop+mapHeight;
  const x=(index:number)=>left+(index+.5)*step;
  const y=(beat:number)=>mapTop+(beat-score.start)/(score.end-score.start)*mapHeight;
  const paths:string[]=[];let path='';
  columns.forEach((column,i)=>{
    const value=historyRate(column.review.total,metric);
    if (value===null) {if(path)paths.push(path);path='';return;}
    path+=`${path?' L':'M'} ${x(i)} ${110-value*90}`;
  });
  if(path)paths.push(path);
  const active=hover && columns[hover.column];
  const activeCounts=active && (hover.bar===null?active.review.total:active.review.bars[hover.bar]);
  return <Box data-testid="practice-history-graph">
    <Flex gap={3} wrap="wrap" align="center" mb={2}>
      <label>History graph <select aria-label="History graph metric" value={metric} onChange={event=>setMetric(event.target.value as HistoryMetric)}>
        <option value="pitch">First-try pitch</option><option value="timing">On-time entrances</option><option value="both">Full hits</option>
      </select></label>
      <Text fontSize="xs" color="fg.muted">{score.title} · {orderedSessions.length} sessions{expandPasses ? ` · ${columns.length} recorded passes` : ""} · newest → oldest</Text>
      <label><input type="checkbox" checked={expandPasses} onChange={event=>{setExpandPasses(event.target.checked);setHover(null);}}/> Show individual passes</label>
    </Flex>
    <Text fontSize="xs" color="fg.muted">{expandPasses ? 'Each column is one recorded pass, grouped by session, aligned with its point above. First judgements are shown without averaging passes together; passes with no judgements are not recorded.' : 'Each column is one session, aligned with its point above.'} Each row is a bar of the whole piece. Scroll horizontally through the full history. Click a point for the session review, or a cell to review that bar.</Text>
    <Box overflowX="auto" mt={2}>
      <svg role="group" aria-label="Session progress and whole-piece judgement map" viewBox={`0 0 ${width} ${bottom+46}`}
        style={{width:'100%',minWidth:width,display:'block',fontFamily:'inherit'}}>
        <style>{'.history-session:focus {outline: none} .history-session:focus-visible .history-column-frame {stroke: currentColor; stroke-width:2}'}</style>
        <text x={8} y={24} style={{fontSize:11}} fill="currentColor">100%</text><text x={22} y={114} style={{fontSize:11}} fill="currentColor">0%</text>
        {[20,65,110].map(at=><path key={at} d={`M ${left} ${at} H ${width-20}`} stroke="currentColor" opacity={.12}/>)}
        {paths.map((d,i)=><path key={i} d={d} fill="none" stroke="var(--chakra-colors-cyan-600)" strokeWidth={2}/>)}
        <text x={6} y={mapTop-12} style={{fontSize:11}} fill="currentColor">Bar</text>
        {bars.map((bar,i)=><g key={bar.start}>
          <path d={`M ${left} ${y(bar.start)} H ${width-20}`} stroke="currentColor" opacity={.1}/>
          {(i%Math.ceil(bars.length/26)===0 || bar.start<0) && <text x={left-8} y={y(bar.start)+Math.min(10,(y(bar.end)-y(bar.start))/2+4)} textAnchor="end" style={{fontSize:10}} fill="currentColor">{bar.start<0?'Pickup':bar.label.replace('Bar ','')}</text>}
        </g>)}
        {columns.map((column,i)=>{
          const rate=historyRate(column.review.total,metric);
          const label=`Session ${column.sessionNumber}${column.cycle===null?'':`, Pass ${column.cycle}`}, ${dateLabel(column.startedAt)}, ${column.session.settings.bpm} BPM, ${column.session.settings.freeTime?'free time':'timed'}, ${metricLabel[metric]} ${rateLabel(rate)}`;
          const activeColumn=(column.session.id===selected && (!expandPasses || selectedPass===null || selectedPass===column.cycle)) || hover?.column===i;
          return <g key={column.id} role="button" tabIndex={0} className="history-session"
            aria-label={`Review ${label}`} data-history-column={column.id} data-history-pass={column.cycle??undefined} data-history-session-id={column.session.id}
            onMouseEnter={()=>setHover({column:i,bar:null})} onMouseLeave={()=>setHover(null)}
            onFocus={()=>setHover({column:i,bar:null})} onBlur={()=>setHover(null)}
            onClick={()=>onReview(column.session.id,null,column.cycle)}
            onKeyDown={event=>{
              if(event.key==='ArrowDown'||event.key==='ArrowUp') {
                event.preventDefault();event.stopPropagation();
                setHover(previous=>({column:i,bar:Math.max(0,Math.min(bars.length-1,(previous?.column===i?previous.bar??-1:-1)+(event.key==='ArrowDown'?1:-1)))}));
              } else if(event.key==='Enter'||event.key===' ') {
                event.preventDefault();event.stopPropagation();onReview(column.session.id,hover?.column===i?hover.bar:null,column.cycle);
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
              const value=historyRate(bar,metric),[success,total]=historyMetricCounts(bar,metric);
              const detail=`${label}. ${bar.label}: ${success}/${total} successful attempts; ${bar.observed}/${bar.notes} melody attacks judged.`;
              return <rect key={bar.start} data-history-cell={`${column.id}:${j}`} x={x(i)-step/2+3} y={y(bar.start)+.5}
                width={step-6} height={Math.max(.3,y(bar.end)-y(bar.start)-1)} rx={1} fill={color(value)}
                stroke={hover?.column===i && hover.bar===j?'currentColor':'none'}
                onMouseEnter={event=>{event.stopPropagation();setHover({column:i,bar:j});}}
                onClick={event=>{event.stopPropagation();onReview(column.session.id,j,column.cycle);}}>
                <title>{detail}</title>
              </rect>;
            })}
            <text x={x(i)} y={bottom+18} textAnchor="middle" style={{fontSize:10}} fill="currentColor">{expandPasses ? `S${column.sessionNumber}/P${column.cycle}` : column.sessionNumber}</text>
            <text x={x(i)} y={bottom+33} textAnchor="middle" style={{fontSize:9}} fill="currentColor">{new Date(column.startedAt).toLocaleDateString(undefined,{month:'numeric',day:'numeric'})}</text>
          </g>;
        })}
      </svg>
    </Box>
    <Flex gap={3} wrap="wrap" fontSize="xs" mt={2}>
      {[[.9,'85–100%'],[.75,'65–84%'],[.3,'Below 65%'],[null,'No judgements / timing not scored']].map(([value,label])=><Flex key={String(label)} gap={1} align="center"><Box width="10px" height="10px" bg={color(value as number|null)} borderWidth="1px"/>{label}</Flex>)}
    </Flex>
    <Text fontSize="xs" minHeight="3em" mt={2} data-testid="history-map-detail">
      {active && activeCounts && hover ? `${dateLabel(active.startedAt)} · ${active.session.settings.bpm} BPM · ${active.session.settings.freeTime?'Free time':'Timed'} ${active.cycle===null?'':`· Pass ${active.cycle} `}· ${hover.bar===null?(expandPasses?'Whole pass':'Whole session'):active.review.bars[hover.bar].label} · ${historyMetricCounts(activeCounts,metric).join('/')} ${metricLabel[metric].toLowerCase()} (${rateLabel(historyRate(activeCounts,metric))})`
        : 'Hover for details. Tab to a session; ↑/↓ chooses a bar, Enter opens its review. Grey is unjudged, never a failed attempt. Cells summarize first judgements per note/pass, not held-note duration.'}
    </Text>
    {columns.some(column=>column.review.stale>0) && <Text fontSize="xs" color="fg.muted">Judgements that no longer match the current score are omitted from this graph.</Text>}
  </Box>;
});
