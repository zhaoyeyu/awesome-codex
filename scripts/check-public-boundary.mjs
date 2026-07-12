import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scannerPath = path.resolve(fileURLToPath(import.meta.url));
const ignoredDirectories = new Set([".git", "node_modules", ".cache", "coverage"]);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".svg", ".txt", ".yml", ".yaml"]);
const findings = [];

const rules = [
  { name: "Windows absolute path", pattern: /(?:^|[\s`'"(])(?:[A-Za-z]:\\|\\\\\?\\)/gm },
  { name: "macOS user path", pattern: /\/Users\/[A-Za-z0-9._-]+\//g },
  { name: "Linux user path", pattern: /\/home\/[A-Za-z0-9._-]+\//g },
  { name: "OpenAI-style API key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { name: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "internal audit path", pattern: /_github_portfolio_audit|run-20260712|portfolio-upgrade-20260712/g },
  { name: "personal email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi }
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

for (const file of await walk(root)) {
  if (path.resolve(file) === scannerPath) continue;
  if ((await stat(file)).size > 1_000_000) continue;
  const content = await readFile(file, "utf8");
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const match of content.matchAll(rule.pattern)) {
      const line = content.slice(0, match.index).split("\n").length;
      findings.push(`${path.relative(root, file)}:${line} ${rule.name}`);
    }
  }
}

if (findings.length) {
  for (const finding of findings) console.error(`ERROR ${finding}`);
  console.error(`\nPublic-boundary scan found ${findings.length} potential leak(s).`);
  process.exitCode = 1;
} else {
  console.log("Public-boundary scan passed: no local paths, task residue, credentials, private keys, or personal email addresses found.");
}
