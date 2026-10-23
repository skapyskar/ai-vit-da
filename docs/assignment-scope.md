# Assignment scope

Student: **Aayush Dwivedi, 24BCT0058**. Course: Artificial Intelligence.

The source assignment's allocation table (page 10) assigns 24BCT0058 algorithm number **3**. The numbered list on page 1 identifies number 3 as **Depth Limited Search (DLS)**. Page 1 explicitly requires implementing only the allocated algorithm; the user repeats that restriction.

Consequently, this project implements DLS only. The generic multi-algorithm selector, heuristic controls, and six-algorithm benchmark are adapted into a fixed DLS selector, a depth-limit input, and independently measured comparisons of DLS at different user-selected limits on the same puzzle. There are no fabricated results for unimplemented algorithms. DLS is uninformed and does not use a heuristic.

## Acceptance criteria

- Static HTML5, CSS3, ES modules, and locally hosted Bootstrap; GitHub Pages compatible.
- Home and student details, manual initial and goal entry, parity validation, random solvable generation relative to the chosen goal.
- Incremental DLS, goal test before depth cutoff, active-path cycle prevention, deterministic Up/Right/Down/Left order, explicit cutoff and resource-limit outcomes.
- Initial/goal/current/parent/successor boards, frontier and expanded history, depth and unit path cost.
- Run, pause/resume, previous/next search event, reset, animation speed, and a separately playable solution path.
- Measured moves, generated/expanded visits, maximum depth, computation time, and clearly labeled memory estimate.
- DLS explanation, pseudocode, complexity, completeness, optimality and limitations.
- Comparison, export, README screenshots, tests, Pages deployment instructions, and demonstration/submission material.

## Measurement definitions

Generated counts the root plus eligible successor visits admitted to the DFS frontier, including repeat states reached by different paths. Expanded counts visits whose successors are generated; goals and cutoff nodes are not expanded. The expanded-history list is observational, never a global pruning set (which could make DLS miss a shallower revisit). Maximum depth is the deepest visited node. Elapsed time measures search computation, excluding animation and user pauses. The memory estimate is a rough logical search-storage estimate, not the browser heap; retained visualization snapshots are reported separately.

Safeguards: limits 0–31, 50,000 visited nodes per run, and 2,000 retained search snapshots. Reaching a resource safeguard does not establish that a puzzle has no solution. Random generation is a legal walk from the selected goal, not a promised optimal difficulty.
