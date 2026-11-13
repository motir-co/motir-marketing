---
source: 9091e5e2f59e
---

A Motir CLI conversa com o mesmo servidor MCP que o agente Motir usa. Ela automatiza o ciclo de planejamento e execução com um token restrito a um espaço de trabalho: uma execução pega o próximo item de trabalho pronto, busca o prompt gerado pelo servidor e despacha um agente em um sandbox para executá-lo. O item de trabalho é o sistema de registro; a CLI é quem conduz.

{{part:meta}}

{{value:packageName}} · versão {{value:packageVersion}} · {{value:commandCount}} comandos

{{part:reference}}

## Instalação {#install}

Node {{value:nodeRequirement}}. Instale-a globalmente ou execute-a uma vez, sem instalar.

{{slot:install}}

## Autenticação {#authenticate}

O fluxo de dispositivo é o caminho mais curto: ele mostra um código, abre o Motir e espera você aprová-lo. Se você já tem um token de acesso pessoal, entregue-o diretamente. De qualquer modo, a CLI conversa com {{value:defaultServer}}, a menos que você a aponte para outro lugar.

{{slot:authenticate}}

Depois, vincule uma pasta a um projeto e verifique a configuração antes da primeira execução.

{{slot:link-and-check}}

## Comandos {#commands}

Todos os comandos que a CLI registra, na ordem em que `motir help` os imprime, gerados a partir do catálogo que o próprio binário declara — por isso esta lista não fica para trás de uma versão. Ela descreve {{value:packageName}}@{{value:packageVersion}}.

{{slot:commands}}

## Onde o Motir guarda as coisas {#where-motir-keeps-things}

Três arquivos, e só um deles guarda um segredo — e não é o que fica no seu repositório. Todo caminho abaixo pode ser mudado de lugar; `motir help files` os imprime a partir do binário que você realmente instalou, com a variável que move cada um.

- `~/.config/motir/config.json` **— segredo, nunca faça commit**
  O armazenamento de credenciais: o único arquivo em que um token de acesso pessoal é gravado, com `chmod 600` dentro de um diretório `0700`, indexado pela URL do servidor para que uma mesma máquina guarde tokens de vários servidores Motir. Ele também guarda o comando do agente que você configurou. Mude-o de lugar com `MOTIR_CONFIG_HOME` ou `XDG_CONFIG_HOME`.
- `.motir.json` **— sem segredo, seguro para commit**
  O vínculo com o projeto na raiz do seu espaço de trabalho: o servidor, o espaço de trabalho e o projeto aos quais esta pasta está vinculada, mais um mapa opcional de substituição de repositórios. Ele não carrega nenhuma credencial, então pertence ao controle de versão. Todo comando o resolve subindo a partir do diretório atual, então qualquer comando funciona de dentro de qualquer checkout sob a raiz.
- `~/.local/state/motir/session-excludes.json` **— sem segredo**
  A lista de exclusão da sessão: os itens de trabalho cujo despacho FALHOU, para que a próxima execução passe por eles em vez de escolher a mesma falha de novo. É estado, não credencial, e é por isso que não fica ao lado do token — o sandbox monta o diretório de configuração como somente leitura, e uma execução nunca deve morrer por não conseguir gravar este arquivo. Se ele não puder ser gravado, o Motir avisa uma vez e continua. Mude-o de lugar com `MOTIR_STATE_HOME`.

## Onde uma execução roda {#where-a-run-executes}

Um agente despachado roda dentro de um contêiner com os seus checkouts e a sua própria credencial de agente — o que ele oferece, o que o token dele recusa e as falhas que uma primeira execução encontra estão na página [{{value:sandboxPage}}](/docs/sandbox), em vez de repetidos aqui. Conectar um agente ao Motir sem a CLI é o [{{value:mcpPage}}](/docs/mcp), e conduzir o mesmo ciclo de trabalho por HTTP é a [{{value:apiPage}}](/docs/api). A referência completa dos comandos — os três formatos de execução, os branches de sessão, a política de falhas e a solução de problemas — está em [docs/cli.md]({{value:cliReferenceUrl}}) no motir-core.

{{part:unreachable}}

A referência dos comandos está temporariamente indisponível. Ela é gerada a partir do catálogo que a própria CLI declara e nunca é copiada aqui, então não há nada para mostrar por enquanto — `motir help` imprime a mesma tabela a partir do binário que você instalou.
