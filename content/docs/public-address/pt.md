---
source: 410c4c87d2ef
---

Um projeto público responde no seu próprio endereço em `motir.co` e pode, além disso, responder em um domínio que você já possui. À parte, um espaço de trabalho pode reivindicar um nome próprio em `motir.site`.

## O seu endereço no Motir {#your-motir-address}

Todo projeto público responde em `motir.co/p/ROADMAP` para um projeto com a chave `ROADMAP`. Não há nada a reivindicar: o endereço decorre da chave do projeto e está incluído em todos os planos.

## O nome do seu espaço de trabalho {#your-workspace-name}

Um espaço de trabalho pode reivindicar um nome em `motir.site` — assim, `acme` dá a você `acme.motir.site`. É nesse nome que respondem as aplicações que o Motir hospeda para o seu espaço de trabalho: o endereço sozinho mostra a aplicação padrão do espaço de trabalho, ou uma página dizendo que ainda não há aplicação aqui. **Projetos públicos nunca respondem nele** — um projeto fica no seu endereço `motir.co`.

Quem reivindica o nome é um proprietário ou administrador do espaço de trabalho, em _Configurações do espaço de trabalho_, em _Endereço público_. As Configurações do projeto o mostram somente para leitura, com um link para lá.

Um nome tem letras minúsculas, dígitos e hifens isolados, de três a sessenta e três caracteres. Um pequeno conjunto de nomes fica reservado para os hosts do próprio Motir e para nomes que alguém poderia confundir com eles.

Um espaço de trabalho tem um nome ou nenhum. **Não há aliases, e nada redireciona:** quando você renomeia ou libera o nome, o endereço antigo para de responder na hora, e os links já compartilhados para ele param de funcionar.

- **Uma mudança a cada 30 dias.** Uma renomeação e uma liberação contam cada uma como uma mudança, então liberar e reivindicar de novo não contorna o limite. Enquanto uma mudança ainda não é permitida, o painel mostra a data a partir da qual será.
- **Um nome que você solta fica retido, a menos que você tenha acabado de reivindicá-lo.** Um nome mantido por menos de 24 horas volta na hora para o conjunto disponível. Um nome mantido por 24 horas ou mais fica retido por 90 dias, para que ninguém mais herde links que apontavam para você; a caixa de confirmação informa a data exata em que ele fica livre.

## Conectando o seu próprio domínio {#connecting-your-own-domain}

Conectar um domínio que você possui está disponível nos planos pagos — veja [nossos planos](/). O seu endereço `motir.co` está incluído em todos os planos e continua funcionando de qualquer modo.

Um domínio conectado serve _um_ projeto, na sua raiz: `roadmap.acme.com/` é a página desse projeto e `roadmap.acme.com/changelog` é o seu registro de mudanças. O quadro ao vivo, os itens de trabalho e o roadmap ficam no aplicativo do Motir, e os links de lá levam até eles.

Você cria dois tipos de registro no seu registrador. **Adicione o domínio primeiro**, em Configurações do projeto, em _Endereço público_: o painel então lista todos os registros de que esse domínio precisa, com o valor exato e um botão de copiar em cada um. Os formatos abaixo são o que esperar — leia-os para conferir se o seu registrador consegue criá-los e pegue os valores no painel.

### 1 · Aponte o domínio para nós {#point-the-domain-at-us}

Para um **subdomínio** como `roadmap.acme.com`, um `CNAME`:

| Tipo    | Nome      | Valor              |
| ------- | --------- | ------------------ |
| `CNAME` | `roadmap` | mostrado no painel |

Para um **domínio raiz** como `acme.com`, um `A` e um `AAAA` no lugar — um domínio raiz não pode receber um `CNAME`, porque já carrega os registros `MX` e `TXT` dos quais o seu e-mail e os seus outros serviços dependem:

| Tipo   | Nome | Valor              |
| ------ | ---- | ------------------ |
| `A`    | `@`  | mostrado no painel |
| `AAAA` | `@`  | mostrado no painel |

Copie cada valor do painel, e não de qualquer outro lugar. Estes são os endereços em que o Motir é servido, lidos da plataforma em que rodamos, e eles podem mudar — o painel muda junto, e uma página como esta não.

