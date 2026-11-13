---
source: 2aa432672926
---

Motir 提供一個模型上下文協議（MCP）伺服器——一個 streamable-HTTP 端點，代理程式和 CLI 透過它讀取並驅動專案管理核心。Motir 代理程式執行計畫時使用的也是這個介面。把它新增到 Claude 只需一次登入，無需權杖；任何其他用戶端或管線，則透過三個步驟使用權杖連線。

## 將 Motir 新增到 Claude {#claude}

用你的 Motir 帳戶登入，選擇一個工作區，並核准 Claude 在其中可以執行的操作。無需複製或貼上任何內容——沒有需要產生或妥善保管的權杖。

### claude.ai {#claude-ai}

1. 開啟「自訂」→「連接器」。
2. 點選「+」，再點選「新增自訂連接器」，並貼上下面的伺服器 URL。在「OAuth 用戶端」下，選擇「使用 Claude 公開發布的身份」——claude.ai 會將其標記為「已偵測到」，因為 Motir 支援它。「OAuth 用戶端 ID」和金鑰請留空——Motir 兩者都不需要。
3. 點選「新增」，再點選「連線」。Claude 會把你帶到 app.motir.co 登入並核准。

{{slot:claude-ai}}

在 Team 或 Enterprise 方案中，由擁有者在「組織設定」→「連接器」→「新增」→「自訂」→「Web」下新增一次連接器，之後每位成員在「自訂」→「連接器」下點選「連線」，使用各自的 Motir 帳戶。 · [Anthropic 的 claude.ai 文件]({{value:routeClaudeAiDocsUrl}}) · 步驟核對於 {{value:routeClaudeAiCheckedOn}}

### Claude 桌面應用程式 {#claude-desktop}

1. 如果你已在 claude.ai 上連線過 Motir，就無需再新增：已連線的連接器在網頁、桌面應用程式和手機上的對話中都可用。
2. 若想改為從桌面應用程式新增，請在側邊欄選擇「自訂」，再選擇「連接器」，然後使用相同的 URL，按 claude.ai 的步驟操作。
3. Motir 的登入頁面會在瀏覽器中開啟；在那裡核准後回到應用程式。

{{slot:claude-desktop}}

