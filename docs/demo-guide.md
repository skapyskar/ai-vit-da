# Demonstration

Aayush Dwivedi | 24BCT0058

Caption text and timings: [TXT](demo-captions.txt) | [SRT](demo-captions.srt).

The video contains a screen recording with captions. It covers:

1. Initial and goal states, blank notation and depth limit.
2. A DLS expansion: parent, successors, open stack and closed list.
3. The two-move solution and its statistics.
4. A cutoff at depth 1.
5. Comparisons at limits 0, 2, 4 and 8.
6. DLS procedure, complexity and limitations.

For a live demonstration, use the default initial state 123 / 406 / 758
and goal 123 / 456 / 780.

| Limit | Result | Generated | Expanded | Moves |
|---|---|---|---|---|
| 0 | Cutoff | 1 | 0 | — |
| 1 | Cutoff | 5 | 1 | — |
| 2 | Solved | 11 | 4 | 2 |

At limit 2, the blank moves Down and then Right.
Search time varies between runs.

DLS uses no heuristic. Its worst-case time is O(b^ℓ), and its search storage is O(bℓ).
It can find a solution within the limit if allowed to finish, but it is not optimal.
Saved visualization steps use additional storage.
