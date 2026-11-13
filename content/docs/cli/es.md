---
source: 9091e5e2f59e
---

La Motir CLI habla con el mismo servidor MCP que usa el agente Motir. Automatiza el bucle de planificación y ejecución sobre un token acotado a un espacio de trabajo: una ejecución reclama el siguiente elemento de trabajo listo, obtiene el prompt generado por el servidor y despacha un agente en un entorno aislado para ejecutarlo. El elemento de trabajo es el sistema de registro; la CLI es quien conduce.

{{part:meta}}

{{value:packageName}} · versión {{value:packageVersion}} · {{value:commandCount}} comandos

{{part:reference}}

## Instalación {#install}

Node {{value:nodeRequirement}}. Instálala de forma global o ejecútala una vez sin instalar.

{{slot:install}}

## Autenticación {#authenticate}

El flujo de dispositivo es el camino más corto: muestra un código, abre Motir y espera a que lo apruebes. Si ya tienes un token de acceso personal, entrégalo directamente. En ambos casos la CLI habla con {{value:defaultServer}} a menos que la apuntes a otro sitio.

{{slot:authenticate}}

Después vincula una carpeta a un proyecto y comprueba la configuración antes de la primera ejecución.

{{slot:link-and-check}}

## Comandos {#commands}

Todos los comandos que registra la CLI, en el orden en que los imprime `motir help`, generados a partir del catálogo que declara el propio binario, de modo que esta lista no puede quedarse atrás de una versión. Describe {{value:packageName}}@{{value:packageVersion}}.

{{slot:commands}}

## Dónde guarda Motir sus cosas {#where-motir-keeps-things}

Son tres archivos, y solo uno de ellos guarda un secreto: no es el que vive en tu repositorio. Todas las rutas siguientes se pueden reubicar; `motir help files` las imprime desde el binario que realmente instalaste, con la variable que mueve cada una.

- `~/.config/motir/config.json` **— secreto, nunca lo subas al repositorio**
  El almacén de credenciales: el único archivo en el que se escribe alguna vez un token de acceso personal, con `chmod 600` dentro de un directorio `0700`, indexado por la URL del servidor para que una misma máquina pueda guardar tokens de varios servidores de Motir. También guarda el comando del agente que configuraste. Reubícalo con `MOTIR_CONFIG_HOME` o `XDG_CONFIG_HOME`.
- `.motir.json` **— sin secreto, seguro para subir al repositorio**
  El vínculo con el proyecto en la raíz de tu espacio de trabajo: el servidor, el espacio de trabajo y el proyecto a los que está vinculada esta carpeta, más un mapa opcional de sustitución de repositorios. No lleva ninguna credencial, así que pertenece al control de versiones. Cada comando lo resuelve subiendo HACIA ARRIBA desde el directorio actual, de modo que cualquier comando funciona desde dentro de cualquier checkout bajo la raíz.
- `~/.local/state/motir/session-excludes.json` **— sin secreto**
  La lista de exclusión de la sesión: los elementos de trabajo cuyo despacho FALLÓ, para que la siguiente ejecución los pase por alto en lugar de volver a elegir el mismo fallo. Es estado y no una credencial, y por eso no está junto al token: el entorno aislado monta el directorio de configuración en solo lectura, y una ejecución nunca debe morir por no poder escribir este archivo. Si no se puede escribir, Motir avisa una vez y continúa. Reubícalo con `MOTIR_STATE_HOME`.

## Dónde se ejecuta una ejecución {#where-a-run-executes}

Un agente despachado se ejecuta dentro de un contenedor con tus checkouts y tu propia credencial de agente: lo que ofrece, lo que rechaza su token y los fallos que encuentra una primera ejecución están en la página [{{value:sandboxPage}}](/docs/sandbox) en lugar de repetirse aquí. Conectar un agente a Motir sin la CLI es [{{value:mcpPage}}](/docs/mcp), y conducir el mismo bucle de trabajo por HTTP es la [{{value:apiPage}}](/docs/api). La referencia completa de comandos (las tres formas de ejecución, las ramas de sesión, la política de fallos y la resolución de problemas) es [docs/cli.md]({{value:cliReferenceUrl}}) en motir-core.

{{part:unreachable}}

La referencia de comandos no está disponible temporalmente. Se genera a partir del catálogo que declara la propia CLI y nunca se copia aquí, así que no hay nada que mostrarte mientras tanto: `motir help` imprime la misma tabla desde el binario que tienes instalado.
