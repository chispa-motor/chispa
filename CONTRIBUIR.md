# Cómo colaborar con Chispa

¡Gracias por querer ayudar! Chispa es para gente que empieza a programar, y
se hace entre todos. No hace falta saber mucho para colaborar: muchas de las
mejores mejoras son **un mensaje de error más claro** o **una receta nueva**.

Antes de nada, lee las [normas de la comunidad](NORMAS_COMUNIDAD.md). Son
cortas.

## Formas de ayudar (de más fácil a más difícil)

1. **Contar un problema.** Si algo no funciona, o un mensaje no se entiende,
   abre una *issue* en GitHub (pestaña **Issues → New issue**) y cuenta:
   - qué querías hacer;
   - qué escribiste (el código, o los pasos en el editor);
   - qué pasó y qué esperabas que pasara;
   - tu navegador y tu sistema (por ejemplo, «Chrome en Windows 11»).

   Si puedes, adjunta el proyecto (`.chispa.json`, del botón Guardar) o una
   captura.
2. **Proponer una idea.** También con una *issue*. Explica **para qué** lo
   quieres, con un ejemplo de juego. «Quiero hacer un Pac-Man y no sé cómo
   hacer que los fantasmas...» ayuda más que «añadid X».
3. **Probar Chispa con alguien que empieza** (tu hermano, tu clase...) y
   contar dónde se atascó. Es de lo más útil que hay: así salió
   [PROBLEMAS_PRINCIPIANTE.md](PROBLEMAS_PRINCIPIANTE.md).
4. **Mejorar la documentación**: el manual, las recetas, EMPIEZA_AQUI.md...
5. **Cambiar el código** (ver abajo).

> **¿Es un fallo de seguridad?** Entonces **no** abras una *issue* pública:
> sigue [SEGURIDAD.md](SEGURIDAD.md).

## Cambiar el código

### Preparar

Necesitas [Node.js](https://nodejs.org) 22 o más nuevo y Git.

```
git clone <dirección del repositorio>
cd chispa
npm install
npm run dev
```

Para las pruebas del navegador, la primera vez: `npx playwright install chromium`.

### Hacer el cambio

1. Haz un *fork* en GitHub y crea una rama con un nombre que diga lo que
   haces: `git checkout -b mensaje-bucle-infinito`.
2. Cambia lo que quieras, siguiendo las reglas de abajo.
3. Comprueba que todo pasa:
   ```
   npm run pruebas
   npm run build
   npm run pruebas:navegador
   ```
4. Haz *commit* con un mensaje en español que explique el porqué:
   «El error de un bucle infinito dice ahora qué variable no cambia».
5. Abre un *Pull Request* explicando qué cambia y por qué. Si arregla una
   *issue*, pon su número («Arregla #12»).

Alguien lo revisará, puede que te pida algún cambio (no es nada malo: es lo
normal) y, cuando esté listo, se unirá a Chispa. Tu nombre irá en
[CREDITOS.md](CREDITOS.md).

### Las reglas de Chispa

- **Todo en español**: el lenguaje, los mensajes, los comentarios, la
  documentación y los nombres del código.
- **Para alguien de 12 años.** Cuando haya varias formas de hacer algo, se
  elige la más fácil para quien empieza. Las decisiones importantes se
  apuntan en [DECISIONES.md](DECISIONES.md), con su porqué.
- **Los errores enseñan.** Cada error dice la línea, qué pasa (enseñando los
  valores) y cómo arreglarlo, con una pista. Nada de «undefined» ni
  mensajes en inglés.
- **Tests para todo lo nuevo**, y todos los tests pasando. Los tests están en
  `pruebas/` (Vitest) y `pruebas-navegador/` (Playwright).
- **Un comando nuevo** necesita:
  - su ficha en `src/chispa/api/documentacion.ts`, con un ejemplo que
    funcione (un test lo comprueba);
  - regenerar el manual con `npm run manual`.
- **Archivos nuevos**: `npm run cabeceras` les pone la cabecera de la
  licencia (un test lo comprueba).
- **Seguridad** (ver [AUDITORIA_SEGURIDAD.md](AUDITORIA_SEGURIDAD.md)):
  - nunca `innerHTML`, `eval` ni `new Function` (un test lo vigila);
  - los textos se ponen con nodos de texto (`h()`);
  - las tablas de nombres del motor se hacen con `sinPrototipo({...})`, y
    lo que viene de un proyecto se lee con `propio()`;
  - todo lo nuevo que se guarde en un proyecto se comprueba en
    `src/proyecto/validar.ts`.
- **Dependencias nuevas**, las menos posibles. Su licencia tiene que ser
  compatible con la MPL 2.0. `npm run licencias` lo comprueba y actualiza
  [LICENCIAS_DEPENDENCIAS.md](LICENCIAS_DEPENDENCIAS.md).
- **No rompas los proyectos de nadie.** Si cambias el formato del proyecto,
  sube `VERSION_PROYECTO` y añade cómo pasar los proyectos viejos al nuevo
  formato (en `migrarProyecto`).

## Licencia de lo que aportes

Chispa tiene licencia [MPL 2.0](LICENSE). Al enviar un cambio, aceptas que tu
aportación se reparta con esa misma licencia. No hace falta firmar nada más.
