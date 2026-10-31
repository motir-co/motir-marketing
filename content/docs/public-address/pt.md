---
source: 331d263ce3e1
---

Um projeto público responde no seu próprio endereço em `motir.co`. À parte, um espaço de trabalho pode reivindicar um nome próprio em `motir.site` e servir seu aplicativo hospedado em um domínio que já possui.

## O seu endereço no Motir {#your-motir-address}

Todo projeto público responde em `motir.co/p/ROADMAP` para um projeto com a chave `ROADMAP`. Não há nada a reivindicar: o endereço decorre da chave do projeto e está incluído em todos os planos.

## O nome do seu espaço de trabalho {#your-workspace-name}

Um espaço de trabalho pode reivindicar um nome em `motir.site` — assim, `acme` dá a você `acme.motir.site`. É nesse nome que respondem as aplicações que o Motir hospeda para o seu espaço de trabalho: o endereço sozinho mostra a aplicação padrão do espaço de trabalho, ou uma página dizendo que ainda não há aplicação aqui. **Projetos públicos nunca respondem nele** — um projeto fica no seu endereço `motir.co`.

Quem reivindica o nome é um proprietário ou administrador do espaço de trabalho, em _Configurações do espaço de trabalho_, em _Endereço público_. As Configurações do projeto o mostram somente para leitura, com um link para lá.

Um nome tem letras minúsculas, dígitos e hifens isolados, de três a sessenta e três caracteres. Um pequeno conjunto de nomes fica reservado para os hosts do próprio Motir e para nomes que alguém poderia confundir com eles.

Um espaço de trabalho tem um nome ou nenhum. **Não há aliases, e nada redireciona:** quando você renomeia ou libera o nome, o endereço antigo para de responder na hora, e os links já compartilhados para ele param de funcionar.

- **Uma mudança a cada 30 dias.** Uma renomeação e uma liberação contam cada uma como uma mudança, então liberar e reivindicar de novo não contorna o limite. Enquanto uma mudança ainda não é permitida, o painel mostra a data a partir da qual será.
- **Um nome que você solta fica retido, a menos que você tenha acabado de reivindicá-lo.** Um nome mantido por menos de 24 horas volta na hora para o conjunto disponível. Um nome mantido por 24 horas ou mais fica retido por 90 dias, para que ninguém mais herde links que apontavam para você; a caixa de confirmação informa a data exata em que ele fica livre.

## Seu próprio domínio {#your-own-domain}

Um domínio que você possui, como `shop.acme.com`, pode responder com o aplicativo hospedado do seu espaço de trabalho, seja qual for o destino que o executa. Domínios personalizados estão disponíveis nos planos pagos — veja [nossos planos](/). Um proprietário ou administrador do espaço de trabalho os adiciona e remove; todos os demais no espaço de trabalho os veem somente para leitura. Os endereços `motir.co` dos seus projetos e o nome `motir.site` do seu espaço de trabalho continuam funcionando de qualquer forma.

## Adicionar o domínio {#add-the-domain}

Adicione o domínio em _Configurações do espaço de trabalho_, em _Domínios personalizados_. O painel _Endereço público_ também leva até lá, com _Usar seu próprio domínio_.

Ao adicioná-lo, escolha qual aplicativo do espaço de trabalho ele serve. Um domínio serve exatamente um aplicativo. Você pode mudar qual depois, na linha do domínio, com _Mudar aplicativo_. Um espaço de trabalho que ainda não tem aplicativo hospedado pode adicionar um domínio mesmo assim: ele é adicionado sem aplicativo e não serve nada até você escolher um.

## Os registros que você cria {#the-records-you-create}

Depois que o domínio é adicionado, o painel lista cada registro de que ele precisa, com o valor exato e um botão de copiar em cada um, e os mantém em _Mostrar registros DNS_. Os formatos abaixo são o que esperar — leia-os para conferir se o seu registrador consegue criá-los, e pegue os valores no painel.

