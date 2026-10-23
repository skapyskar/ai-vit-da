import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createSearch } = await import('../js/dls.js').catch(() => ({}));
const goal = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const near = [1, 2, 3, 4, 5, 6, 7, 0, 8];
function run(initial, target, limit, options) {
  const search = createSearch(initial, target, limit, options);
  const events = [];
  let step;
  do { step = search.next(); if (!step.done) events.push(step.value); } while (!step.done);
  return { result: step.value, events };
}
test('goal at depth zero succeeds before checking the bound', () => {
  const { result } = run(goal, goal, 0);
  assert.equal(result.status, 'solved');
  assert.equal(result.path.length, 1);
  assert.equal(result.stats.expanded, 0);
});
test('zero limit returns cutoff and does not expand the root', () => {
  const { result, events } = run(near, goal, 0);
  assert.equal(result.status, 'cutoff');
  assert.equal(result.stats.generated, 1);
  assert.equal(result.stats.expanded, 0);
  assert.equal(events[0].kind, 'cutoff');
});
test('finds a goal exactly at the depth limit with a legal solution path', () => {
  const { result, events } = run(near, goal, 1);
  assert.equal(result.status, 'solved');
  assert.deepEqual(result.path.map(n => n.board), [near, goal]);
  assert.equal(result.path[1].move, 'Right');
  assert.ok(events.every(e => e.depth <= 1));
  assert.ok(result.stats.elapsedMs >= 0);
  assert.ok(result.stats.memoryBytes > 0);
});
test('rejects unreachable parity without exploring', () => {
  const { result } = run([2, 1, 3, 4, 5, 6, 7, 8, 0], goal, 12);
  assert.equal(result.status, 'unsolvable');
  assert.equal(result.stats.generated, 0);
});
test('validates limits, boards, and resource caps', () => {
  for (const limit of [-1, 1.5, 32, NaN]) assert.throws(() => createSearch(near, goal, limit));
  assert.throws(() => createSearch([1], goal, 2));
  assert.throws(() => createSearch(near, goal, 3, { maxVisits: 0 }));
});
test('node budget returns an honest resource outcome', () => {
  const { result } = run(near, goal, 10, { maxVisits: 1 });
  assert.equal(result.status, 'resource-limit');
  assert.equal(result.stats.visited, 1);
});
test('snapshots stay immutable and report parent, stack, and successors', () => {
  const { events } = run(near, goal, 3);
  assert.equal(events[0].parent, null);
  assert.equal(events[0].successors.length, 3);
  const old = JSON.stringify(events[0]);
  run(near, goal, 6);
  assert.equal(JSON.stringify(events[0]), old);
  assert.ok(events.some(e => e.parent && e.frontier.length));
});
test('cycle prevention applies to the current path, preserving deeper search correctness', () => {
  const { result, events } = run([1, 2, 3, 4, 0, 6, 7, 5, 8], goal, 4);
  assert.equal(result.status, 'solved');
  for (const event of events) {
    const keys = event.path.map(n => n.board.join(''));
    assert.equal(new Set(keys).size, keys.length);
  }
});
