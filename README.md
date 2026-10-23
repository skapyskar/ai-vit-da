# 8-Puzzle Solver

Artificial Intelligence digital assignment.

Aayush Dwivedi | 24BCT0058

- [Website](https://skapyskar.github.io/ai-vit-da/)
- [Repository](https://github.com/skapyskar/ai-vit-da)
- [Submission PDF](docs/24BCT0058-submission.pdf)
- [Demonstration video](docs/24BCT0058-dls-demo.mp4)

## Assignment

24BCT0058 is assigned algorithm 3, Depth Limited Search (DLS).
The solver searches for the goal within the entered depth limit.
It uses no heuristic.

The comparison page runs DLS at different limits on the same puzzle.
Other algorithms are not implemented because the assignment restricts each student to one algorithm.

## Run

From the project directory:

    python3 -m http.server 8080 --bind 127.0.0.1

Open http://127.0.0.1:8080.

## Usage

Enter the initial and goal states using each digit from 0 to 8 once.
Use 0 or _ for the blank, or generate a random solvable puzzle.
Set the depth limit and press Run.

Pause or resume the search, step backward or forward, or reset it.
The page shows the current state, parent, successors, frontier, expanded visits and statistics.
After a solution is found, use Play solution or select a board in the solution path.

For the default puzzle, limit 1 returns a cutoff. Limit 2 finds Down, then Right.
A cutoff does not mean the puzzle is unsolvable. DLS does not guarantee the shortest path.

## Implementation

HTML5, CSS3, JavaScript and Bootstrap 5.3.8.

- js/puzzle.js: board input, moves, solvability and random generation.
- js/dls.js: depth-limited search.
- js/app.js: page controls and display.
- css/styles.css: layout and colours.

Moves are tried in the order Up, Right, Down, Left.
States already on the active path are skipped.
Generated and expanded counts refer to visits, so the same board may be counted on different paths.
Time excludes playback. Memory is an approximate search-storage value.

Limits are 0–31. Each run stops after 50,000 visits.
The page keeps the latest 2,000 search steps and displays up to 8 entries per list.

## Screenshots

![Solver](images/visualizer-desktop.png)

[Solution](images/solution.png) | [Comparison](images/comparison.png) | [Mobile layout](images/visualizer-mobile.png)

## Tests and deployment

    npm ci --ignore-scripts
    npx playwright install --with-deps chromium
    npm test
    npm run test:coverage
    npm run test:e2e
    npm run check
    npm run format:check
    npm run build

Node.js 22+ is required for these checks. Python 3 serves the test site.
An existing Chromium executable can be selected with PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.

The GitHub Actions workflow checks pushes to main and deploys the files in _site to GitHub Pages.
In repository Settings > Pages, the source is GitHub Actions.

## References

- [Question paper](Artificial%20Intelligence%20QP%201.pdf)
- Russell and Norvig, [Artificial Intelligence: A Modern Approach](https://aima.cs.berkeley.edu/)
- [Bootstrap documentation](https://getbootstrap.com/docs/5.3/); MIT licence retained in the stylesheet.
- [MDN JavaScript generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)

Development assistance: OpenAI Codex.
