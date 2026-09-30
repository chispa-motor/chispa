# Seguridad: cómo avisar de un fallo

En Chispa la gente comparte proyectos y juegos, y muchas de esas personas son
niños y niñas. Por eso la seguridad importa mucho: **abrir el proyecto de otra
persona nunca debería poder hacerte daño**. Lo que Chispa ya protege está
explicado en [AUDITORIA_SEGURIDAD.md](AUDITORIA_SEGURIDAD.md).

## Qué cuenta como fallo de seguridad

Por ejemplo, si encuentras una forma de que un proyecto (`.chispa.json`), un
script de Chispa o un juego exportado:

- ejecute JavaScript o cualquier código que no sea Chispa;
- lea datos de otros proyectos o de otros juegos;
- se conecte a internet o cargue algo de fuera;
- meta HTML o código en la página del editor o del juego;
- congele o cierre el navegador sin que salga un error de Chispa;
- se salte la comprobación de las imágenes y los sonidos.

## Cómo avisar (en privado)

**No abras una *issue* pública**: mientras no esté arreglado, cualquiera
podría usar el fallo.

1. Ve a la pestaña **Security** del repositorio de Chispa en GitHub y pulsa
   **Report a vulnerability** («informar de una vulnerabilidad»). El aviso
   solo lo verán quienes mantienen Chispa.
2. Cuenta:
   - qué has encontrado y qué se puede hacer con ello;
   - los pasos para que pase (lo mejor es un proyecto `.chispa.json` o un
     trozo de código pequeño que lo demuestre);
   - la versión de Chispa (sale en **Ayuda → Acerca de Chispa**) y tu
     navegador.

Esa es la **única** forma de avisar de un fallo de seguridad: Chispa no
tiene correo. Nunca lo cuentes en una *issue*, en un comentario ni en un
*pull request*, porque todo eso es público.

## Qué pasará después

- En **una semana** como mucho te contestaremos para decirte que lo hemos
  visto.
- Lo arreglaremos lo antes posible y te contaremos cómo va.
- Cuando esté arreglado se publicará el arreglo y se explicará el fallo, con
  tu nombre en [CREDITOS.md](CREDITOS.md) si quieres.

Te pedimos que no cuentes el fallo en público hasta que esté arreglado (o
hasta que pasen 90 días, lo que llegue antes).

## Versiones que reciben arreglos

| Versión | ¿Recibe arreglos de seguridad? |
|---|---|
| 1.x (la última) | Sí |
| Anteriores a la 1.0 | No: actualiza a la última |

Gracias por ayudar a que Chispa sea un sitio seguro para aprender.
