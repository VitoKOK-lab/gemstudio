# 泰熙爾札娜 珠寶切磨工坊

Three.js gem-faceting game. Every push to `main` is tested, built and deployed to GitHub Pages; a failing test stops the deploy.

- Play: https://vitokok-lab.github.io/gemstudio/
- Setup: `npm install`
- Run locally: `npm run dev`, then open http://127.0.0.1:8765/ (serves `src/` with caching off, so a reload always shows the latest code)
- Tests: `npm test` (geometry, plans, grading, blueprint rewards and drawings) and `npm run test:e2e` (opens the game in headless Chromium). `FULL=1 npm run test:e2e` also plays level 1 to the end (about 4 minutes).
- Build: `npm run build` writes `dist/` with content-hashed `app-*.js` / `style-*.css`, so phones never mix old and new files. `npm run preview` serves it.

## Layout

- `src/app.js`: the bench, camera, lever, guide and level flow. `animate()` is the only game loop; watchers register with `everyFrame(fn, ms)`.
- `src/game.js`, `plans.js`, `geometry.js`, `contact.js`, `lever.js`, `learning.js`: pure game rules and geometry (unit-tested).
- `src/rewards.js` + `blueprint-ui.js` + `blueprints.js`: royal blueprint rules, screens and the kraft-paper drawing.
- `src/apprentice.js` (two of them: dial hand and pusher), `walkgrid.js` + `bench-scan.js` (floor plan and A* routes so they never walk through the machine), `confetti.js`: the helpers, their routes and the clear-level celebration.
- `src/scenery.js`: one theme per level (wall and light colours, furniture, food, wandering animals; Kenney CC0 models in `src/models/kenney/props` and `pets`).
- `src/chip-card.js`, `impact-fx.js`, `royal-machine.js`, `workshop.js`, `wall-cd.js`, `operator.js`: self-contained scene and feedback pieces.
- `blender/`: scripts that build the workshop models, studio HDRI and level thumbnails.
- Music credits: `src/music/CREDITS.txt`. Kenney models (CC0): `src/models/kenney/`.
