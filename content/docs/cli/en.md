The Motir CLI talks to the same MCP server Motir agent uses. It automates the planning-and-execution loop over a workspace-scoped token: a run claims the next ready work item, fetches the server-generated prompt, and dispatches an agent in a sandbox to execute it. The work item is the system of record; the CLI is the driver.

{{part:meta}}

{{value:packageName}} · version {{value:packageVersion}} · {{value:commandCount}} commands

{{part:reference}}

## Install {#install}

Node {{value:nodeRequirement}}. Install it globally, or run it once without installing.

{{slot:install}}

## Authenticate {#authenticate}

The device flow is the shortest path: it shows a code, opens Motir, and waits for you to approve it. If you already hold a personal access token, hand it over directly instead. Either way the CLI talks to {{value:defaultServer}} unless you point it somewhere else.

{{slot:authenticate}}

Then bind a folder to a project, and check the setup before the first run.

{{slot:link-and-check}}

## Commands {#commands}

Every command the CLI registers, in the order `motir help` prints them, generated from the catalogue the binary itself declares — so this list cannot fall behind a release. It describes {{value:packageName}}@{{value:packageVersion}}.

{{slot:commands}}

## Where Motir keeps things {#where-motir-keeps-things}

Three files, and only one of them holds a secret — it is not the one that lives in your repository. Every path below can be relocated; `motir help files` prints them from the binary you actually installed, with the variable that moves each one.

- `~/.config/motir/config.json` **— secret, never commit**
  The credential store: the only file a personal access token is ever written to, `chmod 600` inside a `0700` directory, keyed by server URL so one machine can hold tokens for several Motir servers. It also holds the agent command you configured. Relocate it with `MOTIR_CONFIG_HOME` or `XDG_CONFIG_HOME`.
- `.motir.json` **— no secret, safe to commit**
  The project link at your workspace root: the server, workspace and project this folder is bound to, plus an optional repository override map. It carries no credential, so it belongs in version control. Every command resolves it by walking UPWARD from the current directory, so any command works from inside any checkout under the root.
- `~/.local/state/motir/session-excludes.json` **— no secret**
  The session exclude list: the work items whose dispatch FAILED, so the next run moves past them instead of re-picking the same failure. State rather than a credential, which is why it does not sit beside the token — the sandbox mounts the config directory read-only, and a run must never die because it could not write this file. If it is unwritable Motir warns once and continues. Relocate it with `MOTIR_STATE_HOME`.

## Where a run executes {#where-a-run-executes}

A dispatched agent runs inside a container with your checkouts and your own agent credential — what it provides, what its token refuses, and the failures a first run hits are on the [{{value:sandboxPage}}](/docs/sandbox) page rather than restated here. Wiring an agent to Motir without the CLI is [{{value:mcpPage}}](/docs/mcp), and driving the same work loop over HTTP is the [{{value:apiPage}}](/docs/api). The full command reference — the three run shapes, session branches, the failure policy and troubleshooting — is [docs/cli.md]({{value:cliReferenceUrl}}) in motir-core.

{{part:unreachable}}

The command reference is temporarily unreachable. It is generated from the catalogue the CLI itself declares and is never copied here, so there is nothing to show you in the meantime — `motir help` prints the same table from the binary you have installed.
