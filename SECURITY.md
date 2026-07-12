# Security policy

## Reporting a problem

Please do not publish secrets, private repository details, or a working exploit in a public issue. Use GitHub's private vulnerability reporting feature if it is available for this repository. If it is not available, contact the repository owner through their GitHub profile and ask for a private reporting channel before sharing sensitive details.

General broken links, outdated summaries, accessibility problems, and catalog corrections are not vulnerabilities and can be proposed through a normal pull request.

## Scope

Codex Atlas is a static site. It has no backend, authentication, analytics, cookies, or third-party runtime scripts. Its main security boundaries are:

- untrusted catalog content rendered into the page;
- external links opened from resource cards;
- the local development server;
- GitHub Actions used for validation and Pages deployment.

The UI builds catalog cards with DOM text nodes rather than injecting HTML. Catalog validation permits only HTTPS URLs, external tabs use `noopener noreferrer`, and the site applies a restrictive Content Security Policy.

## Safe-use reminder

Links and playbooks do not grant authority to act on a repository or external system. Review the target, permissions, diff, and test evidence before accepting agent-generated changes. Use the narrowest filesystem and network access suitable for the task.
