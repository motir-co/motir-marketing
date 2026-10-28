A public project answers at its own address on `motir.co`, and can additionally answer on a domain you already own. Separately, a workspace can claim one name of its own under `motir.site`.

## Your Motir address {#your-motir-address}

Every public project answers at `motir.co/p/ROADMAP` for a project keyed `ROADMAP`. There is nothing to claim: the address follows from the project’s key, and it is included on every plan.

## Your workspace name {#your-workspace-name}

A workspace can claim one name under `motir.site`, so `acme` gives you `acme.motir.site`. That name is where the applications Motir hosts for your workspace answer: the bare address shows the workspace’s default application, or a page saying there is no application here yet. **Public projects never answer under it** — a project stays at its `motir.co` address.

A workspace owner or admin claims the name in Workspace settings under _Public address_. Project settings shows it read-only, with a link there.

A name is lowercase letters, digits and single hyphens, three to sixty-three characters. A small set of names is kept back for Motir’s own hosts and for names a reader could mistake for one.

A workspace has one name or none. **There are no aliases, and nothing redirects:** when you rename or release the name, the old address stops answering at once, and links already shared to it stop working.

- **One change every 30 days.** A rename and a release each count as one change, so releasing and claiming again does not get round it. While a change is not allowed yet, the pane shows the date it will be.
- **A name you let go of is held, unless you only just claimed it.** A name held for less than 24 hours goes straight back to the pool. A name held for 24 hours or more is kept back for 90 days, so nobody else can pick up links that pointed at you; the confirm dialog names the exact date it becomes free.

## Connecting your own domain {#connecting-your-own-domain}

Connecting a domain you own is available on paid plans — see [our plans](/). Your `motir.co` address is included on every plan and keeps working either way.

A connected domain serves _one_ project, at its root: `roadmap.acme.com/` is that project’s page and `roadmap.acme.com/changelog` its changelog. The live board, work items and roadmap are in the Motir app, and their links there lead in.

You create two kinds of record at your registrar. **Add the domain first**, in Project settings under _Public address_: the pane then lists every record that domain needs, with its exact value and a copy button on each. The shapes below are what to expect — read them to check your registrar can create them, and take the values from the pane.

### 1 · Point the domain at us {#point-the-domain-at-us}

For a **subdomain** such as `roadmap.acme.com`, one `CNAME`:

| Type    | Name      | Value             |
| ------- | --------- | ----------------- |
| `CNAME` | `roadmap` | shown in the pane |

For a **root domain** such as `acme.com`, an `A` and an `AAAA` instead — a root domain cannot take a `CNAME`, because it already carries the `MX` and `TXT` records your mail and your other services depend on:

| Type   | Name | Value             |
| ------ | ---- | ----------------- |
| `A`    | `@`  | shown in the pane |
| `AAAA` | `@`  | shown in the pane |

Copy each value from the pane rather than from anywhere else. These are the addresses Motir is served on, read from the platform we run on, and they can change — the pane changes with them and a page like this one does not.

> If your DNS provider offers a “proxy” or “cloud” toggle on the record, turn it off: a proxy in front of the record hides your domain from the check and the certificate cannot be issued.

### 2 · Prove the domain is yours {#prove-the-domain-is-yours}

Alongside the pointing record, the pane lists one `TXT` record with a token in it, of the shape:

| Type  | Name                    | Value            |
| ----- | ----------------------- | ---------------- |
| `TXT` | `_motir-verify.roadmap` | `motir-verify=…` |

Copy the value from the pane rather than from here — the token is yours alone. Then choose _Verify_. Once we can see the record we request a certificate, which usually completes in a minute or two. You can close the page; the status keeps moving on its own, and the records stay available under _Show DNS records_.

## What each status means {#what-each-status-means}

[//]: # "Translator: the Status column names states the product itself shows. Use the label the app's own messages file for your locale gives each state, not a fresh translation, so this table matches the screen."

| Status       | What it means                                                                                                                              | What to do                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Not verified | We have not seen your ownership record yet. Nothing has been requested from the certificate authority.                                     | Create the TXT record below, then choose Check again.              |
| Checking…    | We are looking for the ownership record now. DNS changes can take a few minutes to spread.                                                 | Wait a moment. It moves on by itself.                              |
| Issuing…     | Ownership is proven and the certificate has been requested. This usually takes a minute or two.                                            | Nothing. Motir does the rest.                                      |
| Live         | The certificate is issued and your domain serves the project. It renews on its own.                                                        | You can make this address the primary one.                         |
| Failed       | The certificate could not be issued. The reason is shown beside the status — most often a record that is missing or points somewhere else. | Compare your records with the ones below, then choose Check again. |
| Expired      | The certificate lapsed and renewal did not succeed — almost always because a DNS record changed. The domain is not serving.                | Put the records back as they were, then choose Check again.        |
| Revoked      | The certificate was withdrawn. The domain is not serving.                                                                                  | Choose Request again to start a new certificate.                   |

## Which address is the real one {#which-address-is-the-real-one}

A project can answer at several addresses, and exactly one of them is the _primary_ — the one search engines and social cards are told about. Once a connected domain’s certificate is live you can make it primary; until then the Motir address is.

**Every other address redirects to the primary.** That includes your `motir.co` address once you have promoted a domain of your own. Visitors always arrive somewhere that works, and a search engine sees one page rather than three copies competing with each other.

## Removing a domain {#removing-a-domain}

Removing a connected domain withdraws its certificate and the address stops answering — anyone using it will get an error, and links already shared to it stop working. Your project stays public at its other addresses, so removing a domain never makes a project private.

## If something is not working {#if-something-is-not-working}

Three mistakes account for almost every failure, and each shows up differently in the pane.

- **A CNAME on a root domain.** Most registrars accept it and it does not work. The symptom is a domain that stays `Not verified` or reaches `Failed`. Use the `A` and `AAAA` records above instead.
- **A proxying DNS provider in front of the record.** If your provider offers to proxy or accelerate traffic, that hides the real record from us. The symptom is `Checking…` that never settles. Turn the proxy off for these records.
- **A stale ownership record.** If you removed and re-added a domain, the token changed. The symptom is `Not verified` while a `TXT` record is plainly there. Replace its value with the one the pane shows now.
