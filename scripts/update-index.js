const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist/iu-diff-console.js'), 'utf8');
const start = 'const instagramScript = ';
const end = ';//__END_OF_SCRIPT__';
const first = template.indexOf(start);
const last = template.lastIndexOf(end);
if (first < 0 || last <= first) throw new Error('Copy-page script markers are missing.');

// Preserve the bundle exactly when the browser decodes the JS string. Escaping
// '<' also prevents a bundled HTML example from terminating the enclosing script.
const encoded = JSON.stringify(bundle).replace(/</g, '\\u003c');
const copyPage = template.slice(0, first + start.length) + encoded + template.slice(last);
// The upstream template loads remote fonts and a syntax highlighter. The
// standalone distribution needs only its own inline style and script.
const offlinePage = copyPage.replace(/<head>[\s\S]*?<\/head>/i, [
  '<head>',
  '  <meta charset="UTF-8">',
  '  <meta name="viewport" content="width=device-width, initial-scale=1">',
  '  <title>InstagramUnfollowers</title>',
  '</head>',
].join('\n'));
fs.writeFileSync(path.join(root, 'dist/index.html'), offlinePage);
const preview = fs.readFileSync(path.join(root, 'public/preview.html'), 'utf8');
fs.writeFileSync(path.join(root, 'dist/preview.html'), preview.replace('../dist/iu-diff-console.js', './iu-diff-console.js'));
