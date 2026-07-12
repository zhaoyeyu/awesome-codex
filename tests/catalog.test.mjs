import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_STATE,
  filterResources,
  matchesResource,
  normalizeSearch,
  parseState,
  reviewAgeInDays,
  sortResources,
  staleResources,
  stateToSearchParams,
  uniqueValues
} from "../site/assets/catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resources = JSON.parse(await readFile(path.join(root, "site", "data", "resources.json"), "utf8"));

test("normalizes punctuation while retaining useful technical symbols", () => {
  assert.equal(normalizeSearch("  AGENTS.md / C++ & GPT-5  "), "agents.md c++ gpt 5");
});

test("search requires every query term and is case-insensitive", () => {
  const state = { ...DEFAULT_STATE, query: "durable REPOSITORY conventions" };
  const matches = filterResources(resources, state);
  assert.deepEqual(matches.map((item) => item.id), ["agents-md"]);
});

test("All-surface resources match a specific surface", () => {
  const agents = resources.find((item) => item.id === "agents-md");
  assert.equal(matchesResource(agents, { ...DEFAULT_STATE, surface: "Cloud" }), true);
});

test("surface filter excludes unrelated direct surfaces", () => {
  const cli = resources.find((item) => item.id === "codex-cli");
  assert.equal(matchesResource(cli, { ...DEFAULT_STATE, surface: "Cloud" }), false);
  assert.equal(matchesResource(cli, { ...DEFAULT_STATE, surface: "CLI" }), true);
});

test("combined filters narrow the catalog deterministically", () => {
  const matches = filterResources(resources, {
    ...DEFAULT_STATE,
    surface: "CI",
    category: "Automate",
    level: "Advanced",
    source: "OpenAI",
    sort: "title"
  });
  assert.deepEqual(matches.map((item) => item.id), ["codex-github-action", "codex-sdk"]);
});

test("featured sort keeps featured entries first and titles stable", () => {
  const sample = [
    { title: "Zulu", featured: false },
    { title: "Bravo", featured: true },
    { title: "Alpha", featured: true }
  ];
  assert.deepEqual(sortResources(sample, "featured").map((item) => item.title), ["Alpha", "Bravo", "Zulu"]);
});

test("URL state round-trips supported filters", () => {
  const original = {
    query: "security review",
    surface: "Cloud",
    category: "Security",
    level: "Intermediate",
    source: "OpenAI",
    sort: "reviewed"
  };
  const allowed = {
    surface: ["All", "Cloud"],
    category: ["All", "Security"],
    level: ["All", "Intermediate"],
    source: ["All", "OpenAI"],
    sort: ["featured", "reviewed"]
  };
  assert.deepEqual(parseState(`?${stateToSearchParams(original)}`, allowed), original);
});

test("invalid URL filters fall back safely and long queries are bounded", () => {
  const parsed = parseState(`?surface=Unknown&sort=random&q=${"x".repeat(200)}`, {
    surface: ["All", "CLI"],
    sort: ["featured", "title"]
  });
  assert.equal(parsed.surface, "All");
  assert.equal(parsed.sort, "featured");
  assert.equal(parsed.query.length, 120);
});

test("review age and stale detection use calendar dates", () => {
  const now = new Date("2026-07-20T12:00:00Z");
  assert.equal(reviewAgeInDays("2026-07-12", now), 8);
  assert.equal(staleResources(resources, 90, now).length, 0);
});

test("uniqueValues flattens surface arrays and omits All", () => {
  assert.deepEqual(uniqueValues(resources, "surfaces"), ["CI", "CLI", "Cloud", "Desktop", "IDE"]);
});
