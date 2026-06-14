# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Updates to test git push

## Local development

Run the backend API in one terminal:

```sh
npm run dev:server
```

Run the Vite frontend in another terminal:

```sh
npm run dev
```

The frontend proxies `/api` requests to `http://localhost:8787`.

The analyzer accepts a commander name and a pasted decklist. Lists are parsed
locally, resolved through Scryfall, and checked against Commander Spellbook for
complete and near-miss combos.

Synergy analysis is a transparent local heuristic. It scans commander and card
rules text for mechanical themes such as artifacts, tokens, counters, graveyard,
spellslinger, lifegain, sacrifice, landfall, enchantments, equipment, and card
draw, then reports the strongest theme clusters and support concerns.

Deck profile identifiers score consistency, efficiency, interaction, win
conditions, curve, speed, and ramp. The profile also reports fingerprints such
as control, lock/stax, reanimator, fast mana, tutored, graveyard, combo, tokens,
and combat.

Bracket analysis separates two reads:

- Strict baseline bracket: an app-level minimum bracket based on hard restriction
  signals. Bracket 1 allows no Game Changers, mass land denial, extra turns, or
  two-card combos. Bracket 2 allows no Game Changers, mass land denial, chained
  extra turns, or two-card combos. Bracket 3 allows 0-3 Game Changers, no mass
  land denial, no chained extra turns, and no two-card combos before turn 6.
  Bracket 4 has no strict restrictions; Bracket 5 is treated as metagame only.
- Realistic bracket: starts from Commander Spellbook's bracket estimate, then
  adjusts for how quickly complete combos can actually be played, combo density,
  exceptional card synergy backed by ramp/draw efficiency, and consistency
  signals from ramp, draw, and mana value.

For a production-style run, build the frontend and start the Node server:

```sh
npm run build
npm start
```
