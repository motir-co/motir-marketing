---
title: Model providers
version: 1.0.5
effectiveDate: TBD
status: approved
---

# Model providers

**This page lists every model provider that can serve a Motir AI request, and links to
each one's own data practices.** It is referenced by the
[subprocessor list](/legal/subprocessors), and it exists as a separate page for a
reason: the provider set changes when a channel is enabled, and a list that changes
should not be welded into a document that is versioned and re-approved.

**This page is informational and is updated whenever the provider set changes.** It does
not vary the [Terms of Service](/legal/terms), the [Privacy Policy](/legal/privacy) or a
signed [DPA](/legal/dpa), and no notice period attaches to an edit here. The
contractual commitments about model providers live in those documents; this page tells
you who the providers currently are.

**Last reviewed: 2026-08-27**, against the routing table of the running gateway.
**Retention and training re-read per vendor on 2026-09-06** — the four rows that carried
_not confirmed_ are closed below, from each vendor's own published documents.

---

## Where this sits: three products, one company

moooon B.V. builds three things, and a reader of this page benefits from knowing which
one is doing what — particularly because two of them are usable without the others.

| Product           | What it is                                                                            | Can be used on its own?                                                       |
| ----------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **motir-core**    | The planning and project-management application — the board, roadmap and work items   | **Yes.** It is open source and can be self-hosted as standalone PM software   |
| **motir-ai**      | The planning intelligence — it drafts and revises plans                               | **Yes.** It can plan into other project-management tools, not only into Motir |
| **motir-gateway** | The LLM routing layer — one interface in front of many model providers, with metering | **Yes**, and it is intended to be offered to other companies                  |

**None of the three is a subprocessor of the others.** A subprocessor is a _third party_
a processor engages. All three are moooon B.V., so naming them on a subprocessor list
would list a company to itself. What they run **on** — Amazon Web Services — is a
subprocessor, and it is named on the [subprocessor list](/legal/subprocessors).
**⚠️ Updated 2026-11-11:** this sentence used to name Fly.io, which hosted the three
products until they moved to Amazon Web Services.

### What motir-gateway does with your prompt

For the hosted Motir service the path is:

```
motir-core  →  motir-ai  →  motir-gateway  →  the model provider you selected
```

**motir-gateway is a relay, not a model.** It holds no model of its own and produces no
answers. Its job is to accept an OpenAI-compatible request, decide which upstream
_channel_ can serve the model that was asked for, forward the request, meter what it
cost, and return the response. It is the same shape as a public routing service such as
OpenRouter, and it is built to be one.

Three consequences worth stating plainly, because they are what a reader actually wants
to know:

- **It does not train on your content, and neither does motir-ai.** Nothing you send is
  used to train, fine-tune or evaluate a model of ours.
- **It stores what it must meter, and that is a usage record, not a transcript.** Token
  counts, the model name, the channel and a timestamp — the fields a bill is computed
  from.
- **It cannot make a provider behave differently from its own terms.** Once a request
  reaches a provider, that provider's published data practices govern what happens to
  it. That is exactly why they are linked below rather than summarised.

---

## The providers

One row per provider, with the two facts that decide whether you want your content going
there: **how long it is kept**, and **whether it trains a model**. There is no ranking
here and no grouping — the providers differ along these axes and you choose against them,
which is the only honest way to present a set a customer selects from.

The **transfer basis** of each — adequacy, Standard Contractual Clauses, or none on offer
— is a separate question with its own table, in
[_Transfer bases_ on the subprocessor list](/legal/subprocessors).

