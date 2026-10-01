# Licencias de las dependencias

> Este archivo se genera solo con `npm run licencias` (no lo cambies a mano).

Chispa tiene licencia **MPL 2.0**. Todo lo que usa de otras personas tiene
que tener una licencia **compatible**: que deje usarlo dentro de un proyecto
MPL 2.0 y repartirlo. Las licencias «permisivas» (MIT, BSD, ISC, Apache 2.0)
lo permiten todas: solo piden que su aviso de copyright viaje con el código.

## Resumen

- **114 paquetes** en total (contando los que usan los que usamos).
- **Todos son compatibles con la MPL 2.0.**
- Por licencia: MIT (105), Apache-2.0 (4), ISC (2), BSD-2-Clause (1), Unlicense (1), BSD-3-Clause (1).
- **Dentro del editor** van 18 (el editor de código, CodeMirror, y sus piezas). Sus avisos de licencia van con el editor, en `public/licencias-de-terceros.txt`.
- **Dentro de los juegos exportados no va ninguno**: el reproductor es solo código de Chispa.
- Los demás (96) solo sirven para **desarrollar y probar** Chispa (compilar, tests, navegador de pruebas). No se reparten con el editor ni con los juegos.

## Qué significa cada licencia

| Licencia | Compatible | Qué pide |
|---|---|---|
| Apache-2.0 | Sí | Permisiva: guardar su aviso (y su archivo NOTICE, si tiene). Aquí solo la usan herramientas para desarrollar, que no se reparten. |
| BSD-2-Clause | Sí | Permisiva: guardar su aviso de copyright. |
| BSD-3-Clause | Sí | Permisiva: guardar su aviso y no usar su nombre para anunciarse. |
| ISC | Sí | Permisiva, casi igual que la MIT. |
| MIT | Sí | Permisiva: se puede usar en cualquier proyecto guardando su aviso de copyright. |
| Unlicense | Sí | Dominio público: se puede usar sin ninguna condición. |

## Dentro del editor

| Paquete | Versión | Licencia | Compatible |
|---|---|---|---|
| @codemirror/autocomplete | 6.20.3 | MIT | Sí |
| @codemirror/commands | 6.11.1 | MIT | Sí |
| @codemirror/language | 6.12.4 | MIT | Sí |
| @codemirror/lint | 6.9.7 | MIT | Sí |
| @codemirror/search | 6.7.2 | MIT | Sí |
| @codemirror/state | 6.7.6 | MIT | Sí |
| @codemirror/view | 6.43.13 | MIT | Sí |
| @lezer/common | 1.5.3 | MIT | Sí |
| @lezer/highlight | 1.2.5 | MIT | Sí |
| @lezer/lr | 1.4.10 | MIT | Sí |
| @marijn/find-cluster-break | 1.0.4 | MIT | Sí |
| crelt | 1.0.7 | MIT | Sí |
| earcut | 3.2.4 | ISC | Sí |
| polygon-clipping | 0.15.7 | MIT | Sí |
| robust-predicates | 3.0.3 | Unlicense | Sí |
| splaytree | 3.2.3 | MIT | Sí |
| style-mod | 4.1.4 | MIT | Sí |
| w3c-keyname | 2.2.8 | MIT | Sí |

## Solo para desarrollar y probar

| Paquete | Versión | Licencia | Compatible |
|---|---|---|---|
| @jridgewell/resolve-uri | 3.1.2 | MIT | Sí |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT | Sí |
| @jridgewell/trace-mapping | 0.3.31 | MIT | Sí |
| @types/chai | 5.2.3 | MIT | Sí |
| @types/deep-eql | 4.0.2 | MIT | Sí |
| @types/estree | 1.0.9 | MIT | Sí |
| @types/node | 26.6.3 | MIT | Sí |
| @types/whatwg-mimetype | 3.0.2 | MIT | Sí |
| @types/ws | 8.18.2 | MIT | Sí |
| @vitest/mocker | 5.0.2 | MIT | Sí |
| @vitest/spy | 5.0.2 | MIT | Sí |
| assertion-error | 2.0.1 | MIT | Sí |
| buffer-image-size | 0.6.4 | MIT | Sí |
| chai | 6.2.2 | MIT | Sí |
| entities | 7.0.1 | BSD-2-Clause | Sí |
| es-module-lexer | 2.3.2 | MIT | Sí |
| esbuild | 0.28.2 | MIT | Sí |
| estree-walker | 3.0.3 | MIT | Sí |
| expect-type | 1.4.0 | Apache-2.0 | Sí |
| fdir | 6.5.0 | MIT | Sí |
| happy-dom | 20.14.5 | MIT | Sí |
| magic-string | 1.4.2 | MIT | Sí |
| nanoid | 3.3.19 | MIT | Sí |
| obug | 2.2.1 | MIT | Sí |
| picocolors | 1.1.1 | ISC | Sí |
| picomatch | 4.0.7 | MIT | Sí |
| playwright | 1.63.0 | Apache-2.0 | Sí |
| playwright-core | 1.63.0 | Apache-2.0 | Sí |
| postcss | 8.5.28 | MIT | Sí |
| rollup | 4.63.5 | MIT | Sí |
| source-map-js | 1.2.1 | BSD-3-Clause | Sí |
| std-env | 4.3.0 | MIT | Sí |
| tinybench | 6.2.0 | MIT | Sí |
| tinyexec | 1.3.1 | MIT | Sí |
| tinyglobby | 0.2.17 | MIT | Sí |
| tsx | 4.23.15 | MIT | Sí |
| typescript | 5.9.3 | Apache-2.0 | Sí |
| undici-types | 8.9.0 | MIT | Sí |
| vite | 7.3.6 | MIT | Sí |
| vitest | 5.0.2 | MIT | Sí |
| whatwg-mimetype | 3.0.0 | MIT | Sí |
| why-is-node-running | 3.2.2 | MIT | Sí |
| ws | 8.22.0 | MIT | Sí |

Además hay 53 paquetes con el programa ya compilado para cada sistema (Windows, Mac, Linux...) de esbuild y Rollup; npm solo instala los de tu ordenador. Todos son MIT.
