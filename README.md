# Chispa: un motor de videojuegos 2D en español

## Cómo arrancarlo
```
npm install
npm run dev
```
Se abre el navegador en http://localhost:5173 con el **ejemplo mínimo en Chispa**. Arriba a la derecha hay un menú para cambiar a las demos de las Fases 1 y 2.

Otros comandos:

- `npm run pruebas` → ejecuta los tests automáticos (lenguaje, errores y motor).
- `npm run pruebas:vigilar` → igual, pero los repite cada vez que guardas un archivo.
- `npm run build` → comprueba los tipos y compila.

## Estado
- [x] Fase 1: núcleo (bucle, delta time, dibujo, teclado, ratón)
- [x] Fase 2: objetos y componentes (Transformación, Sprite, Colisión, Física, Script)
- [ ] Fase 3: el lenguaje Chispa + la Zona de Programación (3A ✔ especificación · 3B ✔ intérprete · 3C errores · 3D Zona)
- [ ] Fase 4: editor visual
- [ ] Fase 5: exportar el juego

## Carpetas
```
src/
├── motor/        Fase 1: bucle, renderizador, entrada, recursos, errores, consola
├── objetos/      Fase 2: ObjetoJuego, Escena, Cámara, SistemaFisico, componentes/
├── chispa/       Fase 3: el lenguaje (lexico/ → sintaxis/ → ejecucion/, + errores/, api/). Ver chispa/LEEME.md
├── ejemplos/     Ejemplo mínimo en Chispa
├── proyecto/     Formato de proyecto JSON y el cargador (JuegoEnMarcha)
└── demos/        Demos de las fases 1 y 2
pruebas/          Tests automáticos (Vitest)
```

La definición del lenguaje está en **ESPECIFICACION_CHISPA.md**.
