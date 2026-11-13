---
source: 2aa432672926
---

Motir 提供一个模型上下文协议（MCP）服务器——一个 streamable-HTTP 端点，智能体和 CLI 通过它读取并驱动项目管理核心。Motir 智能体执行计划时使用的也是这个接口。把它添加到 Claude 只需一次登录，无需令牌；任何其他客户端或流水线，则通过三个步骤使用令牌连接。

## 将 Motir 添加到 Claude {#claude}

用你的 Motir 账户登录，选择一个工作区，并批准 Claude 在其中可以执行的操作。无需复制或粘贴任何内容——没有需要生成或妥善保管的令牌。

### claude.ai {#claude-ai}

1. 打开“自定义”→“连接器”。
2. 点击“+”，再点击“添加自定义连接器”，并粘贴下面的服务器 URL。在“OAuth 客户端”下，选择“使用 Claude 公开发布的身份”——claude.ai 会将其标记为“已检测到”，因为 Motir 支持它。“OAuth 客户端 ID”和密钥请留空——Motir 两者都不需要。
3. 点击“添加”，再点击“连接”。Claude 会把你带到 app.motir.co 登录并批准。

{{slot:claude-ai}}

在 Team 或 Enterprise 套餐中，由所有者在“组织设置”→“连接器”→“添加”→“自定义”→“Web”下添加一次连接器，之后每位成员在“自定义”→“连接器”下点击“连接”，使用各自的 Motir 账户。 · [Anthropic 的 claude.ai 文档]({{value:routeClaudeAiDocsUrl}}) · 步骤核对于 {{value:routeClaudeAiCheckedOn}}

### Claude 桌面应用 {#claude-desktop}

1. 如果你已在 claude.ai 上连接过 Motir，就无需再添加：已连接的连接器在网页、桌面应用和手机上的对话中都可用。
2. 若想改为从桌面应用添加，请在侧边栏选择“自定义”，再选择“连接器”，然后使用相同的 URL，按 claude.ai 的步骤操作。
3. Motir 的登录页面会在浏览器中打开；在那里批准后返回应用。

{{slot:claude-desktop}}

