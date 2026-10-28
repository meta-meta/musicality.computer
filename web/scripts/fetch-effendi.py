"""Download the public MusicXML collection into a local cache (stdlib only)."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import json
from pathlib import Path
import time
from urllib.parse import urljoin, urlsplit, unquote, quote
from urllib.request import Request, urlopen

BASE = 'https://effendi.me/jazz/repo/'


class Links(HTMLParser):
    def __init__(self): super().__init__(); self.links = []
    def handle_starttag(self, tag, attrs):
        if tag == 'a': self.links.extend(value for key, value in attrs if key == 'href')


def fetch(url):
    for attempt in range(4):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'musicality.computer music-study importer'}), timeout=40) as response:
                return response.read()
        except Exception:
            if attempt == 3: raise
            time.sleep(attempt + 1)


def download(destination):
    destination.mkdir(parents=True, exist_ok=True)
    (destination/'README.source').write_bytes(fetch(BASE+'README'))
    directories, visited, files = [BASE], set(), {}
    while directories:
        directory = directories.pop()
        if directory in visited: continue
        visited.add(directory)
        parser = Links(); parser.feed(fetch(directory).decode('utf-8', errors='replace'))
        for link in parser.links:
            url = urljoin(directory, link)
            if not url.startswith(BASE) or urlsplit(url).query or urlsplit(url).fragment: continue
            relative = unquote(url[len(BASE):])
            if not relative or any(part == '..' for part in relative.split('/')): continue
            if url.endswith('/') and url not in visited: directories.append(url)
            elif relative.lower().endswith(('.xml', '.musicxml', '.mxl')):
                files[relative] = BASE + quote(relative, safe='/')
    def save(item):
        relative, url = item
        path = destination / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            if not path.exists(): path.write_bytes(fetch(url))
            return {'path': relative, 'url': url}
        except Exception as error: return {'path': relative, 'url': url, 'error': str(error)}
    with ThreadPoolExecutor(max_workers=5) as pool: manifest = list(pool.map(save, sorted(files.items())))
    (destination/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'files': len(manifest), 'failures': [entry for entry in manifest if 'error' in entry]}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    download(parser.parse_args().destination)
