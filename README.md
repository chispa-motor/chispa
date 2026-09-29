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

- `npm run pruebas` → ejecuta los tests automáticos (lenguaje, errores, motor, editor, manual y exportación).
- `npm run pruebas:vigilar` → igual, pero los repite cada vez que guardas un archivo.
- `npm run pruebas:navegador` → abre el editor en un navegador de verdad y lo usa como una persona (ejecutar, pintar, exportar, 500 objetos...). La primera vez: `npx playwright install chromium`.
- `npm run build` → comprueba los tipos y compila todo en `dist/` (se puede subir a cualquier web).
- `npm run manual` → vuelve a generar MANUAL_CHISPA.md a partir de la ayuda del editor.
- `npm run lineas` → cuenta las líneas del proyecto por partes.

Las demos de las primeras fases siguen en `?demo=1`, `?demo=2` y `?demo=0` (el ejemplo mínimo a pantalla completa).

## Estado
- [x] Fase 1: núcleo (bucle, delta time, dibujo, teclado, ratón)
- [x] Fase 2: objetos y componentes (Transformación, Sprite, Colisión, Física, Script)
- [x] Fase 3: el lenguaje Chispa (3A especificación · 3B intérprete · 3C errores · 3D Zona de Programación)
- [x] Motor 2D completo: física, cámara, mapas de casillas, animaciones, interfaz, partículas, sonido y música, escenas, guardar/cargar, temporizadores
- [x] Fase 4: editor visual
- [x] Fase 5: exportar el juego como página web
- [x] Sesión 3: textos con huecos (`"Puntos: {juego.puntos}"`), plataformas que se mueven y que se atraviesan desde abajo, selección múltiple, copias enlazadas de plantillas, deshacer para todo, tutorial guiado y publicar en itch.io / GitHub Pages

## Carpetas
```
src/
├── motor/        Núcleo: bucle, renderizador, entrada, recursos, sonido, errores
├── objetos/      ObjetoJuego, Escena, Cámara, física, partículas, componentes/
├── chispa/       El lenguaje (lexico/ → sintaxis/ → analisis/ → ejecucion/, + errores/, api/). Ver chispa/LEEME.md
├── proyecto/     Formato del proyecto (JSON), revisión del código y JuegoEnMarcha (proyecto → juego)
├── editor/       El editor: estado/ (lógica sin interfaz), codigo/ (CodeMirror), escena/, paneles/, juego/
├── exportar/     Genera la página .html del juego exportado, el .zip para itch.io y los pasos para publicar
├── reproductor/  El motor sin el editor (lo que lleva dentro un juego exportado)
├── ejemplos/     Ejemplo mínimo en Chispa
└── demos/        Demos de las fases 1 y 2
pruebas/          Tests automáticos (Vitest)
pruebas-navegador/ Pruebas en un navegador de verdad (Playwright)
herramientas/     Contar líneas
```

- **MANUAL_CHISPA.md**: todo el lenguaje y la API, con un ejemplo de cada cosa.
- **ESPECIFICACION_CHISPA.md**: la definición del lenguaje (reglas y decisiones).
- **DECISIONES.md**: las decisiones de diseño y por qué.
- **PROBLEMAS_PRINCIPIANTE.md**: lo que se encontró (y arregló) haciendo juegos como alguien que empieza.
- **INFORME_REVISION.md**: el estado de cada parte, con sus tests.
