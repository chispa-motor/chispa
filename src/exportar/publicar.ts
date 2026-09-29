/**
 * PUBLICAR: preparar el juego para subirlo a internet, sin conectarse a
 * ninguna cuenta. El editor descarga el archivo listo y enseña los pasos a
 * seguir en la web de cada sitio.
 *
 * DECISIÓN: aquí solo hay DATOS (qué archivo se descarga y qué pasos hay que
 * seguir), nada de pantallas. Así los pasos se pueden probar con tests y el
 * editor solo los dibuja.
 */
import type { DefProyecto } from '../proyecto/formato';
import { generarPaginaJuego } from './exportar';
import { crearZip } from './zip';

export type DestinoPublicar = 'archivo' | 'itch' | 'github';

export interface Descarga {
  nombre: string;
  contenido: string | Uint8Array;
  tipo: string;
}

export interface Publicacion {
  destino: DestinoPublicar;
  titulo: string;
  descarga: Descarga;
  /** Los pasos, en orden. Lo que va entre **asteriscos** sale en negrita. */
  pasos: string[];
  /** Una dirección para abrir (la web donde se sube el juego). */
  enlace?: { texto: string; url: string };
  nota?: string;
}

/** "Mi juego!" → "mi-juego" (para nombres de archivo y de repositorio). */
export function nombreCorto(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return limpio || 'mi-juego';
}

/** Prepara lo que hay que descargar y los pasos, para cada sitio. */
export function prepararPublicacion(proyecto: DefProyecto, reproductor: string, destino: DestinoPublicar): Publicacion {
  const html = generarPaginaJuego(proyecto, reproductor);
  const corto = nombreCorto(proyecto.nombre);
  const tamano = `${proyecto.ancho} × ${proyecto.alto}`;

  if (destino === 'itch') {
    const nombre = `${corto}-itch.zip`;
    return {
      destino,
      titulo: 'Publicar en itch.io',
      descarga: { nombre, contenido: crearZip([{ nombre: 'index.html', contenido: html }]), tipo: 'application/zip' },
      enlace: { texto: 'Abrir itch.io', url: 'https://itch.io/game/new' },
      pasos: [
        `Ya se ha descargado **${nombre}**. Dentro lleva tu juego entero (un index.html). No hace falta abrirlo ni descomprimirlo.`,
        'Entra en **itch.io** e inicia sesión (si no tienes cuenta, créala: es gratis).',
        'Arriba a la derecha, abre el menú de tu nombre y elige **Upload new project** (subir un proyecto nuevo).',
        'Escribe el **Title** (el nombre de tu juego).',
        'En **Kind of project** (tipo de proyecto), elige **HTML**.',
        `En **Uploads**, pulsa **Upload files** y elige **${nombre}**.`,
        'Cuando termine de subir, marca la casilla **This file will be played in the browser** (se juega en el navegador).',
        `En **Embed options**, en **Viewport dimensions** pon **${proyecto.ancho}** de ancho y **${proyecto.alto}** de alto (el tamaño de tu juego). Marca también **Fullscreen button** para que se pueda jugar a pantalla completa.`,
        'Abajo del todo, pulsa **Save & view page**. Así ves tu página y pruebas el juego. De momento solo la ves tú: está como borrador («Draft»).',
        'Cuando te guste, vuelve a editarla (**Edit game**), en **Visibility & access** elige **Public** y guarda. ¡Ya lo puede jugar todo el mundo!',
      ],
      nota: `Para subir una versión nueva: exporta otra vez, entra en Edit game, borra el zip viejo en Uploads y sube el nuevo (y vuelve a marcar «played in the browser»). Tu juego mide ${tamano}; si cambias ese tamaño en el proyecto, cámbialo también en Viewport dimensions.`,
    };
  }

  if (destino === 'github') {
    return {
      destino,
      titulo: 'Publicar en GitHub Pages',
      descarga: { nombre: 'index.html', contenido: html, tipo: 'text/html' },
      enlace: { texto: 'Abrir GitHub', url: 'https://github.com/new' },
      pasos: [
        'Ya se ha descargado **index.html**: es tu juego entero en una sola página. Tiene que llamarse exactamente así (si tu navegador le ha puesto «index (1).html», cámbiale el nombre).',
        'Entra en **github.com** e inicia sesión (si no tienes cuenta, créala: es gratis).',
        `Crea un repositorio nuevo: botón **+** de arriba a la derecha → **New repository**. En **Repository name** escribe, por ejemplo, **${corto}**. Déjalo en **Public** y pulsa **Create repository**.`,
        'En la página del repositorio vacío, pulsa el enlace **uploading an existing file** (subir un archivo que ya tienes).',
        'Arrastra **index.html** a la página y pulsa el botón verde **Commit changes** (guardar los cambios).',
        'Ve a **Settings** (la rueda dentada del repositorio) → en el menú de la izquierda, **Pages**.',
        'En **Build and deployment**, en **Source** deja **Deploy from a branch**. En **Branch** elige **main** y la carpeta **/ (root)**, y pulsa **Save**.',
        `Espera uno o dos minutos y recarga la página: arriba saldrá la dirección de tu juego, que será así: **https://TU-USUARIO.github.io/${corto}/** (con tu nombre de usuario de GitHub).`,
      ],
      nota: 'Para subir una versión nueva: exporta otra vez y sube el index.html nuevo al mismo repositorio (Add file → Upload files). Sustituye al viejo, y en un par de minutos se actualiza la página.',
    };
  }

  const nombre = `${corto}.html`;
  return {
    destino,
    titulo: 'Un archivo con tu juego',
    descarga: { nombre, contenido: html, tipo: 'text/html' },
    pasos: [
      `Ya se ha descargado **${nombre}** (${Math.ceil(html.length / 1024)} KB). Lleva TODO dentro: el motor, tu código, las imágenes y los sonidos.`,
      'Ábrelo con **doble clic** para jugar, incluso sin internet.',
      'Puedes mandarlo por correo o pasarlo en un pendrive: funciona en cualquier ordenador con un navegador.',
    ],
    nota: 'Lo que escribe mostrar() no se ve en el juego exportado (solo en la consola del navegador, F12).',
  };
}
