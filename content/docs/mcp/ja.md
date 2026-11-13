---
source: 2aa432672926
---

Motir は Model Context Protocol サーバーを公開しています。エージェントと CLI がプロジェクト管理の中核を読み取り、操作するために呼び出す、ストリーミング対応の HTTP エンドポイントが 1 つあります。計画を実行するためにMotir エージェントが使うのと同じインターフェースです。Claude への追加は、1 回のサインインだけで済み、トークンは不要です。それ以外のクライアントやパイプラインは、3 つの手順でトークンを使って接続します。

## Claude に Motir を追加する {#claude}

Motir アカウントでサインインし、ワークスペースを 1 つ選んで、そこで Claude に許可する操作を承認します。コピーも貼り付けも不要です。作成したり安全に保管したりするトークンはありません。

### claude.ai {#claude-ai}

1. _Customize_ → _Connectors_ を開きます。
2. 「+」をクリックし、_Add custom connector_ をクリックして、下のサーバー URL を貼り付けます。_OAuth client_ では、_Use Claude’s published identity_ を選びます。Motir が対応しているため、claude.ai はこれを _Detected_ と表示します。OAuth クライアント ID とシークレットは空のままにしてください。Motir はどちらも必要としません。
3. _Add_ をクリックし、続けて _Connect_ をクリックします。Claude が app.motir.co に移動するので、サインインして承認します。

{{slot:claude-ai}}

Team プランまたは Enterprise プランでは、オーナーが _Organization settings_ → _Connectors_ → _Add_ → _Custom_ → _Web_ でコネクターを一度追加し、その後、各メンバーが自分の Motir アカウントで _Customize_ → _Connectors_ から _Connect_ をクリックします。 · [Anthropic の claude.ai のドキュメント]({{value:routeClaudeAiDocsUrl}}) · 手順の確認日 {{value:routeClaudeAiCheckedOn}}

### Claude デスクトップアプリ {#claude-desktop}

1. すでに claude.ai で Motir を接続している場合は、追加するものはありません。接続済みのコネクターは、ウェブ、デスクトップアプリ、モバイルでの会話で利用できます。
2. 代わりにデスクトップアプリから追加する場合は、サイドバーで _Customize_ を選び、続けて _Connectors_ を選んで、同じ URL を使って claude.ai の手順に従います。
3. Motir のサインインページがブラウザーで開きます。そこで承認し、アプリに戻ります。

{{slot:claude-desktop}}

