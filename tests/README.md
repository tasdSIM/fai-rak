# Browser tests

Each script drives headless Microsoft Edge over the DevTools protocol, clicks through the app and
prints what it saw, ending with `errors: none` when nothing threw. Screenshots go to the folder given
as the first argument.

Run from the project root, with the site served locally:

```
python -m http.server 8765 --bind 127.0.0.1          # serves the site
PORT=8799 node relay/relay.js                         # only for two-device tests
node tests/cdp-room.mjs <shots-folder> http://127.0.0.1:8765/index.html
```

| Script | Checks |
|---|---|
| `cdp-test.mjs` | bonus games walkthrough |
| `cdp-test2.mjs` | music bar and hot massage |
| `cdp-wide.mjs` | layout at phone, iPad and desktop sizes |
| `cdp-room.mjs` | two-device card game |
| `cdp-deck.mjs`, `cdp-deck4.mjs` | deck modes, no repeated cards |
| `cdp-case2.mjs` | all 20 cases, one and two devices |
| `cdp-x.mjs`, `cdp-tap.mjs` | strong-word mode and its secret tap |
| `cdp-act.mjs` | cards that need the app to act |
| `cdp-sp.mjs`, `cdp-sp2.mjs` | special cards |
| `cdp-en.mjs`, `cdp-lang.mjs` | English on cards, bonus-game language switch |
| `cdp-lang2.mjs` | EN / ไทย button in the card game: chosen language big, the other small |
| `cdp-how.mjs` | how-to-play page before the game: skip, don't show again, open from setup |
| `cdp-lang3.mjs` | EN / ไทย on the age gate (Thai or Western birth year), setup and after-game |
| `cdp-room-en.mjs` | two-phone room in English on one phone and Thai on the other |

The other scripts set `frm-howskip` so Start goes straight to the game.

`cdp-head.mjs` and the `*-body.mjs` files are the pieces the full scripts were built from.
Tests that force a card use `window.__T`, which the page only exposes on 127.0.0.1.
Each script uses fixed DevTools ports; if one is busy, change the port numbers near the top.
