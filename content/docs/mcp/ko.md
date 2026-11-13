---
source: 2aa432672926
---

Motir는 Model Context Protocol 서버를 제공합니다. 에이전트와 CLI가 프로젝트 관리 핵심을 읽고 구동하기 위해 호출하는 스트리밍 가능한 HTTP 엔드포인트 하나입니다. Motir 에이전트가 계획을 실행할 때 사용하는 것과 같은 인터페이스입니다. Claude에 추가하는 데는 로그인 한 번이면 되고 토큰은 필요 없습니다. 다른 클라이언트나 파이프라인은 세 단계로 토큰을 사용해 연결합니다.

## Claude에 Motir 추가하기 {#claude}

Motir 계정으로 로그인하고, 워크스페이스를 하나 선택하고, Claude가 그곳에서 할 수 있는 일을 승인합니다. 복사하거나 붙여 넣을 것은 없으며, 발급하거나 안전하게 보관해야 할 토큰도 없습니다.

### claude.ai {#claude-ai}

1. Customize → Connectors를 엽니다.
2. “+”를 클릭한 다음 Add custom connector를 클릭하고, 아래의 서버 URL을 붙여 넣습니다. OAuth client에서는 Use Claude’s published identity를 선택하세요. Motir가 이를 지원하므로 claude.ai에 Detected로 표시됩니다. OAuth client ID와 secret은 비워 두세요. Motir는 둘 다 필요하지 않습니다.
3. Add를 클릭한 다음 Connect를 클릭합니다. Claude가 로그인과 승인을 위해 app.motir.co로 이동시킵니다.

{{slot:claude-ai}}

Team 또는 Enterprise 요금제에서는 Owner가 Organization settings → Connectors → Add → Custom → Web에서 커넥터를 한 번 추가하고, 이후 각 멤버가 자신의 Motir 계정으로 Customize → Connectors에서 Connect를 클릭합니다. · [Anthropic의 claude.ai 문서]({{value:routeClaudeAiDocsUrl}}) · 단계 확인일 {{value:routeClaudeAiCheckedOn}}

### Claude 데스크톱 앱 {#claude-desktop}

1. 이미 claude.ai에서 Motir를 연결했다면 추가할 것이 없습니다. 연결된 커넥터는 웹, 데스크톱 앱, 모바일의 대화에서 사용할 수 있습니다.
2. 데스크톱 앱에서 대신 추가하려면 사이드바에서 Customize를 선택한 다음 Connectors를 선택하고, 같은 URL로 claude.ai 단계를 따르세요.
3. Motir 로그인 페이지가 브라우저에서 열립니다. 그곳에서 승인한 다음 앱으로 돌아오세요.

{{slot:claude-desktop}}

