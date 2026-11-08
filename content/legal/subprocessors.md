---
title: Subprocessors
version: 1.0.2
effectiveDate: TBD
status: approved
---

# Subprocessors

**This page covers the hosted Motir service at `app.motir.co`, operated by moooon B.V.
It does not describe a self-hosted installation.** If you run Motir yourself, you are
your own controller and you choose your own subprocessors; none of the companies below
receives your data unless you configure it to.

moooon B.V. (Menkemaborg 65, 8226 TB Lelystad, Netherlands, KvK 97763144) uses the companies below to
provide the hosted service. We publish this list so that a customer acting as a
controller can assess it, and we keep it current: the list is derived from what the
running application actually integrates with, not from a plan.

**This is the set as at general availability.** Motir is not yet generally
available, so no customer data has reached any company named here. The list
therefore describes what each company **will** receive once the service is live,
rather than sorting vendors into live and pending — a distinction that would be
meaningless while the answer for every row is the same. A company that will not be
part of the service at launch is not listed at all, and a company that joins later
is added here in the change that integrates it.

**Last reviewed: 2026-08-27**, in three passes that are not interchangeable and are
recorded separately throughout this page:

| Pass                | What it read                                                                                                                                  | Date           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Repository read** | The dependency manifests and outbound HTTP clients of `motir-core`, `motir-ai` and `motir-gateway`, at each repository's `origin/main`        | **2026-08-27** |
| **Platform read**   | The three Fly applications' secret NAMES and running environment, and the gateway's own channel and option tables, read from inside a machine | **2026-08-27** |
| **Vendor read**     | Each vendor's own published terms, for the transfer basis                                                                                     | **2026-08-27** |

**The distinction is load-bearing, not bookkeeping.** A repository read cannot see
an integration that is configured but not yet coded, and it cannot see one whose
credentials live in a service's own database rather than in source. A platform read
cannot see an integration that is coded but not yet configured. **The passes have
to be able to disagree before the list is trustworthy, and on this review they
did** —
see _How this list is compiled_ at the foot of the page, which states the method in
full and names every surface walked.

`docs/decisions/ai-upstream-transfer-basis.md` records how the gateway's channel
set was first read, and what it decided.

---

## Core subprocessors — every hosted customer

These receive data as a necessary part of running the service. There is no way to use
the hosted service without them.

| Subprocessor                               | Purpose                                                           | Data reached                                                                                                                  | Location                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Fly.io** (Fly.io, Inc.)                  | Application hosting — Motir runs as a long-running Node process   | All data in transit through the application                                                                                   | Primary region `iad`, Ashburn, USA                                       |
| **Neon** (Neon Inc.)                       | Managed PostgreSQL — the primary database                         | All stored account, workspace and work-item data                                                                              | USA (co-located with the application)                                    |
| **Tigris** (Tigris Data, Inc.)             | S3-compatible object storage, in **three** buckets — see below    | Uploaded files and their metadata; **and** code-graph snapshots derived from the repositories you connect                     | USA                                                                      |
| **Resend** (Resend, Inc.)                  | Transactional email — invitations, password resets, notifications | Recipient address, name, and the message body                                                                                 | USA                                                                      |
| **Amazon SES** (Amazon Web Services, Inc.) | Transactional email — invitations, password resets, notifications | Recipient address, name, and the message body                                                                                 | USA — region `us-east-1`, the region the sending identity is verified in |
| **Sentry** (Functional Software, Inc.)     | Error monitoring — server, edge and browser                       | Error and performance events: stack traces, request URLs, and the IP address and user agent of the browser that hit the error | USA                                                                      |

**The three Tigris buckets**, because the count and the third bucket's contents
both changed at this review: `motir-core-public` (public assets) and
`motir-core-private` (file attachments) hold what you upload. A third,
`motir-codegraph-snap`, holds **code-graph snapshots built from the repositories a
workspace connects** — a different category of data from an uploaded file, and one
this page did not previously describe. It is the same vendor, the same region and
the same transfer basis; only the description was incomplete.

## Sign-in

| Subprocessor                                  | Purpose                 | Data reached                                                                                  | Location |
| --------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- | -------- |
| **Google** (Google Ireland Ltd. / Google LLC) | Optional Google sign-in | Your Google account identifier, name and email address, **only if you choose Google sign-in** | Global   |

