export const DEFAULT_STATE = Object.freeze({
  query: "",
  surface: "All",
  category: "All",
  level: "All",
  source: "All",
  sort: "featured"
});

export const SORT_OPTIONS = Object.freeze(["featured", "title", "reviewed"]);

export function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

export function resourceSearchText(resource) {
  return normalizeSearch([
    resource.title,
    resource.summary,
    resource.category,
    resource.level,
    resource.source,
    resource.kind,
    ...resource.surfaces
  ].join(" "));
}

export function matchesResource(resource, state) {
  const terms = normalizeSearch(state.query).split(" ").filter(Boolean);
  const haystack = resourceSearchText(resource);
  const searchMatches = terms.every((term) => haystack.includes(term));
  const surfaceMatches = state.surface === "All"
    || resource.surfaces.includes("All")
    || resource.surfaces.includes(state.surface);

  return searchMatches
    && surfaceMatches
    && (state.category === "All" || resource.category === state.category)
    && (state.level === "All" || resource.level === state.level)
    && (state.source === "All" || resource.source === state.source);
}

export function sortResources(resources, sort = "featured") {
  const sorted = [...resources];
  const byTitle = (a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" });

  if (sort === "title") return sorted.sort(byTitle);
  if (sort === "reviewed") {
    return sorted.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt) || byTitle(a, b));
  }

  return sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || byTitle(a, b));
}

export function filterResources(resources, state) {
  return sortResources(resources.filter((resource) => matchesResource(resource, state)), state.sort);
}

export function parseState(search, allowed = {}) {
  const params = new URLSearchParams(search);
  const pick = (key, fallback) => {
    const value = params.get(key);
    const choices = allowed[key];
    return value && (!choices || choices.includes(value)) ? value : fallback;
  };

  return {
    query: (params.get("q") || "").slice(0, 120),
    surface: pick("surface", DEFAULT_STATE.surface),
    category: pick("category", DEFAULT_STATE.category),
    level: pick("level", DEFAULT_STATE.level),
    source: pick("source", DEFAULT_STATE.source),
    sort: pick("sort", DEFAULT_STATE.sort)
  };
}

export function stateToSearchParams(state) {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  for (const key of ["surface", "category", "level", "source"]) {
    if (state[key] !== "All") params.set(key, state[key]);
  }
  if (state.sort !== DEFAULT_STATE.sort) params.set("sort", state.sort);
  return params;
}

export function reviewAgeInDays(reviewedAt, now = new Date()) {
  const reviewed = new Date(`${reviewedAt}T00:00:00Z`);
  if (Number.isNaN(reviewed.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - reviewed.getTime()) / 86_400_000);
}

export function staleResources(resources, maxAgeDays = 90, now = new Date()) {
  return resources.filter((resource) => reviewAgeInDays(resource.reviewedAt, now) > maxAgeDays);
}

export function uniqueValues(resources, key) {
  return [...new Set(resources.flatMap((resource) => resource[key]))]
    .filter((value) => value !== "All")
    .sort((a, b) => a.localeCompare(b, "en"));
}
