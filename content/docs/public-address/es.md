---
source: 331d263ce3e1
---

Un proyecto público responde en su propia dirección en `motir.co`. Aparte de eso, un espacio de trabajo puede reclamar un nombre propio en `motir.site` y servir su aplicación alojada en un dominio que ya tenga.

## Tu dirección de Motir {#your-motir-address}

Todo proyecto público responde en `motir.co/p/ROADMAP` para un proyecto con la clave `ROADMAP`. No hay nada que reclamar: la dirección se deriva de la clave del proyecto y está incluida en todos los planes.

## El nombre de tu espacio de trabajo {#your-workspace-name}

Un espacio de trabajo puede reclamar un nombre en `motir.site`: así, `acme` te da `acme.motir.site`. En ese nombre responden las aplicaciones que Motir aloja para tu espacio de trabajo: la dirección sola muestra la aplicación predeterminada del espacio de trabajo, o una página que indica que aquí todavía no hay ninguna aplicación. **Los proyectos públicos nunca responden en él**: un proyecto se queda en su dirección de `motir.co`.

Un propietario o administrador del espacio de trabajo reclama el nombre en _Configuración del espacio de trabajo_, en _Dirección pública_. La configuración del proyecto lo muestra en solo lectura, con un enlace hasta allí.

Un nombre son letras minúsculas, dígitos y guiones sueltos, de tres a sesenta y tres caracteres. Se reserva un pequeño conjunto de nombres para los propios hosts de Motir y para nombres que un lector podría confundir con uno de ellos.

Un espacio de trabajo tiene un nombre o ninguno. **No hay alias y nada redirige:** cuando cambias el nombre o lo liberas, la dirección antigua deja de responder al instante, y los enlaces ya compartidos a ella dejan de funcionar.

- **Un cambio cada 30 días.** Un cambio de nombre y una liberación cuentan cada uno como un cambio, así que liberar y volver a reclamar no lo evita. Mientras un cambio aún no esté permitido, el panel muestra la fecha a partir de la cual lo estará.
- **Un nombre que sueltas queda retenido, salvo que acabes de reclamarlo.** Un nombre que tuviste menos de 24 horas vuelve al momento a estar disponible. Un nombre que tuviste 24 horas o más queda retenido 90 días, para que nadie más pueda quedarse con enlaces que apuntaban a ti; el diálogo de confirmación indica la fecha exacta en que vuelve a estar libre.

## Tu propio dominio {#your-own-domain}

Un dominio que tengas, como `shop.acme.com`, puede responder con la aplicación alojada de tu espacio de trabajo, sea cual sea el destino que la ejecuta. Los dominios personalizados están disponibles en los planes de pago — consulta [nuestros planes](/). Un propietario o administrador del espacio de trabajo los añade y los quita; los demás miembros del espacio de trabajo los ven en solo lectura. Las direcciones `motir.co` de tus proyectos y el nombre `motir.site` de tu espacio de trabajo siguen funcionando en cualquier caso.

## Añadir el dominio {#add-the-domain}

Añade el dominio en _Configuración del espacio de trabajo_, en _Dominios personalizados_. El panel _Dirección pública_ también lleva allí, con _Usar tu propio dominio_.

Al añadirlo, elige qué aplicación del espacio de trabajo sirve. Un dominio sirve exactamente una aplicación. Puedes cambiar cuál más adelante en la fila del dominio, con _Cambiar aplicación_. Un espacio de trabajo que aún no tiene ninguna aplicación alojada puede añadir un dominio igualmente: se añade sin aplicación y no sirve nada hasta que elijas una.

## Los registros que creas {#the-records-you-create}

Una vez añadido el dominio, el panel muestra cada registro que necesita, con su valor exacto y un botón de copiar en cada uno, y los guarda en _Mostrar registros DNS_. Las formas de abajo son lo que puedes esperar: léelas para comprobar que tu registrador puede crearlas, y toma los valores del panel.

