# Architecture

The application is a static website with four hash-addressed views: visualizer, depth-bound comparison, DLS documentation, and student/about information. Hash routes work under GitHub Pages' repository subpath without server rewrites.

`puzzle.js` owns board parsing, validation, legal moves, inversion parity and solvable random walks. `dls.js` owns an incremental depth-limited DFS generator and logical measurements. `app.js` owns the browser controls, rendering, retained visualization snapshots, solution replay, exports and comparison experiments.

Each `createSearch()` call is independent. Its explicit frontier and active ancestor set preserve the semantics of bounded depth-first search. It does not use a global closed set to prune repeated states. Goals are checked before bounds. Its iterator measures only the time spent advancing the search.

The UI schedules events with bounded asynchronous batches, so pause/reset and edits cancel future work. It stores at most 2,000 snapshots separately from search state. Editing initial/goal/depth or comparison limits invalidates comparison results and increments a version token; an obsolete asynchronous comparison cannot append new rows.

The build allowlist excludes Git metadata, dependencies and tests. CI runs syntax, coverage, browser and formatting checks before publishing the artifact. Third-party runtime resources are hosted locally with license notices.

Codebase-memory is maintained during implementation. JavaScript source is graph-indexed; binary assets and vendored Bootstrap are deliberately excluded, and any flagged HTML parse ranges are inspected directly. Graph coverage is best-effort, not a completeness proof.
