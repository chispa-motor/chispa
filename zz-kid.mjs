// Arnés de la prueba de principiante: abre el editor de verdad y deja pulsar lo mismo que una persona.
import { chromium } from 'playwright';
import { preview } from 'vite';
export const D = '/tmp/claude-0/-home-claude/0b009c91-1550-55da-92c7-a365df746021/scratchpad/';
export async function sesion(fn, vista = { width: 1440, height: 860 }) {
  const servidor = await preview({ base: '/chispa/', preview: { port: 4390 + Math.floor(Math.random() * 9) }, logLevel: 'silent' });
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await nav.newContext({ viewport: vista, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('ERROR DE PAGINA:', String(e.stack).slice(0, 500)));
  p.on('console', (m) => m.type() === 'error' && console.log('consola-error:', m.text().slice(0, 300)));
  await p.goto(servidor.resolvedUrls.local[0] + '?limpio');
  await p.waitForFunction(() => window.chispa);
  const k = {
    p,
    foto: (n, clip) => p.screenshot({ path: D + n + '.png', ...(clip ? { clip } : {}) }),
    est: (f, a) => p.evaluate(f, a),
    texto: (sel) => p.$eval(sel, (el) => el.innerText).catch(() => '(no está: ' + sel + ')'),
    nuevo: async (id = 'vacio') => { await p.click('[aria-label="Proyecto nuevo"]'); await p.click(`[data-plantilla="${id}"]`); await p.waitForTimeout(300); },
    jugar: async (ms = 1000) => { await p.keyboard.press('F5'); await p.waitForTimeout(ms); return (await k.texto('.estado-juego')); },
    parar: async () => { await p.click('.controles-juego .parar').catch(() => {}); },
    consola: () => k.texto('.consola-editor'),
    problemas: async () => { await p.click('.pestana-inferior:has-text("Problemas"), button:has-text("PROBLEMAS"), button:has-text("Problemas")').catch(() => {}); return k.texto('.panel-inferior'); },
    proyecto: () => p.evaluate(() => JSON.parse(window.chispa.estado.aJSON())),
    juego: (f, a) => p.evaluate(f, a),
  };
  try { await fn(k); } catch (e) { console.log('SE HA ROTO:', String(e.stack ?? e).slice(0, 900)); await p.screenshot({ path: D + 'roto.png' }); }
  await nav.close();
  await servidor.httpServer.close();
}
