import { keyOf, parseBoard, randomBoard, isSolvable } from "./puzzle.js";
import { createSearch } from "./dls.js";

const $ = (id) => document.getElementById(id);
const HISTORY_LIMIT = 2000;
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
function drawBoard(board) {
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
    drawBoard(initial);
    $("initial-preview").replaceChildren(...miniBoard(initial).children);
    $("initial-preview").setAttribute(
      "aria-label",
      `Initial state: ${boardLabel(initial)}`,
    );
    $("stage-goal").replaceChildren(...miniBoard(goal).children);
    $("stage-goal").setAttribute(
      "aria-label",
      `Goal state: ${boardLabel(goal)}`,
    );
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
  $("pause").textContent = playing ? "Pause" : "Resume";
}
function clearComparison() {
  compareVersion++;
  comparing = false;
  $("compare-run").disabled = false;
  $("comparison-status").textContent = "";
  const row = element("tr");
  const cell = element("td", "empty-note", "No results.");
  cell.colSpan = 8;
  row.append(cell);
  $("comparison-body").replaceChildren(row);
  try {
    $("comparison-instance").textContent =
      `Initial ${keyOf(parseBoard($("initial-input").value))} → Goal ${keyOf(parseBoard($("goal-input").value))} · 0 = blank`;
  } catch {
    $("comparison-instance").textContent =
      "Enter valid initial and goal states on the Solver page.";
  }
}
function reset({ inputChanged = false } = {}) {
  stopTimers();
  session = null;
  setError();
  $("run-state").textContent = "Ready";
  $("run-state").removeAttribute("data-status");
  $("event-kind").textContent = "Not started";
  $("event-description").textContent = "Press Run or Next to start.";
  $("current-depth").textContent = "0";
  $("board-caption").textContent = "Initial state";
  $("step-counter").textContent = "Step 0";
  $("history-note").textContent = "";
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
    ["parent-board", "No parent."],
    ["successor-list", "None."],
    ["frontier-list", "Empty."],
    ["closed-list", "Empty."],
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
  drawBoard(frame.board);
  $("event-kind").textContent = {
    expand: "Expanding node",
    cutoff: "Depth limit reached",
    goal: "Goal reached",
  }[frame.kind];
  $("event-description").textContent = {
    expand: "Generating successors.",
    cutoff: "Backtracking. This node will not be expanded.",
    goal: "Solution path shown below.",
  }[frame.kind];
  $("current-depth").textContent = frame.depth;
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
      : element("p", "empty-note", "No parent."),
  );
  $("successor-count").textContent = frame.successors.length;
  $("successor-list").replaceChildren();
  for (const node of frame.successors) {
    const item = element("div", "successor-item");
    item.append(miniBoard(node.board), element("span", "", node.move));
    $("successor-list").append(item);
  }
  if (!frame.successors.length)
    $("successor-list").append(element("p", "empty-note", "None generated."));
  $("frontier-count").textContent = frame.frontierSize;
  $("closed-count").textContent = frame.stats.expanded;
  renderList("frontier-list", frame.frontier, "Empty.");
  renderList("closed-list", frame.closed, "Empty.");
  $("history-note").textContent = session.dropped
    ? `Showing the latest ${session.history.length} steps. ${session.dropped} earlier steps discarded.`
    : "";
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
  drawBoard(node.board);
  $("board-caption").textContent =
    `Solution · ${node.move === "Start" ? "Initial state" : `blank ${node.move.toLowerCase()}`}`;
  $("solution-position").textContent =
    `Move ${session.solutionIndex} of ${path.length - 1}`;
  $("current-depth").textContent = session.solutionIndex;
  $("stat-cost").textContent = session.solutionIndex;
  $("event-kind").textContent = "Solution playback";
  $("event-description").textContent = "Showing the solution moves.";
  $("solution-prev").disabled = session.solutionIndex === 0;
  $("solution-next").disabled = session.solutionIndex === path.length - 1;
  [...$("solution-path").children].forEach((button, i) =>
    button.classList.toggle("active", i === session.solutionIndex),
  );
}
function showResult() {
  const { status, path, stats } = session.result;
  $("result").hidden = false;
  $("result").dataset.status = status;
  $("run-state").dataset.status = status;
  $("result-title").textContent = labels[status];
  $("result-description").textContent = {
    solved: `${path.length - 1} moves. Path cost: ${path.length - 1}.`,
    cutoff: `No solution within depth ${session.limit}. Try a higher limit.`,
    failure: "Search finished without finding a solution.",
    unsolvable: "The initial and goal states have different inversion parity.",
    "resource-limit":
      "Stopped after 50,000 visits. Try a smaller limit. This does not prove the puzzle is unsolvable.",
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
  $("comparison-status").textContent = "Comparison complete.";
}
function navigate() {
  const route = location.hash.slice(1);
  const page = ["lab", "compare", "algorithm"].includes(route) ? route : "lab";
  document.querySelectorAll(".page").forEach((node) => {
    node.hidden = node.id !== `page-${page}`;
  });
  document.querySelectorAll("[data-route]").forEach((link) => {
    if (link.dataset.route === page) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (page !== "lab" && session?.playing) pauseSearch();
  document.title = `${{ lab: "Solver", compare: "Comparison", algorithm: "DLS Algorithm" }[page]} - 8-Puzzle Solver`;
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
    reset({ inputChanged: true });
  });
$("random").addEventListener("click", () => {
  try {
    const goal = parseBoard($("goal-input").value);
    $("initial-input").value = formatBoard(randomBoard(goal, 8));
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
$("compare-run").addEventListener("click", compare);
$("comparison-limits").addEventListener("input", clearComparison);
window.addEventListener("hashchange", navigate);
reset({ inputChanged: true });
navigate();
