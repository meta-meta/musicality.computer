import {Button,Flex,Stack,Text} from '@chakra-ui/react';
import {useEffect,useRef,useState} from 'react';
import {DialogBody,DialogCloseTrigger,DialogContent,DialogHeader,DialogRoot,DialogTitle} from '../../components/chakra-ui/dialog.tsx';
import {useTimingCalibration} from './useTimingCalibration.ts';
import {latestSavedCalibration,savedCalibration,saveCalibration} from './timingCalibration.ts';
import type {AudioSetup,CalibrationProfile} from './timingCalibration.ts';

export function TimingCalibration({disabled,setup,onPrepare,onBusy,onCorrection}: {
  disabled:boolean;setup:AudioSetup|null;onPrepare:()=>void;onBusy:(busy:boolean)=>void;onCorrection:(value:number)=>void;
}) {
  const [initialProfile]=useState(()=>{try{return latestSavedCalibration(window.localStorage);}catch{return null;}});
  const [open,setOpen]=useState(false),[volume,setVolume]=useState(12);
  const [notice,setNotice]=useState(initialProfile?`Restored saved correction: ${initialProfile.correction} ms. Audio setup will be checked when the microphone starts.`:'');
  const [saved,setSaved]=useState<CalibrationProfile|null>(initialProfile);
  const restored=useRef<string|null>(null);
  const test=useTimingCalibration();
  useEffect(()=>{onBusy(open||test.busy);},[open,test.busy,onBusy]);
  useEffect(()=>{
    if(!setup||disabled||test.busy||restored.current===setup.key)return;
    restored.current=setup.key;
    try {
      const profile=savedCalibration(setup,window.localStorage);setSaved(profile);
      if(profile) {
        onCorrection(profile.correction);setNotice(`Restored saved correction: ${profile.correction} ms.`);
        // Remember the last used setup for the next page load, without changing its measurement date.
        try {saveCalibration(profile,window.localStorage);} catch { /* The matching profile remains usable. */ }
      } else if(saved&&saved.setup.key!==setup.key) {
        onCorrection(0);setNotice('Audio setup changed. No saved calibration matches it, so timing correction was reset to 0 ms. Calibrate this setup or adjust manually.');
      } else setNotice('No saved correction for this audio setup; the current manual value is unchanged.');
    } catch {setNotice('Saved timing calibration is unavailable in this browser.');}
  },[setup,disabled,test.busy,onCorrection,saved]);
  return <Stack gap={2} mt={2} fontSize="xs">
    <Button size="xs" variant="outline" alignSelf="start" disabled={disabled||test.busy} onClick={()=>{setOpen(value=>!value);setNotice('');}}>Auto-calibrate</Button>
    <DialogRoot open={open} placement="center" scrollBehavior="inside" onOpenChange={details=>{if(!details.open)test.cancel();setOpen(details.open);}}>
      <DialogContent maxWidth="640px">
      <DialogHeader><DialogTitle>Timing calibration</DialogTitle></DialogHeader>
      <DialogBody pb={5}><Stack gap={3} fontSize="sm">
        <Text>Stay quiet while 10 short tones play (about 13 seconds). Let your mic hear your usual speakers, or hold one headphone earcup near it. Keep this tab visible. Use a comfortable volume; don’t play your flute during the test.</Text>
        <Text color="fg.muted">This measures playback, microphone, and pitch-detection delay together. No audio is saved or uploaded. Your correction changes only when you apply a result.</Text>
        <Flex as="label" gap={2} align="center">Test volume
          <input aria-label="Calibration test volume" type="range" min={1} max={30} value={volume} disabled={test.busy} onChange={event=>setVolume(Number(event.target.value))}/>{volume}%
        </Flex>
        <Flex gap={2} wrap="wrap">
          <Button size="xs" disabled={disabled||test.busy} onClick={()=>{onPrepare();setNotice('');void test.start(volume/100);}}>{test.phase==='idle'?'Start calibration':'Run calibration again'}</Button>
          <Button size="xs" variant="outline" aria-label="Cancel timing calibration" onClick={()=>{test.cancel();setOpen(false);}}>{test.result?'Close':'Cancel'}</Button>
        </Flex>
        {test.busy&&<Text role="status">{test.phase==='starting'?'Starting microphone…':`${test.detected}/10 test tones detected…`}</Text>}
        {test.error&&<Text role="alert" color="orange.500">{test.error} Your correction is unchanged.</Text>}
        {test.result&&<>
          <Text fontWeight="semibold">Suggested correction: {test.result.correction} ms</Text>
          <Text>{test.result.used}/{test.result.detected} detections used · timing spread {test.result.spread} ms · {test.result.used>=8&&test.result.spread<=40?'Good consistency':'Usable consistency'}</Text>
          <Text color="fg.muted">Click Listen to flute again when you’re ready to practice.</Text>
          <Text color="fg.muted">{test.result.setup.input} · {test.result.setup.output}</Text>
          <Button size="xs" alignSelf="start" disabled={disabled} onClick={()=>{
            onCorrection(test.result!.correction);setSaved(test.result);restored.current=test.result!.setup.key;
            try {saveCalibration(test.result!,window.localStorage);setNotice(`Applied and saved ${test.result!.correction} ms for this audio setup.`);}
            catch {setNotice(`Applied ${test.result!.correction} ms for this page, but the calibration could not be saved.`);}
          }}>Apply and save correction</Button>
        </>}
        {notice&&<Text role="status">{notice}</Text>}
      </Stack></DialogBody>
      <DialogCloseTrigger/>
      </DialogContent>
    </DialogRoot>
    {!open&&notice&&<Text role="status">{notice}</Text>}
    {saved&&<Text color="fg.muted">Saved calibration: {saved.correction} ms · {saved.setup.input} · {new Date(saved.at).toLocaleDateString()}</Text>}
    <Text color="fg.muted">Saved calibration restores on reload and is checked against the audio setup when the microphone starts while practice is stopped. Recalibrate after changing audio devices or routing. Flute attacks may still need small manual adjustments.</Text>
  </Stack>;
}