Primeiro, um registro `TXT` que prova que o domínio é seu. O nome dele é `_motir-verify.` seguido do seu domínio; a maioria dos registradores quer só a parte antes do seu domínio raiz, como aqui:

| Tipo  | Nome                 | Valor              |
| ----- | -------------------- | ------------------ |
| `TXT` | `_motir-verify.shop` | mostrado no painel |

O token dentro dele é só seu, então copie-o do painel e não de outro lugar.

Depois, um registro que aponta o domínio para o Motir. Para um **subdomínio** como `shop.acme.com`, um `CNAME`:

| Tipo    | Nome   | Valor              |
| ------- | ------ | ------------------ |
| `CNAME` | `shop` | mostrado no painel |

Para um **domínio raiz** como `acme.com`, um `A` e um `AAAA` no lugar — um domínio raiz não pode ter um `CNAME`, porque já tem os registros `MX` e `TXT` dos quais dependem seu e-mail e seus outros serviços. O mesmo vale para um domínio logo abaixo de um sufixo público de mais de uma parte, como `acme.co.uk`; o painel sabe de que tipo é o seu e lista os registros certos.

| Tipo   | Nome | Valor              |
| ------ | ---- | ------------------ |
| `A`    | `@`  | mostrado no painel |
| `AAAA` | `@`  | mostrado no painel |

Esses endereços são do próprio Motir, reservados para domínios de clientes. Se algum dia mudarem, o painel muda junto; uma página como esta, não.

> Se o seu provedor de DNS oferece uma opção de “proxy” ou “nuvem” no registro, desligue-a: um proxy na frente do registro esconde seu domínio da verificação e o certificado não pode ser emitido.

Depois escolha _Conferir agora_. Assim que vemos o registro de propriedade, solicitamos um certificado, o que costuma levar alguns minutos. Você pode fechar a página; o status avança sozinho.

## O que cada status significa {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Status         | O que significa                                                                                                                                                 | O que fazer                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Não confirmado | Ainda não vimos seu registro de propriedade. Nada foi solicitado à autoridade certificadora, e o domínio não responde.                                          | Crie os registros que o painel lista e escolha Conferir agora.                                 |
| Pendente       | Estamos procurando seu registro de propriedade agora. Mudanças de DNS podem levar alguns minutos para se propagar.                                              | Aguarde um momento. Ele avança sozinho.                                                        |
| Pendente       | A propriedade está confirmada e o certificado está sendo emitido. Isso costuma levar alguns minutos.                                                            | Nada. A página se atualiza sozinha.                                                            |
| Emitido        | O certificado está emitido e seu domínio responde. Ele se renova sozinho.                                                                                       | Nada.                                                                                          |
| Falhou         | “Não vemos mais o seu registro de propriedade.” O registro `TXT` não traz mais o seu token, então o domínio parou de responder.                                 | Restaure o registro `TXT` que o painel mostra e escolha Conferir de novo.                      |
| Falhou         | “_Seu domínio_ não aponta mais para o Motir.” O registro `A`, `AAAA` ou `CNAME` dele foi alterado ou removido, então o domínio parou de responder.              | Volte o registro ao valor que o painel mostra e escolha Conferir de novo.                      |
| Falhou         | “Não foi possível emitir o certificado.” A autoridade certificadora o recusou; o painel mostra o motivo dela ao lado.                                           | Corrija o que o motivo aponta — quase sempre um registro que falta — e escolha Tentar de novo. |
| Falhou         | “Não foi possível emitir o certificado.” O certificado expirou e a renovação não deu certo — quase sempre porque um registro DNS mudou. O domínio não responde. | Deixe os registros como o painel os mostra e escolha Tentar de novo.                           |
| Falhou         | “Não foi possível emitir o certificado.” O certificado foi revogado. O domínio não responde.                                                                    | Escolha Tentar de novo para iniciar um novo certificado.                                       |

