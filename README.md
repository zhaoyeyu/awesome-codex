# Codex Atlas

<p align="center">
  <img src="site/assets/brand-mark.svg" width="104" height="104" alt="Codex Atlas compass mark">
</p>

<p align="center">
  A task-first field guide to OpenAI Codex across the CLI, IDE, cloud, desktop app, and automation surfaces.
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-6f5cf6"></a>
  <img alt="No build step" src="https://img.shields.io/badge/frontend-zero--build-25b99a">
  <img alt="Last curated July 2026" src="https://img.shields.io/badge/curated-2026--07--12-e9a23b">
</p>

> [!NOTE]
> This repository covers the current Codex coding agent, not the retired Codex API models. OpenAI's original 2021 announcement now states that those models were deprecated in March 2023. The original collection is preserved in the [2021 demo archive](archive/2021-codex-demos.md).

## What this project is

Codex Atlas is a small, maintainable resource product rather than an endless link dump:

- **Resource explorer** — a responsive, keyboard-friendly catalog with search, filters, sorting, shareable URL state, dark/light themes, and no backend.
- **Workflow playbooks** — concise prompts and evidence checklists for codebase discovery, bug fixing, UI work, parallel tasks, reviews, and automation.
- **Multi-surface map** — guidance for choosing the CLI, IDE extension, cloud, or desktop app based on the job.
- **Freshness controls** — every active resource has a review date; automated checks reject malformed, duplicate, unsafe, or stale catalog entries.
- **Historical continuity** — earlier community demos remain readable without being presented as current recommendations.

It deliberately does not try to duplicate command-focused collections such as `awesome-codex-cli`. The organizing question here is **“What outcome do I need, and which Codex surface and workflow fit it?”**

## Choose a surface

| Need | Start with | Why |
| --- | --- | --- |
| Inspect, edit, test, or script against a local repository | [Codex CLI](https://learn.chatgpt.com/docs/codex/cli) | Terminal-native work with local tools and repeatable `codex exec` flows |
| Use open files and selections as immediate context | [Codex IDE extension](https://learn.chatgpt.com/docs/codex/ide) | In-editor prompting and review without leaving the coding flow |
| Run longer jobs in parallel, away from the local machine | [Codex cloud](https://learn.chatgpt.com/docs/cloud) | Isolated environments, parallel tasks, and reviewable diffs |
| Coordinate files, browser work, desktop apps, and long-running tasks | [ChatGPT desktop app](https://learn.chatgpt.com/docs/app) | A broader workspace for coding and non-code artifacts |

When a task can modify data or execute code, start with the narrowest permissions that still let it succeed. Read [agent approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security) before enabling broader filesystem, network, or automation access.

## Run the explorer

Node.js 20 or newer is enough; there are no runtime dependencies.

```bash
npm run dev
```

Open `http://localhost:4173`. You can also serve the `site/` directory with any static server or deploy it to GitHub Pages.

Useful checks:

```bash
npm run check
npm run check:links
```

`npm run check` validates the catalog, playbooks, public-release boundary, and browser logic. The link check distinguishes confirmed HTTP failures from inconclusive network errors; use `npm run check:links:strict` in a network environment where every destination is reachable.

## Curated starting points

The interactive catalog contains the full active set. These are the highest-value entry points in plain Markdown:

### Start and operate

- [Codex CLI](https://learn.chatgpt.com/docs/codex/cli) — local repository work and repeatable terminal automation.
- [Codex IDE extension](https://learn.chatgpt.com/docs/codex/ide) — editor context and in-place review.
- [Codex cloud](https://learn.chatgpt.com/docs/cloud) — parallel work in isolated environments.
- [Codex changelog](https://learn.chatgpt.com/docs/changelog) — verify behavior before relying on fast-moving features.

### Configure and extend

- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) — durable repository guidance.
- [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic) — user and project settings.
- [Model Context Protocol](https://learn.chatgpt.com/docs/extend/mcp) — connect tools and external context.
- [Build skills](https://learn.chatgpt.com/docs/build-skills) — package repeatable workflows.
- [Build plugins](https://learn.chatgpt.com/docs/build-plugins) — bundle skills, tools, apps, and related assets.

### Automate safely

- [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) — structured, scriptable runs.
- [Codex GitHub Action](https://learn.chatgpt.com/docs/github-action) — repository automation in CI.
- [Agent approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security) — permission and sandbox boundaries.
- [Cloud internet access](https://learn.chatgpt.com/docs/cloud/internet-access) — control outbound access for cloud tasks.

## Repository map

```text
site/                         Static resource explorer and playbooks
site/data/resources.json     Curated resource records and review dates
site/data/playbooks.json     Reusable task recipes
scripts/                     Content, boundary, link, and local-server tools
tests/                       Catalog/search and static-site tests
archive/                     Clearly labelled historical material
.github/workflows/           Quality, scheduled link, and Pages automation
```

## Curation rules

A resource belongs in the active catalog when it is useful now, has a clear owner, uses HTTPS, explains a concrete Codex outcome, and was reviewed recently. Official documentation is preferred for product behavior and security claims. Community resources must add practical value beyond restating official docs.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the schema, acceptance criteria, and verification commands. Security concerns should follow [SECURITY.md](SECURITY.md).

## Status and scope

- Last full content review: **2026-07-12**.
- The catalog is curated, not exhaustive.
- A successful automated probe proves that a URL responded at that time; it does not prove that every statement on the destination remains correct.
- Codex and ChatGPT are trademarks of OpenAI. This community project is not affiliated with or endorsed by OpenAI.

## License

[MIT](LICENSE). The original 2021 copyright notice is retained from the upstream repository.
