---
source: 2aa432672926
---

Motir expose un serveur Model Context Protocol — un seul endpoint HTTP en streaming que les agents et la CLI appellent pour lire et piloter le cœur de gestion de projet. C’est la même surface que celle qu’utilise l’agent Motir pour exécuter un plan. L’ajouter à Claude ne nécessite qu’une connexion et aucun token ; tout autre client, ou un pipeline, se connecte avec un token en trois étapes.

## Ajouter Motir à Claude {#claude}

Vous vous connectez avec votre compte Motir, choisissez un espace de travail et approuvez ce que Claude peut y faire. Rien n’est copié ni collé — il n’y a aucun token à créer ni à protéger.

### claude.ai {#claude-ai}

1. Ouvrez Customize → Connectors.
2. Cliquez sur « + », puis sur Add custom connector, et collez l’URL du serveur ci-dessous. Sous OAuth client, choisissez Use Claude’s published identity — claude.ai l’indique comme Detected, car Motir la prend en charge. Laissez vides l’ID client et le secret OAuth — Motir n’a besoin ni de l’un ni de l’autre.
3. Cliquez sur Add, puis sur Connect. Claude vous envoie vers app.motir.co pour vous connecter et approuver.

{{slot:claude-ai}}

Avec une offre Team ou Enterprise, un Owner ajoute le connecteur une seule fois, sous Organization settings → Connectors → Add → Custom → Web, puis chaque membre clique sur Connect sous Customize → Connectors avec son propre compte Motir. · [Documentation de claude.ai d’Anthropic]({{value:routeClaudeAiDocsUrl}}) · étapes vérifiées le {{value:routeClaudeAiCheckedOn}}

### Application de bureau Claude {#claude-desktop}

1. Si vous avez déjà connecté Motir sur claude.ai, il n’y a rien à ajouter : un connecteur connecté est disponible dans vos conversations sur le web, dans l’application de bureau et sur mobile.
2. Pour l’ajouter plutôt depuis l’application de bureau, sélectionnez Customize dans la barre latérale, puis Connectors, et suivez les étapes de claude.ai avec la même URL.
3. La page de connexion de Motir s’ouvre dans votre navigateur ; approuvez-y, puis revenez dans l’application.

{{slot:claude-desktop}}

C’est un connecteur distant, et non une extension de bureau locale : Claude joint Motir depuis le cloud d’Anthropic, rien n’est donc installé sur votre machine. · [Documentation de l’application de bureau Claude d’Anthropic]({{value:routeClaudeDesktopDocsUrl}}) · étapes vérifiées le {{value:routeClaudeDesktopCheckedOn}}

### Claude Code {#claude-code}

1. Ajoutez le serveur avec la commande ci-dessous — sans en-tête et sans token.
2. Dans Claude Code, exécutez `/mcp`, sélectionnez `motir` et suivez la connexion dans votre navigateur.

{{slot:claude-code}}

Si vous avez connecté Claude Code avec votre compte Claude, un connecteur que vous avez connecté sur claude.ai y est déjà disponible. Le plugin Motir pour Claude Code apporte ce serveur avec lui, en plus des skills. · [Documentation de Claude Code d’Anthropic]({{value:routeClaudeCodeDocsUrl}}) · étapes vérifiées le {{value:routeClaudeCodeCheckedOn}}

### Ce que vous approuvez, et comment le retirer {#consent}

La page de connexion de Motir nomme l’application qui fait la requête, vous fait choisir un espace de travail et liste les permissions souhaitées. Claude agit ensuite en votre nom dans cet espace de travail, dans les limites de ce que vous avez approuvé — jamais au-delà de ce que permet votre propre rôle.

Lorsque claude.ai se connecte avec l’identité publiée de Claude, Motir vérifie que claude.ai la publie, et affiche claude.ai comme domaine vérifié sur la page de connexion et dans Applications connectées. Tout autre client MCP qui s’enregistre lui-même apparaît comme Non vérifiée : le nom qu’il affiche est un nom qu’il a choisi, et Motir ne peut pas le contrôler.

