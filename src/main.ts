/**
 * Punto de entrada. Elige qué arrancar según la dirección:
 *   http://localhost:5173/           → el EDITOR de Chispa
 *   http://localhost:5173/?demo=1    → demo de la Fase 1 (núcleo)
 *   http://localhost:5173/?demo=2    → demo de la Fase 2 (objetos y componentes)
 *   http://localhost:5173/?demo=0    → el ejemplo mínimo, a pantalla completa
 *
 * DECISIÓN: el editor se carga con import() ("carga diferida"). Así las demos
 * no descargan el editor de código, que es la parte más pesada.
 */
const demo = new URLSearchParams(location.search).get('demo');

async function arrancarDemo(): Promise<void> {
  await import('./estilos.css');
  const { Motor } = await import('./motor/Motor');
  const { mostrarError } = await import('./motor/Errores');
  const { escribirEnConsola } = await import('./motor/Consola');
  const { ErrorCompilacion, formatearError } = await import('./chispa/errores/ErrorChispa');
  const canvas = document.querySelector<HTMLCanvasElement>('#lienzo')!;
  document.getElementById('pagina-demo')!.hidden = false;
  document.querySelectorAll<HTMLAnchorElement>('#menu-demos a').forEach((a) => {
    if ((a.dataset.demo ?? '') === demo) a.classList.add('activo');
  });
  try {
    if (demo === '1') await (await import('./demos/demoFase1')).demoFase1(new Motor({ canvas }));
    else if (demo === '2') await (await import('./demos/demoFase2')).demoFase2(new Motor({ canvas }));
    else {
      const { JuegoEnMarcha } = await import('./proyecto/JuegoEnMarcha');
      const { proyectoMinimo } = await import('./ejemplos/minimo/proyecto');
      await JuegoEnMarcha.arrancar(new Motor({ canvas }), proyectoMinimo);
    }
  } catch (error) {
    // Errores de escritura: se enseñan TODOS en la consola
    if (error instanceof ErrorCompilacion) for (const e of error.errores) escribirEnConsola(formatearError(e), 'error');
    else mostrarError(error);
  }
}

async function arrancarEditor(): Promise<void> {
  await import('./editor/editor.css');
  const { Aplicacion } = await import('./editor/Aplicacion');
  document.getElementById('pagina-demo')?.remove();
  const raiz = document.getElementById('editor')!;
  raiz.hidden = false;
  const app = new Aplicacion(raiz);
  // ?limpio = empezar con el ejemplo, sin recuperar lo guardado (lo usan las pruebas del navegador)
  if (!new URLSearchParams(location.search).has('limpio')) await app.recuperar();
  // Para poder inspeccionarlo desde la consola del navegador (F12) y en las pruebas
  (window as unknown as { chispa: unknown }).chispa = app;
}

if (demo !== null) void arrancarDemo();
else void arrancarEditor();