| Provider            | Models                                | Region                                                                                                                                    | Prompt retention                                                                                                                                         | Trains on your prompts?                                                                                                                                                                                                            | Its data practices                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI**          | GPT, and embeddings                   | USA                                                                                                                                       | Up to 30 days for abuse monitoring, then deleted                                                                                                         | **No** — not on API content                                                                                                                                                                                                        | [Sub-processor list](https://openai.com/policies/sub-processor-list/) · published DPA                                                                                                                                                                            |
| **Anthropic**       | Claude                                | USA                                                                                                                                       | Zero Data Retention available                                                                                                                            | **No** — not on commercial API content                                                                                                                                                                                             | Published Data Processing Addendum, incorporated automatically on its commercial terms                                                                                                                                                                           |
| **Alibaba Cloud**   | Qwen — planning and hosted agent runs | **Requests stored in the USA (Virginia); inference on Alibaba's Global scope, which may run outside the EU, including in mainland China** | **Not stated as a period** — no Model Studio document states one, and its EEA DPA commits only to delete or return Data on termination (read 2026-09-06) | **No** — "will never use your data for model training" (read 2026-09-06)                                                                                                                                                           | [EEA Data Processing Addendum](https://www.alibabacloud.com/help/en/legal/latest/ae8upq) · [GDPR trust centre](https://www.alibabacloud.com/trust-center/gdpr) · [Model Studio privacy notice](https://www.alibabacloud.com/help/en/model-studio/privacy-notice) |
| **DeepSeek**        | DeepSeek                              | People's Republic of China                                                                                                                | **Not stated as a period** — "as long as necessary to provide our Services" (read 2026-09-06)                                                            | **Yes** — "to train and improve our technology, such as our machine learning models and algorithms"; an opt-out is offered to users in certain regions (read 2026-09-06)                                                           | [Privacy policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html) · [Open-platform terms](https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html)                                                             |
| **Zhipu AI** (Z.ai) | GLM — planning and hosted agent runs  | Singapore (Z.ai's international platform)                                                                                                 | **Not stored** — API content "is processed in real-time … and is not saved on our servers" (read 2026-10-02)                                             | **No, unless you explicitly agree** — "We will not use End User Content to develop or improve Services, unless you explicitly agree to such use." (read 2026-10-02)                                                                | [Privacy policy and API Data Processing Addendum](https://docs.z.ai/legal-agreement/privacy-policy) · [Terms and Additional Terms for API Services](https://docs.z.ai/legal-agreement/terms-of-use)                                                              |
| **Moonshot AI**     | Kimi — planning and hosted agent runs | Singapore (Moonshot AI's international platform)                                                                                          | **Not stated as a period** — "account, input, and payment information are retained while your account is active" (read 2026-10-02)                       | **Yes, unless agreed in writing** — content may be used to "develop, support, and improve the Services"; "Unless otherwise expressly agreed in writing, Customer Content may be used for the foregoing purposes" (read 2026-10-02) | [Terms of Service](https://platform.kimi.ai/docs/agreement/modeluse) · [Privacy policy](https://platform.kimi.ai/docs/agreement/userprivacy)                                                                                                                     |
| **Brave**           | Search, not a model                   | USA                                                                                                                                       | Up to 90 days for query records                                                                                                                          | Not applicable                                                                                                                                                                                                                     | Brave Search API Data Processing Addendum                                                                                                                                                                                                                        |

**⚠️ NO CELL READS _not confirmed_ ANY MORE — the four that did were read on 2026-09-06
and are recorded above.** A cell reading _not confirmed_ used to mean _we have not looked_,
and the page said so rather than implying a favourable answer. Every cell now carries
either a stated fact or an explicit **"not stated"**, which is a different thing and is
described next.

**⚠️ "Not stated" IS NOT A PASS EITHER — it is the vendor's silence, reported as silence.**
Three of the rows above say _not stated as a period_ for retention. That does not mean the
vendor keeps nothing, and it does not mean it keeps your prompt for ever. It means we read
that vendor's own published documents and **they do not commit to a period**, so there is
nothing for a customer to rely on. Writing a number in that we had inferred rather than
read would be worse than leaving it open, because the cell is what a customer relies on.
**A workspace that needs a retention guarantee should select a provider whose row states
one** — OpenAI and Anthropic do; Zhipu AI (Z.ai) states that API content is not
stored; Brave states one for search queries.

**Neither moooon B.V. nor its gateway trains on your content**, whichever provider you
select. The rows above describe what the _provider_ does once a request reaches it.

### How each of the four answers was read

Recorded so a reader can repeat the read rather than trust it. Each is that vendor's own
published document, in the **international / EU-facing** edition where a vendor publishes
more than one, and each was read on **2026-09-06** — except **Zhipu AI**, re-read on
**2026-10-02** from Z.ai's international platform (`docs.z.ai`), the one we use. The
earlier Zhipu AI answers were read from the mainland `docs.bigmodel.cn`, which requires
a company registered in China and is not the platform Motir calls. **Moonshot AI** was
likewise re-read on **2026-10-02** from its international platform (`platform.kimi.ai`,
where `platform.moonshot.ai` now redirects), the one behind `api.moonshot.ai`; the
earlier answers quoted the Chinese-language Kimi Open Platform terms.

| Provider            | Retention read from                                                                                                                                                                                                                                                                                                      | Training read from                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Alibaba Cloud**   | Model Studio's _Security certifications and privacy notice_ and its _regions_ documentation state no retention period; the **EEA Data Processing Addendum** commits only to "delete or return all Data in Alibaba Cloud's possession or control following the termination of the Membership Agreement"                   | Model Studio's _Security certifications and privacy notice_: **"Alibaba Cloud strictly protects your data privacy and will never use your data for model training."**                                                                                                                                                                                                                                                    |
| **DeepSeek**        | Privacy policy: **"We retain Personal Data for as long as necessary to provide our Services and for the other purposes set out in this Privacy Policy."** The open-platform terms of service state no period at all                                                                                                      | Privacy policy: personal data is used **"to train and improve our technology, such as our machine learning models and algorithms"**, with a right for users in certain regions **"to opt-out of using your Personal Data for training our models or optimizing our technologies"**                                                                                                                                       |
| **Zhipu AI** (Z.ai) | Data Processing Addendum for API Services §4(b): **"The Company do not store any of the content the Customer or its End Users provide or generate while using our Services … This information is processed in real-time … and is not saved on our servers."** Other customer data is deleted after the terms end (§4(c)) | Additional Terms for API Services §3(b): **"We will not use End User Content to develop or improve Services, unless you explicitly agree to such use."** Z.ai prints this sentence in square brackets, which reads like a drafting mark; it is reported as published                                                                                                                                                     |
| **Moonshot AI**     | Privacy Policy §6: **"account, input, and payment information are retained while your account is active"**; Terms of Service §11: content and data are deleted after termination **"in accordance with the requirements of applicable laws and regulations"**. No period is stated                                       | Terms of Service §4: **"Customer who requires restrictions on the use of Customer Content for training or improving Moonshot AI models may contact Moonshot AI to discuss available enterprise arrangements or separate written agreements. Unless otherwise expressly agreed in writing, Customer Content may be used for the foregoing purposes."** — training is the default; a restriction needs a written agreement |

⚠️ **The Alibaba Cloud row is the one to be careful with, and it was read accordingly.**
Model Studio publishes separate documentation for its mainland-China and international
editions, and the answers can differ. Every document cited above is the **international**
edition on `alibabacloud.com`, which is what serves the **US (Virginia)** region our
workspace uses; that documentation states that request data is stored in the selected
region. Nothing here was read from `help.aliyun.com`. **Read 2026-11-12 for our own
account:** the international edition, the EEA Data Processing Addendum accepted, and a
US (Virginia) workspace created on 2026-11-12 with deployment scope **Global**. Alibaba's
[_US (Virginia) — Global_](https://www.alibabacloud.com/help/en/model-studio/usa-virginia-global)
page (last updated 2026-10-13, read 2026-11-12) gives that scope as _"Global (any
available node, including Chinese mainland and overseas)"_ and says _"User static data is
always stored in the selected region"_: requests are stored in the United States
(Virginia), and inference may run outside the EU, including in mainland China. The
transfer is made under the Standard Contractual Clauses, recorded under _Transfer bases_
on the [subprocessor list](/legal/subprocessors). **⚠️ Updated 2026-11-12:** this
paragraph and the Region cell above used to say _Frankfurt, Germany (EU)_, with a
workspace whose deployment scope was set to the EU so that inference ran in the Union
(re-confirmed 2026-10-02). Qwen moves to the new Global-scope workspace, because Alibaba
fixes a workspace's scope when it is created. The retention and training answers are
unchanged.

⚠️ **Zhipu AI has a processing agreement but no transfer mechanism.** Z.ai's addendum names
us controller and Z.ai processor, and says only that transfers use "legally recognized
transfer mechanisms" without naming one. GLM is still served, for planning and for hosted
agent runs; the [subprocessor list](/legal/subprocessors) records it under _Transfer
bases_ with no basis, and a customer who needs one can exclude it per request.

⚠️ **Three of these four answers are about the vendor's PUBLISHED position, not about a
negotiated one.** Where a vendor offers no commitment in public, a customer with a signed
agreement may have a different answer than this page reports. This page reports what
anyone can read.

---

## Restricting where your requests go

The table exists so it can be acted on, not only read.

- **Choose the model per project.** That choice determines the provider.
  **⚠️ Updated 2026-09-06.** This bullet used to promise that the general-availability
  default would be "a provider whose retention and training rows are stated rather than
  open". Now that all six rows are recorded, that condition is met by every provider and
  no longer distinguishes between them — **the answers themselves do**. Two of the six,
  DeepSeek and Moonshot AI, state that they use API content to train or optimise models.
  **⚠️ Updated 2026-10-02:** Zhipu AI used to be the third; re-read from Z.ai's
  international terms, it states that it does not without your explicit agreement.
  Moonshot AI, re-read the same day from its international terms, still does by
  default, unless a written agreement says otherwise.
  What the GA default should be is therefore a live question rather than a settled one,
  and it is not decided on this page.
- **Hosted agents choose their own model**, which need not be the planner's — so a
  workspace can plan on one provider and execute on another.
- **Motir never assigns a provider that trains on your prompts.** Motir's own defaults
  — the planner's, and a hosted agent run's at every difficulty level — are not
  DeepSeek, Zhipu AI or Moonshot AI. Those three are reached only when someone chooses
  one of their models, for a request, for a hosted agent run (which sends the content of
  the repository the run works in), or as a project's own default for a difficulty level.
- **Refuse a provider's data practices per request.** The gateway takes a data policy on
  each request, in the `X-Motir-Data-Policy` header. `must-not-train` admits only a
  provider that states it does not train on API content, the way OpenRouter's
  `data_collection: "deny"` does. `zero-retention` admits only a provider that commits
  not to retain prompts, the way OpenRouter's `zdr` does, and a provider whose retention
  is _not stated_ does not qualify. Either policy keeps a request away from DeepSeek. A
  request with no policy is not restricted.
- **The restriction is enforced where the request leaves.** A request whose policy no
  provider for its model satisfies **fails rather than routing** — the correct failure,
  because a job that errors can be retried and a transfer that has happened cannot be
  undone.
- **⚠️ Updated 2026-10-01.** This section used to say that a provider without a recorded
  transfer basis cannot enter the group that serves EU traffic. That group exists, but no
  caller is bound to it, so it restricts nothing. The per-request data policy is the
  control.

---

## How this list is kept accurate

It is read from the gateway's own routing table, which is the thing that actually
decides where a request goes. It is **not** compiled from anyone's memory of which
integrations exist — that method failed four times in a single day on the subprocessor
list, which is why that page now carries a test and why this one records its method.

⚠️ **The read is currently manual, and that is a known weakness.** The routing table
lives in the gateway's database rather than in a repository, so no test in `motir-core`
can see it. Until this page is generated from that table, a provider enabled without a
corresponding edit here would go unlisted, and only a human re-run of this method would
find it.

Questions about anything on this page: **[legal@motir.co](mailto:legal@motir.co)**.