Primero, un registro `TXT` que demuestra que el dominio es tuyo. Su nombre es `_motir-verify.` seguido de tu dominio; la mayoría de los registradores solo piden la parte anterior a tu dominio raíz, como aquí:

| Tipo  | Nombre               | Valor                  |
| ----- | -------------------- | ---------------------- |
| `TXT` | `_motir-verify.shop` | se muestra en el panel |

El token que contiene es solo tuyo, así que cópialo del panel y no de ningún otro sitio.

Después, un registro que apunta el dominio a Motir. Para un **subdominio** como `shop.acme.com`, un `CNAME`:

| Tipo    | Nombre | Valor                  |
| ------- | ------ | ---------------------- |
| `CNAME` | `shop` | se muestra en el panel |

Para un **dominio raíz** como `acme.com`, un `A` y un `AAAA` en su lugar: un dominio raíz no puede llevar un `CNAME`, porque ya lleva los registros `MX` y `TXT` de los que dependen tu correo y tus otros servicios. Lo mismo vale para un dominio situado justo debajo de un sufijo público de más de una parte, como `acme.co.uk`; el panel sabe de qué tipo es el tuyo y muestra los registros correctos.

| Tipo   | Nombre | Valor                  |
| ------ | ------ | ---------------------- |
| `A`    | `@`    | se muestra en el panel |
| `AAAA` | `@`    | se muestra en el panel |

Estas direcciones son de Motir, que las reserva para los dominios de sus clientes. Si alguna vez cambian, el panel cambia con ellas; una página como esta, no.

> Si tu proveedor de DNS ofrece un interruptor de “proxy” o “nube” en el registro, desactívalo: un proxy delante del registro oculta tu dominio a la comprobación y el certificado no se puede emitir.

Después elige _Comprobar ahora_. En cuanto vemos el registro de propiedad solicitamos un certificado, lo que suele tardar unos minutos. Puedes cerrar la página; el estado avanza por sí solo.

## Qué significa cada estado {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Estado        | Qué significa                                                                                                                                                 | Qué hacer                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Sin comprobar | Aún no hemos visto tu registro de propiedad. No se ha solicitado nada a la autoridad de certificación y el dominio no responde.                               | Crea los registros que muestra el panel y elige Comprobar ahora.                         |
| Pendiente     | Estamos buscando tu registro de propiedad ahora mismo. Los cambios de DNS pueden tardar unos minutos en propagarse.                                           | Espera un momento. Avanza por sí solo.                                                   |
| Pendiente     | La propiedad está confirmada y el certificado se está emitiendo. Suele tardar unos minutos.                                                                   | Nada. La página se actualiza sola.                                                       |
| Emitido       | El certificado está emitido y tu dominio responde. Se renueva solo.                                                                                           | Nada.                                                                                    |
| Fallido       | “Ya no vemos tu registro de propiedad.” El registro `TXT` ya no contiene tu token, así que el dominio ha dejado de responder.                                 | Restaura el registro `TXT` que muestra el panel y elige Volver a comprobar.              |
| Fallido       | “_Tu dominio_ ya no apunta a Motir.” Su registro `A`, `AAAA` o `CNAME` se cambió o se eliminó, así que el dominio ha dejado de responder.                     | Devuelve el registro al valor que muestra el panel y elige Volver a comprobar.           |
| Fallido       | “No se pudo emitir el certificado.” La autoridad de certificación lo rechazó; el panel muestra su propio motivo al lado.                                      | Corrige lo que indica el motivo —casi siempre un registro que falta— y elige Reintentar. |
| Fallido       | “No se pudo emitir el certificado.” El certificado caducó y la renovación no se completó, casi siempre porque cambió un registro DNS. El dominio no responde. | Deja los registros como los muestra el panel y elige Reintentar.                         |
| Fallido       | “No se pudo emitir el certificado.” El certificado se retiró. El dominio no responde.                                                                         | Elige Reintentar para empezar un certificado nuevo.                                      |

