---
source: 2aa432672926
---

Motir expone un servidor de Model Context Protocol: un único endpoint HTTP con streaming al que llaman los agentes y la CLI para leer y manejar el núcleo de gestión de proyectos. Es la misma superficie que usa el agente Motir para ejecutar un plan. Añadirlo a Claude requiere un inicio de sesión y ningún token; cualquier otro cliente, o un pipeline, se conecta con un token en tres pasos.

## Añade Motir a Claude {#claude}

Inicias sesión con tu cuenta de Motir, eliges un espacio de trabajo y apruebas lo que Claude puede hacer en él. No se copia ni se pega nada: no hay ningún token que crear ni guardar.

### claude.ai {#claude-ai}

1. Abre Personalizar → Conectores.
2. Haz clic en “+”, luego en Añadir conector personalizado, y pega la URL del servidor que aparece más abajo. En Cliente OAuth, elige Usar la identidad publicada de Claude: claude.ai la marca como Detectada, porque Motir la admite. Deja vacíos el ID y el secreto del cliente OAuth: Motir no necesita ninguno.
3. Haz clic en Añadir y luego en Conectar. Claude te lleva a app.motir.co para iniciar sesión y aprobar.

{{slot:claude-ai}}

En un plan Team o Enterprise, un propietario añade el conector una sola vez, en Configuración de la organización → Conectores → Añadir → Personalizado → Web, y después cada miembro hace clic en Conectar en Personalizar → Conectores con su propia cuenta de Motir. · [Documentación de claude.ai de Anthropic]({{value:routeClaudeAiDocsUrl}}) · pasos comprobados {{value:routeClaudeAiCheckedOn}}

### Aplicación de escritorio de Claude {#claude-desktop}

1. Si ya conectaste Motir en claude.ai, no hay nada que añadir: un conector ya conectado está disponible en tus conversaciones en la web, en la aplicación de escritorio y en el móvil.
2. Para añadirlo desde la aplicación de escritorio, selecciona Personalizar en la barra lateral, luego Conectores, y sigue los pasos de claude.ai con la misma URL.
3. La página de inicio de sesión de Motir se abre en tu navegador; aprueba ahí y vuelve a la aplicación.

{{slot:claude-desktop}}

