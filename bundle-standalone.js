const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'build');
let html = fs.readFileSync(path.join(buildDir, 'index.html'), 'utf8');

const jsFiles = fs.readdirSync(path.join(buildDir, 'static/js')).filter(f => f.endsWith('.js'));
const cssFiles = fs.readdirSync(path.join(buildDir, 'static/css')).filter(f => f.endsWith('.css'));

let jsBundle = '';
jsFiles.forEach(f => {
  jsBundle += fs.readFileSync(path.join(buildDir, 'static/js', f), 'utf8') + '\n';
});

let cssBundle = '';
cssFiles.forEach(f => {
  cssBundle += fs.readFileSync(path.join(buildDir, 'static/css', f), 'utf8') + '\n';
});

// Inline JS and CSS
html = html.replace(/<script defer="defer" src="[^"]+"><\/script>/g, '');
html = html.replace(/<link href="[^"]+" rel="stylesheet">/g, '');
html = html.replace('</head>', `<style>${cssBundle}</style></head>`);
html = html.replace('</body>', `<script>${jsBundle}</script></body>`);

fs.writeFileSync(path.join(__dirname, '../mps2-portal-standalone.html'), html);
console.log('Standalone HTML generated successfully! Size:', (fs.statSync(path.join(__dirname, '../mps2-portal-standalone.html')).size / 1024).toFixed(2), 'KB');