これはリモートコネクターであり、ローカルのデスクトップ拡張機能ではありません。Claude は Anthropic のクラウドから Motir にアクセスするため、お使いのマシンには何もインストールされません。 · [Anthropic の Claude デスクトップアプリのドキュメント]({{value:routeClaudeDesktopDocsUrl}}) · 手順の確認日 {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. 下のコマンドでサーバーを追加します。ヘッダーもトークンも不要です。
2. Claude Code で `/mcp` を実行し、`motir` を選んで、ブラウザーでのサインインに従います。

{{slot:claude-code}}

Claude アカウントで Claude Code にサインインしている場合、claude.ai で接続したコネクターはすでに利用できます。Claude Code 用の Motir プラグインには、スキルと並んでこのサーバーが含まれています。 · [Anthropic の Claude Code のドキュメント]({{value:routeClaudeCodeDocsUrl}}) · 手順の確認日 {{value:routeClaudeCodeCheckedOn}}

### 承認する内容と、取り消す方法 {#consent}

Motir のサインインページには、要求しているアプリの名前が表示され、ワークスペースを 1 つ選び、要求する権限が一覧表示されます。Claude はそのワークスペースで、承認された範囲内で、あなたとして動作します。あなた自身のロールで許されている範囲を超えることはありません。

claude.ai が Claude の公開されたアイデンティティで接続する場合、Motir は claude.ai がそのアイデンティティを公開していることを確認し、サインインページと「接続済みアプリ」に、claude.ai を確認済みのドメインとして表示します。自分で登録する他の MCP クライアントは「未確認」と表示されます。表示される名前はクライアントが自分で選んだもので、Motir には確認できないためです。

Claude は、何かを変更するツールを使う前に確認を求めます。すべてのツールは、読み取りだけを行うのか、書き込みを行うのか、削除を行うのかを示しており、どれがどれかは [{{value:mcpToolsPage}}](/docs/mcp/tools)で確認できます。代わりに Claude Code 用のプラグインを使いたい場合は、このサーバーも含まれています。[{{value:skillsPage}}](/docs/skills)をご覧ください。

接続したすべてのアプリは、Motir の「設定 → アカウント → トークン」にある[接続済みアプリ]({{value:connectedAppsUrl}})に一覧表示され、ワークスペース、権限、最後に使われた時刻が示されます。取り消すと、次のリクエストからそのアクセスは終了します。

## その他のクライアントと CI：トークンを使う {#token-route}

OAuth のサインインに対応していないクライアント、ヘッドレスのエージェント、CI パイプラインには、この方法を選んでください。同じサーバーで、サインインの代わりにパーソナルアクセストークンを使います。

## このサーバーか、REST API か {#fork}

どちらも同じデータを扱い、同じ認証情報を受け付けます。想定する利用者が異なり、重要な違いは、それぞれが「後から変わらないこと」についてどこまで約束しているかです。

|                    | {{value:mcpPage}}                                                                                              | {{value:apiPage}}                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **エンドポイント** | `POST {{value:endpointPath}}`                                                                                  | `/api/v1/…`                                                                    |
| **想定する用途**   | ご自身が管理するエージェント。実行時にツールの説明を読みます。                                                 | 配布するクライアント。固定された形に対して一度書いたコードです。               |
| **安定性**         | 変更が前提です。説明の言い回しや引数名を変えることが、エージェントの挙動を調整する方法だからです。             | 追加のみです。破壊的変更は `/api/v2` として新設され、v1 は約束を守り続けます。 |
| **形式**           | 同じです。MCP のペイロードは v1 のレスポンススキーマから導出されるため、両者は同一のオブジェクトを記述します。 | 同じです。MCP が導出する元になっているのは、こちらです。                       |
| **認証**           | 1 つのパーソナルアクセストークンと、1 つのスコープセット。                                                     | 同じ認証情報が両方で使えます。                                                 |

エージェントを接続するなら、このページのままで構いません。他の人がインストールするソフトウェアを書くなら、[{{value:apiPage}}](/docs/api)がもう一方の選択肢です。こちらは、後から変わらないことを約束するほうです。

## 1. トークンを発行する {#token}

すべてのリクエストには、Motir の「設定 → アカウント → トークン」で発行したパーソナルアクセストークンが必要です。紐付けるワークスペースを選び、その作業に足りる最も狭いスコープセットを付与してください。各スコープが何を制御するかは、このページの末尾の表に書かれています。付与はご自身のロールを狭めるだけで広げることはないため、トークンが、あなたにできないことをできるようになることはありません。

シークレットが表示されるのは、トークンを作成したときの 1 回だけです。そのときにコピーしてください。後から読み取る方法はなく、紛失したトークンは復元ではなく再発行します。

## 2. クライアントを設定する {#wire}

どのクライアントでも、名前は違っても同じ 4 つの事実が必要です。

|                    |                                                                           |
| ------------------ | ------------------------------------------------------------------------- |
| **URL**            | `{{value:url}}`                                                           |
| **トランスポート** | ストリーミング対応の HTTP。SSE でも、stdio コマンドでもありません         |
| **ヘッダー**       | すべてのリクエストに `{{value:authHeader}}: {{value:authScheme}} <token>` |
| **トークン**       | `{{value:tokenPlaceholder}}` — 手順 1 で発行したトークン                  |

トークンを、リポジトリで追跡されるファイルに置かないでください。クライアントが環境から読み取れる場合や、入力を求めてくれる場合は、下のブロックでは直接の値の代わりにそれを使っています。そのため、そのうち 2 つは秘密の値ではなく `{{value:tokenEnvVar}}` を指しています。

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

あるいは 1 つのコマンドでも設定できます: `{{value:claudeCodeTokenCommand}}` · [Claude Code のドキュメント]({{value:clientClaudeCodeDocsUrl}}) · 形式の確認日 {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor は `${env:…}` を展開するため、トークンは環境に置いたままにでき、ファイルには残りません。 · [Cursor のドキュメント]({{value:clientCursorDocsUrl}}) · 形式の確認日 {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code は、サーバーを初めて起動するときにトークンの入力を求め、安全に保存します。秘密の値がファイルに書き込まれることはありません。 · [VS Code のドキュメント]({{value:clientVscodeDocsUrl}}) · 形式の確認日 {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` には、トークンそのものではなく、変数の「名前」を指定します。 · [Codex CLI のドキュメント]({{value:clientCodexDocsUrl}}) · 形式の確認日 {{value:clientsCheckedOn}}

### その他のストリーミング対応 HTTP クライアント {#client-other}

{{slot:client-other}}

Windsurf、Zed、Cline、Goose、あるいはご自身で書いたものなど、キー名が違うだけで、同じ 4 つの事実が必要です。 · [その他のストリーミング対応 HTTP クライアントのドキュメント]({{value:clientOtherDocsUrl}}) · 形式の確認日 {{value:clientsCheckedOn}}

## 3. 接続を確認する {#check}

クライアントを再起動し、使えるツールを尋ねてください。サーバーは、付与された権限の範囲で絞り込まれたカタログ全体を返します。クライアントを介さずにエンドポイント自体を確認するには、直接問い合わせます。これは同じハンドシェイクで、トークンは環境に置いたものを使います。

{{slot:verify}}

**認証されていないという応答は、配線ではなくトークンに関するものです。** トークンが存在しない、形式が正しくない、不明、失効済み、期限切れの場合は、すべて同じ拒否が返されます。これは意図した仕様です。区別できるようにすると、そのシークレットが存在するかどうかを答える手がかりとして、エンドポイントが悪用されてしまいます。ヘッダーの綴りが `{{value:authHeader}}` であること、値が `{{value:authScheme}}` で始まっていること、トークンが Motir で失効していないことを確認してください。

## 接続が呼び出せるもの {#scopes}

すべてのツールはスコープで制御されています。接続したアプリに承認した権限、またはトークンに付与された権限によって、呼び出せるツールが決まります。そのため、クライアントに表示される一覧は、すでにあなたに合わせて絞り込まれています。この内容はこのページが要求されたときに Motir 自身から読み取るため、サーバーがそのとき提供している内容そのものです。

{{part:what-next}}

[//]: # 'Placed after the scope table, which the page generates from the published catalogue.'

## 次のステップ {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools)では、サーバーが公開しているすべてのツールを、受け取る引数とともに一覧できます。各ツールの完全な説明は、motir-core の[完全なリファレンス]({{value:referenceUrl}})にあります。同じデータをターミナルから操作する場合は、[{{value:cliPage}}](/docs/cli)をご覧ください。

{{part:column-scope}}

[//]: # 'A heading of the scope table. Each of the five parts below is one short label that stays a single word or phrase, with no sentence around it.'

スコープ

{{part:column-gates}}

制御する対象

{{part:column-default}}

デフォルト

{{part:granted}}

付与済み

{{part:off-by-default}}

デフォルトではオフ

{{part:unreachable}}

[//]: # 'Shown in place of the scope table when the catalogue cannot be fetched. Keep `tools/list` literal.'

スコープの表に一時的にアクセスできません。この表は Motir が公開するカタログから導出されるもので、ここにコピーは置いていないため、今お見せできるものがありません。お持ちのトークンで `tools/list` のハンドシェイクを行うと、そのトークンについて同じ内容がわかります。
