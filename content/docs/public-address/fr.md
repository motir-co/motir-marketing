---
source: 331d263ce3e1
---

Un projet public répond à sa propre adresse sur `motir.co`. Par ailleurs, un espace de travail peut réserver un nom qui lui est propre sous `motir.site`, et servir son application hébergée sur un domaine qu’il possède déjà.

## Votre adresse Motir {#your-motir-address}

Chaque projet public répond à `motir.co/p/ROADMAP` pour un projet dont la clé est `ROADMAP`. Il n’y a rien à réserver : l’adresse découle de la clé du projet, et elle est incluse dans toutes les offres.

## Le nom de votre espace de travail {#your-workspace-name}

Un espace de travail peut réserver un nom sous `motir.site` — ainsi `acme` vous donne `acme.motir.site`. C’est sous ce nom que répondent les applications que Motir héberge pour votre espace de travail : l’adresse seule affiche l’application par défaut de l’espace de travail, ou une page indiquant qu’il n’y a pas encore d’application ici. **Les projets publics n’y répondent jamais** — un projet reste à son adresse `motir.co`.

Un propriétaire ou un administrateur de l’espace de travail réserve le nom dans les _Paramètres de l’espace de travail_, sous _Adresse publique_. Les paramètres du projet l’affichent en lecture seule, avec un lien vers cet endroit.

Un nom se compose de lettres minuscules, de chiffres et de tirets isolés, de trois à soixante-trois caractères. Un petit ensemble de noms est mis de côté pour les hôtes de Motir et pour les noms qu’un lecteur pourrait prendre pour l’un d’eux.

Un espace de travail a un nom ou aucun. **Il n’y a pas d’alias, et rien ne redirige :** quand vous renommez ou libérez le nom, l’ancienne adresse cesse aussitôt de répondre, et les liens déjà partagés vers elle ne fonctionnent plus.

- **Un changement tous les 30 jours.** Un renommage et une libération comptent chacun pour un changement : libérer puis réserver à nouveau ne permet donc pas de contourner la règle. Tant qu’un changement n’est pas encore permis, le volet indique la date à partir de laquelle il le sera.
- **Un nom que vous abandonnez est retenu, sauf si vous venez de le réserver.** Un nom détenu moins de 24 heures retourne immédiatement dans le pool. Un nom détenu 24 heures ou plus est mis de côté pendant 90 jours, pour que personne d’autre ne récupère des liens qui pointaient vers vous ; la boîte de confirmation indique la date exacte à laquelle il redevient libre.

## Votre propre domaine {#your-own-domain}

Un domaine que vous possédez, comme `shop.acme.com`, peut répondre avec l’application hébergée de votre espace de travail, quelle que soit la cible qui l’exécute. Les domaines personnalisés sont disponibles avec les offres payantes — voir [nos offres](/). Un propriétaire ou un administrateur de l’espace de travail les ajoute et les retire ; tous les autres membres de l’espace de travail les voient en lecture seule. Les adresses `motir.co` de vos projets et le nom `motir.site` de votre espace de travail continuent de fonctionner dans tous les cas.

## Ajouter le domaine {#add-the-domain}

Ajoutez le domaine dans les _Paramètres de l’espace de travail_, sous _Domaines personnalisés_. Le panneau _Adresse publique_ y renvoie aussi, avec _Utiliser plutôt votre propre domaine_.

En l’ajoutant, choisissez quelle application de l’espace de travail il sert. Un domaine sert exactement une application. Vous pourrez changer laquelle plus tard sur la ligne du domaine, avec _Changer d’application_. Un espace de travail qui n’a pas encore d’application hébergée peut quand même ajouter un domaine : il est ajouté sans application et ne sert rien tant que vous n’en avez pas choisi une.

## Les enregistrements à créer {#the-records-you-create}

Une fois le domaine ajouté, le panneau liste chaque enregistrement dont il a besoin, avec sa valeur exacte et un bouton de copie sur chacun, et les garde sous _Afficher les enregistrements DNS_. Les formes ci-dessous montrent à quoi vous attendre — lisez-les pour vérifier que votre registraire peut les créer, et prenez les valeurs dans le panneau.

