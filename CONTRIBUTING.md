# Contributing to Codex Atlas

Thanks for helping keep the guide useful. The active catalog is intentionally selective: one maintained, outcome-oriented resource is better than ten near-duplicates.

## Before proposing a resource

An active entry must:

1. Help with a concrete Codex task across the CLI, IDE, cloud, desktop app, configuration, security, or automation.
2. Be available over HTTPS without requiring a secret in the URL.
3. Identify its source honestly as `OpenAI` or `Community`.
4. Have a concise original summary rather than copied marketing text.
5. Include a `reviewedAt` date from a real manual review.
6. Avoid retired Codex API/model instructions unless the entry is explicitly historical.
7. Add value beyond a command list or a mirror of official documentation.

Community entries should also have a visible license where relevant, usable setup instructions, and recent maintenance evidence. Popularity alone is not an acceptance criterion.

## Resource schema

Edit `site/data/resources.json`. Each record has this shape:

```json
{
  "id": "stable-kebab-case-id",
  "title": "Human-readable title",
  "summary": "What outcome this resource helps achieve.",
  "url": "https://example.com/resource",
  "category": "Configure",
  "surfaces": ["CLI", "IDE"],
  "level": "Intermediate",
  "source": "OpenAI",
  "kind": "Guide",
  "featured": false,
  "reviewedAt": "2026-07-12"
}
```

Allowed categories, surfaces, levels, sources, and kinds are enforced by `scripts/validate-content.mjs`. IDs and URLs must be unique. Review dates older than 120 days are rejected so neglected entries become visible maintenance work.

## Playbooks

Playbooks live in `site/data/playbooks.json`. A playbook should define a specific outcome, a short prompt that leaves room for repository context, and observable evidence of completion. Do not present a destructive command, broad permission grant, or unsupervised production change as a default step.

## Verify your change

```bash
npm run check
npm run check:links
npm run dev
```

Then check the explorer at narrow and wide viewport sizes, test keyboard navigation, and confirm that search/filter state can be shared through the URL.

The remote link probe can be inconclusive when a destination blocks automation or the network is restricted. Do not describe an inconclusive result as a broken link. Conversely, do not claim all links are valid merely because schema tests passed.

## Pull request notes

Explain:

- the user outcome the change improves;
- what you manually reviewed;
- the exact verification commands run;
- any URL that could not be checked conclusively.

Keep local paths, private task notes, credentials, customer data, internal critique, and generated audit residue out of public files.