이것은 로컬 데스크톱 확장이 아니라 원격 커넥터입니다. Claude가 Anthropic의 클라우드에서 Motir에 접속하므로 컴퓨터에는 아무것도 설치되지 않습니다. · [Anthropic의 Claude 데스크톱 앱 문서]({{value:routeClaudeDesktopDocsUrl}}) · 단계 확인일 {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. 아래 명령으로 서버를 추가합니다. 헤더도 토큰도 필요 없습니다.
2. Claude Code에서 `/mcp`를 실행하고 `motir`를 선택한 다음, 브라우저에서 로그인을 진행합니다.

{{slot:claude-code}}

Claude 계정으로 Claude Code에 로그인했다면, claude.ai에서 연결한 커넥터는 이미 그곳에서 사용할 수 있습니다. Claude Code용 Motir 플러그인에는 스킬과 함께 이 서버가 포함되어 있습니다. · [Anthropic의 Claude Code 문서]({{value:routeClaudeCodeDocsUrl}}) · 단계 확인일 {{value:routeClaudeCodeCheckedOn}}

### 승인하는 내용과 철회 방법 {#consent}

Motir의 로그인 페이지에는 요청하는 앱의 이름이 표시되고, 워크스페이스를 하나 선택하게 하며, 앱이 원하는 권한이 나열됩니다. 이후 Claude는 해당 워크스페이스에서 승인한 범위 안에서 사용자 권한으로 동작하며, 사용자의 역할이 허용하는 범위를 넘지 않습니다.

claude.ai가 Claude의 공개 ID로 연결하면, Motir는 claude.ai가 그것을 게시하는지 확인하고 로그인 페이지와 연결된 앱에 claude.ai를 확인된 도메인으로 표시합니다. 스스로 등록하는 다른 MCP 클라이언트는 확인되지 않음으로 표시됩니다. 표시되는 이름은 클라이언트가 직접 고른 것이며 Motir가 확인할 수 없기 때문입니다.

Claude는 무언가를 변경하는 도구를 사용하기 전에 먼저 묻습니다. 모든 도구에는 읽기만 하는지, 쓰는지, 삭제하는지가 표시되며, 어느 것이 어느 것인지는 [{{value:mcpToolsPage}}](/docs/mcp/tools)에서 확인할 수 있습니다. Claude Code용 플러그인을 원하시나요? 플러그인에 이 서버가 포함되어 있습니다. [{{value:skillsPage}}](/docs/skills)를 참고하세요.

연결한 모든 앱은 Motir의 설정 → 계정 → 토큰에 있는 [연결된 앱]({{value:connectedAppsUrl}})에 워크스페이스, 권한, 마지막 사용 시점과 함께 나열됩니다. 액세스 취소는 다음 요청부터 해당 앱의 액세스를 끝냅니다.

## 다른 클라이언트와 CI: 토큰 사용 {#token-route}

OAuth 로그인이 없는 클라이언트, 헤드리스 에이전트, CI 파이프라인에는 이 방법을 선택하세요. 같은 서버이며, 개인 액세스 토큰이 로그인을 대신합니다.

## 이 서버인가, REST API인가? {#fork}

둘 다 같은 데이터에 접근하며 같은 자격 증명을 사용합니다. 대상으로 하는 사용자가 다르며, 중요한 차이는 각각이 사용자 모르게 바뀌는 것에 대해 무엇을 약속하느냐입니다.

|                | {{value:mcpPage}}                                                                                           | {{value:apiPage}}                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **엔드포인트** | `POST {{value:endpointPath}}`                                                                               | `/api/v1/…`                                                                        |
| **대상**       | 사용자가 제어하는 에이전트. 실행 시점에 도구 설명을 읽습니다.                                               | 사용자가 배포하는 클라이언트. 고정된 형태에 맞춰 한 번 작성한 코드입니다.          |
| **안정성**     | 변경될 것으로 예상됩니다. 설명을 고쳐 쓰거나 인수 이름을 바꾸는 것이 에이전트의 동작을 조정하는 방법입니다. | 추가만 합니다. 호환성을 깨는 변경은 `/api/v2`를 새로 만들며, v1은 약속을 지킵니다. |
| **형태**       | 같습니다. MCP 페이로드는 v1 응답 스키마에서 파생되므로, 둘은 증명 가능하게 동일한 객체를 설명합니다.        | 같으며, MCP가 파생되는 원본입니다.                                                 |
| **인증**       | 개인 액세스 토큰 하나, 범위 집합 하나.                                                                      | 같은 자격 증명이 둘 다에서 작동합니다.                                             |

에이전트를 연결하는 중이라면 이 페이지에 머무르세요. 다른 사람들이 설치하는 소프트웨어를 만드는 중이라면 [{{value:apiPage}}](/docs/api)가 나머지 절반이며, 사용자 모르게 바뀌지 않겠다고 약속하는 쪽입니다.

## 1. 토큰 발급 {#token}

모든 요청에는 Motir의 설정 → 계정 → 토큰에서 발급한 개인 액세스 토큰이 포함됩니다. 토큰이 연결될 워크스페이스를 선택하고 작업에 필요한 가장 좁은 범위 집합을 부여하세요. 각 범위가 무엇을 제어하는지는 이 페이지 맨 아래의 표에 있습니다. 부여된 권한은 사용자의 역할을 좁힐 뿐 넓히지 않으므로, 토큰은 사용자가 할 수 없는 일을 절대 할 수 없습니다.

비밀 값은 토큰을 만들 때 한 번만 표시됩니다. 그때 복사해 두세요. 다시 읽을 방법은 없으며, 잃어버린 토큰은 복구하는 것이 아니라 새로 발급합니다.

## 2. 클라이언트 연결 {#wire}

모든 클라이언트에는 이름만 다를 뿐 같은 네 가지 정보가 필요합니다.

|               |                                                                  |
| ------------- | ---------------------------------------------------------------- |
| **URL**       | `{{value:url}}`                                                  |
| **전송 방식** | 스트리밍 가능한 HTTP. SSE도 아니고 stdio 명령도 아닙니다         |
| **헤더**      | 모든 요청에 `{{value:authHeader}}: {{value:authScheme}} <token>` |
| **토큰**      | `{{value:tokenPlaceholder}}` — 1단계에서 발급한 토큰             |

토큰을 저장소가 추적하는 파일에 넣지 마세요. 클라이언트가 환경 변수에서 읽거나 입력을 요청할 수 있는 경우, 아래 블록은 실제 값 대신 그 방식을 사용합니다. 그래서 그중 둘은 비밀 값이 아니라 `{{value:tokenEnvVar}}` 변수를 가리킵니다.

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

또는 명령 하나로: `{{value:claudeCodeTokenCommand}}` · [Claude Code 문서]({{value:clientClaudeCodeDocsUrl}}) · 형식 확인일 {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor는 `${env:…}`를 치환하므로 토큰이 파일이 아니라 환경에 남습니다. · [Cursor 문서]({{value:clientCursorDocsUrl}}) · 형식 확인일 {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code는 서버를 처음 시작할 때 토큰을 물어보고 안전하게 저장하므로, 파일에는 비밀 정보가 기록되지 않습니다. · [VS Code 문서]({{value:clientVscodeDocsUrl}}) · 형식 확인일 {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}`에는 토큰이 아니라 변수의 이름을 지정합니다. · [Codex CLI 문서]({{value:clientCodexDocsUrl}}) · 형식 확인일 {{value:clientsCheckedOn}}

### 그 밖의 스트리밍 가능한 HTTP 클라이언트 {#client-other}

{{slot:client-other}}

Windsurf, Zed, Cline, Goose, 또는 직접 작성한 것까지, 키 이름만 다를 뿐 같은 네 가지 정보를 사용합니다. · [그 밖의 스트리밍 가능한 HTTP 클라이언트 문서]({{value:clientOtherDocsUrl}}) · 형식 확인일 {{value:clientsCheckedOn}}

## 3. 연결 확인 {#check}

클라이언트를 다시 시작하고 어떤 도구가 있는지 물어보세요. 서버가 사용자에게 부여된 권한 범위로 좁혀진 전체 카탈로그로 응답합니다. 클라이언트를 거치지 않고 엔드포인트 자체를 확인하려면 직접 요청하세요. 토큰을 환경에 둔 상태로, 같은 핸드셰이크를 수행합니다.

{{slot:verify}}

**인증되지 않았다는 응답은 연결이 아니라 토큰에 대한 것입니다.** 토큰이 없거나, 형식이 잘못되었거나, 알 수 없거나, 폐기되었거나, 만료된 경우에는 모두 같은 거부 응답이 의도적으로 반환됩니다. 이를 구분하면 엔드포인트가 비밀 값의 존재 여부에 답하는 판별기가 되어 버립니다. 헤더 이름이 정확히 `{{value:authHeader}}`인지, 값이 `{{value:authScheme}}` 형식으로 시작하는지, Motir에서 토큰이 폐기되지 않았는지 확인하세요.

## 연결이 호출할 수 있는 것 {#scopes}

모든 도구는 범위로 제어됩니다. 연결된 앱에 대해 승인한 권한이나 토큰이 가진 권한이 어떤 도구를 호출할 수 있는지 결정하므로, 클라이언트에 표시되는 목록은 이미 사용자에게 맞게 좁혀진 것입니다. 이 내용은 페이지를 요청할 때 Motir에서 직접 읽어 오므로, 서버가 지금 제공하는 내용 그대로입니다.

{{part:what-next}}

[//]: # 'Placed after the scope table, which the page generates from the published catalogue.'

## 다음 단계 {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools)는 서버가 제공하는 모든 도구와 각 도구가 받는 인수를 나열합니다. motir-core의 [전체 참조]({{value:referenceUrl}})에는 각 도구의 전체 설명이 있습니다. 같은 데이터를 터미널에서 구동하려면 [{{value:cliPage}}](/docs/cli)를 참고하세요.

{{part:column-scope}}

[//]: # 'A heading of the scope table. Each of the five parts below is one short label that stays a single word or phrase, with no sentence around it.'

범위

{{part:column-gates}}

제어하는 대상

{{part:column-default}}

기본값

{{part:granted}}

부여됨

{{part:off-by-default}}

기본적으로 꺼짐

{{part:unreachable}}

[//]: # 'Shown in place of the scope table when the catalogue cannot be fetched. Keep `tools/list` literal.'

범위 표를 일시적으로 가져올 수 없습니다. 이 표는 Motir가 게시하는 카탈로그에서 도출되며 여기에 복사해 두지 않으므로, 그동안 보여 드릴 내용이 없습니다. 자신의 토큰으로 `tools/list` 핸드셰이크를 수행하면 해당 토큰에 대한 같은 질문에 답이 나옵니다.
