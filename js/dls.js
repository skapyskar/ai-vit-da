import { keyOf, successors, isSolvable, validateBoard } from "./puzzle.js";

/**
 * Incremental depth-limited DFS, implemented from scratch.
 * Only ancestors are excluded: a global visited set would incorrectly prune a
 * state encountered later with more remaining depth. Frontier order is explicit.
 * No heuristic, breadth-first search, or iterative deepening is used.
 */
export function createSearch(
  initial,
  goal,
  limit,
  { maxVisits = 50_000 } = {},
) {
  validateBoard(initial);
  validateBoard(goal);
  if (!Number.isInteger(limit) || limit < 0 || limit > 31)
    throw new Error("Depth limit must be an integer from 0 to 31.");
  if (!Number.isInteger(maxVisits) || maxVisits < 1)
    throw new Error("Visit budget must be a positive integer.");
  const root = { board: [...initial], move: "Start", depth: 0 };
  const targetKey = keyOf(goal);
  const frontier = [root];
  const path = [];
  const ancestors = new Set();
  const closed = [];
  const stats = {
    generated: 1,
    expanded: 0,
    visited: 0,
    maxDepth: 0,
    elapsedMs: 0,
    memoryBytes: 0,
    peakFrontier: 1,
  };
  let elapsedMs = 0;

  function memory() {
    // Logical estimate: 9 eight-byte numbers + metadata per node, path keys.
    stats.memoryBytes = Math.max(
      stats.memoryBytes,
      (frontier.length + path.length + closed.length) * 128 +
        ancestors.size * 32,
    );
    stats.peakFrontier = Math.max(stats.peakFrontier, frontier.length);
  }
  function snapshot(node, kind, children = []) {
    memory();
    return {
      board: node.board,
      move: node.move,
      depth: node.depth,
      kind,
      parent: path.length > 1 ? path[path.length - 2].board : null,
      path: [...path],
      successors: children,
      frontier: frontier.slice(-8).reverse(),
      frontierSize: frontier.length,
      closed: [...closed].reverse(),
      stats: { ...stats },
    };
  }
  function* visit(node) {
    frontier.pop();
    path.push(node);
    ancestors.add(keyOf(node.board));
    stats.visited++;
    stats.maxDepth = Math.max(stats.maxDepth, node.depth);
    if (keyOf(node.board) === targetKey) {
      yield snapshot(node, "goal");
      return { status: "solved", path: [...path] };
    }
    if (node.depth === limit) {
      yield snapshot(node, "cutoff");
      path.pop();
      ancestors.delete(keyOf(node.board));
      return { status: "cutoff", path: [] };
    }
    const children = successors(node.board)
      .filter((n) => !ancestors.has(keyOf(n.board)))
      .map((n) => ({ ...n, depth: node.depth + 1 }));
    stats.expanded++;
    stats.generated += children.length;
    frontier.push(...[...children].reverse());
    closed.push({ board: node.board, depth: node.depth });
    if (closed.length > 8) closed.shift();
    yield snapshot(node, "expand", children);
    let cutoff = false;
    for (const child of children) {
      if (stats.visited >= maxVisits)
        return { status: "resource-limit", path: [] };
      const outcome = yield* visit(child);
      if (outcome.status === "solved" || outcome.status === "resource-limit")
        return outcome;
      cutoff ||= outcome.status === "cutoff";
    }
    path.pop();
    ancestors.delete(keyOf(node.board));
    return { status: cutoff ? "cutoff" : "failure", path: [] };
  }
  function* execute() {
    if (!isSolvable(initial, goal)) {
      stats.generated = 0;
      return { status: "unsolvable", path: [] };
    }
    return yield* visit(root);
  }
  const iterator = execute();
  let terminal;
  return {
    next() {
      if (terminal) return terminal;
      const start = performance.now();
      const step = iterator.next();
      elapsedMs += performance.now() - start;
      stats.elapsedMs = elapsedMs;
      step.value.stats = { ...stats };
      if (step.done) terminal = step;
      return step;
    },
  };
}
