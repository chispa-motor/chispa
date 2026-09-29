/**
 * PUNTOS DE PARADA en el editor de código: un punto rojo al lado del número de
 * línea. Se ponen y se quitan haciendo clic en el número (o en el hueco de su
 * izquierda). Si escribes líneas encima, el punto baja con su línea.
 *
 * También resalta en amarillo la línea donde está parado el juego.
 */
import { RangeSet, RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, GutterMarker, gutter, lineNumbers, type DecorationSet } from '@codemirror/view';

class MarcadorPunto extends GutterMarker {
  toDOM() {
    const el = document.createElement('span');
    el.className = 'punto-parada';
    el.title = 'Punto de parada: el juego se para aquí. Clic para quitarlo.';
    return el;
  }
}
const MARCADOR = new MarcadorPunto();

/** Pone o quita el punto de la línea que empieza en esta posición. */
const alternarPunto = StateEffect.define<number>();
/** La línea donde está parado el juego (null = no está parado en este script). */
export const marcarParada = StateEffect.define<number | null>();

const campoPuntos = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(puntos, tr) {
    puntos = puntos.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(alternarPunto)) {
        let habia = false;
        puntos.between(e.value, e.value, () => {
          habia = true;
        });
        puntos = habia ? puntos.update({ filter: (desde) => desde !== e.value }) : puntos.update({ add: [MARCADOR.range(e.value)] });
      }
    }
    return puntos;
  },
});

const LINEA_PARADA = Decoration.line({ class: 'cm-linea-parada' });
const campoParada = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(marcarParada)) continue;
      deco = e.value === null || e.value > tr.state.doc.lines ? Decoration.none : Decoration.set([LINEA_PARADA.range(tr.state.doc.line(e.value).from)]);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/** Los números de línea que tienen punto de parada. */
export function lineasConPunto(vista: EditorView): number[] {
  const lineas: number[] = [];
  const puntos = vista.state.field(campoPuntos, false);
  puntos?.between(0, vista.state.doc.length, (desde) => {
    lineas.push(vista.state.doc.lineAt(desde).number);
  });
  return lineas;
}

/**
 * Las extensiones del editor para los puntos de parada.
 * `iniciales`: los que ya tenía el script. `alCambiar`: cada vez que cambian (líneas).
 */
export function puntosDeParada(iniciales: number[], alCambiar: (lineas: number[]) => void): Extension {
  const alternar = (vista: EditorView, desde: number) => {
    vista.dispatch({ effects: alternarPunto.of(desde) });
    return true;
  };
  let anteriores = iniciales.join(',');
  return [
    campoPuntos.init((estado) => {
      const b = new RangeSetBuilder<GutterMarker>();
      for (const n of [...iniciales].sort((a, c) => a - c)) if (n >= 1 && n <= estado.doc.lines) b.add(estado.doc.line(n).from, estado.doc.line(n).from, MARCADOR);
      return b.finish();
    }),
    campoParada,
    gutter({
      class: 'cm-gutter-puntos',
      markers: (v) => v.state.field(campoPuntos),
      initialSpacer: () => MARCADOR,
      domEventHandlers: { mousedown: (vista, linea) => alternar(vista, linea.from) },
    }),
    lineNumbers({ domEventHandlers: { mousedown: (vista, linea) => alternar(vista, linea.from) } }),
    // Si los puntos cambian (al poner uno, o porque se han movido al escribir), se avisa
    EditorView.updateListener.of((u) => {
      if (!u.docChanged && !u.transactions.some((t) => t.effects.some((e) => e.is(alternarPunto)))) return;
      const lineas = lineasConPunto(u.view);
      const clave = lineas.join(',');
      if (clave === anteriores) return;
      anteriores = clave;
      alCambiar(lineas);
    }),
  ];
}