> Se o seu provedor de DNS oferecer um botão de “proxy” ou “nuvem” no registro, desative-o: um proxy na frente do registro esconde o seu domínio da verificação, e o certificado não pode ser emitido.

### 2 · Comprove que o domínio é seu {#prove-the-domain-is-yours}

Junto com o registro de apontamento, o painel lista um registro `TXT` com um token dentro, neste formato:

| Tipo  | Nome                    | Valor            |
| ----- | ----------------------- | ---------------- |
| `TXT` | `_motir-verify.roadmap` | `motir-verify=…` |

Copie o valor do painel, e não daqui — o token é só seu. Depois escolha _Verificar_. Quando conseguirmos ver o registro, solicitamos um certificado, o que costuma levar um ou dois minutos. Você pode fechar a página; o status continua avançando sozinho, e os registros permanecem disponíveis em _Mostrar registros DNS_.

## O que cada status significa {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Status         | O que significa                                                                                                                                        | O que fazer                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Não verificado | Ainda não vimos o seu registro de propriedade. Nada foi solicitado à autoridade certificadora.                                                         | Crie o registro TXT abaixo e depois escolha Verificar novamente.              |
| Verificando…   | Estamos procurando o registro de propriedade agora. As mudanças de DNS podem levar alguns minutos para se espalhar.                                    | Espere um momento. Ele avança sozinho.                                        |
| Emitindo…      | A propriedade está comprovada e o certificado foi solicitado. Isso costuma levar um ou dois minutos.                                                   | Nada. O Motir faz o resto.                                                    |
| Ativo          | O certificado foi emitido e o seu domínio serve o projeto. Ele é renovado sozinho.                                                                     | Você pode tornar este endereço o principal.                                   |
| Falhou         | Não foi possível emitir o certificado. O motivo aparece ao lado do status — quase sempre um registro que está faltando ou que aponta para outro lugar. | Compare os seus registros com os abaixo e depois escolha Verificar novamente. |
| Expirado       | O certificado expirou e a renovação não deu certo — quase sempre porque um registro DNS mudou. O domínio não está servindo.                            | Devolva os registros ao que eram e depois escolha Verificar novamente.        |
| Revogado       | O certificado foi retirado. O domínio não está servindo.                                                                                               | Escolha Solicitar novamente para iniciar um novo certificado.                 |

## Qual endereço é o verdadeiro {#which-address-is-the-real-one}

Um projeto pode responder em vários endereços, e exatamente um deles é o _principal_ — aquele que os mecanismos de busca e as prévias em redes sociais recebem. Quando o certificado de um domínio conectado estiver ativo, você pode torná-lo o principal; até lá, o principal é o endereço do Motir.

**Todos os outros endereços redirecionam para o principal.** Isso inclui o seu endereço `motir.co` depois que você promover um domínio próprio. Os visitantes sempre chegam a um lugar que funciona, e um mecanismo de busca vê uma página, e não três cópias competindo entre si.

## Removendo um domínio {#removing-a-domain}

Remover um domínio conectado retira o certificado dele e o endereço deixa de responder — quem o estiver usando receberá um erro, e os links já compartilhados para ele deixam de funcionar. O seu projeto continua público nos outros endereços, então remover um domínio nunca torna um projeto privado.

## Se algo não estiver funcionando {#if-something-is-not-working}

Três erros respondem por quase todas as falhas, e cada um aparece de um jeito diferente no painel.

- **Um CNAME em um domínio raiz.** A maioria dos registradores o aceita e ele não funciona. O sintoma é um domínio que fica em `Not verified` ou chega a `Failed`. Use os registros `A` e `AAAA` acima.
- **Um provedor de DNS com proxy na frente do registro.** Se o seu provedor oferece fazer proxy ou acelerar o tráfego, isso esconde de nós o registro real. O sintoma é um `Checking…` que nunca se resolve. Desative o proxy para esses registros.
- **Um registro de propriedade desatualizado.** Se você removeu e adicionou o domínio de novo, o token mudou. O sintoma é `Not verified` enquanto um registro `TXT` está claramente lá. Substitua o valor dele pelo que o painel mostra agora.
