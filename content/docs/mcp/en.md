Motir exposes a Model Context Protocol server — one streamable-HTTP endpoint that agents and the CLI call to read and drive the project-management core. It is the same surface Motir agent uses to execute a plan. Adding it to Claude takes one sign-in and no token; any other client, or a pipeline, connects with a token in three steps.

## Add Motir to Claude {#claude}

You sign in with your Motir account, pick one workspace and approve what Claude may do there. Nothing is copied or pasted — there is no token to mint or keep safe.

### claude.ai {#claude-ai}

1. Open Customize → Connectors.
2. Click “+”, then Add custom connector, and paste the server URL below. Under OAuth client, choose Use Claude’s published identity — claude.ai marks it Detected, because Motir supports it. Leave the OAuth client ID and secret empty — Motir needs neither.
3. Click Add, then Connect. Claude sends you to app.motir.co to sign in and approve.

{{slot:claude-ai}}

On a Team or Enterprise plan an Owner adds the connector once, under Organization settings → Connectors → Add → Custom → Web, and each member then clicks Connect under Customize → Connectors with their own Motir account. · [Anthropic’s claude.ai documentation]({{value:routeClaudeAiDocsUrl}}) · steps checked {{value:routeClaudeAiCheckedOn}}

### Claude desktop app {#claude-desktop}

1. If you already connected Motir on claude.ai, there is nothing to add: a connected connector is available in your conversations on the web, the desktop app and mobile.
2. To add it from the desktop app instead, select Customize in the sidebar, then Connectors, and follow the claude.ai steps with the same URL.
3. The Motir sign-in page opens in your browser; approve there and return to the app.

{{slot:claude-desktop}}

