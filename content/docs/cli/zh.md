---
source: 9091e5e2f59e
---

Motir CLI 与 Motir 智能体所用的是同一个 MCP 服务器。它基于限定在某个工作区的令牌，把规划与执行的循环自动化：一次运行会领取下一个就绪的工作项，获取服务器生成的提示词，并在沙箱中调度一个智能体去执行它。工作项是事实记录的来源；CLI 只是驱动者。

{{part:meta}}

{{value:packageName}} · 版本 {{value:packageVersion}} · {{value:commandCount}} 个命令

{{part:reference}}

## 安装 {#install}

Node {{value:nodeRequirement}}。可以全局安装，也可以不安装、直接运行一次。

{{slot:install}}

## 认证 {#authenticate}

设备流程是最短的路径：它会显示一个代码，打开 Motir，并等待批准。如果已经有个人访问令牌，也可以直接交给 CLI。无论哪种方式，除非另行指定，CLI 都会连接到 {{value:defaultServer}}。

{{slot:authenticate}}

接着把一个文件夹绑定到项目，并在首次运行前检查设置。

{{slot:link-and-check}}

## 命令 {#commands}

CLI 注册的每一条命令，按 `motir help` 打印的顺序排列，由二进制文件自身声明的目录生成——因此这份列表不会落后于发布版本。它描述的是 {{value:packageName}}@{{value:packageVersion}}。

{{slot:commands}}

## Motir 把文件保存在哪里 {#where-motir-keeps-things}

共三个文件，其中只有一个保存机密——而它并不是位于你的仓库里的那个。下面每个路径都可以改到别处；`motir help files` 会根据实际安装的二进制文件打印它们，并给出用来移动各个文件的变量。

- `~/.config/motir/config.json` **——机密，切勿提交**
  凭据存储：个人访问令牌唯一会写入的文件，文件权限经 `chmod 600` 设置，所在目录权限为 `0700`，并以服务器 URL 为键，因此一台机器可以保存多个 Motir 服务器的令牌。你配置的智能体命令也保存在这里。可通过 `MOTIR_CONFIG_HOME` 或 `XDG_CONFIG_HOME` 改变它的位置。
- `.motir.json` **——不含机密，可以放心提交**
  位于工作区根目录的项目链接：记录这个文件夹所绑定的服务器、工作区和项目，另有一份可选的仓库覆盖映射。它不含任何凭据，因此应当纳入版本控制。每条命令都会从当前目录向上逐级查找它，所以在根目录下任何一个仓库副本内都可以运行任意命令。
- `~/.local/state/motir/session-excludes.json` **——不含机密**
  会话排除列表：记录调度失败的工作项，这样下一次运行会跳过它们，而不是再次选中同一个失败项。它属于状态而非凭据，所以不与令牌放在一起——沙箱会以只读方式挂载配置目录，而运行绝不能因为写不进这个文件而中止。如果它不可写，Motir 只会警告一次，然后继续。可通过 `MOTIR_STATE_HOME` 改变它的位置。

## 运行在哪里执行 {#where-a-run-executes}

被调度的智能体运行在一个容器内，容器里有你的仓库副本和你自己的智能体凭据——容器提供什么、它的令牌拒绝什么，以及首次运行会遇到的故障，都在 [{{value:sandboxPage}}](/docs/sandbox) 页面，这里不再重复。不使用 CLI 而把智能体接入 Motir，见 [{{value:mcpPage}}](/docs/mcp)；通过 HTTP 驱动同一个工作循环，见 [{{value:apiPage}}](/docs/api)。完整的命令参考——三种运行形态、会话分支、失败策略与故障排查——是 motir-core 中的 [docs/cli.md]({{value:cliReferenceUrl}})。

{{part:unreachable}}

命令参考暂时无法访问。它由 CLI 自身声明的目录生成，从不在此处复制，因此眼下没有可展示的内容——`motir help` 会根据你已安装的二进制文件打印同一张表。
