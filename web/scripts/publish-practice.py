"""Publish a converted catalog as a small index and content-addressed static tunes."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def publish(catalog, collection):
    folder = ROOT/'public/practice/scores'
    folder.mkdir(parents=True, exist_ok=True)
    index_path = ROOT/'src/lumatone/practice/catalog.index.json'
    index = json.loads(index_path.read_text(encoding='utf-8')) if index_path.exists() else []
    index = [entry for entry in index if entry['collection'] != collection]
    for original in catalog:
        score = {**original, 'collection': collection}
        data = (json.dumps(score, ensure_ascii=False, separators=(',', ':'))+'\n').encode('utf-8')
        filename = score['id']+'-'+hashlib.sha256(data).hexdigest()[:16]+'.json'
        (folder/filename).write_bytes(data)
        index.append({**{key: score[key] for key in ('id','title','composer','edition') if key in score},
                      'collection': collection, 'melodyOnly': not score['chords'], 'hasLyrics': bool(score.get('lyrics')), 'file': filename})
    index.sort(key=lambda entry: (entry['title'].casefold(),entry['id']))
    index_path.write_text(json.dumps(index,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    # Remove only obsolete generated scores inside this dedicated output folder.
    referenced = {entry['file'] for entry in index}
    import re
    for path in folder.glob('*.json'):
        if path.name not in referenced and re.fullmatch(r'(openbook|effendi|wikifonia)-[a-z0-9_-]+-[0-9a-f]{16}\.json',path.name):
            path.unlink()
    print(f'{collection}: published {len(catalog)} tunes')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('catalog',type=Path)
    parser.add_argument('--collection',required=True)
    args = parser.parse_args()
    publish(json.loads(args.catalog.read_text(encoding='utf-8')),args.collection)