D’abord, un enregistrement `TXT` qui prouve que le domaine vous appartient. Son nom est `_motir-verify.` suivi de votre domaine ; la plupart des registraires n’attendent que la partie qui précède votre domaine racine, comme ici :

| Type  | Nom                  | Valeur                   |
| ----- | -------------------- | ------------------------ |
| `TXT` | `_motir-verify.shop` | affichée dans le panneau |

Le jeton qu’il contient n’appartient qu’à vous : copiez-le depuis le panneau plutôt que depuis ailleurs.

Puis un enregistrement qui fait pointer le domaine vers Motir. Pour un **sous-domaine** comme `shop.acme.com`, un `CNAME` :

| Type    | Nom    | Valeur                   |
| ------- | ------ | ------------------------ |
| `CNAME` | `shop` | affichée dans le panneau |

Pour un **domaine racine** comme `acme.com`, un `A` et un `AAAA` à la place — un domaine racine ne peut pas porter de `CNAME`, car il porte déjà les enregistrements `MX` et `TXT` dont dépendent votre messagerie et vos autres services. Il en va de même pour un domaine placé directement sous un suffixe public de plus d’une partie, comme `acme.co.uk` ; le panneau sait de quel type est le vôtre et liste les bons enregistrements.

| Type   | Nom | Valeur                   |
| ------ | --- | ------------------------ |
| `A`    | `@` | affichée dans le panneau |
| `AAAA` | `@` | affichée dans le panneau |

Ces adresses appartiennent à Motir, qui les réserve aux domaines de ses clients. Si elles changent un jour, le panneau change avec elles ; une page comme celle-ci, non.

> Si votre fournisseur DNS propose un interrupteur « proxy » ou « cloud » sur l’enregistrement, désactivez-le : un proxy placé devant l’enregistrement cache votre domaine à la vérification, et le certificat ne peut pas être émis.

Choisissez ensuite _Contrôler maintenant_. Dès que nous voyons l’enregistrement de propriété, nous sollicitons un certificat, ce qui prend en général quelques minutes. Vous pouvez fermer la page ; le statut avance tout seul.

## Ce que signifie chaque statut {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Statut       | Ce qu’il signifie                                                                                                                                                                   | Que faire                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Non confirmé | Nous n’avons pas encore vu votre enregistrement de propriété. Rien n’a été sollicité auprès de l’autorité de certification, et le domaine ne répond pas.                            | Créez les enregistrements que liste le panneau, puis choisissez Contrôler maintenant.                    |
| En attente   | Nous cherchons votre enregistrement de propriété en ce moment. Les changements DNS peuvent mettre quelques minutes à se propager.                                                   | Patientez un instant. Il avance tout seul.                                                               |
| En attente   | La propriété est confirmée et le certificat est en cours d’émission. Cela prend en général quelques minutes.                                                                        | Rien. La page se met à jour toute seule.                                                                 |
| Émis         | Le certificat est émis et votre domaine répond. Il se renouvelle tout seul.                                                                                                         | Rien.                                                                                                    |
| Échec        | « Nous ne voyons plus votre enregistrement de propriété. » L’enregistrement `TXT` ne contient plus votre jeton, donc le domaine a cessé de répondre.                                | Rétablissez l’enregistrement `TXT` que montre le panneau, puis choisissez Contrôler à nouveau.           |
| Échec        | « _Votre domaine_ ne pointe plus vers Motir. » Son enregistrement `A`, `AAAA` ou `CNAME` a été modifié ou supprimé, donc le domaine a cessé de répondre.                            | Remettez l’enregistrement à la valeur que montre le panneau, puis choisissez Contrôler à nouveau.        |
| Échec        | « Le certificat n’a pas pu être émis. » L’autorité de certification l’a refusé ; le panneau affiche son propre motif à côté.                                                        | Corrigez ce que nomme le motif — le plus souvent un enregistrement manquant — puis choisissez Réessayer. |
| Échec        | « Le certificat n’a pas pu être émis. » Le certificat a expiré et son renouvellement a échoué — presque toujours parce qu’un enregistrement DNS a changé. Le domaine ne répond pas. | Rétablissez les enregistrements tels que les montre le panneau, puis choisissez Réessayer.               |
| Échec        | « Le certificat n’a pas pu être émis. » Le certificat a été révoqué. Le domaine ne répond pas.                                                                                      | Choisissez Réessayer pour lancer un nouveau certificat.                                                  |

