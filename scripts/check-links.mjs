import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const timeoutMs = Number.parseInt(process.env.LINK_CHECK_TIMEOUT_MS || "12000", 10);
const concurrency = Number.parseInt(process.env.LINK_CHECK_CONCURRENCY || "6", 10);
const resources = JSON.parse(await readFile(path.join(root, "site", "data", "resources.json"), "utf8"));

async function request(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "codex-atlas-link-check/2.0",
        accept: "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5",
        ...(method === "GET" ? { range: "bytes=0-2047" } : {})
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function probe(resource) {
  let response;
  let headError;
  try {
    response = await request(resource.url, "HEAD");
  } catch (error) {
    headError = error;
  }

  if (!response || [401, 403, 405, 429, 501].includes(response.status)) {
    try {
      response = await request(resource.url, "GET");
    } catch (error) {
      const reason = `${error.name}: ${error.message}`;
      return { resource, outcome: "inconclusive", reason: headError ? `${headError.name}: ${headError.message}; GET ${reason}` : reason };
    }
  }

  if (response.status >= 200 && response.status < 400) {
    return { resource, outcome: "ok", status: response.status, finalUrl: response.url };
  }
  if ([401, 403, 408, 425, 429].includes(response.status) || response.status >= 500) {
    return { resource, outcome: "inconclusive", status: response.status, reason: "destination blocked or returned a transient response" };
  }
  return { resource, outcome: "broken", status: response.status, reason: "confirmed HTTP client error" };
}

const results = new Array(resources.length);
let nextIndex = 0;

async function worker() {
  while (nextIndex < resources.length) {
    const index = nextIndex++;
    results[index] = await probe(resources[index]);
  }
}

await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, resources.length)) }, worker));

for (const result of results) {
  const status = result.status ? `HTTP ${result.status}` : "NETWORK";
  const redirect = result.finalUrl && result.finalUrl !== result.resource.url ? ` -> ${result.finalUrl}` : "";
  console.log(`${result.outcome.toUpperCase().padEnd(12)} ${status.padEnd(10)} ${result.resource.id}${redirect}`);
}

const counts = Object.groupBy
  ? Object.groupBy(results, (result) => result.outcome)
  : results.reduce((groups, result) => {
      (groups[result.outcome] ||= []).push(result);
      return groups;
    }, {});
const ok = counts.ok?.length || 0;
const broken = counts.broken?.length || 0;
const inconclusive = counts.inconclusive?.length || 0;

console.log(`\nLink probe summary: ${ok} reachable, ${broken} confirmed broken, ${inconclusive} inconclusive.`);
console.log("A reachable URL only proves that it responded during this probe; content accuracy still requires review.");

if (broken > 0 || (strict && inconclusive > 0)) {
  if (strict && inconclusive > 0) console.error("Strict mode treats inconclusive probes as failures.");
  process.exitCode = 1;
}
