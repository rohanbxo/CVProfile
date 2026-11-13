# CVProfile

A long time ago in a galaxy far, far away... a CV learned to scroll like an opening crawl.

CVProfile is the personal site of Rohan Burugapalli, AI & Backend Engineer. It is a plain static page: experience, projects, skills and education scroll through a 3D folded panel over a starfield, in Star Wars yellow.

## Features
- 3D "folded scroll": the content runs through tilted top, centre and bottom panels
- Space-rocket cursor (with a boosted flame over links and buttons) and an exhaust trail
- Canvas starfield with slow twinkle and scroll parallax
- Rocket launch loader, scroll progress rail, always-visible CV link
- Click the email icon to copy the address (falls back to your mail app)
- Respects `prefers-reduced-motion`; touch devices get the normal cursor and no trail
- No frameworks, no build step

## Files
- `index.html`: page structure and CV content
- `style.css`: theme, 3D folds, cursor, layout
- `main.js`: fold mirroring and scroll, starfield, exhaust trail, email copy, music toggle
- `assets/`: rocket cursors (SVG + 32×32 PNG fallbacks) and favicon
- `BurugapalliRohan.pdf`: the full CV

## Run locally
```sh
python3 -m http.server
```
Then open http://localhost:8000.

To enable the optional background-music button, add a `test.mp3` to the project root. Without it the button stays hidden.

May the Force be with you.
