---
source: 9091e5e2f59e
---

Motir CLI 與 Motir 代理程式所用的是同一個 MCP 伺服器。它基於限定在某個工作區的權杖，把規劃與執行的迴圈自動化：一次執行會領取下一個就緒的工作項目，取得伺服器產生的提示，並在沙箱中排程一個代理程式去執行它。工作項目是事實記錄的來源；CLI 只是驅動者。

{{part:meta}}

{{value:packageName}} · 版本 {{value:packageVersion}} · {{value:commandCount}} 個指令

{{part:reference}}

## 安裝 {#install}

Node {{value:nodeRequirement}}。可以全域安裝，也可以不安裝、直接執行一次。

{{slot:install}}

## 認證 {#authenticate}

裝置流程是最短的路徑：它會顯示一個程式碼，開啟 Motir，並等待核准。如果已經有個人存取權杖，也可以直接交給 CLI。無論哪種方式，除非另行指定，CLI 都會連線到 {{value:defaultServer}}。

{{slot:authenticate}}

接著把一個資料夾繫結到專案，並在首次執行前檢查設定。

{{slot:link-and-check}}

## 指令 {#commands}

CLI 註冊的每一條指令，按 `motir help` 輸出的順序排列，由二進位檔自身宣告的目錄產生——因此這份清單不會落後於釋出版本。它描述的是 {{value:packageName}}@{{value:packageVersion}}。

{{slot:commands}}

## Motir 把檔案儲存在哪裡 {#where-motir-keeps-things}

共三個檔案，其中只有一個儲存機密——而它並不是位於你的儲存庫裡的那個。下面每個路徑都可以改到別處；`motir help files` 會根據實際安裝的二進位檔輸出它們，並給出用來移動各個檔案的變數。

- `~/.config/motir/config.json` **——機密，切勿提交**
  憑證儲存：個人存取權杖唯一會寫入的檔案，檔案權限經 `chmod 600` 設定，所在目錄權限為 `0700`，並以伺服器 URL 為鍵，因此一台機器可以儲存多個 Motir 伺服器的權杖。你設定的代理程式指令也儲存在這裡。可透過 `MOTIR_CONFIG_HOME` 或 `XDG_CONFIG_HOME` 改變它的位置。
- `.motir.json` **——不含機密，可以放心提交**
  位於工作區根目錄的專案連結：記錄這個資料夾所繫結的伺服器、工作區和專案，另有一份可選的儲存庫覆蓋對應。它不含任何憑證，因此應當納入版本控制。每條指令都會從目前目錄向上逐級查詢它，所以在根目錄下任何一個儲存庫副本內都可以執行任意指令。
- `~/.local/state/motir/session-excludes.json` **——不含機密**
  工作階段排除清單：記錄排程失敗的工作項目，這樣下一次執行會跳過它們，而不是再次選中同一個失敗項。它屬於狀態而非憑證，所以不與權杖放在一起——沙箱會以唯讀方式掛載設定目錄，而執行絕不能因為寫不進這個檔案而中止。如果它不可寫，Motir 只會警告一次，然後繼續。可透過 `MOTIR_STATE_HOME` 改變它的位置。

## 執行在哪裡進行 {#where-a-run-executes}

排程的代理程式在一個容器內執行，容器裡有你的儲存庫副本和你自己的代理程式憑證——容器提供什麼、它的權杖拒絕什麼，以及首次執行會遇到的故障，都在 [{{value:sandboxPage}}](/docs/sandbox) 頁面，這裡不再重複。不使用 CLI 而把代理程式串接 Motir，見 [{{value:mcpPage}}](/docs/mcp)；透過 HTTP 驅動同一個工作迴圈，見 [{{value:apiPage}}](/docs/api)。完整的指令參考——三種執行形態、工作階段分支、失敗策略與故障排查——是 motir-core 中的 [docs/cli.md]({{value:cliReferenceUrl}})。

{{part:unreachable}}

指令參考暫時無法存取。它由 CLI 自身宣告的目錄產生，從不在此處複製，因此眼下沒有可展示的內容——`motir help` 會根據你已安裝的二進位檔輸出同一張表。
