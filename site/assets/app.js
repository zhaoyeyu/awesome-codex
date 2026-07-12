import {
  DEFAULT_STATE,
  SORT_OPTIONS,
  filterResources,
  parseState,
  staleResources,
  stateToSearchParams,
  uniqueValues
} from "./catalog.js";

const surfaceDescriptions = Object.freeze({
  All: "Every surface",
  CLI: "Local + terminal",
  IDE: "Editor context",
  Cloud: "Parallel tasks",
  Desktop: "Workspace tools",
  CI: "Automation"
});

const elements = {
  search: document.querySelector("#search"),
  surfaceTabs: document.querySelector("#surface-tabs"),
  category: document.querySelector("#category-filter"),
  level: document.querySelector("#level-filter"),
  source: document.querySelector("#source-filter"),
  sort: document.querySelector("#sort-filter"),
  reset: document.querySelector("#reset-filters"),
  emptyReset: document.querySelector("#empty-reset"),
  resultCount: document.querySelector("#result-count"),
  freshness: document.querySelector("#freshness-note"),
  resourceGrid: document.querySelector("#resource-grid"),
  emptyState: document.querySelector("#empty-state"),
  playbookGrid: document.querySelector("#playbook-grid"),
  resourceStat: document.querySelector("#resource-stat"),
  surfaceStat: document.querySelector("#surface-stat"),
  playbookStat: document.querySelector("#playbook-stat"),
  themeToggle: document.querySelector("#theme-toggle"),
  dialog: document.querySelector("#playbook-dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  dialogKicker: document.querySelector("#dialog-kicker"),
  dialogTitle: document.querySelector("#dialog-title"),
  dialogSummary: document.querySelector("#dialog-summary"),
  dialogSurfaces: document.querySelector("#dialog-surfaces"),
  dialogPrompt: document.querySelector("#dialog-prompt"),
  dialogSteps: document.querySelector("#dialog-steps"),
  dialogEvidence: document.querySelector("#dialog-evidence"),
  copyPrompt: document.querySelector("#copy-prompt"),
  toast: document.querySelector("#toast")
};

let resources = [];
let playbooks = [];
let state = { ...DEFAULT_STATE };
let currentPrompt = "";
let toastTimer;

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function addOptions(select, values) {
  const fragment = document.createDocumentFragment();
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    fragment.append(option);
  }
  select.append(fragment);
}

function renderSurfaceTabs() {
  elements.surfaceTabs.replaceChildren();
  for (const [surface, description] of Object.entries(surfaceDescriptions)) {
    const button = createElement("button", "surface-tab");
    button.type = "button";
    button.dataset.surface = surface;
    button.setAttribute("aria-pressed", String(state.surface === surface));
    button.append(createElement("strong", "", surface), createElement("small", "", description));
    button.addEventListener("click", () => {
      state.surface = surface;
      render();
    });
    elements.surfaceTabs.append(button);
  }
}

