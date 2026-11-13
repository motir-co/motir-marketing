---
source: 9091e5e2f59e
---

La Motir CLI dialogue avec le même serveur MCP que l’agent Motir. Elle automatise la boucle de planification et d’exécution à partir d’un token limité à un espace de travail : une exécution prend le prochain élément de travail prêt, récupère le prompt généré par le serveur et lance un agent dans un bac à sable pour l’exécuter. L’élément de travail est le système de référence ; la CLI n’est que le pilote.

{{part:meta}}

{{value:packageName}} · version {{value:packageVersion}} · {{value:commandCount}} commandes

{{part:reference}}

## Installer {#install}

Node {{value:nodeRequirement}}. Installez-la globalement, ou lancez-la une seule fois sans l’installer.

{{slot:install}}

## S’authentifier {#authenticate}

Le flux d’appareil est le chemin le plus court : il affiche un code, ouvre Motir et attend que vous l’approuviez. Si vous possédez déjà un token d’accès personnel, fournissez-le directement à la place. Dans les deux cas, la CLI dialogue avec {{value:defaultServer}} sauf si vous la dirigez ailleurs.

{{slot:authenticate}}

Liez ensuite un dossier à un projet, puis vérifiez la configuration avant la première exécution.

{{slot:link-and-check}}

## Commandes {#commands}

Chaque commande que la CLI enregistre, dans l’ordre où `motir help` les affiche, générée à partir du catalogue que le binaire déclare lui-même — cette liste ne peut donc pas prendre de retard sur une version. Elle décrit {{value:packageName}}@{{value:packageVersion}}.

{{slot:commands}}

## Où Motir range ses données {#where-motir-keeps-things}

Trois fichiers, dont un seul contient un secret — et ce n’est pas celui qui se trouve dans votre dépôt. Chaque chemin ci-dessous peut être déplacé ; `motir help files` les affiche d’après le binaire que vous avez réellement installé, avec la variable qui déplace chacun.

- `~/.config/motir/config.json` **— secret, à ne jamais commiter**
  Le magasin d’identifiants : le seul fichier dans lequel un token d’accès personnel est écrit, en `chmod 600` dans un répertoire `0700`, indexé par l’URL du serveur pour qu’une même machine puisse conserver les tokens de plusieurs serveurs Motir. Il contient aussi la commande d’agent que vous avez configurée. Déplacez-le avec `MOTIR_CONFIG_HOME` ou `XDG_CONFIG_HOME`.
- `.motir.json` **— aucun secret, peut être commité sans risque**
  Le lien de projet à la racine de votre espace de travail : le serveur, l’espace de travail et le projet auxquels ce dossier est lié, plus une table facultative de remplacement des dépôts. Il ne contient aucun identifiant et a donc sa place dans le contrôle de version. Chaque commande le résout en remontant VERS LE HAUT depuis le répertoire courant, de sorte que toute commande fonctionne depuis n’importe quelle copie de travail située sous la racine.
- `~/.local/state/motir/session-excludes.json` **— aucun secret**
  La liste d’exclusion de session : les éléments de travail dont le lancement a ÉCHOUÉ, afin que l’exécution suivante passe à autre chose au lieu de reprendre le même échec. C’est un état et non un identifiant, ce qui explique qu’il ne se trouve pas à côté du token — le bac à sable monte le répertoire de configuration en lecture seule, et une exécution ne doit jamais s’interrompre faute de pouvoir écrire ce fichier. S’il n’est pas accessible en écriture, Motir avertit une fois puis continue. Déplacez-le avec `MOTIR_STATE_HOME`.

## Où s’exécute une exécution {#where-a-run-executes}

Un agent lancé s’exécute dans un conteneur qui contient vos copies de travail et votre propre identifiant d’agent — ce qu’il fournit, ce que son token refuse et les échecs que rencontre une première exécution sont décrits sur la page [{{value:sandboxPage}}](/docs/sandbox) plutôt que répétés ici. Connecter un agent à Motir sans la CLI est l’objet de [{{value:mcpPage}}](/docs/mcp), et piloter la même boucle de travail en HTTP est l’objet de l’[{{value:apiPage}}](/docs/api). La référence complète des commandes — les trois formes d’exécution, les branches de session, la politique d’échec et le dépannage — se trouve dans [docs/cli.md]({{value:cliReferenceUrl}}), dans motir-core.

{{part:unreachable}}

La référence des commandes est temporairement inaccessible. Elle est générée à partir du catalogue que la CLI déclare elle-même et n’est jamais copiée ici ; il n’y a donc rien à vous montrer en attendant — `motir help` affiche le même tableau à partir du binaire que vous avez installé.
