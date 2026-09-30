# Arena de Habilidades

Un juego completo hecho **solo con Chispa**, como ejemplo grande (y como prueba de todo el motor).

**Es de dominio público** (ver `../LICENCIA.md`): úsalo, cámbialo y copia lo que quieras para tus juegos.

**Para jugarlo:** en el editor, **Abrir** → `arena-de-habilidades.chispa.json` → **▶ Ejecutar**.

- Moverse: WASD o flechas · Apuntar: ratón · Habilidades: 1 2 3 4 5 · Pausa: Escape o P
- Con mando: palanca para moverse (y la derecha para apuntar), A dash, X orbe, Y nova, B escudo, RT definitiva, START pausa

**Truco para probar** (en la consola del editor, mientras juegas): `buscar("Director").saltarA(10)` va directo al jefe.

## Qué hay dentro

| Script | Qué hace |
|---|---|
| `jugador.chs` | Movimiento, las 5 habilidades con enfriamiento y energía, combos, daño, experiencia y mejoras al subir de nivel |
| `enemigo.chs` | La IA de los 4 enemigos (y los esbirros): perseguir, disparar y huir, embestir con aviso, invocar |
| `jefe.chs` | El Guardián: 3 fases, ataques avisados en el suelo, diálogos |
| `director.chs` | Las oleadas, la pausa, el final y el récord |
| `interfaz.chs` | Vida, energía, iconos con el enfriamiento en círculo, vida del jefe, avisos |
| `estados.chs` | *Script de funciones*: quemado, congelado, aturdido y ralentizado (lo usan todos) |
| `utiles.chs` | *Script de funciones*: números flotantes, direcciones, puntos de la arena |
| `orbe.chs`, `bala.chs`, `aviso.chs`, `cristal.chs`, `efecto.chs`, `numero.chs` | Los objetos pequeños |
| `menu.chs`, `final.chs` | El menú y las pantallas de derrota y victoria |

La carpeta `scripts/` y `proyecto.json` son el mismo juego separado en archivos (para leerlo cómodo).
Para volver a juntarlo: `node herramientas/proyecto-carpeta.mjs montar proyectos/arena-de-habilidades`.
