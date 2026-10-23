/** Eight-puzzle state utilities. 0 denotes the blank; each move costs one. */
export const DEFAULT_GOAL = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 0]);
export const keyOf = (board) => board.join("");

export function parseBoard(value) {
  const text = String(value)
    .replace(/_/g, "0")
    .replace(/[\s,|]/g, "");
  if (!/^[0-8]{9}$/.test(text) || new Set(text).size !== 9) {
    throw new Error(
      "Use each tile 0–8 exactly once. Use 0 or _ for the blank.",
    );
  }
  return [...text].map(Number);
}

export function validateBoard(board) {
  if (
    !Array.isArray(board) ||
    board.length !== 9 ||
    board.some((n) => !Number.isInteger(n))
  ) {
    throw new Error("Use each tile 0–8 exactly once.");
  }
  parseBoard(board.join(""));
}

export function successors(board) {
  const blank = board.indexOf(0);
  const row = Math.floor(blank / 3);
  const col = blank % 3;
  return [
    ["Up", row > 0, -3],
    ["Right", col < 2, 1],
    ["Down", row < 2, 3],
    ["Left", col > 0, -1],
  ]
    .filter(([, legal]) => legal)
    .map(([move, , offset]) => {
      const next = [...board];
      [next[blank], next[blank + offset]] = [next[blank + offset], next[blank]];
      return { board: next, move };
    });
}

function parity(board) {
  const tiles = board.filter(Boolean);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++)
      if (tiles[i] > tiles[j]) inversions++;
  }
  return inversions % 2;
}

/** On an odd-width board, start and goal must have equal inversion parity. */
export function isSolvable(initial, goal) {
  return parity(initial) === parity(goal);
}

export function randomBoard(goal, steps = 12, random = Math.random) {
  validateBoard(goal);
  let current = [...goal];
  let previous = "";
  for (let i = 0; i < steps; i++) {
    const options = successors(current).filter(
      (n) => keyOf(n.board) !== previous,
    );
    previous = keyOf(current);
    current = options[Math.floor(random() * options.length)].board;
  }
  // A walk can return to the goal. Always offer a puzzle that needs a move.
  if (keyOf(current) === keyOf(goal)) current = successors(current)[0].board;
  return current;
}
