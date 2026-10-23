# Demonstration guide (3–5 minutes)

**Aayush Dwivedi · 24BCT0058**

A generated screen walkthrough is supplied as `24BCT0058-dls-demo.mp4` with disclosed synthetic narration. Review it before submission. This guide also supports recording your own voice.

| Time | Action | Explain |
|---|---|---|
| 0:00–0:30 | Visualizer and About | Course, student details, 8-puzzle state space; algorithm 3 is DLS. |
| 0:30–1:00 | Initial/goal fields and depth bound | Blank = 0, orthogonal moves, custom goals, random solvability. |
| 1:00–1:40 | Run at limit 2, pause and step | Up/Right/Down/Left order, ancestor cycles, parent, successors, stack and history. |
| 1:40–2:15 | Summary and solution replay | Down → Right, two moves, cost 2; generated vs expanded; time and memory. |
| 2:15–2:45 | Reset, limit 1, Instant run | Cutoff is not unsolvable. A swapped numbered pair is rejected by parity. |
| 2:45–3:25 | Compare 0, 2, 4, 8 | Only DLS is assigned; independent bounds change effort, not necessarily path length. |
| 3:25–4:00 | Algorithm and source | O(b^ℓ), O(bℓ), bounded completeness subject to budget, no optimality, no heuristic. |

## Reproducible example

Initial: `123 / 406 / 758`; goal: `123 / 456 / 780`.

- Limit 0: cutoff; generated 1, expanded 0.
- Limit 1: cutoff; generated 5, expanded 1.
- Limit 2: solved; generated 11, expanded 4; Down → Right, cost 2.
- Higher limits may explore more branches. Timings vary by device.

Do not call this A*, BFS, or iterative deepening. DLS uses no heuristic and does not generally find the shortest path.
