# Cómo funciona Chispa por dentro

Un programa en Chispa pasa por **tres etapas**, cada una en su carpeta:

```
  texto .chs ──► lexico/ ──► tokens ──► sintaxis/ ──► árbol (AST) ──► ejecucion/ ──► ¡hace cosas!
```

| Carpeta | Archivo | Qué hace |
|---|---|---|
| `lexico/` | `tokens.ts` | Qué tipos de "palabras" existen y cuáles son las palabras reservadas. |
| | `lexer.ts` | Corta el texto en tokens. También se encarga de la sangría: genera los tokens INDENTAR y DESINDENTAR. |
| `sintaxis/` | `ast.ts` | La forma del árbol: qué nodos hay (Si, Mientras, Binaria, Llamada...). |
| | `parser.ts` | Convierte la lista de tokens en el árbol, con la técnica de descenso recursivo. |
| `ejecucion/` | `valores.ts` | Qué es un valor en Chispa (número, texto, lista, `Tabla`...) y cómo se convierte a texto o se compara. |
| | `entorno.ts` | Dónde viven las variables: bloques que apuntan a su bloque padre. |
| | `interprete.ts` | Recorre el árbol y lo ejecuta. Usa generadores (`function*`) para que `esperar()` pueda pausar. |
| `errores/` | `ErrorChispa.ts` | El error con línea, columna, archivo y pista. |
| | `sugerencias.ts` | "¿Querías decir...?", con la distancia de Levenshtein. |
| `api/` | `basicas.ts` | Funciones que no necesitan motor: `mostrar`, `esperar`, matemáticas, textos. |
| | `objetos.ts` | `yo` y `otro`: traduce `yo.velocidad` al componente Física, etc. |
| | `motor.ts` | `crear`, `buscar`, `teclado`, `raton`, `escena`, `sonido`, `tiempo`, `juego`... |
| | `argumentos.ts` | Comprobación de los valores que recibe cada función, con ejemplos en los errores. |
| (raíz) | `ScriptChispa.ts` | El puente con el motor: un componente que ejecuta un `.chs` en un objeto, gestiona los eventos `cuando` y los hilos dormidos en `esperar()`. |

**Orden recomendado para leer el código:**

1. `tokens.ts` → `lexer.ts`
2. `ast.ts` → `parser.ts`
3. `valores.ts` → `interprete.ts`
4. `ScriptChispa.ts`

**Ver la cadena en acción:** los tests de `pruebas/` son pequeños programas de Chispa, cada uno con el resultado que debería dar.
