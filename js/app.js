import {
  DEFAULT_GOAL,
  keyOf,
  parseBoard,
  randomBoard,
  isSolvable,
} from "./puzzle.js";
import { createSearch } from "./dls.js";

const $ = (id) => document.getElementById(id);
const HISTORY_LIMIT = 2000;
const defaults = [1, 2, 3, 4, 0, 6, 7, 5, 8];
const labels = {
  solved: "Solution found",
  cutoff: "Depth limit reached",
  unsolvable: "Unsolvable puzzle",
  failure: "Search exhausted",
  "resource-limit": "Resource limit reached",
};
let session = null;
let searchTimer;
let solutionTimer;
let compareVersion = 0;
let comparing = false;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function formatBoard(board) {
  return [0, 3, 6].map((i) => board.slice(i, i + 3).join(" ")).join("\n");
}
function boardLabel(board) {
  return board.map((n) => n || "blank").join(", ");
}
function memoryLabel(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
function timeLabel(ms) {
  return ms < 0.1 ? "<0.1 ms" : `${ms.toFixed(1)} ms`;
}
function miniBoard(board) {
  const grid = element("div", "mini-board");
  grid.setAttribute("role", "img");
  grid.setAttribute("aria-label", boardLabel(board));
  for (const tile of board)
    grid.append(element("span", tile ? "" : "blank", tile || ""));
  return grid;
}
function drawBoard(board, goal = DEFAULT_GOAL) {
  const grid = $("current-board");
  if (!grid.children.length) {
    for (let n = 0; n <= 8; n++) {
      const tile = element("div", n ? "tile" : "tile blank", n || "");
      tile.dataset.tile = n;
      tile.setAttribute("aria-hidden", "true");
      grid.append(tile);
    }
  }
  for (const tile of grid.children) {
    const n = Number(tile.dataset.tile);
    const position = board.indexOf(n);
    const x = position % 3;
    const y = Math.floor(position / 3);
    tile.style.transform = `translate(calc(${x} * (100% + 6px)), calc(${y} * (100% + 6px)))`;
    tile.classList.toggle("correct", n !== 0 && goal[position] === n);
  }
  grid.setAttribute("aria-label", `Current state: ${boardLabel(board)}`);
}
function setError(message = "") {
  $("input-error").hidden = !message;
  $("input-error").textContent = message;
}
function readInput() {
  const initial = parseBoard($("initial-input").value);
  const goal = parseBoard($("goal-input").value);
  const rawLimit = $("depth-limit").value.trim();
  const limit = Number(rawLimit);
  if (!rawLimit || !Number.isInteger(limit) || limit < 0 || limit > 31)
    throw new Error("Choose a whole-number depth limit from 0 to 31.");
  if (!isSolvable(initial, goal))
    throw new Error(
      "This initial state cannot reach the goal (inversion parity differs). Swap two numbered tiles or generate a random puzzle.",
    );
  return { initial, goal, limit };
}
function stopTimers() {
  clearTimeout(searchTimer);
  clearTimeout(solutionTimer);
  if (session) session.playing = false;
}
function preview() {
  try {
    const initial = parseBoard($("initial-input").value);
    const goal = parseBoard($("goal-input").value);
    drawBoard(initial, goal);
    $("initial-preview").replaceChildren(...miniBoard(initial).children);
    $("goal-preview").replaceChildren(...miniBoard(goal).children);
    $("stage-goal").replaceChildren(...miniBoard(goal).children);
  } catch {
    /* Keep the last valid preview while the user edits. Run explains errors. */
  }
  $("depth-display").textContent = $("depth-limit").value || "—";
}
function updateControls() {
  $("run").disabled = Boolean(session);
  $("previous").disabled = !session || session.cursor <= 0;
  $("next").disabled = Boolean(
    session?.result && session.cursor === session.history.length - 1,
  );
  $("pause").disabled =
    !session ||
    Boolean(session.result && session.cursor === session.history.length - 1);
  const playing = session?.playing;
  const label = playing ? "Pause search" : "Resume search";
  $("pause").setAttribute("aria-label", label);
  $("pause").title = label;
  $("pause")
    .querySelector("path")
    .setAttribute("d", playing ? "M8 5v14M16 5v14" : "m8 5 11 7-11 7Z");
}
function clearComparison() {
  compareVersion++;
  comparing = false;
  $("compare-run").disabled = false;
  $("comparison-status").textContent = "";
  const row = element("tr");
  const cell = element(
    "td",
    "empty-note",
    "Run an experiment to collect real measurements.",
  );
  cell.colSpan = 8;
  row.append(cell);
  $("comparison-body").replaceChildren(row);
  try {
    $("comparison-instance").textContent =
      `Initial ${keyOf(parseBoard($("initial-input").value))} → Goal ${keyOf(parseBoard($("goal-input").value))} · 0 = blank`;
  } catch {
    $("comparison-instance").textContent =
      "Set valid initial and goal states in the visualizer.";
  }
}
function reset({ inputChanged = false } = {}) {
  stopTimers();
  session = null;
  setError();
  $("run-state").textContent = "Ready";
  $("event-kind").textContent = "Ready to explore";
  $("event-description").textContent =
    "Your initial state is on the board. Run the search or take the first step.";
  $("current-depth").textContent = "0";
  $("depth-progress").style.width = "0%";
  $("board-caption").textContent = "Initial state";
  $("step-counter").textContent = "Step 0";
  $("history-note").textContent = "UP → RIGHT → DOWN → LEFT";
  for (const id of [
    "stat-generated",
    "stat-expanded",
    "stat-max-depth",
    "stat-time",
    "stat-cost",
    "successor-count",
    "frontier-count",
    "closed-count",
  ])
    $(id).textContent = "0";
  $("parent-depth").textContent = "—";
  for (const [id, text] of [
    ["parent-board", "The root has no parent."],
    ["successor-list", "Successors appear when a node expands."],
    ["frontier-list", "No pending nodes yet."],
    ["closed-list", "No nodes expanded yet."],
  ]) {
    $(id).replaceChildren(element("p", "empty-note", text));
  }
  $("result").hidden = true;
  $("solution-path").replaceChildren();
  preview();
  updateControls();
  if (inputChanged) clearComparison();
}
function begin() {
  try {
    setError();
    const input = readInput();
    session = {
      ...input,
      search: createSearch(input.initial, input.goal, input.limit),
      history: [],
      cursor: -1,
      dropped: 0,
      result: null,
      playing: false,
      solutionIndex: 0,
    };
    $("result").hidden = true;
    updateControls();
    return true;
  } catch (error) {
    setError(error.message);
    return false;
  }
}
function renderList(id, nodes, emptyText) {
  $(id).replaceChildren();
  if (!nodes.length) {
    $(id).append(element("p", "empty-note", emptyText));
    return;
  }
  for (const node of nodes) {
    const row = element("div", "state-row");
    row.append(
      element("span", "state-key", keyOf(node.board).replace("0", "_")),
      element("small", "", `d=${node.depth}`),
    );
    $(id).append(row);
  }
}
function renderEvent(frame) {
  drawBoard(frame.board, session.goal);
  $("event-kind").textContent = {
    expand: "Expanding this node",
    cutoff: "Depth bound reached",
    goal: "Goal reached",
  }[frame.kind];
  $("event-description").textContent = {
    expand: "Generate legal moves, then follow the next branch.",
    cutoff: "No expansion here. Backtrack and try the next branch.",
    goal: "This board matches the goal. The solution is ready below.",
  }[frame.kind];
  $("current-depth").textContent = frame.depth;
  $("depth-progress").style.width =
    `${session.limit ? (frame.depth / session.limit) * 100 : 0}%`;
  $("board-caption").textContent =
    `${frame.move === "Start" ? "Root node" : `Blank moved ${frame.move.toLowerCase()}`} · g(n) = ${frame.depth}`;
  $("step-counter").textContent =
    `Step ${session.dropped + session.cursor + 1}`;
  $("stat-generated").textContent = frame.stats.generated.toLocaleString();
  $("stat-expanded").textContent = frame.stats.expanded.toLocaleString();
  $("stat-max-depth").textContent = frame.stats.maxDepth;
  $("stat-time").textContent = timeLabel(frame.stats.elapsedMs);
  $("stat-cost").textContent = frame.depth;
  $("parent-depth").textContent = frame.parent ? `d=${frame.depth - 1}` : "—";
  $("parent-board").replaceChildren(
    frame.parent
      ? miniBoard(frame.parent)
      : element("p", "empty-note", "The root has no parent."),
  );
  $("successor-count").textContent = frame.successors.length;
  $("successor-list").replaceChildren();
  for (const node of frame.successors) {
    const item = element("div", "successor-item");
    item.append(miniBoard(node.board), element("span", "", node.move));
    $("successor-list").append(item);
  }
  if (!frame.successors.length)
    $("successor-list").append(
      element("p", "empty-note", "No successors generated at this visit."),
    );
  $("frontier-count").textContent = frame.frontierSize;
  $("closed-count").textContent = frame.stats.expanded;
  renderList("frontier-list", frame.frontier, "The frontier is empty.");
  renderList("closed-list", frame.closed, "No nodes expanded yet.");
  $("history-note").textContent = session.dropped
    ? `LATEST ${session.history.length} EVENTS · ${session.dropped} EARLIER EVENTS DISCARDED`
    : "UP → RIGHT → DOWN → LEFT";
  updateControls();
}
function advance() {
  if (session.cursor < session.history.length - 1) {
    session.cursor++;
    renderEvent(session.history[session.cursor]);
    return true;
  }
  if (session.result) {
    session.playing = false;
    $("run-state").textContent =
      session.result.status === "solved" ? "Solved" : "Finished";
    updateControls();
    return false;
  }
  const step = session.search.next();
  if (step.done) {
    session.result = step.value;
    session.playing = false;
    $("run-state").textContent =
      step.value.status === "solved" ? "Solved" : "Finished";
    showResult();
    updateControls();
    return false;
  }
  session.history.push(step.value);
  if (session.history.length > HISTORY_LIMIT) {
    session.history.shift();
    session.dropped++;
  }
  session.cursor = session.history.length - 1;
  renderEvent(step.value);
  return true;
}
function schedule() {
  if (!session?.playing) return;
  const speed = Number($("speed").value);
  const batch = speed === 0 ? 100 : 1;
  for (let i = 0; i < batch && session.playing; i++) if (!advance()) break;
  if (session.playing) searchTimer = setTimeout(schedule, speed);
}
function playSearch() {
  clearTimeout(solutionTimer);
  clearTimeout(searchTimer);
  if (!session && !begin()) return;
  session.playing = true;
  $("run-state").textContent = "Searching";
  updateControls();
  schedule();
}
function pauseSearch() {
  stopTimers();
  if (session) $("run-state").textContent = "Paused";
  updateControls();
}
function showSolution(index) {
  const path = session.result.path;
  session.solutionIndex = Math.max(0, Math.min(index, path.length - 1));
  const node = path[session.solutionIndex];
  drawBoard(node.board, session.goal);
  $("board-caption").textContent =
    `Solution · ${node.move === "Start" ? "Initial state" : `blank ${node.move.toLowerCase()}`}`;
  $("solution-position").textContent =
    `Move ${session.solutionIndex} of ${path.length - 1}`;
  $("current-depth").textContent = session.solutionIndex;
  $("stat-cost").textContent = session.solutionIndex;
  $("event-kind").textContent = "Solution playback";
  $("event-description").textContent =
    "Each adjacent board is one legal blank movement.";
  $("depth-progress").style.width =
    `${session.limit ? (session.solutionIndex / session.limit) * 100 : 0}%`;
  $("solution-prev").disabled = session.solutionIndex === 0;
  $("solution-next").disabled = session.solutionIndex === path.length - 1;
  [...$("solution-path").children].forEach((button, i) =>
    button.classList.toggle("active", i === session.solutionIndex),
  );
}
function showResult() {
  const { status, path, stats } = session.result;
  $("result").hidden = false;
  $("result-title").textContent = labels[status];
  $("result-description").textContent = {
    solved: `${path.length - 1} legal moves to the goal. Explore or replay the path below. DLS does not promise the shortest path.`,
    cutoff: `No solution found within depth ${session.limit}. Increase the limit and try again; a cutoff does not mean unsolvable.`,
    failure:
      "All eligible branches within this search were exhausted without finding the goal.",
    unsolvable: "The initial and goal states have different inversion parity.",
    "resource-limit":
      "Stopped at 50,000 visits to keep your browser responsive. This result is inconclusive; try a smaller limit or a simpler puzzle.",
  }[status];
  $("summary").replaceChildren();
  for (const [label, value] of [
    ["Total moves", status === "solved" ? path.length - 1 : "—"],
    ["Nodes generated", stats.generated.toLocaleString()],
    ["Nodes expanded", stats.expanded.toLocaleString()],
    ["Maximum depth", stats.maxDepth],
    ["Search time", timeLabel(stats.elapsedMs)],
    ["Path cost", status === "solved" ? path.length - 1 : "—"],
    ["Search memory ≈", memoryLabel(stats.memoryBytes)],
    [
      "UI history estimate ≈",
      `${session.history.length} events · ${memoryLabel(session.history.length * 3000)}`,
    ],
  ]) {
    const item = element("div", "summary-item");
    item.append(element("span", "", label), element("strong", "", value));
    $("summary").append(item);
  }
  $("stat-time").textContent = timeLabel(stats.elapsedMs);
  $("solution-controls").hidden = status !== "solved";
  $("solution-path").replaceChildren();
  if (status === "solved") {
    path.forEach((node, i) => {
      const button = element("button", "path-step", undefined);
      button.type = "button";
      button.setAttribute("aria-label", `Solution move ${i}: ${node.move}`);
      button.append(
        miniBoard(node.board),
        element("span", "", `${i} · ${node.move}`),
      );
      button.addEventListener("click", () => {
        clearTimeout(solutionTimer);
        showSolution(i);
      });
      $("solution-path").append(button);
    });
    $("solution-position").textContent = `Move 0 of ${path.length - 1}`;
    $("solution-prev").disabled = true;
    $("solution-next").disabled = path.length <= 1;
  }
}
function exportRun() {
  if (!session?.result) return;
  const report = {
    student: "Aayush Dwivedi",
    registration: "24BCT0058",
    algorithm: "DLS",
    initial: session.initial,
    goal: session.goal,
    depthLimit: session.limit,
    moveOrder: ["Up", "Right", "Down", "Left"],
    ...session.result,
    notes:
      "Generated/expanded count visits, not unique states. Memory is an estimate. Computation time excludes animation.",
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
  );
  const anchor = element("a");
  anchor.href = url;
  anchor.download = "24BCT0058-dls-run.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function compare() {
  if (comparing) return;
  let input, limits;
  try {
    input = readInput();
    const parts = $("comparison-limits")
      .value.split(",")
      .map((s) => s.trim());
    if (parts.some((p) => !/^\d+$/.test(p)))
      throw new Error(
        "Enter 1–6 comma-separated whole-number limits from 0 to 31.",
      );
    limits = [...new Set(parts.map(Number))];
    if (!limits.length || limits.length > 6 || limits.some((n) => n > 31))
      throw new Error(
        "Enter 1–6 comma-separated whole-number limits from 0 to 31.",
      );
  } catch (error) {
    $("comparison-status").textContent = error.message;
    return;
  }
  pauseSearch();
  const version = ++compareVersion;
  comparing = true;
  $("compare-run").disabled = true;
  $("comparison-body").replaceChildren();
  $("comparison-instance").textContent =
    `Initial ${keyOf(input.initial)} → Goal ${keyOf(input.goal)} · 0 = blank`;
  for (const limit of limits) {
    $("comparison-status").textContent =
      `Measuring DLS at depth limit ${limit}…`;
    const search = createSearch(input.initial, input.goal, limit);
    let step;
    do {
      for (let i = 0; i < 250; i++) {
        step = search.next();
        if (step.done) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (version !== compareVersion) return;
    } while (!step.done);
    const { status, path, stats } = step.value;
    const row = element("tr");
    row.append(element("td", "", `DLS · ℓ = ${limit}`));
    const outcome = element("td");
    outcome.append(
      element(
        "span",
        `outcome ${status}`,
        status === "solved" ? "Solved" : labels[status],
      ),
    );
    row.append(outcome);
    for (const value of [
      stats.generated,
      stats.expanded,
      status === "solved" ? path.length - 1 : "—",
      stats.maxDepth,
      timeLabel(stats.elapsedMs),
      memoryLabel(stats.memoryBytes),
    ])
      row.append(element("td", "", value));
    $("comparison-body").append(row);
  }
  comparing = false;
  $("compare-run").disabled = false;
  $("comparison-status").textContent =
    "Experiment complete. All rows use the same puzzle; times vary by device and run.";
}
function navigate() {
  const route = location.hash.slice(1);
  const page = ["lab", "compare", "algorithm", "about"].includes(route)
    ? route
    : "lab";
  document.querySelectorAll(".page").forEach((node) => {
    node.hidden = node.id !== `page-${page}`;
  });
  document.querySelectorAll("[data-route]").forEach((link) => {
    if (link.dataset.route === page) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (page !== "lab" && session?.playing) pauseSearch();
  document.title = `${{ lab: "Visualizer", compare: "Compare limits", algorithm: "The algorithm", about: "About" }[page]} · 8-Puzzle Lab`;
}

$("run-state").setAttribute("role", "status");
$("result-title").setAttribute("aria-live", "polite");
$("run").addEventListener("click", playSearch);
$("pause").addEventListener("click", () =>
  session?.playing ? pauseSearch() : playSearch(),
);
$("next").addEventListener("click", () => {
  pauseSearch();
  if (!session && !begin()) return;
  $("run-state").textContent = "Paused";
  advance();
});
$("previous").addEventListener("click", () => {
  pauseSearch();
  if (session?.cursor > 0) {
    session.cursor--;
    renderEvent(session.history[session.cursor]);
  }
});
$("reset").addEventListener("click", () => reset());
$("speed").addEventListener("change", () => {
  if (session?.playing) {
    clearTimeout(searchTimer);
    schedule();
  }
});
for (const id of ["initial-input", "goal-input", "depth-limit"])
  $(id).addEventListener("input", () => {
    if (id !== "depth-limit") $("preset").value = "custom";
    reset({ inputChanged: true });
  });
$("preset").addEventListener("change", () => {
  const presets = {
    two: [defaults, DEFAULT_GOAL, 8],
    four: [[1, 2, 3, 5, 0, 6, 4, 7, 8], DEFAULT_GOAL, 6],
    assignment: [[2, 8, 3, 1, 6, 4, 7, 0, 5], [1, 2, 3, 8, 0, 4, 7, 6, 5], 7],
  };
  const preset = presets[$("preset").value];
  if (!preset) return;
  $("initial-input").value = formatBoard(preset[0]);
  $("goal-input").value = formatBoard(preset[1]);
  $("depth-limit").value = preset[2];
  reset({ inputChanged: true });
});
$("random").addEventListener("click", () => {
  try {
    const goal = parseBoard($("goal-input").value);
    $("initial-input").value = formatBoard(randomBoard(goal, 8));
    $("preset").value = "custom";
    $("depth-limit").value = 10;
    reset({ inputChanged: true });
  } catch (error) {
    setError(error.message);
  }
});
$("play-solution").addEventListener("click", () => {
  stopTimers();
  showSolution(0);
  function tick() {
    if (
      !session?.result ||
      session.solutionIndex >= session.result.path.length - 1
    )
      return;
    showSolution(session.solutionIndex + 1);
    solutionTimer = setTimeout(tick, Math.max(160, Number($("speed").value)));
  }
  solutionTimer = setTimeout(tick, Math.max(160, Number($("speed").value)));
});
$("solution-prev").addEventListener("click", () => {
  clearTimeout(solutionTimer);
  showSolution(session.solutionIndex - 1);
});
$("solution-next").addEventListener("click", () => {
  clearTimeout(solutionTimer);
  showSolution(session.solutionIndex + 1);
});
$("export").addEventListener("click", exportRun);
$("compare-run").addEventListener("click", compare);
$("comparison-limits").addEventListener("input", clearComparison);
window.addEventListener("hashchange", navigate);
reset({ inputChanged: true });
navigate();