This is a remote connector, not a local desktop extension: Claude reaches Motir from Anthropic’s cloud, so nothing is installed on your machine. · [Anthropic’s Claude desktop app documentation]({{value:routeClaudeDesktopDocsUrl}}) · steps checked {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. Add the server with the command below — no header and no token.
2. In Claude Code, run `/mcp`, select `motir` and follow the sign-in in your browser.

{{slot:claude-code}}

If you signed Claude Code in with your Claude account, a connector you connected on claude.ai is already available there. The Motir plugin for Claude Code brings this server with it, beside the skills. · [Anthropic’s Claude Code documentation]({{value:routeClaudeCodeDocsUrl}}) · steps checked {{value:routeClaudeCodeCheckedOn}}

### What you approve, and how to take it back {#consent}

The sign-in page on Motir names the app that is asking, has you choose one workspace, and lists the permissions it wants. Claude then acts as you in that workspace, within what you approved — never beyond what your own role allows.

When claude.ai connects with Claude’s published identity, Motir checks that claude.ai publishes it, and shows claude.ai as a verified domain on the sign-in page and in Connected apps. Any other MCP client that registers itself reads Unverified: the name it shows is one it chose, and Motir cannot check it.

Claude asks before it uses a tool that changes anything: every tool says whether it only reads, writes or deletes, and [{{value:mcpToolsPage}}](/docs/mcp/tools) shows which is which. Want the plugin for Claude Code instead? It brings this server with it — [{{value:skillsPage}}](/docs/skills).

Every app you connect is listed under [Connected apps]({{value:connectedAppsUrl}}), on Settings → Account → Tokens in Motir, with its workspace, permissions and when it was last used. Revoke ends its access at its next request.

## Other clients and CI: use a token {#token-route}

Choose this route for a client without OAuth sign-in, a headless agent, or a CI pipeline. It is the same server; a personal access token stands in for the sign-in.

## This server, or the REST API? {#fork}

Both speak to the same data and take the same credential. They are built for different consumers, and the difference that matters is what each promises about changing under you.

|               | {{value:mcpPage}}                                                                                                | {{value:apiPage}}                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Endpoint**  | `POST {{value:endpointPath}}`                                                                                    | `/api/v1/…`                                                             |
| **Built for** | An agent you control — it reads tool descriptions at run time.                                                   | A client you ship — code written once against a fixed shape.            |
| **Stability** | Expected to change. Rewording a description or renaming an argument is how an agent’s behaviour gets tuned.      | Additive only. A breaking change mints `/api/v2`; v1 keeps its promise. |
| **Shape**     | The same. MCP payloads are derived from the v1 response schemas, so the two describe provably identical objects. | The same, and it is the source the MCP derives from.                    |
| **Auth**      | One personal access token, one scope set.                                                                        | The same credential works on both.                                      |

Wiring an agent? Stay here. Writing software other people install? The [{{value:apiPage}}](/docs/api) is the other half — it is the one that promises not to change under you.

## 1. Mint a token {#token}

Every request carries a personal access token, minted in Motir under Settings → Account → Tokens. Choose the workspace it is bound to and grant it the narrowest scope set that does the job — the table at the bottom of this page says what each scope gates. A grant narrows your own role and never widens it, so a token can never do something you could not.

The secret is shown once, when the token is created. Copy it then; there is no way to read it again, and a lost token is replaced rather than recovered.

## 2. Wire your client {#wire}

Every client needs the same four facts under whatever names it gives them.

|               |                                                                        |
| ------------- | ---------------------------------------------------------------------- |
| **URL**       | `{{value:url}}`                                                        |
| **Transport** | Streamable HTTP — not SSE, and not a stdio command                     |
| **Header**    | `{{value:authHeader}}: {{value:authScheme}} <token>`, on every request |
| **Token**     | `{{value:tokenPlaceholder}}` — the one you minted in step 1            |

Keep the token out of a file your repository tracks. Where a client can read it from your environment or prompt you for it, the block below uses that instead of a literal — which is why two of them name `{{value:tokenEnvVar}}` rather than a secret.

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

Or one command: `{{value:claudeCodeTokenCommand}}` · [Claude Code documentation]({{value:clientClaudeCodeDocsUrl}}) · format checked {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor interpolates `${env:…}`, so the token stays in your environment and out of the file. · [Cursor documentation]({{value:clientCursorDocsUrl}}) · format checked {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code prompts for the token the first time the server starts and stores it securely — nothing secret is written to the file. · [VS Code documentation]({{value:clientVscodeDocsUrl}}) · format checked {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` takes the variable’s NAME, not the token. · [Codex CLI documentation]({{value:clientCodexDocsUrl}}) · format checked {{value:clientsCheckedOn}}

### Any other streamable-HTTP client {#client-other}

{{slot:client-other}}

Windsurf, Zed, Cline, Goose, or something you wrote yourself — the same four facts under different key names. · [Any other streamable-HTTP client documentation]({{value:clientOtherDocsUrl}}) · format checked {{value:clientsCheckedOn}}

## 3. Check the connection {#check}

Restart the client and ask it what tools it has; the server answers with the whole catalogue, scoped to your grant. To check the endpoint itself before involving a client, ask it directly — this is the same handshake, with the token in your environment.

{{slot:verify}}

**An unauthorized answer is about the TOKEN, not the wiring.** A missing, malformed, unknown, revoked or expired token all return the same refusal, deliberately — distinguishing them would turn the endpoint into an oracle that answers whether a secret exists. Check that the header is spelled `{{value:authHeader}}`, that the value begins `{{value:authScheme}}`, and that the token has not been revoked in Motir.

## What a connection may call {#scopes}

Every tool is gated by a scope. The permissions you approved for a connected app, or the grant a token carries, decide which tools it may call — so the list your client shows is already scoped to you. These are read from Motir itself when this page is requested, so they are whatever the server ships right now.

{{part:what-next}}

[//]: # 'Placed after the scope table, which the page generates from the published catalogue.'

## What next {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools) lists every tool the server exposes with the arguments it takes. [The full reference]({{value:referenceUrl}}) in motir-core carries each tool’s complete description. Driving the same data from a terminal instead is the [{{value:cliPage}}](/docs/cli).

{{part:column-scope}}

[//]: # 'A heading of the scope table. Each of the five parts below is one short label that stays a single word or phrase, with no sentence around it.'

Scope

{{part:column-gates}}

What it gates

{{part:column-default}}

Default

{{part:granted}}

Granted

{{part:off-by-default}}

Off by default

{{part:unreachable}}

[//]: # 'Shown in place of the scope table when the catalogue cannot be fetched. Keep `tools/list` literal.'

The scope table is temporarily unreachable. It is derived from the catalogue Motir publishes and is never copied here, so there is nothing to show you in the meantime — a `tools/list` handshake with your own token answers the same question for that token.