這是一個遠端連接器，而不是本機桌面擴充：Claude 從 Anthropic 的雲端存取 Motir，所以你的機器上不會安裝任何東西。 · [Anthropic 的 Claude 桌面應用程式文件]({{value:routeClaudeDesktopDocsUrl}}) · 步驟核對於 {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. 用下面的指令新增伺服器——不帶請求標頭，也不帶權杖。
2. 在 Claude Code 中執行 `/mcp`，選擇 `motir`，並在瀏覽器中完成登入。

{{slot:claude-code}}

如果你是用 Claude 帳戶登入的 Claude Code，那麼你在 claude.ai 上連線過的連接器在這裡已經可用。Claude Code 的 Motir 外掛會連同技能一起帶上這個伺服器。 · [Anthropic 的 Claude Code 文件]({{value:routeClaudeCodeDocsUrl}}) · 步驟核對於 {{value:routeClaudeCodeCheckedOn}}

### 你核准了什麼，以及如何收回 {#consent}

Motir 上的登入頁面會寫明是哪個應用程式在發出請求，讓你選擇一個工作區，並列出它想要的權限。隨後 Claude 在該工作區內以你的身份行事，不超出你核准的範圍——也永遠不會超出你自己的角色所允許的範圍。

當 claude.ai 使用 Claude 公開發布的身份連線時，Motir 會核實 claude.ai 確實釋出了該身份，並在登入頁面和「已連線的應用程式」中把 claude.ai 顯示為已驗證的網域。任何自行註冊的其他 MCP 用戶端都顯示為「未驗證」：它顯示的名稱是它自己選的，Motir 無法核實。

在使用任何會更改內容的工具之前，Claude 會先詢問：每個工具都會註明它只是讀取、寫入還是刪除，[{{value:mcpToolsPage}}](/docs/mcp/tools) 則顯示了哪個是哪種。想改用 Claude Code 的外掛？它會連同這個伺服器一起帶上——見 [{{value:skillsPage}}](/docs/skills)。

你連線的每個應用程式都列在 Motir 中「設定」→「帳戶」→「權杖」下的[已連線的應用程式]({{value:connectedAppsUrl}})裡，並附有它的工作區、權限以及上次使用的時間。選擇「撤銷」後，它的存取權限在下一次請求時結束。

## 其他用戶端與 CI：使用權杖 {#token-route}

如果用戶端不支援 OAuth 登入、是無頭代理程式或 CI 管線，請選這條路線。伺服器是同一個；由個人存取權杖代替登入。

## 使用這個伺服器，還是 REST API？ {#fork}

兩者面向同一份資料，使用同一個憑證。它們是為不同的使用者建置的，關鍵區別在於各自對「會在你不知情時發生變化」做出了怎樣的承諾。

|              | {{value:mcpPage}}                                                          | {{value:apiPage}}                                     |
| ------------ | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| **端點**     | `POST {{value:endpointPath}}`                                              | `/api/v1/…`                                           |
| **適用物件** | 你自己掌控的代理程式——它在執行時讀取工具描述。                             | 你要釋出的用戶端——針對固定結構一次寫成的程式碼。      |
| **穩定性**   | 預期會變化。改寫描述或重新命名參數，正是調校代理程式行為的方式。           | 只增不減。破壞性變更會產生 `/api/v2`；v1 保持其承諾。 |
| **結構**     | 相同。MCP 的酬載由 v1 回應模式衍生，因此兩者描述的是可證明完全一致的物件。 | 相同，並且它是 MCP 所衍生自的來源。                   |
| **認證**     | 一個個人存取權杖，一組權限範圍。                                           | 同一個憑證在兩者上都有效。                            |

要串接代理程式？留在這裡。要撰寫供他人安裝的軟體？[{{value:apiPage}}](/docs/api) 是另一半——它承諾不會在你不知情時發生變化。

## 1. 產生權杖 {#token}

每個請求都帶有一個個人存取權杖，在 Motir 的「設定」→「帳戶」→「權杖」下產生。選擇它所繫結的工作區，並授予能完成工作的最窄權限範圍集合——本頁底部的表格說明了每個權限範圍控制什麼。授權只會收窄你自己的角色而不會放寬，所以權杖永遠不能做你本人做不到的事。

金鑰只在建立權杖時顯示一次。請當時就複製；之後無法再次讀取，遺失的權杖只能替換，無法找回。

## 2. 設定用戶端 {#wire}

每個用戶端都需要同樣的四項資訊，只是叫法各不相同。

|              |                                                                      |
| ------------ | -------------------------------------------------------------------- |
| **URL**      | `{{value:url}}`                                                      |
| **傳輸方式** | Streamable HTTP——不是 SSE，也不是 stdio 指令                         |
| **請求標頭** | `{{value:authHeader}}: {{value:authScheme}} <token>`，每個請求都帶上 |
| **權杖**     | `{{value:tokenPlaceholder}}`——你在第 1 步中產生的那個                |

不要把權杖放進儲存庫追蹤的檔案裡。用戶端能從環境變數讀取權杖或提示你輸入時，下面的程式碼區塊就採用這種方式，而不是寫死的字面值——所以其中兩個寫的是 `{{value:tokenEnvVar}}`，而不是金鑰本身。

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

或者一條指令：`{{value:claudeCodeTokenCommand}}` · [Claude Code 文件]({{value:clientClaudeCodeDocsUrl}}) · 格式核對於 {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor 會對 `${env:…}` 做插值，所以權杖留在環境變數中，不會出現在檔案裡。 · [Cursor 文件]({{value:clientCursorDocsUrl}}) · 格式核對於 {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code 會在伺服器首次啟動時提示你輸入權杖並安全地儲存——不會有任何機密寫入檔案。 · [VS Code 文件]({{value:clientVscodeDocsUrl}}) · 格式核對於 {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` 接收的是變數的名稱，而不是權杖本身。 · [Codex CLI 文件]({{value:clientCodexDocsUrl}}) · 格式核對於 {{value:clientsCheckedOn}}

### 其他任意 Streamable HTTP 用戶端 {#client-other}

{{slot:client-other}}

Windsurf、Zed、Cline、Goose，或者你自己寫的程式——同樣的四項資訊，只是鍵名不同。 · [其他任意 Streamable HTTP 用戶端的文件]({{value:clientOtherDocsUrl}}) · 格式核對於 {{value:clientsCheckedOn}}

## 3. 檢查連線 {#check}

重新啟動用戶端，問它有哪些工具；伺服器會傳回按你的授權範圍過濾後的完整目錄。若想在串接用戶端之前先檢查端點本身，可以直接向它發問——這是同樣的交握，權杖放在你的環境變數中。

{{slot:verify}}

**未授權的回應與權杖有關，而與設定無關。** 權杖缺失、格式錯誤、未知、已撤銷或已過期，都會傳回同樣的拒絕，這是有意為之——如果區分它們，端點就會變成一個能回答「某個金鑰是否存在」的探測器。請檢查請求標頭拼寫為 `{{value:authHeader}}`，值以 `{{value:authScheme}}` 開頭，並確認權杖沒有在 Motir 中被撤銷。

## 連線可以呼叫什麼 {#scopes}

每個工具都由一個權限範圍控制。你為已連線的應用程式核准的權限，或權杖所攜帶的授權，決定了它可以呼叫哪些工具——所以你的用戶端顯示的清單已經按你的權限過濾。這些內容在請求本頁時直接從 Motir 讀取，因此就是伺服器目前實際釋出的內容。

{{part:what-next}}

[//]: # '放在範圍表之後，該表由頁面根據已釋出的目錄產生。'

## 下一步 {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools) 列出伺服器公開的每一個工具及其接收的參數。motir-core 中的[完整參考]({{value:referenceUrl}})包含每個工具的完整描述。若想改從終端機驅動同樣的資料，見 [{{value:cliPage}}](/docs/cli)。

{{part:column-scope}}

[//]: # '範圍表的一個表頭。下面五個部分各是一個簡短標籤，保持為單個詞或短語，前後不加句子。'

權限範圍

{{part:column-gates}}

控制的內容

{{part:column-default}}

預設

{{part:granted}}

已授予

{{part:off-by-default}}

預設關閉

{{part:unreachable}}

[//]: # '在無法取得目錄時，用於代替範圍表顯示。請保持 `tools/list` 原樣。'

範圍表暫時無法存取。它由 Motir 釋出的目錄衍生而來，從不在此處複製，因此眼下沒有可展示的內容——用你自己的權杖發起一次 `tools/list` 交握，就能回答同樣的疑問。