这是一个远程连接器，而不是本地桌面扩展：Claude 从 Anthropic 的云端访问 Motir，所以你的机器上不会安装任何东西。 · [Anthropic 的 Claude 桌面应用文档]({{value:routeClaudeDesktopDocsUrl}}) · 步骤核对于 {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. 用下面的命令添加服务器——不带请求头，也不带令牌。
2. 在 Claude Code 中运行 `/mcp`，选择 `motir`，并在浏览器中完成登录。

{{slot:claude-code}}

如果你是用 Claude 账户登录的 Claude Code，那么你在 claude.ai 上连接过的连接器在这里已经可用。Claude Code 的 Motir 插件会连同技能一起带上这个服务器。 · [Anthropic 的 Claude Code 文档]({{value:routeClaudeCodeDocsUrl}}) · 步骤核对于 {{value:routeClaudeCodeCheckedOn}}

### 你批准了什么，以及如何收回 {#consent}

Motir 上的登录页面会写明是哪个应用在发出请求，让你选择一个工作区，并列出它想要的权限。随后 Claude 在该工作区内以你的身份行事，不超出你批准的范围——也永远不会超出你自己的角色所允许的范围。

当 claude.ai 使用 Claude 公开发布的身份连接时，Motir 会核实 claude.ai 确实发布了该身份，并在登录页面和“已连接的应用”中把 claude.ai 显示为已验证的域名。任何自行注册的其他 MCP 客户端都显示为“未验证”：它显示的名称是它自己选的，Motir 无法核实。

在使用任何会更改内容的工具之前，Claude 会先询问：每个工具都会注明它只是读取、写入还是删除，[{{value:mcpToolsPage}}](/docs/mcp/tools) 则显示了哪个是哪种。想改用 Claude Code 的插件？它会连同这个服务器一起带上——见 [{{value:skillsPage}}](/docs/skills)。

你连接的每个应用都列在 Motir 中“设置”→“账户”→“令牌”下的[已连接的应用]({{value:connectedAppsUrl}})里，并附有它的工作区、权限以及上次使用的时间。选择“撤销”后，它的访问权限在下一次请求时结束。

## 其他客户端与 CI：使用令牌 {#token-route}

如果客户端不支持 OAuth 登录、是无头智能体或 CI 流水线，请选这条路线。服务器是同一个；由个人访问令牌代替登录。

## 使用这个服务器，还是 REST API？ {#fork}

两者面向同一份数据，使用同一个凭据。它们是为不同的使用者构建的，关键区别在于各自对“会在你不知情时发生变化”做出了怎样的承诺。

|              | {{value:mcpPage}}                                                          | {{value:apiPage}}                                     |
| ------------ | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| **端点**     | `POST {{value:endpointPath}}`                                              | `/api/v1/…`                                           |
| **适用对象** | 你自己掌控的智能体——它在运行时读取工具描述。                               | 你要发布的客户端——针对固定结构一次写成的代码。        |
| **稳定性**   | 预期会变化。改写描述或重命名参数，正是调校智能体行为的方式。               | 只增不减。破坏性变更会产生 `/api/v2`；v1 保持其承诺。 |
| **结构**     | 相同。MCP 的载荷由 v1 响应模式派生，因此两者描述的是可证明完全一致的对象。 | 相同，并且它是 MCP 所派生自的来源。                   |
| **认证**     | 一个个人访问令牌，一组权限范围。                                           | 同一个凭据在两者上都有效。                            |

要接入智能体？留在这里。要编写供他人安装的软件？[{{value:apiPage}}](/docs/api) 是另一半——它承诺不会在你不知情时发生变化。

## 1. 生成令牌 {#token}

每个请求都带有一个个人访问令牌，在 Motir 的“设置”→“账户”→“令牌”下生成。选择它所绑定的工作区，并授予能完成任务的最窄权限范围集合——本页底部的表格说明了每个权限范围控制什么。授权只会收窄你自己的角色而不会放宽，所以令牌永远不能做你本人做不到的事。

密钥只在创建令牌时显示一次。请当时就复制；之后无法再次读取，丢失的令牌只能替换，无法找回。

## 2. 配置客户端 {#wire}

每个客户端都需要同样的四项信息，只是叫法各不相同。

|              |                                                                      |
| ------------ | -------------------------------------------------------------------- |
| **URL**      | `{{value:url}}`                                                      |
| **传输方式** | Streamable HTTP——不是 SSE，也不是 stdio 命令                         |
| **请求头**   | `{{value:authHeader}}: {{value:authScheme}} <token>`，每个请求都带上 |
| **令牌**     | `{{value:tokenPlaceholder}}`——你在第 1 步中生成的那个                |

不要把令牌放进仓库跟踪的文件里。客户端能从环境变量读取令牌或提示你输入时，下面的代码块就采用这种方式，而不是写死的字面值——所以其中两个写的是 `{{value:tokenEnvVar}}`，而不是密钥本身。

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

或者一条命令：`{{value:claudeCodeTokenCommand}}` · [Claude Code 文档]({{value:clientClaudeCodeDocsUrl}}) · 格式核对于 {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor 会对 `${env:…}` 做插值，所以令牌留在环境变量中，不会出现在文件里。 · [Cursor 文档]({{value:clientCursorDocsUrl}}) · 格式核对于 {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code 会在服务器首次启动时提示你输入令牌并安全地保存——不会有任何机密写入文件。 · [VS Code 文档]({{value:clientVscodeDocsUrl}}) · 格式核对于 {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` 接收的是变量的名称，而不是令牌本身。 · [Codex CLI 文档]({{value:clientCodexDocsUrl}}) · 格式核对于 {{value:clientsCheckedOn}}

### 其他任意 Streamable HTTP 客户端 {#client-other}

{{slot:client-other}}

Windsurf、Zed、Cline、Goose，或者你自己写的程序——同样的四项信息，只是键名不同。 · [其他任意 Streamable HTTP 客户端的文档]({{value:clientOtherDocsUrl}}) · 格式核对于 {{value:clientsCheckedOn}}

## 3. 检查连接 {#check}

重启客户端，问它有哪些工具；服务器会返回按你的授权范围过滤后的完整目录。若想在接入客户端之前先检查端点本身，可以直接向它发问——这是同样的握手，令牌放在你的环境变量中。

{{slot:verify}}

**未授权的响应与令牌有关，而与配置无关。** 令牌缺失、格式错误、未知、已撤销或已过期，都会返回同样的拒绝，这是有意为之——如果区分它们，端点就会变成一个能回答“某个密钥是否存在”的探测器。请检查请求头拼写为 `{{value:authHeader}}`，值以 `{{value:authScheme}}` 开头，并确认令牌没有在 Motir 中被撤销。

## 连接可以调用什么 {#scopes}

每个工具都由一个权限范围控制。你为已连接的应用批准的权限，或令牌所携带的授权，决定了它可以调用哪些工具——所以你的客户端显示的列表已经按你的权限过滤。这些内容在请求本页时直接从 Motir 读取，因此就是服务器当前实际发布的内容。

{{part:what-next}}

[//]: # '放在范围表之后，该表由页面根据已发布的目录生成。'

## 下一步 {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools) 列出服务器公开的每一个工具及其接收的参数。motir-core 中的[完整参考]({{value:referenceUrl}})包含每个工具的完整描述。若想改从终端驱动同样的数据，见 [{{value:cliPage}}](/docs/cli)。

{{part:column-scope}}

[//]: # '范围表的一个表头。下面五个部分各是一个简短标签，保持为单个词或短语，前后不加句子。'

权限范围

{{part:column-gates}}

控制的内容

{{part:column-default}}

默认

{{part:granted}}

已授予

{{part:off-by-default}}

默认关闭

{{part:unreachable}}

[//]: # '在无法获取目录时，用于代替范围表显示。请保持 `tools/list` 原样。'

范围表暂时无法访问。它由 Motir 发布的目录派生而来，从不在此处复制，因此眼下没有可展示的内容——用你自己的令牌发起一次 `tools/list` 握手，就能回答同样的疑问。
