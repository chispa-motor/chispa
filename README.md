# Chispa: un motor de videojuegos 2D en español

Un editor en el navegador para hacer juegos 2D programándolos en **Chispa**,
un lenguaje en español pensado para quien empieza.

**¿Es la primera vez? Lee [EMPIEZA_AQUI.md](EMPIEZA_AQUI.md).**

## Cómo arrancarlo
```
npm install
npm run dev
```
Se abre el navegador en http://localhost:5173 con el **editor**.

Otros comandos:

- `npm run pruebas` → ejecuta los tests automáticos (lenguaje, errores, motor, editor y exportación).
- `npm run pruebas:vigilar` → igual, pero los repite cada vez que guardas un archivo.
- `npm run build` → comprueba los tipos y compila todo en `dist/` (se puede subir a cualquier web).

Las demos de las primeras fases siguen en `?demo=1`, `?demo=2` y `?demo=0` (el ejemplo mínimo a pantalla completa).

## Estado
- [x] Fase 1: núcleo (bucle, delta time, dibujo, teclado, ratón)
- [x] Fase 2: objetos y componentes (Transformación, Sprite, Colisión, Física, Script)
- [x] Fase 3: el lenguaje Chispa (3A especificación · 3B intérprete · 3C errores · 3D Zona de Programación)
- [x] Motor 2D completo: física, cámara, mapas de casillas, animaciones, interfaz, partículas, sonido y música, escenas, guardar/cargar, temporizadores
- [x] Fase 4: editor visual
- [x] Fase 5: exportar el juego como página web

## Carpetas
```
src/
├── motor/        Núcleo: bucle, renderizador, entrada, recursos, sonido, errores
├── objetos/      ObjetoJuego, Escena, Cámara, física, partículas, componentes/
├── chispa/       El lenguaje (lexico/ → sintaxis/ → analisis/ → ejecucion/, + errores/, api/). Ver chispa/LEEME.md
├── proyecto/     Formato del proyecto (JSON), revisión del código y JuegoEnMarcha (proyecto → juego)
├── editor/       El editor: estado/ (lógica sin interfaz), codigo/ (CodeMirror), escena/, paneles/, juego/
├── exportar/     Genera la página .html del juego exportado
├── reproductor/  El motor sin el editor (lo que lleva dentro un juego exportado)
├── ejemplos/     Ejemplo mínimo en Chispa
└── demos/        Demos de las fases 1 y 2
pruebas/          Tests automáticos (Vitest)
```

- La definición del lenguaje está en **ESPECIFICACION_CHISPA.md**.
- Las decisiones de diseño (y por qué) están en **DECISIONES.md**.
