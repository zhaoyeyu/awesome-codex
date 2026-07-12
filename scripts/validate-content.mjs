import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourcesPath = path.join(root, "site", "data", "resources.json");
const playbooksPath = path.join(root, "site", "data", "playbooks.json");

const allowed = Object.freeze({
  category: ["Start", "Configure", "Extend", "Automate", "Security", "Workflow", "Reference"],
  surfaces: ["All", "CLI", "IDE", "Cloud", "Desktop", "CI"],
  level: ["Beginner", "Intermediate", "Advanced"],
  source: ["OpenAI", "Community"],
  kind: ["Guide", "Reference", "Examples", "Repository"]
});

const requiredResourceFields = [
  "id", "title", "summary", "url", "category", "surfaces",
  "level", "source", "kind", "featured", "reviewedAt"
];
const requiredPlaybookFields = [
  "id", "kicker", "title", "summary", "surfaces", "prompt", "steps", "evidence"
];

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function loadJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    fail(`${path.relative(root, file)}: ${error.message}`);
    return [];
  }
}

function assertExactFields(item, fields, label) {
  for (const field of fields) {
    if (!(field in item)) fail(`${label}: missing required field "${field}"`);
  }
  for (const field of Object.keys(item)) {
    if (!fields.includes(field)) fail(`${label}: unknown field "${field}"`);
  }
}

function validateDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${label}: reviewedAt must use YYYY-MM-DD`);
    return;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    fail(`${label}: reviewedAt is not a real calendar date`);
    return;
  }
  const ageDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (ageDays < -1) fail(`${label}: reviewedAt is in the future`);
  if (ageDays > 120) fail(`${label}: review is ${ageDays} days old; re-review active entries within 120 days`);
  else if (ageDays > 90) warn(`${label}: review is ${ageDays} days old and will expire soon`);
}

function validateUrl(value, item) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`resource ${item.id}: url is invalid`);
    return;
  }
  if (url.protocol !== "https:") fail(`resource ${item.id}: url must use HTTPS`);
  if (url.username || url.password) fail(`resource ${item.id}: url must not contain credentials`);

  if (item.source === "OpenAI") {
    const officialHost = ["learn.chatgpt.com", "developers.openai.com"].includes(url.hostname);
    const officialGitHub = url.hostname === "github.com" && url.pathname.startsWith("/openai/");
    if (!officialHost && !officialGitHub) {
      fail(`resource ${item.id}: OpenAI source must use an official OpenAI documentation or repository URL`);
    }
  }
}

function validateResources(resources) {
  if (!Array.isArray(resources) || resources.length < 12) {
    fail("resources.json: expected an array with at least 12 curated entries");
    return;
  }
  const ids = new Set();
  const urls = new Set();
  const categoryCoverage = new Set();
  const surfaceCoverage = new Set();

  for (const [index, item] of resources.entries()) {
    const label = `resource ${item?.id || `#${index + 1}`}`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      fail(`${label}: entry must be an object`);
      continue;
    }
    assertExactFields(item, requiredResourceFields, label);

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || "")) fail(`${label}: id must be kebab-case`);
    if (ids.has(item.id)) fail(`${label}: duplicate id`);
    ids.add(item.id);

    if (typeof item.title !== "string" || item.title.length < 3 || item.title.length > 80) {
      fail(`${label}: title must be 3–80 characters`);
    }
    if (typeof item.summary !== "string" || item.summary.length < 45 || item.summary.length > 190) {
      fail(`${label}: summary must be 45–190 characters`);
    }
    validateUrl(item.url, item);
    if (urls.has(item.url)) fail(`${label}: duplicate url`);
    urls.add(item.url);

    if (!allowed.category.includes(item.category)) fail(`${label}: unsupported category "${item.category}"`);
    if (!allowed.level.includes(item.level)) fail(`${label}: unsupported level "${item.level}"`);
    if (!allowed.source.includes(item.source)) fail(`${label}: unsupported source "${item.source}"`);
    if (!allowed.kind.includes(item.kind)) fail(`${label}: unsupported kind "${item.kind}"`);
    if (typeof item.featured !== "boolean") fail(`${label}: featured must be boolean`);
    if (!Array.isArray(item.surfaces) || item.surfaces.length === 0) fail(`${label}: surfaces must be a non-empty array`);
    for (const surface of item.surfaces || []) {
      if (!allowed.surfaces.includes(surface)) fail(`${label}: unsupported surface "${surface}"`);
      surfaceCoverage.add(surface);
    }
    if (item.surfaces?.includes("All") && item.surfaces.length > 1) {
      fail(`${label}: "All" must be the only surface when used`);
    }
    validateDate(item.reviewedAt, label);
    if (item.featured) categoryCoverage.add(item.category);
  }

  for (const category of allowed.category) {
    if (!categoryCoverage.has(category)) fail(`resources.json: category "${category}" needs at least one featured entry`);
  }
  for (const surface of allowed.surfaces.filter((item) => item !== "All")) {
    if (!surfaceCoverage.has(surface)) fail(`resources.json: surface "${surface}" has no direct coverage`);
  }
}

function validatePlaybooks(playbooks) {
  if (!Array.isArray(playbooks) || playbooks.length < 5) {
    fail("playbooks.json: expected an array with at least five playbooks");
    return;
  }
  const ids = new Set();
  for (const [index, item] of playbooks.entries()) {
    const label = `playbook ${item?.id || `#${index + 1}`}`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      fail(`${label}: entry must be an object`);
      continue;
    }
    assertExactFields(item, requiredPlaybookFields, label);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || "")) fail(`${label}: id must be kebab-case`);
    if (ids.has(item.id)) fail(`${label}: duplicate id`);
    ids.add(item.id);
    if (typeof item.kicker !== "string" || item.kicker.length < 3 || item.kicker.length > 16) fail(`${label}: kicker must be 3–16 characters`);
    if (typeof item.title !== "string" || item.title.length < 5 || item.title.length > 70) fail(`${label}: title must be 5–70 characters`);
    if (typeof item.summary !== "string" || item.summary.length < 35 || item.summary.length > 150) fail(`${label}: summary must be 35–150 characters`);
    if (typeof item.prompt !== "string" || item.prompt.length < 120 || item.prompt.length > 700) fail(`${label}: prompt must be 120–700 characters`);
    if (!Array.isArray(item.surfaces) || item.surfaces.length === 0) fail(`${label}: surfaces must be a non-empty array`);
    for (const surface of item.surfaces || []) {
      if (!allowed.surfaces.includes(surface) || surface === "All") fail(`${label}: unsupported playbook surface "${surface}"`);
    }
    if (!Array.isArray(item.steps) || item.steps.length < 3 || item.steps.length > 6) fail(`${label}: include 3–6 steps`);
    if (!Array.isArray(item.evidence) || item.evidence.length < 3 || item.evidence.length > 6) fail(`${label}: include 3–6 evidence items`);
  }
}

async function validateLocalReferences(file) {
  const content = await readFile(file, "utf8");
  const references = [
    ...content.matchAll(/\[[^\]]*\]\((?!https?:|#|mailto:)([^)]+)\)/g),
    ...content.matchAll(/(?:src|href)="(?!https?:|#|mailto:)([^"?]+)(?:\?[^"#]*)?(?:#[^"]*)?"/g)
  ].map((match) => match[1].split("#")[0]).filter(Boolean);

  for (const reference of new Set(references)) {
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(reference));
    try {
      await stat(resolved);
    } catch {
      fail(`${path.relative(root, file)}: missing local reference "${reference}"`);
    }
  }
}

async function validatePublicSurfaces() {
  const files = [
    "README.md", "CONTRIBUTING.md", "SECURITY.md", "site/index.html",
    "site/data/resources.json", "site/data/playbooks.json"
  ];
  const retiredPatterns = ["beta.openai.com", "codex-javascript-sandbox"];
  for (const relative of files) {
    const content = await readFile(path.join(root, relative), "utf8");
    for (const pattern of retiredPatterns) {
      if (content.includes(pattern)) fail(`${relative}: retired Codex surface "${pattern}" is not allowed in active content`);
    }
  }

  await Promise.all([
    validateLocalReferences(path.join(root, "README.md")),
    validateLocalReferences(path.join(root, "CONTRIBUTING.md")),
    validateLocalReferences(path.join(root, "SECURITY.md")),
    validateLocalReferences(path.join(root, "archive", "2021-codex-demos.md")),
    validateLocalReferences(path.join(root, "site", "index.html"))
  ]);
}

const [resources, playbooks] = await Promise.all([loadJson(resourcesPath), loadJson(playbooksPath)]);
validateResources(resources);
validatePlaybooks(playbooks);
await validatePublicSurfaces();

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  console.error(`\nContent validation failed with ${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${resources.length} resources and ${playbooks.length} playbooks.`);
  console.log("Active content, local references, review dates, and catalog coverage are valid.");
}