Claude vous consulte avant d’utiliser un outil qui modifie quoi que ce soit : chaque outil indique s’il se limite à lire, à écrire ou à supprimer, et [{{value:mcpToolsPage}}](/docs/mcp/tools) montre lesquels sont lesquels. Vous préférez le plugin pour Claude Code ? Il apporte ce serveur avec lui — [{{value:skillsPage}}](/docs/skills).

Chaque application que vous connectez est listée sous [Applications connectées]({{value:connectedAppsUrl}}), dans Paramètres → Compte → Jetons de Motir, avec son espace de travail, ses permissions et la date de sa dernière utilisation. Révoquer met fin à son accès dès sa requête suivante.

## Autres clients et CI : utiliser un token {#token-route}

Choisissez cette voie pour un client sans connexion OAuth, un agent sans interface ou un pipeline de CI. C’est le même serveur ; un token d’accès personnel remplace la connexion.

## Ce serveur, ou l’API REST ? {#fork}

Les deux s’adressent aux mêmes données et acceptent le même identifiant. Ils sont conçus pour des consommateurs différents, et la différence qui compte est ce que chacun promet quant à ce qui peut changer sous vos pieds.

|                      | {{value:mcpPage}}                                                                                                                                     | {{value:apiPage}}                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Endpoint**         | `POST {{value:endpointPath}}`                                                                                                                         | `/api/v1/…`                                                                            |
| **Conçu pour**       | Un agent que vous contrôlez — il lit les descriptions des outils à l’exécution.                                                                       | Un client que vous livrez — du code écrit une fois pour une forme figée.               |
| **Stabilité**        | Appelé à changer. Reformuler une description ou renommer un argument est la manière d’ajuster le comportement d’un agent.                             | Additive uniquement. Un changement incompatible crée `/api/v2` ; v1 tient sa promesse. |
| **Forme**            | La même. Les charges utiles MCP sont dérivées des schémas de réponse v1, si bien que les deux décrivent, de façon démontrable, des objets identiques. | La même, et c’est la source dont dérive le MCP.                                        |
| **Authentification** | Un token d’accès personnel, un ensemble de scopes.                                                                                                    | Le même identifiant fonctionne sur les deux.                                           |

Vous connectez un agent ? Restez ici. Vous écrivez un logiciel que d’autres installent ? L’[{{value:apiPage}}](/docs/api) est l’autre moitié — c’est elle qui promet de ne pas changer sous vos pieds.

## 1. Créer un token {#token}

Chaque requête porte un token d’accès personnel, créé dans Motir sous Paramètres → Compte → Jetons. Choisissez l’espace de travail auquel il est lié et accordez-lui l’ensemble de scopes le plus restreint qui suffit — le tableau en bas de cette page indique ce que chaque scope contrôle. Une autorisation restreint votre propre rôle et ne l’élargit jamais, de sorte qu’un token ne peut jamais faire ce que vous ne pourriez pas faire.

Le secret n’est affiché qu’une seule fois, à la création du token. Copiez-le à ce moment-là ; il est impossible de le relire ensuite, et un token perdu se remplace au lieu de se récupérer.

## 2. Connecter votre client {#wire}

Chaque client a besoin des quatre mêmes informations, sous les noms qu’il leur donne.

|               |                                                                          |
| ------------- | ------------------------------------------------------------------------ |
| **URL**       | `{{value:url}}`                                                          |
| **Transport** | HTTP en streaming — pas SSE, et pas une commande stdio                   |
| **En-tête**   | `{{value:authHeader}}: {{value:authScheme}} <token>`, sur chaque requête |
| **Token**     | `{{value:tokenPlaceholder}}` — celui que vous avez créé à l’étape 1      |

Gardez le token hors de tout fichier que suit votre dépôt. Lorsqu’un client peut le lire dans votre environnement ou vous le réclamer, le bloc ci-dessous utilise cette option au lieu d’une valeur littérale — c’est pourquoi deux d’entre eux nomment `{{value:tokenEnvVar}}` plutôt qu’un secret.

