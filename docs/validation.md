# Validation evidence

Validated on 23 October 2026.

## Automated checks

- `npm test`: **13 passed, 0 failed**.
- `npm run test:coverage`: search/puzzle modules **100% lines, 100% functions, 94.83% branches**, above the enforced 80% thresholds. This is core-module coverage, not a whole-UI coverage claim.
- `npm run check`: JavaScript syntax checks passed.
- Playwright: **5 browser journeys passed** using installed Chromium 151.0.7922.34 (revision 1234) with Playwright 1.58.2 via the executable-path override. CI uses the Google Chrome preinstalled on GitHub's Ubuntu runner, prints its version, and runs the same browser suite.
- Automated axe checks on all four application views: no violations of the tested WCAG A/AA rules. This is not a complete accessibility certification.
- No document-level horizontal overflow at **375, 768 and 1440 px** in the responsive browser journey.
- Desktop/mobile, solution, and comparison screenshots were generated from actual browser interactions. This is an initial visual baseline; no prior baseline existed for regression comparison.

## RED → GREEN evidence

1. Core journeys derived from the assignment scope: parse states, validate tile uniqueness, preserve arbitrary-goal parity, generate legal moves, handle zero-depth and exact-bound goals, enforce resource budgets, and maintain acyclic solution paths.
2. Before implementation, `node --test --test-isolation=none tests/puzzle.test.js tests/dls.test.js` reported **12 failing and 1 passing**. Failures named missing `createSearch`, `parseBoard`, `successors`, `isSolvable` and `randomBoard` behaviors. The validation-only assertion was not independent evidence while functions were missing.
3. After implementation, the same target reported **13 passing**. Checkpoint commits: `e29c8d3` (RED), `d333d3c` (GREEN).
4. Browser-test setup initially lacked its matching Chromium and later had overly broad label selectors. These setup failures are **not** counted as application RED evidence.
5. A real browser regression then reproduced completed-history replay leaving status “Searching” instead of “Solved.” The new test failed with that exact mismatch. Checkpoint `f861b37` records the reproducer.
6. The replay terminal-state fix and darker muted text resolved the replay regression and an axe-detected **4.43:1** comparison-header contrast failure. Browser suite then passed **5/5**, recorded in `da41170`.

## Guarantees checked

| Guarantee | Evidence |
|---|---|
| Root goal succeeds even at limit zero | Unit test |
| Non-goal at limit zero cuts off without expansion | Unit test |
| A goal exactly at the bound is reachable | Unit test |
| Illegal states and invalid limits are rejected | Unit and browser tests |
| Arbitrary goal parity is respected | Unit and browser tests |
| Random walks preserve solvability | Unit tests |
| Resource outcome does not claim failure or unsolvability | Unit test |
| Snapshot history does not change during later search | Unit test |
| Current path contains no ancestor cycle | Unit test |
| Solution playback and history replay work | Browser test |
| Reset cancels scheduled playback | Browser test plus delayed observation |
| Comparisons use a fixed instance and stale rows are cleared | Browser test |

## Limitations

Timing varies by hardware. Memory values are estimates, not heap measurements. Visual history is capped at 2,000 events; older visits are discarded with an explicit notice. Search is capped at 50,000 visits. The 80% coverage gate applies to core search/puzzle modules; browser interactions test the UI separately. No manual screen-reader certification, cross-browser matrix, INP benchmark, or historical screenshot regression claim is made.