Solo responde un dominio cuyo estado sea _Emitido_.

## Qué sirve tu dominio {#what-your-domain-serves}

Una vez emitido su certificado, a tu dominio le responde el borde de Motir, que reenvía cada solicitud —su ruta, su consulta, su cuerpo y sus cookies— a la aplicación que nombra el dominio y devuelve la respuesta de esa misma aplicación. Lo que ve un visitante depende de la aplicación:

- **Tu propia aplicación**, cuando está publicada y abierta a todo el mundo.
- **Una página que dice que aquí aún no hay nada publicado**, cuando el dominio no nombra ninguna aplicación o la aplicación aún no se ha publicado.
- **Una página que dice que el sitio es solo para miembros**, cuando la aplicación solo está abierta a sus miembros. Los miembros llegan a ella en su dirección `motir.site`, a la que enlaza la página cuando la hay. Hoy toda aplicación alojada está abierta solo a sus miembros —el ajuste que abre una a todo el mundo aún no está disponible—, así que por ahora un dominio que nombra una aplicación publicada muestra esta página en lugar de la aplicación.
- **Una página que dice que el sitio no está disponible en este momento**, cuando la aplicación se ejecuta en un destino al que el borde aún no sabe reenviar. Vuelve a responder en cuanto el borde puede.
- **Una sola página sencilla de “no encontrado”** para cualquier otro motivo, incluido un dominio quitado. Es la misma página sea cual sea el motivo, así que nunca le dice a un visitante cuál se aplicó.

Ninguna de estas páginas lleva el sitio de Motir alrededor, y los buscadores no indexan ninguna.

Motir no añade en tu dominio ninguna redirección, enlace canónico, archivo robots ni sitemap propios. Tu aplicación define los suyos.

## Dos dominios en un mismo espacio de trabajo {#two-domains-on-one-workspace}

Un espacio de trabajo puede conectar más de un dominio, hasta lo que incluya su plan. Cada uno nombra su propia aplicación, elegida en su propia fila. Motir no pone a ninguno por encima de los demás ni redirige entre ellos: cada uno responde por sí mismo, con la aplicación que nombra.

## Quitar un dominio {#removing-a-domain}

Elige _Quitar_ en la fila del dominio. El dominio deja de servir tu aplicación en aproximadamente medio minuto y, desde entonces, responde con la página de no encontrado. No se reserva nada: puedes volver a añadirlo más adelante, y otro espacio de trabajo puede añadirlo en cuanto demuestre la propiedad con un registro `TXT` propio. Los registros en tu proveedor de DNS los borras tú. Quitar un dominio no cambia nada de la aplicación, que sigue respondiendo en sus otras direcciones.

## Si algo no funciona {#if-something-is-not-working}

Cuatro errores explican casi todos los fallos, y cada uno se nota de forma distinta en el panel.

- **Un CNAME en un dominio raíz.** La mayoría de los registradores lo aceptan y no funciona. El síntoma es un dominio que se queda en _Pendiente_ o llega a _Fallido_. Usa en su lugar los registros `A` y `AAAA` de arriba.
- **Un proveedor de DNS que hace de proxy delante del registro.** Si tu proveedor ofrece pasar el tráfico por un proxy o acelerarlo, eso nos oculta el registro real. El síntoma es un _Pendiente_ que nunca se resuelve. Desactiva el proxy para estos registros.
- **Un registro de propiedad desactualizado.** Si quitaste y volviste a añadir un dominio, el token cambió. El síntoma es _Sin comprobar_ aunque haya un registro `TXT` a la vista. Sustituye su valor por el que muestra ahora el panel.
- **Un registro de propiedad borrado más tarde.** Un dominio activo cuyo registro `TXT` desaparece sigue respondiendo hasta que nuestra comprobación periódica lo detecta, lo que ocurre en aproximadamente una hora; entonces pasa a _Fallido_ y deja de responder. Restaura el registro y elige Volver a comprobar.
