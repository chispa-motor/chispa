# Chispa: un motor de videojuegos 2D en español

## Cómo arrancarlo
```
npm install
npm run dev
```
Se abre el navegador en http://localhost:5173. Arriba a la derecha hay un menú para elegir entre la demo de la Fase 1 y la de la Fase 2.

Otros comandos:

- `npm run pruebas` → prueba el lenguaje Chispa sin navegador y enseña ejemplos de mensajes de error.
- `npm run build` → comprueba los tipos y compila.

## Estado
- [x] Fase 1: núcleo (bucle, delta time, dibujo, teclado, ratón)
- [x] Fase 2: objetos y componentes (Transformación, Sprite, Colisión, Física, Script)
- [ ] Fase 3: el lenguaje Chispa + la Zona de Programación (3A ✔ especificación · 3B intérprete · 3C errores · 3D Zona)
- [ ] Fase 4: editor visual
- [ ] Fase 5: exportar el juego

## Carpetas
```
src/
├── motor/        Fase 1: bucle, renderizador, entrada, recursos, errores, consola
├── objetos/      Fase 2: ObjetoJuego, Escena, Cámara, SistemaFisico, componentes/
├── chispa/       Fase 3: tokens → lexer → parser → ast → interprete (+ api, ScriptChispa)
├── proyecto/     Formato de proyecto JSON y el cargador (JuegoEnMarcha)
└── demos/        Demos de las fases 1 y 2
```

La definición del lenguaje está en **ESPECIFICACION_CHISPA.md**.