Es un conector remoto, no una extensión de escritorio local: Claude accede a Motir desde la nube de Anthropic, así que no se instala nada en tu máquina. · [Documentación de la aplicación de escritorio de Claude de Anthropic]({{value:routeClaudeDesktopDocsUrl}}) · pasos comprobados {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. Añade el servidor con el comando de abajo, sin cabecera y sin token.
2. En Claude Code, ejecuta `/mcp`, selecciona `motir` y sigue el inicio de sesión en tu navegador.

{{slot:claude-code}}

Si iniciaste sesión en Claude Code con tu cuenta de Claude, un conector que conectaste en claude.ai ya está disponible ahí. El plugin de Motir para Claude Code trae este servidor consigo, junto a las skills. · [Documentación de Claude Code de Anthropic]({{value:routeClaudeCodeDocsUrl}}) · pasos comprobados {{value:routeClaudeCodeCheckedOn}}

### Qué apruebas y cómo retirarlo {#consent}

La página de inicio de sesión de Motir nombra la aplicación que lo solicita, te hace elegir un espacio de trabajo y enumera los permisos que pide. Claude actúa entonces como tú en ese espacio de trabajo, dentro de lo que aprobaste y nunca más allá de lo que permite tu propio rol.

Cuando claude.ai se conecta con la identidad publicada de Claude, Motir comprueba que claude.ai la publica y muestra claude.ai como dominio verificado en la página de inicio de sesión y en Aplicaciones conectadas. Cualquier otro cliente MCP que se registre por sí mismo aparece como Sin verificar: el nombre que muestra es uno que él eligió, y Motir no puede comprobarlo.

Claude pregunta antes de usar una herramienta que cambie algo: cada herramienta indica si solo lee, escribe o elimina, y [{{value:mcpToolsPage}}](/docs/mcp/tools) muestra cuál es cuál. ¿Prefieres el plugin para Claude Code? Trae este servidor consigo: [{{value:skillsPage}}](/docs/skills).

Cada aplicación que conectas aparece en [Aplicaciones conectadas]({{value:connectedAppsUrl}}), en Configuración → Cuenta → Tokens de Motir, con su espacio de trabajo, sus permisos y cuándo se usó por última vez. Revocar pone fin a su acceso en su siguiente petición.

## Otros clientes y CI: usa un token {#token-route}

Elige esta vía para un cliente sin inicio de sesión OAuth, un agente sin interfaz o un pipeline de CI. Es el mismo servidor; un token de acceso personal sustituye al inicio de sesión.

## ¿Este servidor o la API REST? {#fork}

Ambos hablan con los mismos datos y aceptan la misma credencial. Están pensados para consumidores distintos, y la diferencia que importa es lo que cada uno promete sobre cambiar bajo tus pies.

|                   | {{value:mcpPage}}                                                                                                          | {{value:apiPage}}                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Endpoint**      | `POST {{value:endpointPath}}`                                                                                              | `/api/v1/…`                                                                  |
| **Pensado para**  | Un agente que controlas: lee las descripciones de las herramientas en tiempo de ejecución.                                 | Un cliente que distribuyes: código escrito una vez contra una forma fija.    |
| **Estabilidad**   | Se espera que cambie. Reformular una descripción o renombrar un argumento es como se afina el comportamiento de un agente. | Solo aditiva. Un cambio incompatible crea `/api/v2`; v1 mantiene su promesa. |
| **Forma**         | La misma. Los payloads de MCP se derivan de los esquemas de respuesta de v1, así que ambos describen objetos idénticos.    | La misma, y es la fuente de la que se deriva MCP.                            |
| **Autenticación** | Un token de acceso personal, un conjunto de alcances.                                                                      | La misma credencial funciona en ambos.                                       |

¿Conectas un agente? Quédate aquí. ¿Escribes software que instalan otras personas? La [{{value:apiPage}}](/docs/api) es la otra mitad: es la que promete no cambiar bajo tus pies.

## 1. Crea un token {#token}

Cada petición lleva un token de acceso personal, creado en Motir en Configuración → Cuenta → Tokens. Elige el espacio de trabajo al que queda ligado y concédele el conjunto de alcances más reducido que baste para el trabajo: la tabla del final de esta página indica qué controla cada alcance. Una concesión restringe tu propio rol y nunca lo amplía, así que un token nunca puede hacer algo que tú no podrías.

El secreto se muestra una sola vez, cuando se crea el token. Cópialo entonces; no hay forma de volver a leerlo, y un token perdido se sustituye en lugar de recuperarse.

## 2. Conecta tu cliente {#wire}

Todos los clientes necesitan los mismos cuatro datos, con los nombres que cada uno les dé.

|                |                                                                        |
| -------------- | ---------------------------------------------------------------------- |
| **URL**        | `{{value:url}}`                                                        |
| **Transporte** | HTTP con streaming: no SSE y no un comando stdio                       |
| **Cabecera**   | `{{value:authHeader}}: {{value:authScheme}} <token>`, en cada petición |
| **Token**      | `{{value:tokenPlaceholder}}`: el que creaste en el paso 1              |

Mantén el token fuera de cualquier archivo que tu repositorio rastree. Cuando un cliente puede leerlo de tu entorno o pedírtelo, el bloque de abajo usa eso en lugar de un valor literal, y por eso dos de ellos nombran `{{value:tokenEnvVar}}` en lugar de un secreto.

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

O con un solo comando: `{{value:claudeCodeTokenCommand}}` · [Documentación de Claude Code]({{value:clientClaudeCodeDocsUrl}}) · formato comprobado {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor interpola `${env:…}`, así que el token permanece en tu entorno y fuera del archivo. · [Documentación de Cursor]({{value:clientCursorDocsUrl}}) · formato comprobado {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code te pide el token la primera vez que arranca el servidor y lo guarda de forma segura: no se escribe nada secreto en el archivo. · [Documentación de VS Code]({{value:clientVscodeDocsUrl}}) · formato comprobado {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` recibe el NOMBRE de la variable, no el token. · [Documentación de Codex CLI]({{value:clientCodexDocsUrl}}) · formato comprobado {{value:clientsCheckedOn}}

### Cualquier otro cliente HTTP con streaming {#client-other}

{{slot:client-other}}

Windsurf, Zed, Cline, Goose o algo que hayas escrito tú: los mismos cuatro datos con otros nombres de clave. · [Documentación de cualquier otro cliente HTTP con streaming]({{value:clientOtherDocsUrl}}) · formato comprobado {{value:clientsCheckedOn}}

## 3. Comprueba la conexión {#check}

Reinicia el cliente y pregúntale qué herramientas tiene; el servidor responde con el catálogo completo, acotado a tu concesión. Para comprobar el propio endpoint antes de involucrar a un cliente, pregúntaselo directamente: es el mismo handshake, con el token en tu entorno.

{{slot:verify}}

**Una respuesta de no autorizado trata del TOKEN, no de la conexión.** Un token ausente, mal formado, desconocido, revocado o caducado devuelve el mismo rechazo, deliberadamente: distinguirlos convertiría el endpoint en un oráculo que responde si existe un secreto. Comprueba que la cabecera se escribe `{{value:authHeader}}`, que el valor empieza por `{{value:authScheme}}` y que el token no se ha revocado en Motir.

## Qué puede invocar una conexión {#scopes}

Cada herramienta está controlada por un alcance. Los permisos que aprobaste para una aplicación conectada, o la concesión que lleva un token, deciden qué herramientas puede invocar, de modo que la lista que muestra tu cliente ya está acotada a ti. Esto se lee del propio Motir cuando se solicita esta página, así que es lo que el servidor ofrece ahora mismo.

{{part:what-next}}

[//]: # 'Placed after the scope table, which the page generates from the published catalogue.'

## Siguientes pasos {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools) enumera todas las herramientas que expone el servidor con los argumentos que admiten. [La referencia completa]({{value:referenceUrl}}) en motir-core lleva la descripción completa de cada herramienta. Manejar los mismos datos desde un terminal es la [{{value:cliPage}}](/docs/cli).

{{part:column-scope}}

[//]: # 'A heading of the scope table. Each of the five parts below is one short label that stays a single word or phrase, with no sentence around it.'

Alcance

{{part:column-gates}}

Qué controla

{{part:column-default}}

Por defecto

{{part:granted}}

Concedido

{{part:off-by-default}}

Desactivado por defecto

{{part:unreachable}}

[//]: # 'Shown in place of the scope table when the catalogue cannot be fetched. Keep `tools/list` literal.'

La tabla de alcances no está disponible temporalmente. Se deriva del catálogo que publica Motir y nunca se copia aquí, así que no hay nada que mostrarte mientras tanto: un handshake `tools/list` con tu propio token responde a la misma pregunta para ese token.