Só responde um domínio cujo status é _Emitido_.

## O que o seu domínio serve {#what-your-domain-serves}

Depois que o certificado é emitido, quem responde pelo seu domínio é a borda do Motir, que encaminha cada requisição — caminho, query, corpo e cookies — ao aplicativo que o domínio nomeia e devolve a resposta desse próprio aplicativo. O que um visitante encontra depende do aplicativo:

- **O seu próprio aplicativo**, quando ele foi publicado e está aberto a todos.
- **Uma página dizendo que nada foi publicado aqui ainda**, quando o domínio não nomeia nenhum aplicativo ou o aplicativo ainda não foi publicado.
- **Uma página dizendo que o site é só para membros**, quando o aplicativo está aberto só para os seus membros. Os membros chegam a ele no endereço `motir.site` dele, para o qual a página aponta quando há um. Hoje todo aplicativo hospedado está aberto só para os seus membros — a configuração que abre um para todos ainda não está disponível —, então por enquanto um domínio que nomeia um aplicativo publicado mostra esta página no lugar do aplicativo.
- **Uma página dizendo que o site não pode ser acessado agora**, quando o aplicativo roda em um destino para o qual a borda ainda não consegue encaminhar. Ele volta a responder assim que a borda conseguir.
- **Uma única página simples de “não encontrado”** para qualquer outro motivo, inclusive um domínio removido. É a mesma página seja qual for o motivo, então ela nunca conta ao visitante qual se aplicou.

Nenhuma dessas páginas traz o site do Motir em volta, e nenhuma é indexada pelos mecanismos de busca.

O Motir não adiciona no seu domínio nenhum redirecionamento, link canônico, arquivo robots ou sitemap próprio. O seu aplicativo define os dele.

## Dois domínios no mesmo espaço de trabalho {#two-domains-on-one-workspace}

Um espaço de trabalho pode conectar mais de um domínio, até o que o plano dele inclui. Cada um nomeia seu próprio aplicativo, escolhido na sua própria linha. O Motir não coloca nenhum acima dos outros e não redireciona entre nenhum deles: cada um responde por conta própria, com o aplicativo que nomeia.

## Remover um domínio {#removing-a-domain}

Escolha _Remover_ na linha do domínio. O domínio para de servir seu aplicativo em cerca de meio minuto e, a partir daí, responde com a página de não encontrado. Nada fica reservado: você pode adicioná-lo de novo depois, e outro espaço de trabalho pode adicioná-lo assim que provar a propriedade com um registro `TXT` próprio. Apagar os registros no seu provedor de DNS fica a seu cargo. Remover um domínio não muda nada no aplicativo, que continua respondendo nos outros endereços dele.

## Se algo não estiver funcionando {#if-something-is-not-working}

Quatro erros explicam quase todas as falhas, e cada um aparece de um jeito diferente no painel.

- **Um CNAME em um domínio raiz.** A maioria dos registradores aceita e não funciona. O sintoma é um domínio que fica em _Pendente_ ou chega a _Falhou_. Use em vez disso os registros `A` e `AAAA` acima.
- **Um provedor de DNS fazendo proxy na frente do registro.** Se o seu provedor oferece passar o tráfego por proxy ou acelerá-lo, isso esconde de nós o registro real. O sintoma é um _Pendente_ que nunca se resolve. Desligue o proxy para esses registros.
- **Um registro de propriedade desatualizado.** Se você removeu e adicionou de novo um domínio, o token mudou. O sintoma é _Não confirmado_ enquanto um registro `TXT` está claramente lá. Troque o valor dele pelo que o painel mostra agora.
- **Um registro de propriedade apagado depois.** Um domínio ativo cujo registro `TXT` desaparece continua respondendo até que a nossa verificação periódica perceba, o que acontece em cerca de uma hora; então ele passa a _Falhou_ e para de responder. Restaure o registro e escolha Conferir de novo.
