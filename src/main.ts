/**
 * Punto de entrada. Elige qué arrancar según la dirección:
 *   http://localhost:5173/?demo=1    → demo de la Fase 1 (núcleo)
 *   http://localhost:5173/           → demo de la Fase 2 (objetos y componentes)
 * En la Fase 3D esto se sustituirá por la Zona de Programación.
 */
import './estilos.css';
import { Motor } from './motor/Motor';
import { mostrarError } from './motor/Errores';
import { demoFase1 } from './demos/demoFase1';
import { demoFase2 } from './demos/demoFase2';

const canvas = document.querySelector<HTMLCanvasElement>('#lienzo')!;
const demo = new URLSearchParams(location.search).get('demo');

// Marcar en el menú la opción activa
document.querySelectorAll<HTMLAnchorElement>('#menu-demos a').forEach((a) => {
  if ((a.dataset.demo ?? '') === (demo ?? '')) a.classList.add('activo');
});

async function arrancar(): Promise<void> {
  try {
    if (demo === '1') await demoFase1(new Motor({ canvas }));
    else await demoFase2(new Motor({ canvas }));
  } catch (error) {
    mostrarError(error);
  }
}

arrancar();