Email-and-password sign-in reaches no third party.

## Product analytics

| Subprocessor                          | Purpose                     | Data reached                                                                       | Location               |
| ------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| **Plausible** (Plausible Insights OÜ) | Aggregate product analytics | Page-level usage events. **Cookieless**, and it does not identify individual users | EU (Estonia / Germany) |

## AI features — the model you choose

Motir's AI features — planning, and the hosted agents that carry out the work — send the
text you provide to a **model provider you select**. **If you never use an AI feature, no
prompt data leaves the core service.**

### ⚠️ Three of the names in that path are ours, and none of them is a subprocessor

moooon B.V. builds three products, and two of them sit between Motir and a model
provider. They are worth naming because they are separate products a reader may meet on
their own — not because they are third parties, which they are not:

- **motir-core** — the planning and project-management application. Open source, and
  usable standalone as self-hosted PM software.
- **motir-ai** — the planning intelligence. It can plan into other project-management
  tools, not only into Motir.
- **motir-gateway** — the LLM routing layer: one OpenAI-compatible interface in front of
  many providers, with metering. It is intended to be offered to other companies, and it
  is the same shape as a public routing service such as OpenRouter.

**A subprocessor is a _third party_ a processor engages.** All three are moooon B.V., so
listing them here would name a company to itself and tell you nothing about who else can
see your data. What they run **on** is a different question and a real one: they are
hosted by **Fly.io**, which is a subprocessor and is listed under _Core subprocessors_
above.

**motir-gateway holds no model and produces no answers.** It accepts a request, decides
which upstream channel can serve the model asked for, forwards it, meters what it cost
and returns the response. It does not train on your content, and what it retains is a
usage record — token counts, model name, channel, timestamp — rather than a transcript.
Once a request reaches a provider, **that provider's own terms govern it**, which is why
they are linked rather than summarised.

So the chain is `Motir → our gateway → the provider you chose`, and only that last hop
introduces a company other than moooon B.V.

### The providers, and where the list lives

**→ [The full model-provider list is at `/legal/model-providers`](/legal/model-providers)**
— one row per provider, with its region, how long it retains a prompt, whether it trains
on your content, and a link to its own published data practices.

It is a separate page deliberately. The provider set changes whenever a gateway channel
is enabled, and hosted agents select models independently of the planner, so it churns
for two reasons at once. Welding a churning roster into a document that is versioned,
counsel-reviewed and subject to re-consent produces one of two bad outcomes: the roster
goes stale, or every routing change drags a contract document through a version bump.
**That coupling is the mechanism behind every staleness incident this page has had.**

Three things about that relationship belong here rather than there, because they are
commitments rather than facts about a roster:

- **Your content goes to the provider you selected.** We do not route it elsewhere to
  save money, and the model chosen for a project is what determines the recipient.
- **Neither moooon B.V. nor its gateway trains on your content**, and we contractually
  require each provider to comply with applicable data-protection law. **A provider's own
  terms govern its independent use of your data**, which is why the roster links to those
  terms rather than summarising them — a summary of somebody else's policy is a promise
  we are not in a position to keep.
- **Each provider's data practices are published, and a request can refuse them.**
  [The model-provider list](/legal/model-providers) records, for every provider, how long
  it keeps a prompt and whether it trains on one. The gateway takes a data policy on
  each request: a request that will not accept a provider that trains on prompts, or
  one that retains them, is never routed to such a provider, and it fails rather than
  routing around the restriction. Motir's own defaults are a provider that publishes a
  processing agreement; a provider without one is reached only when someone chooses
  it. `docs/decisions/ai-upstream-transfer-basis.md` carries the decision, as amended
  on 2026-10-01, and each provider's basis has a row in _Transfer bases_ below.
  **⚠️ Updated 2026-10-01.** This bullet used to say that only providers with a
  recorded transfer basis may serve EU traffic, enforced by a residency group. That
  group exists, but no caller is bound to it, so the sentence described a control that
  does not apply to any request. The per-request data policy is the control.

## Optional integrations — only if you connect them

These are connected by you, per workspace, and they receive or supply data only for the
workspace that authorised them. **A workspace that connects nothing reaches none of
them.**

**⚠️ You already have your own relationship with each of these**, and your agreement
with them governs what they do with the data in your account. What is listed here is the
leg that is OURS: what moooon B.V. sends to them, and on what basis. We list them rather
than treat them as your problem, because a reader assessing where their content can
travel wants one page, not two.

