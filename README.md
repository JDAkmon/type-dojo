# Type Dojo

A friendly, offline-first Pokémon type trainer. Start with no knowledge and build toward confident single- and dual-type decisions. No account, API keys, package installation, or paid services required.

## Run locally

Install Node.js 20 or newer, then open a terminal in this repository:

```sh
npm start
```

Open **http://127.0.0.1:4173**. Keep the terminal running while using the app. Stop it with Ctrl+C. To use another port, set the `PORT` environment variable. The server listens only on your computer.

```sh
npm test
```

The app has no dependencies and makes no external requests. Everything works without an internet connection once served locally. Do not open `index.html` directly; JavaScript modules need the local server.

## Learn from zero to hero

- **Ground Zero:** six guided chapters, from the Fire/Water/Grass triangle to dual-type multiplication. Read first, practice second. A lesson completes at 75% correct without hints. The later-types chapter is unavailable in Generation I.
- **Practice arena:** attack matchups, incoming damage, immunities, dual types, adaptive review, and a 20-question challenge without hints. Number keys answer; Enter advances after feedback when focus is outside a button.
- **Type library:** browse all available types, see offensive and defensive matchups separately, and use story-based mnemonics.
- **Matchup chart:** complete interactive chart plus a dual-type calculator. Rows attack; columns defend.
- **My progress:** XP, accuracy, mastery, explored cells, training days, and personal review queue. Export/import JSON backups, or reset one era.

## Chart eras

| Rules | Available types | Significant differences |
| --- | --- | --- |
| Generation I | 15 | Bug → Poison and Poison → Bug are 2×; Ghost → Psychic is 0×; Ice → Fire is 1×. |
| Generations II–V | 17 | Dark and Steel added. Bug → Poison becomes ½×; Poison → Bug becomes 1×; Ghost → Psychic becomes 2×; Ice → Fire becomes ½×. Steel resists Ghost and Dark. |
| Generation VI onward | 18 standard types | Fairy added. Ghost and Dark attacks become neutral against Steel. |

Remakes follow the generation in which the remake was released. For example, FireRed uses the II–V chart; Brilliant Diamond uses the VI+ chart. This tool teaches base main-series type effectiveness, not Pokémon GO or the card game. It excludes damage stats, STAB, abilities, special move overrides, weather, transformations, and Generation IX's special Stellar Terastallization rules. Dual-type answers multiply the two chart values; any zero makes the result zero. Mnemonics are imaginative memory cues, not real-world science.

## Progress model

Progress is stored in this browser's local storage under `type-dojo-v1`. Each chart era has its own lessons, XP, and matchup records. Use a consistent origin (host and port) to keep using the same save. Clearing browser data removes local progress; export a backup first.

Three consecutive correct, unaided answers mark a matchup mastered. Misses and hints reset the unaided streak. Review intervals are 1 minute, 10 minutes, 1 day, 3 days, and then 7 days. New, missed, and overdue cells receive extra weight; sessions sample all available result categories and do not repeat a question within a session. Immunity mode deliberately only contains 0× answers.

Mastery counts every single-type cell, including neutral cells: 225, 289, or 324 depending on the era. Dual-type answers earn XP and count toward overall accuracy, but do not inflate single-type mastery. This is a practical self-study measure, not a guarantee of long-term retention. Correct unaided answers earn 10 XP, hinted correct answers 4, and mistakes 2. Ground Zero completion counts unaided correct answers, while overall accuracy includes correct answers with hints.

## Project structure

```text
index.html          Accessible app shell
server.js           Local static server (Node built-ins only)
src/data.js         Chart rules, generation overrides, mnemonics, lessons
src/progress.js     Adaptive sessions, mastery, save validation
src/app.js          UI and interaction flows
src/styles.css      Responsive interface and reduced-motion support
tests/chart.test.js Historical chart fixtures and learning-system checks
```

## Sources

- [Official Pokémon type chart](https://sg.portal-pokemon.com/game/type-chart/)
- [Red/Blue original matchup data, pret/pokered](https://github.com/pret/pokered/blob/master/data/types/type_matchups.asm)
- [Crystal original matchup data, pret/pokecrystal](https://github.com/pret/pokecrystal/blob/master/data/types/type_matchups.asm)
- [Generation change reference](https://bulbapedia.bulbagarden.net/wiki/Type/Type_chart)

Historical tests compare every cell with independent fixtures from the original game tables. Modern tests verify unchanged cells and every Fairy matchup, as well as dual-type stacking, unavailable types, mastery and review scheduling, generation isolation, and backup validation.

## GitHub

This folder is a standalone local Git repository on `main`, ready to connect to a GitHub repository. No remote or online repository is created automatically. After creating an empty repository on your GitHub account:

```sh
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

This is an unofficial fan learning tool. Pokémon and associated names are trademarks of their respective owners. The interface artwork is created for this project; no official character artwork is bundled.
