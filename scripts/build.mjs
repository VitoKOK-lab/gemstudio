// Production build: bundles src/app.js (with three.js) and style.css into content-hashed files in dist/,
// copies the static assets, and points index.html at the hashed names. Hashes replace the old hand-edited ?v= tags.
import {build, transform} from 'esbuild';
import {cp, readFile, rm, writeFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const src = fileURLToPath(new URL('../src/', import.meta.url)), out = fileURLToPath(new URL('../dist/', import.meta.url));
const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 10);

await rm(out, {recursive: true, force: true});
// Code is bundled below; everything else (models, music, images, HDRI, licences) is copied as is.
await cp(src, out, {recursive: true, filter: from => !/\.(js|css)$/.test(from) && !from.endsWith('/vendor')});

const result = await build({
  entryPoints: [src + 'app.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  target: 'es2022',
  alias: {three: src + 'vendor/three.module.js'},
  entryNames: '[name]-[hash]',
  outdir: out,
  metafile: true,
  legalComments: 'eof',
  logLevel: 'warning',
});
const appFile = Object.keys(result.metafile.outputs).find(f => f.endsWith('.js')).split('/').pop();

const css = (await transform(await readFile(src + 'style.css', 'utf8'), {loader: 'css', minify: true})).code;
const cssFile = `style-${hash(css)}.css`;
await writeFile(out + cssFile, css);

let html = await readFile(src + 'index.html', 'utf8');
html = html
  .replace('href="style.css"', `href="${cssFile}"`)
  .replace('src="app.js"', `src="${appFile}"`)
  .replace(/<script type="importmap">.*?<\/script>/s, '');
if (!html.includes(cssFile) || !html.includes(appFile)) throw new Error('index.html no longer references style.css / app.js');
await writeFile(out + 'index.html', html);

const files = await readdir(out);
console.log(`built ${appFile} (${(result.metafile.outputs[Object.keys(result.metafile.outputs)[0]].bytes / 1024).toFixed(0)} KB), ${cssFile}, ${files.length} entries`);