| Service                                 | Purpose, and which way data flows                                                                                                                                                                                           | Data reached                                                                                                                                                                                                      | Location                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **GitHub** (GitHub, Inc. / Microsoft)   | Repository access, pull-request and CI status, and the agent-dispatch workflow — the most commonly connected integration. **Both ways:** we read repository and pull-request data, and we act on repositories you authorise | Repository content and metadata, commits, branches, pull requests, CI status, and the identities of the accounts involved. Code-graph snapshots are derived from this and stored with our object-storage provider | USA                                                    |
| **GitLab** (GitLab Inc. / GitLab B.V.)  | Repository connection. **Both ways**, as GitHub                                                                                                                                                                             | As GitHub                                                                                                                                                                                                         | USA                                                    |
| **Atlassian / Jira** (Atlassian Corp.)  | Issue import. **Inbound today** — see the note below                                                                                                                                                                        | Issue titles, descriptions, comments and the identities attached to them                                                                                                                                          | USA, with cloud region pinning available               |
| **Linear** (Linear Orbit, Inc.)         | Issue import. **Inbound today** — see the note below                                                                                                                                                                        | As Jira                                                                                                                                                                                                           | USA                                                    |
| **Plane** (Plane, or your own instance) | Issue import. **Inbound today** — see the note below                                                                                                                                                                        | As Jira                                                                                                                                                                                                           | **Whichever instance you name** — see its transfer row |

**⚠️ THREE OF THESE WILL BECOME TWO-WAY, and this page changes when they do.** Jira,
Linear and Plane are import sources today: we read what you already hold there. The
planning intelligence is being extended to plan back INTO other project-management
tools, and on the day a workspace can do that, those rows stop being inbound and start
sending your content outward. **That is a change to what this page discloses, so it is
made in the same change that ships the capability** — not discovered afterwards by a
reader.

## Corporate correspondence

| Subprocessor              | Purpose                                                                                                                            | Data reached                     | Location |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------- |
| **Spaceship (Spacemail)** | The `motir.co` mailbox that receives the addresses printed in our published documents — privacy, security and legal correspondence | The content of email you send us | —        |

**⚠️ Open counsel question — and it is now only ONE question, not two.** This row
receives personal data that arrives _outside_ the product, from people who may not be
users at all. Whether that makes it a subprocessor of the service — belonging on this
published list — or simply a vendor of moooon B.V.'s own correspondence, is a judgement
this draft deliberately leaves open rather than resolving in either direction. Pending
MOTIR-3621. **Its transfer basis is no longer open:** Spaceship publishes a Data
Processing Addendum incorporating the SCCs, read 2026-08-27 and recorded in _Transfer
bases_ below. The two were previously entangled in one "not confirmed" cell, which
made a readable fact look like a legal judgement.

---

## Payments

| Subprocessor                                       | Purpose                           | Data reached                                                           | Location |
| -------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------- | -------- |
| **Stripe** (Stripe, Inc. / Stripe Payments Europe) | Payments and subscription billing | Billing contact details, subscription and seat counts, payment records | USA      |

Card numbers are entered on Stripe's own hosted checkout and **never reach Motir's
servers**. The `stripe` SDK is a production dependency of `motir-ai`, which ships the
checkout, portal, subscription, seat-sync and webhook routes.

---

## Transfer bases

Most of the companies above are established in the United States and receive personal
data from a controller established in the Netherlands. That is lawful **conditionally**,
and the condition is a mechanism under Chapter V of the GDPR — either the receiving
organisation's certification under the EU–US Data Privacy Framework, or Standard
Contractual Clauses.

**Read per vendor, from each vendor's own published terms** — the rows carried over
from 2026-08-26, and the three previously-open rows re-read on **2026-08-27**.
Recorded below rather than assumed. A row marked _not confirmed_ is an open item,
not a pass.