function renderResourceCard(resource) {
  const card = createElement("article", `resource-card${resource.featured ? " featured" : ""}`);
  const badges = createElement("div", "card-badges");
  badges.append(
    createElement("span", "badge category", resource.category),
    createElement("span", "badge source", resource.source),
    createElement("span", "badge", resource.kind)
  );

  const title = createElement("h3");
  const link = createElement("a", "", resource.title);
  link.href = resource.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `${resource.title} (opens in a new tab)`);
  title.append(link);

  const surfaces = createElement("div", "card-surfaces");
  for (const surface of resource.surfaces) surfaces.append(createElement("span", "", surface));

  const footer = createElement("div", "card-footer");
  const reviewed = document.createElement("time");
  reviewed.dateTime = resource.reviewedAt;
  reviewed.textContent = `Reviewed ${new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${resource.reviewedAt}T00:00:00Z`))}`;
  footer.append(reviewed, createElement("span", "arrow", "↗"));

  card.append(badges, title, createElement("p", "", resource.summary), surfaces, footer);
  return card;
}

function updateUrl() {
  const params = stateToSearchParams(state).toString();
  const next = `${window.location.pathname}${params ? `?${params}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}

function renderResources() {
  const visible = filterResources(resources, state);
  const fragment = document.createDocumentFragment();
  for (const resource of visible) fragment.append(renderResourceCard(resource));
  elements.resourceGrid.replaceChildren(fragment);
  elements.resourceGrid.hidden = visible.length === 0;
  elements.emptyState.hidden = visible.length !== 0;
  elements.resultCount.textContent = `${visible.length} of ${resources.length} resources`;
}

function syncControls() {
  elements.search.value = state.query;
  elements.category.value = state.category;
  elements.level.value = state.level;
  elements.source.value = state.source;
  elements.sort.value = state.sort;

  for (const tab of elements.surfaceTabs.querySelectorAll("button")) {
    tab.setAttribute("aria-pressed", String(tab.dataset.surface === state.surface));
  }
}

function render() {
  syncControls();
  renderResources();
  updateUrl();
}

function resetFilters({ preserveQuery = false } = {}) {
  state = { ...DEFAULT_STATE, query: preserveQuery ? state.query : "" };
  render();
}

function renderPlaybook(playbook) {
  const card = createElement("article", "playbook-card");
  card.append(
    createElement("span", "playbook-kicker", playbook.kicker),
    createElement("h3", "", playbook.title),
    createElement("p", "", playbook.summary)
  );

  const footer = createElement("div", "playbook-footer");
  const surfaces = createElement("div", "playbook-surfaces");
  for (const surface of playbook.surfaces) surfaces.append(createElement("span", "", surface));
  const open = createElement("button", "playbook-open", "↗");
  open.type = "button";
  open.setAttribute("aria-label", `Open ${playbook.title} playbook`);
  open.addEventListener("click", () => openPlaybook(playbook));
  footer.append(surfaces, open);
  card.append(footer);
  return card;
}

function appendListItems(parent, items) {
  parent.replaceChildren();
  for (const item of items) parent.append(createElement("li", "", item));
}

function openPlaybook(playbook) {
  currentPrompt = playbook.prompt;
  elements.dialogKicker.textContent = playbook.kicker;
  elements.dialogTitle.textContent = playbook.title;
  elements.dialogSummary.textContent = playbook.summary;
  elements.dialogPrompt.textContent = playbook.prompt;
  elements.dialogSurfaces.replaceChildren();
  for (const surface of playbook.surfaces) {
    elements.dialogSurfaces.append(createElement("span", "", surface));
  }
  appendListItems(elements.dialogSteps, playbook.steps);
  appendListItems(elements.dialogEvidence, playbook.evidence);
  elements.copyPrompt.textContent = "Copy prompt";
  elements.dialog.showModal();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(currentPrompt);
    elements.copyPrompt.textContent = "Copied";
    showToast("Prompt copied to clipboard");
  } catch {
    showToast("Clipboard access is unavailable");
  }
}

function initializeTheme() {
  let storedTheme;
  try {
    storedTheme = localStorage.getItem("codex-atlas-theme");
  } catch {
    storedTheme = null;
  }
  const theme = storedTheme || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
  try {
    localStorage.setItem("codex-atlas-theme", theme);
  } catch {
    // Theme persistence is optional when storage is unavailable.
  }
}

function bindControls() {
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value.slice(0, 120);
    render();
  });

  for (const [element, key] of [
    [elements.category, "category"],
    [elements.level, "level"],
    [elements.source, "source"],
    [elements.sort, "sort"]
  ]) {
    element.addEventListener("change", (event) => {
      state[key] = event.target.value;
      render();
    });
  }

  elements.reset.addEventListener("click", () => resetFilters());
  elements.emptyReset.addEventListener("click", () => resetFilters());
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.dialogClose.addEventListener("click", () => elements.dialog.close());
  elements.copyPrompt.addEventListener("click", copyPrompt);
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || target.isContentEditable;
    if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      elements.search.focus();
    }
  });
}

async function loadData() {
  const [resourceResponse, playbookResponse] = await Promise.all([
    fetch("data/resources.json"),
    fetch("data/playbooks.json")
  ]);
  if (!resourceResponse.ok || !playbookResponse.ok) throw new Error("Catalog data could not be loaded");
  [resources, playbooks] = await Promise.all([resourceResponse.json(), playbookResponse.json()]);
}

function initializePage() {
  const surfaces = ["All", ...Object.keys(surfaceDescriptions).filter((item) => item !== "All")];
  const categories = ["All", ...uniqueValues(resources, "category")];
  const levels = ["All", ...uniqueValues(resources, "level")];
  const sources = ["All", ...uniqueValues(resources, "source")];

  addOptions(elements.category, categories.slice(1));
  addOptions(elements.level, levels.slice(1));
  addOptions(elements.source, sources.slice(1));

  state = parseState(window.location.search, {
    surface: surfaces,
    category: categories,
    level: levels,
    source: sources,
    sort: SORT_OPTIONS
  });

  renderSurfaceTabs();
  elements.resourceStat.textContent = String(resources.length).padStart(2, "0");
  elements.surfaceStat.textContent = String(surfaces.length - 1).padStart(2, "0");
  elements.playbookStat.textContent = String(playbooks.length).padStart(2, "0");

  const stale = staleResources(resources, 90);
  elements.freshness.textContent = stale.length
    ? `${stale.length} ${stale.length === 1 ? "entry needs" : "entries need"} re-review`
    : "All active entries reviewed within 90 days";

  const playbookFragment = document.createDocumentFragment();
  for (const playbook of playbooks) playbookFragment.append(renderPlaybook(playbook));
  elements.playbookGrid.replaceChildren(playbookFragment);
  bindControls();
  render();
}

initializeTheme();
loadData()
  .then(initializePage)
  .catch((error) => {
    elements.resultCount.textContent = "The resource catalog could not be loaded.";
    elements.freshness.textContent = "Run this site through a local static server.";
    console.error(error);
  });
