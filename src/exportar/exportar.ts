/**
 * EXPORTAR: convierte un proyecto en UNA página web que funciona sola.
 *
 * La página lleva dentro TODO:
 *   - el reproductor (el motor + el intérprete de Chispa, sin el editor),
 *   - el proyecto en JSON, con las imágenes y sonidos como "data URL",
 *   - los estilos.
 * No necesita internet ni ningún otro archivo: se puede abrir con doble clic,
 * mandar por correo o subir tal cual a itch.io, GitHub Pages, Netlify...
 */
import type { DefProyecto } from '../proyecto/formato';

/** Estilos de la página del juego (pantalla completa, bandas negras, panel de errores). */
const ESTILOS = `
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:system-ui,"Segoe UI",sans-serif}
#contenedor-juego{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center}
#lienzo{display:block;touch-action:none;outline:none}
#panel-error{position:fixed;left:50%;top:24px;transform:translateX(-50%);max-width:min(680px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;padding:16px 20px;background:#3a1216;border:2px solid #e74c3c;border-radius:10px;color:#ffe9e9;box-shadow:0 10px 30px rgba(0,0,0,.5)}
#panel-error h2{margin:0 0 8px;font-size:18px;color:#ff8a80}
#panel-error p{margin:6px 0;line-height:1.45;white-space:pre-wrap}
#panel-error .pista{color:#ffd98a}
#panel-error pre{margin:8px 0;padding:8px 10px;background:#1c0709;border-radius:6px;color:#ffd98a;font:14px ui-monospace,Consolas,monospace;white-space:pre-wrap}
`;

/** Escapa un texto para meterlo en HTML (el título). */
export function escaparHTML(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * JSON seguro dentro de <script>: cambiamos "<" por su código "\u003c". Así
 * ningún texto del juego (por ejemplo, un mostrar("</script>")) puede cerrar
 * la etiqueta antes de tiempo. Al leerlo, JSON.parse lo convierte otra vez en "<".
 */
export function jsonParaScript(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/** Genera la página completa. `reproductor` es el código de public/reproductor.js. */
export function generarPaginaJuego(proyecto: DefProyecto, reproductor: string): string {
  const codigo = reproductor.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Chispa">
<title>${escaparHTML(proyecto.nombre)}</title>
<style>${ESTILOS}</style>
</head>
<body>
<div id="contenedor-juego"><canvas id="lienzo" tabindex="0"></canvas></div>
<div id="panel-error" hidden></div>
<script type="application/json" id="proyecto-chispa">${jsonParaScript(proyecto)}</script>
<script>${codigo}</script>
</body>
</html>
`;
}
