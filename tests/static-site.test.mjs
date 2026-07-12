import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [html, app, css, resources, playbooks] = await Promise.all([
  readFile(path.join(root, "site", "index.html"), "utf8"),
  readFile(path.join(root, "site", "assets", "app.js"), "utf8"),
  readFile(path.join(root, "site", "assets", "styles.css"), "utf8"),
  readFile(path.join(root, "site", "data", "resources.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "site", "data", "playbooks.json"), "utf8").then(JSON.parse)
]);

test("page has core landmarks and a keyboard skip target", () => {
  for (const pattern of [
    /<html lang="en">/,
    /<header class="site-header">/,
    /<main id="main-content">/,
    /<footer>/,
    /class="skip-link" href="#main-content"/,
    /aria-live="polite"/
  ]) assert.match(html, pattern);
});

test("page applies a restrictive content security policy", () => {
  const policy = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] || "";
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /script-src 'self'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'none'/);
  assert.doesNotMatch(policy, /'unsafe-inline'|'unsafe-eval'/);
});

test("runtime code renders untrusted catalog strings without HTML injection", () => {
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write/);
  assert.match(app, /textContent/);
  assert.match(app, /noopener noreferrer/);
});

test("site has no remote runtime script, stylesheet, font, or analytics dependency", () => {
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)="https?:/i);
  assert.doesNotMatch(html, /analytics|googletagmanager|segment\.com/i);
});

test("deployed navigation does not escape the Pages artifact", () => {
  assert.doesNotMatch(html, /(?:href|src)="\.\.\//i);
});

test("catalog identifiers and URLs are unique", () => {
  assert.equal(new Set(resources.map((item) => item.id)).size, resources.length);
  assert.equal(new Set(resources.map((item) => item.url)).size, resources.length);
  assert.equal(new Set(playbooks.map((item) => item.id)).size, playbooks.length);
});

test("every resource uses HTTPS and every playbook asks for evidence", () => {
  assert.ok(resources.every((item) => item.url.startsWith("https://")));
  assert.ok(playbooks.every((item) => item.evidence.length >= 3));
});

test("responsive and reduced-motion behavior are present", () => {
  assert.match(css, /@media \(max-width: 780px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible/);
});
