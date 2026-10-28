import {existsSync, statSync, readFileSync, createReadStream} from 'node:fs';
import path from 'node:path';
import {transformWithEsbuild} from 'vite';
import type {Plugin} from 'vite';

// Private scores are a development-only overlay. Production always uses the
// empty public modules and never mounts the private static assets.
export function privateArrangements(): Plugin {
  const root = path.resolve(__dirname);
  const checkout = path.resolve(root, '../arrangements.local/web');
  const prefix = '\0private-arrangement:';
  const counterpart = (original: string) => path.join(checkout, path.relative(root, original));
  const contained = (base: string, target: string) => {
    const relative = path.relative(base, target);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  };
  return {
    name: 'private-arrangements', apply: 'serve', enforce: 'pre',
    async resolveId(source, importer) {
      if (source.startsWith(prefix)) return source;
      const from = importer?.startsWith(prefix) ? importer.slice(prefix.length) : importer;
      let original: string;
      if (source.startsWith('.')) {
        if (!from) return;
        original = path.resolve(path.dirname(from), source);
      } else if (source.startsWith('/src/')) original = path.resolve(root, '.' + source);
      else if (path.isAbsolute(source)) original = source;
      else return;
      if (contained(path.join(root, 'src'), original) && existsSync(counterpart(original))) {
        return prefix + original;
      }
      // Resolve relative helpers against their public logical location.
      if (importer?.startsWith(prefix) && source.startsWith('.')) return this.resolve(source, from, {skipSelf: true});
    },
    async load(id) {
      if (!id.startsWith(prefix)) return;
      const original = id.slice(prefix.length);
      const source = readFileSync(counterpart(original), 'utf8');
      this.addWatchFile(counterpart(original));
      return original.endsWith('.json') ? source : (await transformWithEsbuild(source, original)).code;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/practice/scores/') && !url.pathname.startsWith('/lumatone-exercises/')) return next();
        let file: string;
        try { file = path.resolve(checkout, 'public', '.' + decodeURIComponent(url.pathname)); }
        catch { res.statusCode = 400; return res.end(); }
        if (!contained(path.join(checkout, 'public'), file) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader('Content-Type', file.endsWith('.pdf') ? 'application/pdf' : 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        const stream = createReadStream(file);
        stream.on('error', () => { res.statusCode = 500; res.end(); });
        stream.pipe(res);
      });
    },
  };
}