| Vendor                                                                                                                                 | Basis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Read from                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fly.io**                                                                                                                             | **DPF-certified** — active participant under the EU–US Data Privacy Framework and its UK and Swiss extensions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Fly.io's published DPF privacy policy                                                                                                                                                                                             |
| **Resend**                                                                                                                             | **DPF-certified** — EU–US DPF and the UK Extension                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Resend's own certification announcement                                                                                                                                                                                           |
| **Amazon SES**                                                                                                                         | **SCCs + DPF** — the AWS GDPR Data Processing Addendum, which applies automatically under the AWS Service Terms, incorporates the Commission's Standard Contractual Clauses (Module 2 where we are controller, Module 3 where we are processor). Amazon Web Services, Inc. also participates in the EU–US Data Privacy Framework                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | AWS's published GDPR Data Processing Addendum                                                                                                                                                                                     |
| **Neon**                                                                                                                               | **SCCs** — its DPA incorporates the Commission-approved SCCs and the UK Addendum, and it also relies on the DPF                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Neon's published DPA                                                                                                                                                                                                              |
| **Tigris**                                                                                                                             | **SCCs** — its DPA incorporates the Approved EU SCCs with the UK Addendum, with the Irish supervisory authority named as competent for EEA data subjects                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Tigris's published Data Processing Addendum                                                                                                                                                                                       |
| **OpenAI** (models + embeddings, via the gateway)                                                                                      | **SCCs** — Module 2 where we are controller, Module 3 where we are processor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | OpenAI's published DPA                                                                                                                                                                                                            |
| **Brave** (search, via the gateway)                                                                                                    | **SCCs** — the Brave Search API Data Processing Addendum incorporates the EU SCCs and the UK Addendum. Query records are retained for up to 90 days                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Brave's published Search API DPA                                                                                                                                                                                                  |
| **Anthropic** (Claude, via the gateway)                                                                                                | **DPA + SCCs** — Anthropic's Data Processing Addendum incorporates the Commission's Standard Contractual Clauses (Module 2 where we are controller, Module 3 where we are processor, Decision 2021/914), automatically on acceptance of its commercial terms. Zero-Data-Retention is available and is the configuration we use where a model supports it                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Anthropic's published Data Processing Addendum                                                                                                                                                                                    |
| **Alibaba Cloud** (Intelligent Cloud Computing (Singapore) Private Limited; Qwen, for planning and hosted agent runs, via the gateway) | **NO CHAPTER V TRANSFER — inference is EU-resident.** Qwen is served from Model Studio's **Frankfurt** region with the workspace deployment scope pinned to the EU, so the personal data does not leave the Union and Chapter V does not engage. Alibaba Cloud additionally publishes an **EEA Data Processing Addendum incorporating the SCCs** (Decision 2021/914), which governs anything that falls outside that scope. **Re-confirmed 2026-10-02 for our own account:** the international edition (`alibabacloud.com`), the EEA DPA accepted at registration, and a Frankfurt workspace with its deployment scope set to the EU                                                                                                                                                                                 | Alibaba Cloud's published EEA DPA and Model Studio region documentation, re-confirmed 2026-10-02                                                                                                                                  |
| **Zhipu AI** (Z.ai, JINGSHENG HENGXING TECHNOLOGY PTE.LTD, Singapore; GLM, for planning and hosted agent runs, via the gateway)        | **A processing agreement, but NO transfer mechanism.** Z.ai's international API platform (`api.z.ai`) incorporates a _Data Processing Addendum for API Services_ into its API terms, naming us controller and Z.ai processor. That addendum says only that transfers use _"legally recognized transfer mechanisms"_: it names no SCCs, and Singapore has no EU adequacy decision, so no Chapter V basis is recorded. **GLM is still served**, the way DeepSeek is, and a customer who needs a basis can exclude it per request. We use Z.ai's international platform, not the mainland `open.bigmodel.cn`, which requires a company registered in China. See _The three providers without a recorded transfer basis_ below. **Removable without changing models:** GLM's weights are published under the MIT licence | Z.ai's published [privacy policy and API Data Processing Addendum](https://docs.z.ai/legal-agreement/privacy-policy) and [API terms](https://docs.z.ai/legal-agreement/terms-of-use), read 2026-10-02                             |
| **Moonshot AI** (Moonshot AI PTE. LTD., Singapore; Kimi, for planning and hosted agent runs, via the gateway)                          | **No Art. 28 processing agreement and NO transfer mechanism.** Moonshot AI's international platform (`api.moonshot.ai`) publishes no DPA and no SCCs, and Singapore has no EU adequacy decision, so no Chapter V basis is recorded. **Kimi is still served**, the way DeepSeek is, and a customer who needs a basis can exclude it per request. We use Moonshot AI's international platform, not the mainland `api.moonshot.cn`, which requires a company registered in China. **⚠️ Updated 2026-10-02:** this row used to say Moonshot AI is established in Beijing, which was read from the mainland service. See _The three providers without a recorded transfer basis_ below                                                                                                                                    | Moonshot AI's published [Terms of Service](https://platform.kimi.ai/docs/agreement/modeluse) (updated 2026-07-30) and [Privacy Policy](https://platform.kimi.ai/docs/agreement/userprivacy) (updated 2025-04-30), read 2026-10-02 |
| **Plausible**                                                                                                                          | **No Chapter V transfer** — established and hosted in the EU                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Its stated EU hosting                                                                                                                                                                                                             |
| **Google** (optional sign-in)                                                                                                          | **DPF-certified** — Google LLC is an active participant in the EU–US DPF, the UK Extension and the Swiss–US DPF, and states it relies on **SCCs** for transfers the framework does not cover. **CLOSED 2026-08-27**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Google's published data-transfer-frameworks page                                                                                                                                                                                  |
| **Sentry**                                                                                                                             | **DPF-certified** — Functional Software, Inc. self-certifies to the EU–US DPF, the UK Extension and the Swiss–US framework, and its DPA (v5.1.0) offers the **EU SCCs** as the fallback should the framework not apply. **CLOSED 2026-08-27**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Sentry's published DPA and privacy pages                                                                                                                                                                                          |
| **Stripe** (payments)                                                                                                                  | **Contracting entity is in the EEA, with SCCs for what goes beyond it.** For customers in the EEA the counterparty is **Stripe Payments Europe, Ltd.**, established in Dublin, so the primary leg raises no Chapter V question; Stripe's Data Processing Agreement incorporates the Commission's Standard Contractual Clauses for onward transfers to Stripe, Inc. in the United States. **Card details are entered on Stripe's own hosted checkout and never reach our servers**, so what we send is billing contact and subscription data, not payment credentials                                                                                                                                                                                                                                                 | Stripe's published Data Processing Agreement and its EEA contracting terms                                                                                                                                                        |
| **GitHub** (optional integration)                                                                                                      | **DPF + SCCs** — GitHub's Data Protection Agreement incorporates the Commission's Standard Contractual Clauses, and Microsoft, its parent, participates in the EU–US Data Privacy Framework. GitHub publishes its own subprocessor list, so the chain below us is readable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | GitHub's published Data Protection Agreement and subprocessor list                                                                                                                                                                |
| **GitLab** (optional integration)                                                                                                      | **DPF-certified + SCCs** — GitLab self-certifies to the EU–US Data Privacy Framework, and **GitLab B.V.**, its EU entity, acts as the Art. 28 processor for European customers under GitLab's Data Processing Addendum                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | GitLab's published Privacy Statement and DPA                                                                                                                                                                                      |
| **Atlassian / Jira** (optional integration)                                                                                            | **SCCs** — Atlassian's Data Processing Addendum incorporates the clauses annexed to Decision 2021/914. Atlassian Cloud additionally offers **region pinning**, which can keep the data you hold there in the EEA                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Atlassian's published Data Processing Addendum                                                                                                                                                                                    |
| **Linear** (optional integration)                                                                                                      | **SCCs + UK Addendum** — Linear's DPA incorporates the EU SCCs, with Annex I and II populated in its own exhibits, and names the courts of **Ireland** for data-protection disputes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Linear's published DPA                                                                                                                                                                                                            |
| **Plane** (optional integration)                                                                                                       | **DEPENDS ON THE INSTANCE YOU NAME, and it is the one row here you control.** Plane is open source and the connector targets whichever instance you configure. Point it at your own EU-hosted deployment and there is **no third-country transfer and no third party at all** — the endpoint is yours. Point it at Plane's hosted cloud and it becomes an ordinary transfer needing that vendor's own instrument, which is **not confirmed** and is an open item rather than a pass                                                                                                                                                                                                                                                                                                                                  | The connector's configured endpoint (`PLANE_OAUTH_INSTANCES`); Plane's published terms, not yet read                                                                                                                              |
| **Spaceship (Spacemail)**                                                                                                              | **SCCs** — its published Data Processing Addendum states that data may be transferred to the US and other non-adequate locations "using an approved transfer mechanism, such as the Standard Contractual Clauses", with the SCCs attached to the DPA and moooon B.V. as the controller/exporter. **Transfer basis CLOSED 2026-08-27**; whether this row belongs on the list at all remains an open counsel question, which is a different question                                                                                                                                                                                                                                                                                                                                                                   | Spaceship's published Data Processing Addendum                                                                                                                                                                                    |
| **DeepSeek** (planner and hosted agent runs, via the gateway)                                                                          | **No Art. 28 processing agreement is on offer**, and its privacy policy states that personal data is processed and stored in the **People's Republic of China**. **Reached only when someone chooses a DeepSeek model** — for a planning request, for a hosted agent run (which sends the content of the repository the run works in), or as a project's own default for a difficulty level. Motir's own defaults are never DeepSeek, and a request carrying a `must-not-train` or `zero-retention` data policy cannot reach it. See _The three providers without a recorded transfer basis_ below. **Removable without changing models:** DeepSeek's weights are published under the MIT licence                                                                                                                    | DeepSeek's published privacy policy and open-platform terms, read 2026-08-27                                                                                                                                                      |

### The three providers without a recorded transfer basis

The model providers carry the most sensitive payload on this page — whatever a
customer typed, plus the work-item content they asked the planner to reason over.
**Three of the six offer no Standard Contractual Clauses for their hosted APIs, so
none of the three carries a recorded transfer basis: DeepSeek, Zhipu AI (GLM) and
Moonshot AI (Kimi).** DeepSeek and Moonshot AI publish no Art. 28 processing
agreement either. Zhipu AI, on Z.ai's international platform, does publish one,
but it names no transfer mechanism (**⚠️ updated 2026-10-02**: this section used to
say Zhipu AI offered no processing agreement, which was read from the mainland
`open.bigmodel.cn` platform rather than the one we use). Moonshot AI's position was
re-read on 2026-10-02 from its international platform, the one we use: still no
processing agreement and no SCCs, from a Singapore entity. This section says what
that is, because the question is asked often and answered badly.

**It is a gap in three vendors' paperwork. It is not a consequence of where they
are established.** Art. 46(2)(c) SCCs are available for transfers to any third
country, adequacy decision or not, and an EU controller may lawfully use a Chinese
processor that signs them. The demonstration is on this very page: **Alibaba
Cloud** is a Chinese company, and it carries both an EEA DPA with the SCCs and
EU-resident inference — a stronger position than any US provider listed here. The
obstacle for these three is that they offer no clauses to sign, and an EU-
established vendor with the same gap would be in exactly the same position.

**The European regulatory actions do not say otherwise**, and they are routinely
misread. Italy's authority ordered **DeepSeek** to stop processing Italian users'
data through its consumer app, and the investigations opened in France, Ireland,
Germany, Belgium and Portugal are of the same kind: findings about DeepSeek as
controller of its own users. **None of them restricts a European company from
calling the API.**

**What the gap does mean.** Because a model must read the prompt in plaintext, the
supplementary measure the EDPB relies on — encryption where the importer holds no
key — is structurally unavailable, so a transfer impact assessment for these three
would rest on contractual measures alone. That is a real weakness, and it is why
they are not the default.

**What we do about it.** The provider is chosen, never assigned. Motir's own
defaults — the planner's, and a hosted agent run's at every difficulty level — are
a provider that publishes a processing agreement, so reaching one of these three is
always a deliberate choice: a person picks the model for a request or a run, or
makes it their project's default. The choice is the customer's because customers
weigh it differently, and a caller who will not accept a provider that trains on
prompts or retains them says so on the request — a `must-not-train` or
`zero-retention` data policy — and the gateway refuses rather than routing around
it. **⚠️ Updated 2026-10-01.** This paragraph used to say that the default was
DeepSeek. It has not been since 2026-08-28. **Two of the three are removable without
changing models at all** — DeepSeek and GLM publish their weights under the MIT
licence, so serving them from our own EU infrastructure would remove the
processor, the transfer and the gap together. We list all three rather than omit
them, because a subprocessor list is worth reading only if it names the
uncomfortable rows.

Of the three rows that were open on 2026-08-26, **two are now closed** —
**Google** (DPF-certified, plus SCCs where the framework does not reach) and
**Spaceship** (a published DPA incorporating the SCCs). What remains open is
recorded here rather than resolved silently:

- **Spaceship — one open question remains, and it is not a transfer question.**
  Whether corporate correspondence belongs on a published subprocessor list is
  for counsel (MOTIR-3621).
- **Three missing transfer bases — OPEN, and disclosed rather than
  gating.** DeepSeek and Moonshot AI (re-read 2026-10-02 from its international platform)
  offer no Art. 28 agreement, and Zhipu AI's
  agreement (Z.ai, read 2026-10-02) names no transfer mechanism, so their rows
  carry a gap a customer may weigh. It does not block publication:
  this page's job is to state the position accurately, and an omitted row would
  serve a reader worse than a candid one. Each is reopened if that vendor
  publishes a DPA, if a supervisory authority addresses business use of the API,
  or if a customer requires it closed.
- **✅ Four retention and training answers — CLOSED 2026-09-06.** Alibaba Cloud,
  DeepSeek, Zhipu AI and Moonshot AI were marked _not confirmed_ on the
  model-provider list rather than assumed favourable. All four have now been read
  from each vendor's own published documents and recorded on
  [the model-provider list](/legal/model-providers), which carries the document
  and the date for each. **All four TRAINING cells are a stated fact and all four
  RETENTION cells are an explicit "not stated"** — Alibaba Cloud states it will
  never use customer data for model training, while DeepSeek, Zhipu AI and
  Moonshot AI each state that they use API content to train or optimise models,
  and **none of the four commits to a retention period**. "Not stated" is the vendor's silence reported as
  silence; it is not a pass, and the model-provider list says so in as many words.
  Reopened if any of the four publishes a period or changes its training position.
  **⚠️ Updated 2026-10-02:** Zhipu AI's answers were re-read from Z.ai's
  international terms, the platform we use. They state that API content is not
  used to improve the service unless the customer explicitly agrees, and that it
  is processed in real time and not stored. The 2026-09-06 answers above came from
  the mainland platform. **Moonshot AI's answers were re-read the same day** from its
  international terms: it still uses API content to improve its services by default,
  unless a written agreement says otherwise, and it still states no retention period
  (inputs are kept while the account is active).
- **⚠️ The six-provider set is a LAUNCH intention, and must be re-read before
  general availability.** Two channels were enabled when the gateway was last
  read. Listing a provider that never ships is the same error as omitting one
  that does, in the other direction — so this page is re-read against the
  gateway's channel table before the service opens, and any provider that did not
  arrive is removed.

---

## How this list is compiled

This page claims to be _"derived from what the running application actually
integrates with, not from a plan."_ **On 2026-08-26 that claim was falsified**: the
Brave Search API was a live upstream, receiving search queries derived from what
customers asked the planner, and it appeared nowhere on this page — not in a table,
not under _Not yet subprocessors_, not in _Transfer bases_. It was found by a
different piece of work that happened to be reading the gateway for an unrelated
reason.

**One missed row does not tell you how many others there are. It tells you the
method had not been shown to be complete.** So the method is written down here,
and the enumeration was re-run against it. A reader who wants to check this list
rather than trust it can repeat every step below.

### Why the original method missed one

The original enumeration walked **model providers**: it read `motir-ai` for the
provider it calls, and the gateway for its channel table. Brave is neither. It is
reached on the gateway's **per-call-unit** billing path rather than through a
channel row, so a walk of providers cannot see it however carefully it is done.
**The blind spot is structural, not careless** — and the same shape covers anything
else reached on a path the walk does not traverse.

**So the method enumerates EGRESS, not providers.** Any outbound path that carries
data is in scope, whether or not it looks like a model provider, an SDK, or an
integration.

### The three passes

**No one pass is sufficient, and the method depends on their disagreement.**

1. **Repository read** — at each repository's `origin/main`, never a working tree:
   the dependency manifest, and every outbound HTTP host in application code.
2. **Platform read** — the running deployment: each Fly application's secret
   NAMES, its actual environment values for endpoints, and the gateway's own
   channel and option tables. **A configuration file is a claim about a
   deployment; the machine is the deployment.**
3. **Vendor read** — each vendor's own published terms, for the transfer basis.

**Secret names are the pass that catches what code cannot.** An integration that is
provisioned before it is coded exists only as a credential; one that is coded but
never provisioned exists only in source. Sentry and Stripe are one of each on this
review, and neither is visible to the other pass.

**And the platform pass has its own blind spot, named here so it is not
rediscovered:** the gateway's model-provider credentials are **not** Fly secrets —
they are rows in the gateway's own database. `fly secrets list -a motir-gateway`
returns one upstream credential, Brave's, and no model provider at all. That is
precisely where DeepSeek hides from a secret-name sweep, and it is why the channel
table is read separately and from inside the machine.

### Every surface walked, and what it yielded

Read 2026-08-27. **A row that yielded nothing is recorded, not omitted** — an
absent row and an unexamined surface are indistinguishable otherwise.

| Surface                                                                     | Yielded                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `motir-gateway` — the **channel table**, read from inside a running machine | **OpenAI** (enabled) · **DeepSeek** (enabled — serves the planner default) · Anthropic (disabled, so it receives nothing) · **Moonshot** (since 2026-10-02 served from `api.moonshot.ai` — Kimi, for planning and hosted agent runs; it was disabled, and pointed at the mainland `api.moonshot.cn`, when this table was first read) |
| `motir-gateway` — the **per-call-unit** path, `motir/search/`               | **Brave** — and only Brave. Exactly one priced unit, `search.brave`, with one provider implementing it                                                                                                                                                                                                                               |
| `motir-gateway` — its **option table** (OAuth providers, SMTP)              | **Nothing.** No OAuth provider is enabled and no SMTP server is configured, so the relay's own login and mail paths reach no third party                                                                                                                                                                                             |
| `motir-core` — dependency manifest                                          | **Tigris** (S3 SDK) · **Sentry** (`@sentry/nextjs`, merged 2026-08-27 — this row said "no Sentry SDK" hours earlier) · **Amazon SES** (`@aws-sdk/client-sesv2`, merged 2026-11-07 with the `EMAIL_PROVIDER=ses` sender) · no Stripe SDK                                                                                              |
| `motir-core` — outbound HTTP hosts in application code                      | **GitHub** · **GitLab** · **Atlassian** · **Linear** · **Plane** · **Google** (OAuth) · **Resend** · **Plausible** · **Fly** (machines API)                                                                                                                                                                                          |
| `motir-ai` — dependency manifest                                            | **Tigris** (S3 SDK) · **Stripe** — the SDK this page previously said did not exist                                                                                                                                                                                                                                                   |
| `motir-ai` — outbound HTTP hosts in application code                        | **Nothing new.** Its model and search calls go to moooon B.V.'s own gateway, not to a provider                                                                                                                                                                                                                                       |
| **`motir-core`** Fly secret names                                           | **Sentry** — configured in production, ahead of its code · everything else already listed                                                                                                                                                                                                                                            |
| **`motir-ai`** Fly secret names                                             | **Stripe** — live keys in production · **Tigris** as its object store, in a third bucket this page did not describe                                                                                                                                                                                                                  |
| **`motir-gateway`** Fly secret names                                        | **Brave** only. The model-provider credentials are not here — see the blind spot above                                                                                                                                                                                                                                               |
| The agent-runner fleet (`motir-ci-runners`, `motir-index-runners`)          | **Nothing.** Both hold **no secrets at all**; they are machine pools, credentialed per machine at creation, and introduce no vendor of their own                                                                                                                                                                                     |

### Two things that look like subprocessors and are not

Recorded because each is a plausible false positive, and an enumeration that
silently drops one is indistinguishable from one that never looked.

- **Google Fonts.** The application loads its typefaces through `next/font/google`,
  which downloads them **at build time and self-hosts them**. A visitor's browser
  makes no request to Google, so no IP address reaches Google by this path. (Google
  is a subprocessor on this page for a different reason: optional sign-in.)
- **The coding agents.** Motir generates an agent-ready prompt; the agent runs
  under **your own credential**, on your machine or in your sandbox. Its vendor is
  not a subprocessor of the hosted service, because moooon B.V. never transmits to
  it.

### What has to be re-run, and when

Before any change to this page, and at each `Last reviewed` date: **all three
passes, all of the surfaces above.** A change to one repository does not license a
single-repository re-read — the row this page missed was in neither the repository
that was being read nor the one that was being edited.

---

## Changes to this list

We will update this page before a new subprocessor begins processing, and record the
date of each change. If you have a data-processing agreement with us, the notification
and objection terms in that agreement apply.

Questions: **privacy@motir.co**.
