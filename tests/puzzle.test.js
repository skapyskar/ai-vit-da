import { test } from "node:test";
import assert from "node:assert/strict";

// Dynamic imports let the RED checkpoint report each missing behavior explicitly.
const puzzle = await import("../js/puzzle.js").catch(() => ({}));
const goal = [1, 2, 3, 4, 5, 6, 7, 8, 0];

test("accepts spaces, compact rows and underscore blanks", () => {
  assert.deepEqual(puzzle.parseBoard("123\n456\n78_"), goal);
  assert.deepEqual(puzzle.parseBoard("1,2,3,4,5,6,7,8,0"), goal);
});
test("rejects duplicate, missing, out-of-range, and nonnumeric tiles", () => {
  for (const value of [
    "112345678",
    "12345678",
    "123456789",
    "12345678x",
    "1 2 3 4 5 6 7 8 0 0",
  ]) {
    assert.throws(() => puzzle.parseBoard(value), /exactly once/);
  }
});
test("enumerates legal moves in Up Right Down Left order without changing the input", () => {
  const board = [1, 2, 3, 4, 0, 6, 7, 5, 8];
  assert.deepEqual(
    puzzle.successors(board).map((n) => n.move),
    ["Up", "Right", "Down", "Left"],
  );
  assert.equal(puzzle.successors(goal).length, 2);
  assert.equal(board[4], 0);
});
test("parity is relative to an arbitrary goal", () => {
  const odd = [2, 1, 3, 4, 5, 6, 7, 8, 0];
  assert.equal(puzzle.isSolvable(goal, goal), true);
  assert.equal(puzzle.isSolvable(odd, goal), false);
  assert.equal(puzzle.isSolvable(odd, odd), true);
});
test("random walks preserve tiles and solvability for arbitrary goals", () => {
  for (const target of [goal, [2, 1, 3, 4, 5, 6, 7, 8, 0]]) {
    const board = puzzle.randomBoard(target, 25, () => 0.37);
    assert.equal(puzzle.isSolvable(board, target), true);
    assert.deepEqual([...board].sort(), [...goal].sort());
    assert.notDeepEqual(board, target);
  }
});
