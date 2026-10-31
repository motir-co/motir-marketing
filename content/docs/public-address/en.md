A public project answers at its own address on `motir.co`. Separately, a workspace can claim one name of its own under `motir.site`, and can serve its hosted application on a domain it already owns.

## Your Motir address {#your-motir-address}

Every public project answers at `motir.co/p/ROADMAP` for a project keyed `ROADMAP`. There is nothing to claim: the address follows from the project’s key, and it is included on every plan.

## Your workspace name {#your-workspace-name}

A workspace can claim one name under `motir.site`, so `acme` gives you `acme.motir.site`. That name is where the applications Motir hosts for your workspace answer: the bare address shows the workspace’s default application, or a page saying there is no application here yet. **Public projects never answer under it** — a project stays at its `motir.co` address.

A workspace owner or admin claims the name in Workspace settings under _Public address_. Project settings shows it read-only, with a link there.

A name is lowercase letters, digits and single hyphens, three to sixty-three characters. A small set of names is kept back for Motir’s own hosts and for names a reader could mistake for one.

A workspace has one name or none. **There are no aliases, and nothing redirects:** when you rename or release the name, the old address stops answering at once, and links already shared to it stop working.

- **One change every 30 days.** A rename and a release each count as one change, so releasing and claiming again does not get round it. While a change is not allowed yet, the pane shows the date it will be.
- **A name you let go of is held, unless you only just claimed it.** A name held for less than 24 hours goes straight back to the pool. A name held for 24 hours or more is kept back for 90 days, so nobody else can pick up links that pointed at you; the confirm dialog names the exact date it becomes free.

## Your own domain {#your-own-domain}

A domain you own, such as `shop.acme.com`, can answer with your workspace’s hosted application, whichever target runs it. Custom domains are available on paid plans — see [our plans](/). A workspace owner or admin adds and removes them; everyone else in the workspace sees them read-only. Your projects’ `motir.co` addresses and your workspace’s `motir.site` name keep working either way.

## Add the domain {#add-the-domain}

Add the domain in Workspace settings under _Custom domains_. The _Public address_ pane links there too, with _Use your own domain instead_.

When you add it, choose which of the workspace’s applications it serves. A domain serves exactly one application. You can change which one later on the domain’s row, with _Change application_. A workspace with no hosted application yet can still add a domain: it is added naming none, and serves nothing until you choose one.

## The records you create {#the-records-you-create}

Once the domain is added, the pane lists every record it needs, with its exact value and a copy button on each, and keeps them under _Show DNS records_. The shapes below are what to expect — read them to check your registrar can create them, and take the values from the pane.

First, one `TXT` record that proves the domain is yours. Its name is `_motir-verify.` followed by your domain; most registrars want only the part before your root domain, as here:

| Type  | Name                 | Value             |
| ----- | -------------------- | ----------------- |
| `TXT` | `_motir-verify.shop` | shown in the pane |

The token in it is yours alone, so copy it from the pane rather than from anywhere else.

Then a record that points the domain at Motir. For a **subdomain** such as `shop.acme.com`, one `CNAME`:

| Type    | Name   | Value             |
| ------- | ------ | ----------------- |
| `CNAME` | `shop` | shown in the pane |

For a **root domain** such as `acme.com`, an `A` and an `AAAA` instead — a root domain cannot take a `CNAME`, because it already carries the `MX` and `TXT` records your mail and your other services depend on. The same holds for a domain directly under a public suffix of more than one part, such as `acme.co.uk`; the pane knows which kind yours is and lists the right records.

| Type   | Name | Value             |
| ------ | ---- | ----------------- |
| `A`    | `@`  | shown in the pane |
| `AAAA` | `@`  | shown in the pane |

These addresses are Motir’s own, held for customer domains. If they ever change, the pane changes with them and a page like this one does not.

> If your DNS provider offers a “proxy” or “cloud” toggle on the record, turn it off: a proxy in front of the record hides your domain from the check and the certificate cannot be issued.

Then choose _Check now_. Once we can see the ownership record we request a certificate, which usually takes a few minutes. You can close the page; the status keeps moving on its own.

