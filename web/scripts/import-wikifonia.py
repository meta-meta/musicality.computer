"""Convert cached ChoCo/Wikifonia MusicXML and publish on-demand practice scores."""
import argparse
from collections import Counter
import json
from pathlib import Path
import runpy

HERE=Path(__file__).resolve().parent
convert=runpy.run_path(str(HERE/'import-effendi.py'))['import_score']
publish=runpy.run_path(str(HERE/'publish-practice.py'))['publish']
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source',type=Path,required=True)
parser.add_argument('--limit',type=int)
args=parser.parse_args()
manifest=json.loads((args.source/'manifest.json').read_text(encoding='utf-8'))
scores=[];failures=[];seen=set();duplicates=0
for entry in manifest[:args.limit]:
    original=entry.get('originalPath',entry['path'])
    if entry['path'] in seen:
        duplicates+=1
        continue
    seen.add(entry['path'])
    try:
        if 'error' in entry: raise ValueError(entry['error'])
        score=convert(args.source/entry['path'],{**entry,'path':original})
        score['id']='wikifonia-'+entry['path'].split('.')[0]
        score['credit']=score['credit'].replace('Modern Jazz Fake Book · effendi.me','Wikifonia archive · ChoCo (smashub/choco)')
        score['edition']=Path(original).name.removesuffix('.mxl')
        scores.append(score)
    except Exception as error:
        failures.append({'file':original,'source':entry['url'],'reason':str(error)})
report={'sourceFiles':min(len(manifest),args.limit or len(manifest)),'imported':len(scores),'duplicates':duplicates,
        'melodyOnly':sum(not score['chords'] for score in scores),'failures':failures}
output=HERE.parent/'src/lumatone/practice/wikifonia'
output.mkdir(parents=True,exist_ok=True)
if args.limit:
    (args.source/'sample.report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
else:
    publish(scores,'Wikifonia')
    (output/'catalog.report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({**{key:value for key,value in report.items() if key!='failures'},'failureReasons':dict(Counter(item['reason'] for item in failures))},ensure_ascii=False,indent=2))
