const fs = require('node:fs');
const path = require('node:path');
const webRoot = path.resolve(__dirname, '..');
const privateRoot = path.resolve(webRoot, '../arrangements.local/web');
const privateDataPlugin = {name: 'private-test-data', setup(build) {
  build.onLoad({filter: /\.(tsx?|json)$/}, args => {
    const relative = path.relative(webRoot, args.path);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return;
    const file = path.join(privateRoot, relative);
    if (!fs.existsSync(file)) return;
    return {contents: fs.readFileSync(file, 'utf8'), loader: file.endsWith('.json') ? 'json' : file.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path)};
  });
}};
module.exports = {privateRoot, privateDataPlugin};