## What each status means {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Status     | What it means                                                                                                                                                       | What to do                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Unverified | We have not seen your ownership record yet. Nothing has been requested from the certificate authority, and the domain does not answer.                              | Create the records the pane lists, then choose Check now.                    |
| Pending    | We are looking for your ownership record now. DNS changes can take a few minutes to spread.                                                                         | Wait a moment. It moves on by itself.                                        |
| Pending    | Ownership is confirmed and the certificate is being issued. This usually takes a few minutes.                                                                       | Nothing. The page updates on its own.                                        |
| Issued     | The certificate is issued and your domain answers. It renews on its own.                                                                                            | Nothing.                                                                     |
| Failed     | “We can no longer see your ownership record.” The `TXT` record no longer carries your token, so the domain stopped answering.                                       | Restore the `TXT` record the pane shows, then choose Re-check.               |
| Failed     | “_Your domain_ no longer points at Motir.” Its `A`, `AAAA` or `CNAME` record was changed or removed, so the domain stopped answering.                               | Set the record back to the value the pane shows, then choose Re-check.       |
| Failed     | “The certificate could not be issued.” The certificate authority refused it; the pane shows the authority’s own reason beside it.                                   | Fix what the reason names — most often a missing record — then choose Retry. |
| Failed     | “The certificate could not be issued.” The certificate lapsed and renewal did not succeed — almost always because a DNS record changed. The domain does not answer. | Put the records back as the pane shows them, then choose Retry.              |
| Failed     | “The certificate could not be issued.” The certificate was withdrawn. The domain does not answer.                                                                   | Choose Retry to start a new certificate.                                     |

Only a domain whose status is _Issued_ answers at all.

## What your domain serves {#what-your-domain-serves}

Once its certificate is issued, your domain is answered by Motir’s edge, which forwards each request — its path, query, body and cookies — to the application the domain names and hands back that application’s own response. What a visitor meets depends on the application:

- **Your application itself**, when it has been released and is open to everyone.
- **A page saying nothing is published here yet**, when the domain names no application or the application has not been released yet.
- **A page saying the site is for members only**, when the application opens only to its members. Members reach it at its `motir.site` address, which the page links to when it has one. Today every hosted application opens only to its members — the setting that opens one to everyone is not available yet — so for now a domain naming a released application shows this page rather than the application.
- **A page saying the site can’t be reached right now**, when the application runs on a target the edge cannot forward to yet. It answers again as soon as the edge can.
- **One plain not-found page** for every other reason, a removed domain included. It is the same page whatever the reason, so it never tells a visitor which one applied.

None of these pages carries Motir’s own site around it, and none is indexed by search engines.

Motir adds no redirect, canonical link, robots file or sitemap of its own on your domain. Your application defines its own.

## Two domains on one workspace {#two-domains-on-one-workspace}

A workspace can connect more than one domain, up to what its plan includes. Each names its own application, chosen on its own row. Motir ranks none of them above the others and redirects between none of them: each answers on its own, with the application it names.

## Removing a domain {#removing-a-domain}

Choose _Remove_ on the domain’s row. The domain stops serving your application within about half a minute, and from then on answers the not-found page. Nothing is reserved: you can add it again later, and another workspace can add it once it proves ownership with a `TXT` record of its own. The records at your DNS provider are yours to delete. Removing a domain changes nothing about the application, which keeps answering at its other addresses.

## If something is not working {#if-something-is-not-working}

Four mistakes account for almost every failure, and each shows up differently in the pane.

- **A CNAME on a root domain.** Most registrars accept it and it does not work. The symptom is a domain that stays _Pending_ or reaches _Failed_. Use the `A` and `AAAA` records above instead.
- **A proxying DNS provider in front of the record.** If your provider offers to proxy or accelerate traffic, that hides the real record from us. The symptom is _Pending_ that never settles. Turn the proxy off for these records.
- **A stale ownership record.** If you removed and re-added a domain, the token changed. The symptom is _Unverified_ while a `TXT` record is plainly there. Replace its value with the one the pane shows now.
- **An ownership record deleted later.** A live domain whose `TXT` record disappears keeps answering until our regular check notices, which happens within about an hour; then it turns _Failed_ and stops answering. Restore the record and choose Re-check.
