import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';
import path from 'path';

function collectHtmlInputs() {
  const inputs = {};
  const add = (file) => {
    const name = file.replace(/\.html$/, '').replace(/[\/\.]/g, '-');
    inputs[name || 'main'] = path.resolve(file);
  };
  // Only safe, validated pages for rollup (avoid parse5 errors on heavy workflow/admin debug files)
  if (fs.existsSync('index.html')) add('index.html');
  if (fs.existsSync('boutique.html')) add('boutique.html');
  if (fs.existsSync('services')) {
    fs.readdirSync('services').filter(f => f.endsWith('.html')).forEach(f => add(`services/${f}`));
  }
  // Workflow: only index + fiscalite + declarations-mensuelles are certified clean
  // calcul-impots.html (1.4M) contains raw '<' (e.g. 20M<CA) that breaks parse5 — served as static copy instead
  ['workflow/index.html', 'workflow/fiscalite.html', 'workflow/declarations-mensuelles.html'].forEach(f => {
    if (fs.existsSync(f)) add(f);
  });
  return inputs;
}

export default defineConfig({
  server: { host: '0.0.0.0', allowedHosts: true },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'docs', dest: '.' },
        { src: 'assets', dest: '.' },
        { src: 'workflow', dest: '.' }, // workflow heavy files (calcul-impots, debug) as static
        { src: 'admin', dest: '.' },
        { src: 'services', dest: '.' }, // also copied raw for fallback (vite will override services/* built)
      ],
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: collectHtmlInputs() },
  },
});