Seul un domaine dont le statut est _Émis_ répond.

## Ce que sert votre domaine {#what-your-domain-serves}

Une fois son certificat émis, votre domaine reçoit sa réponse de la périphérie de Motir, qui transmet chaque requête — son chemin, sa chaîne de requête, son corps et ses cookies — à l’application que nomme le domaine, et renvoie la réponse propre à cette application. Ce que voit un visiteur dépend de l’application :

- **Votre application elle-même**, quand elle a été publiée et qu’elle est ouverte à tous.
- **Une page indiquant que rien n’est encore publié ici**, quand le domaine ne nomme aucune application ou que l’application n’a pas encore été publiée.
- **Une page indiquant que le site est réservé aux membres**, quand l’application n’est ouverte qu’à ses membres. Les membres y accèdent à son adresse `motir.site`, vers laquelle la page renvoie quand il y en a une. Aujourd’hui, chaque application hébergée n’est ouverte qu’à ses membres — le réglage qui en ouvre une à tous n’est pas encore disponible —, donc pour l’instant un domaine qui nomme une application publiée affiche cette page plutôt que l’application.
- **Une page indiquant que le site est momentanément injoignable**, quand l’application tourne sur une cible vers laquelle la périphérie ne sait pas encore transmettre. Il répond de nouveau dès qu’elle le peut.
- **Une seule page « introuvable » toute simple** pour toute autre raison, y compris un domaine retiré. C’est la même page quelle que soit la raison, elle ne dit donc jamais à un visiteur laquelle s’applique.

Aucune de ces pages n’affiche le site de Motir autour d’elle, et aucune n’est indexée par les moteurs de recherche.

Motir n’ajoute sur votre domaine ni redirection, ni lien canonique, ni fichier robots, ni sitemap qui lui soient propres. Votre application définit les siens.

## Deux domaines dans un même espace de travail {#two-domains-on-one-workspace}

Un espace de travail peut connecter plus d’un domaine, dans la limite de ce que comprend son offre. Chacun nomme sa propre application, choisie sur sa propre ligne. Motir ne place aucun d’eux au-dessus des autres et ne redirige entre aucun d’eux : chacun répond de lui-même, avec l’application qu’il nomme.

## Retirer un domaine {#removing-a-domain}

Choisissez _Retirer_ sur la ligne du domaine. Le domaine cesse de servir votre application en une trentaine de secondes environ, puis répond avec la page introuvable. Rien n’est réservé : vous pourrez l’ajouter de nouveau plus tard, et un autre espace de travail peut l’ajouter dès qu’il en prouve la propriété avec un enregistrement `TXT` à lui. Les enregistrements chez votre fournisseur DNS sont à vous de supprimer. Retirer un domaine ne change rien à l’application, qui continue de répondre à ses autres adresses.

## Si quelque chose ne fonctionne pas {#if-something-is-not-working}

Quatre erreurs expliquent presque tous les échecs, et chacune se manifeste différemment dans le panneau.

- **Un CNAME sur un domaine racine.** La plupart des registraires l’acceptent, et il ne fonctionne pas. Le symptôme est un domaine qui reste _En attente_ ou passe en _Échec_. Utilisez plutôt les enregistrements `A` et `AAAA` ci-dessus.
- **Un fournisseur DNS qui joue le rôle de proxy devant l’enregistrement.** Si votre fournisseur propose de faire transiter ou d’accélérer le trafic, cela nous cache le véritable enregistrement. Le symptôme est un _En attente_ qui ne se stabilise jamais. Désactivez le proxy pour ces enregistrements.
- **Un enregistrement de propriété périmé.** Si vous avez retiré puis ajouté de nouveau un domaine, le jeton a changé. Le symptôme est _Non confirmé_ alors qu’un enregistrement `TXT` est bien là. Remplacez sa valeur par celle que le panneau affiche maintenant.
- **Un enregistrement de propriété supprimé plus tard.** Un domaine actif dont l’enregistrement `TXT` disparaît continue de répondre jusqu’à ce que notre contrôle régulier s’en aperçoive, ce qui arrive en une heure environ ; il passe alors en _Échec_ et cesse de répondre. Rétablissez l’enregistrement et choisissez Contrôler à nouveau.
