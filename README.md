# Chispa: un motor de videojuegos 2D en español

## Cómo arrancarlo
```
npm install
npm run dev
```
Se abre el navegador en http://localhost:5173. Arriba a la derecha hay un menú para elegir entre:

- la demo de la Fase 1,
- la demo de la Fase 2,
- el juego de plataformas hecho en Chispa.

Otros comandos:

- `npm run pruebas` → prueba el lenguaje Chispa sin navegador y enseña ejemplos de mensajes de error.
- `npm run build` → comprueba los tipos y compila.

## Estado
- [x] Fase 1: núcleo (bucle, delta time, dibujo, teclado, ratón)
- [x] Fase 2: objetos y componentes (Transformación, Sprite, Colisión, Física, Script)
- [x] Fase 3: el lenguaje Chispa (.chs) y el juego de ejemplo de plataformas
- [ ] Fase 4: editor visual
- [ ] Fase 5: exportar el juego

## Carpetas
```
src/
├── motor/        Fase 1: bucle, renderizador, entrada, recursos, errores, consola
├── objetos/      Fase 2: ObjetoJuego, Escena, Cámara, SistemaFisico, componentes/
├── chispa/       Fase 3: tokens → lexer → parser → ast → interprete (+ api, ScriptChispa)
├── proyecto/     Formato de proyecto JSON y el cargador (JuegoEnMarcha)
├── juegos/       Juegos de ejemplo (plataformas/ con sus scripts .chs)
└── demos/        Demos de las fases 1 y 2
```

La referencia del lenguaje está en **GUIA_CHISPA.md**.
