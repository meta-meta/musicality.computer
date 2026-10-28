"""Extract Wikifonia blobs into safe filenames, including Windows-incompatible titles.
Requires a local ChoCo clone made with git clone --filter=blob:none --no-checkout.
"""
import argparse
import json
from pathlib import Path
import subprocess
from urllib.parse import quote

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repo',type=Path,required=True)
parser.add_argument('--out',type=Path,required=True)
args=parser.parse_args()
def git(*params,**kwargs):
    return subprocess.run(['git','-C',str(args.repo),*params],check=True,stdout=subprocess.PIPE,**kwargs).stdout
revision=git('rev-parse','HEAD').decode().strip()
entries=[]
for line in git('ls-tree','-rz','--full-tree','HEAD','partitions/wikifonia/raw').split(b'\0'):
    if not line: continue
    info,name=line.split(b'\t',1)
    path=name.decode('utf-8')
    if '.mxl' not in path.lower() and not path.lower().endswith(('.xml','.musicxml')): continue
    entries.append((info.split()[2].decode(),path))
args.out.mkdir(parents=True,exist_ok=True)
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request
import time

def download(item):
    sha,path=item
    filename=sha+'.mxl'
    target=args.out/filename
    url='https://raw.githubusercontent.com/smashub/choco/'+revision+'/'+quote(path,safe='/')
    error=None
    for attempt in range(4):
        try:
            if not target.exists():
                with urlopen(Request(url,headers={'User-Agent':'musicality.computer importer'}),timeout=45) as response:
                    data=response.read()
                target.write_bytes(data)
            return {'path':filename,'originalPath':path,'url':'https://github.com/smashub/choco/blob/'+revision+'/'+quote(path,safe='/')}
        except Exception as exc:
            error=str(exc);time.sleep(attempt+1)
    return {'path':filename,'originalPath':path,'url':url,'error':error}
manifest=[]
with ThreadPoolExecutor(max_workers=12) as pool:
    for entry in pool.map(download,entries):
        manifest.append(entry)
        if len(manifest)%500==0: print(f'Cached {len(manifest)}/{len(entries)} scores',flush=True)
(args.out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(args.out/'revision.txt').write_text(revision,encoding='utf-8')
print(f'Cached {len(manifest)} source scores at {revision}',flush=True)