### Claude Code {#client-claude-code}

{{slot:client-claude-code}}

Ou une seule commande : `{{value:claudeCodeTokenCommand}}` · [Documentation de Claude Code]({{value:clientClaudeCodeDocsUrl}}) · format vérifié le {{value:clientsCheckedOn}}

### Cursor {#client-cursor}

{{slot:client-cursor}}

Cursor interpole `${env:…}`, de sorte que le token reste dans votre environnement et hors du fichier. · [Documentation de Cursor]({{value:clientCursorDocsUrl}}) · format vérifié le {{value:clientsCheckedOn}}

### VS Code {#client-vscode}

{{slot:client-vscode}}

VS Code vous réclame le token au premier démarrage du serveur et le stocke de façon sécurisée — aucun secret n’est écrit dans le fichier. · [Documentation de VS Code]({{value:clientVscodeDocsUrl}}) · format vérifié le {{value:clientsCheckedOn}}

### Codex CLI {#client-codex}

{{slot:client-codex}}

`{{value:codexTokenKey}}` prend le NOM de la variable, pas le token. · [Documentation de Codex CLI]({{value:clientCodexDocsUrl}}) · format vérifié le {{value:clientsCheckedOn}}

### Tout autre client HTTP en streaming {#client-other}

{{slot:client-other}}

Windsurf, Zed, Cline, Goose, ou quelque chose que vous avez écrit vous-même — les mêmes quatre informations sous d’autres noms de clés. · [Documentation de tout autre client HTTP en streaming]({{value:clientOtherDocsUrl}}) · format vérifié le {{value:clientsCheckedOn}}

## 3. Vérifier la connexion {#check}

Redémarrez le client et interrogez-le sur les outils dont il dispose ; le serveur répond avec tout le catalogue, limité à votre autorisation. Pour vérifier l’endpoint lui-même avant d’y mêler un client, interrogez-le directement — c’est le même handshake, avec le token dans votre environnement.

{{slot:verify}}

**Une réponse « non autorisé » concerne le TOKEN, pas la configuration.** Un token absent, mal formé, inconnu, révoqué ou expiré renvoie le même refus, à dessein — les distinguer ferait de l’endpoint un oracle qui révèle si un secret existe. Vérifiez que l’en-tête s’écrit `{{value:authHeader}}`, que la valeur commence par `{{value:authScheme}}`, et que le token n’a pas été révoqué dans Motir.

## Ce qu’une connexion peut appeler {#scopes}

Chaque outil est contrôlé par un scope. Les permissions que vous avez approuvées pour une application connectée, ou l’autorisation que porte un token, déterminent les outils qu’il peut appeler — la liste affichée par votre client est donc déjà limitée à ce qui vous concerne. Elles sont lues dans Motir lui-même à chaque affichage de cette page ; elles reflètent donc ce que le serveur fournit à l’instant.

{{part:what-next}}

[//]: # 'Placed after the scope table, which the page generates from the published catalogue.'

## La suite {#what-next}

[{{value:mcpToolsPage}}](/docs/mcp/tools) liste chaque outil que le serveur expose avec les arguments qu’il prend. [La référence complète]({{value:referenceUrl}}) dans motir-core porte la description complète de chaque outil. Piloter les mêmes données depuis un terminal est l’objet de la [{{value:cliPage}}](/docs/cli).

{{part:column-scope}}

[//]: # 'A heading of the scope table. Each of the five parts below is one short label that stays a single word or phrase, with no sentence around it.'

Scope

{{part:column-gates}}

Ce qu’il contrôle

{{part:column-default}}

Par défaut

{{part:granted}}

Accordé

{{part:off-by-default}}

Désactivé par défaut

{{part:unreachable}}

[//]: # 'Shown in place of the scope table when the catalogue cannot be fetched. Keep `tools/list` literal.'

Le tableau des scopes est temporairement inaccessible. Il est dérivé du catalogue que publie Motir et n’est jamais copié ici ; il n’y a donc rien à vous montrer en attendant — un handshake `tools/list` avec votre propre token répond à la même question pour ce token.
