/**
 * Recursos: carga y guarda las imágenes del juego.
 *
 * DECISIÓN: cargar las imágenes ANTES de empezar el juego.
 * Cargar una imagen en el navegador es asíncrono (tarda un rato y no sabemos
 * cuánto). Si intentáramos dibujarla antes de que llegue, no se vería nada.
 * Por eso cargamos todo primero (con Promesas) y luego arrancamos el bucle.
 * Es la misma idea que ContentProvider:PreloadAsync en Roblox.
 */
import { ErrorMotor } from './Errores';

export class Recursos {
  private imagenes = new Map<string, HTMLImageElement>();

  /** Carga una imagen y la guarda con un nombre corto para usarla después. */
  cargarImagen(nombre: string, ruta: string): Promise<HTMLImageElement> {
    return new Promise((resolver, rechazar) => {
      const img = new Image();
      img.onload = () => {
        this.imagenes.set(nombre, img);
        resolver(img);
      };
      img.onerror = () =>
        rechazar(
          new ErrorMotor(
            `No he podido cargar la imagen "${ruta}".`,
            'Comprueba que el archivo existe dentro de la carpeta "public" y que el nombre está bien escrito ' +
              '(las mayúsculas y minúsculas cuentan: "Estrella.svg" no es lo mismo que "estrella.svg").',
          ),
        );
      img.src = ruta;
    });
  }

  /** Carga varias imágenes a la vez. Ejemplo: { estrella: 'imagenes/estrella.svg' } */
  async cargarImagenes(lista: Record<string, string>): Promise<void> {
    await Promise.all(Object.entries(lista).map(([n, r]) => this.cargarImagen(n, r)));
  }

  /** Devuelve una imagen ya cargada. Si no existe, da un error claro. */
  imagen(nombre: string): HTMLImageElement {
    const img = this.imagenes.get(nombre);
    if (!img) {
      const disponibles = [...this.imagenes.keys()];
      throw new ErrorMotor(
        `Intentas usar la imagen "${nombre}", pero no está cargada.`,
        disponibles.length
          ? `Las imágenes cargadas son: ${disponibles.join(', ')}. ¿Está bien escrito el nombre?`
          : 'Todavía no se ha cargado ninguna imagen. Cárgala antes de empezar el juego.',
      );
    }
    return img;
  }
}
