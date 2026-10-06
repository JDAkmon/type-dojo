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

- **Ground Zero:** six guided chapters, from the Fire/Water/Grass triangle to dual-type multiplication. Read first, practice second. A lesson completes at 75% correct without hints. The later-types chapter is unavailable in Generation I. Completing every available chapter opens graduation and the Type Hero challenge, with an option to revisit lessons.
- **Practice arena:** attack matchups, incoming damage, immunity detective, dual types, adaptive review, and a 20-question challenge without hints. Immunity detective mixes immune attacks with similar attacks that land. Number keys answer; Enter advances after feedback when focus is outside a button.
- **Personal study plan:** home shows up to three priority types, with reasons drawn from mistakes, hints, and due reviews in the selected era. A six-question session revisits those types, including previously attempted dual-type matchups. New learners get familiar Fire/Water/Grass questions first.
- **Type Hero badge:** get 16 of 20 challenge questions correct without hints (80%) to earn a badge for that era. Best score and attempt history persist across refreshes and backups; a later lower score does not revoke an earned badge. The badge is a challenge milestone, separate from full chart mastery.
- **Type library:** browse all available types, see offensive and defensive matchups separately, and use story-based mnemonics.
- **Matchup chart:** complete interactive chart plus a dual-type calculator. Rows attack; columns defend.
- **My progress:** XP, accuracy, mastery, explored cells, training days, and personal review queue. Export/import JSON backups, or reset one era.

## A Pokémon adventure

The interface features animated Pokémon sprites, an original pixel-art Route 01 meadow, illustrated lesson cards, a battle field, and species spotlights in the type library. Choose Pikachu, Bulbasaur, Charmander, Squirtle, or Eevee as your study buddy; your choice is saved on this device.

Soft, original musical cues accompany starting practice, choosing a buddy, answers, and finishing a session. They start at 25% volume and play only after your interaction. There is no background music, autoplay, or hover audio. Use **Sound on/off** in the header to mute instantly; the adjacent arrow opens **Sound settings**, with a volume slider and a preview. Preferences persist on this device. The browser synthesizes the sounds locally; no audio downloads are required. Cues fade gently, repeated clicks are throttled, and sound stops when the page is hidden.

Use the sun/moon button in the header to pause or resume animations. System reduced-motion preferences automatically use still sprites. Both animated GIFs and still PNGs are bundled locally, so the app still works offline with no third-party image requests.

Defending sprites always match the **complete typing** in the question. When no matching species is bundled, a clearly labeled practice target shows the required type or types. The attacking Pokémon uses a verified move, and the sprites face each other. Type badges, library selectors, and chart headings use Pokémon sprite pictograms. Multiplier cards have distinct hover and keyboard-focus colors. The attacking Pokémon demonstrates the move type; its own typing is not used to calculate the answer. Species availability follows the selected chart era, and historical changes such as Clefairy's Normal-to-Fairy typing and Magnemite's added Steel typing are handled explicitly. Sprite artwork uses a consistent Generation V style across all eras.

Training battles name an actual move and show its source game and learning method. Open that note for the species-specific learnset and move-type sources. The 49 examples are checked against PokéAPI data for the exact species (not its evolution), game, move type, and introduction generation. Games sharing a type chart can have different learnsets: Squirtle uses Bubble Beam via TM in Red/Blue, Water Gun at level 13 in Black 2/White 2, and Bubble Beam at level 27 in Let's Go. These are named game examples, not availability claims for every game in an era.

Generation I Dragon questions explicitly practice the chart without an actual move: the only Dragon move then, Dragon Rage, deals a fixed 40 HP and cannot correctly illustrate the usual damage multipliers. Other training move examples use standard type effectiveness; exercises isolate that multiplier from power, stats, STAB, abilities, and secondary effects.

Sprite credits, original download URLs, and the source repository's notice are preserved in [assets/ATTRIBUTION.md](assets/ATTRIBUTION.md).

## Chart eras

| Rules | Available types | Significant differences |
| --- | --- | --- |
| Generation I | 15 | Bug → Poison and Poison → Bug are 2×; Ghost → Psychic is 0×; Ice → Fire is 1×. |
| Generations II–V | 17 | Dark and Steel added. Bug → Poison becomes ½×; Poison → Bug becomes 1×; Ghost → Psychic becomes 2×; Ice → Fire becomes ½×. Steel resists Ghost and Dark. |
| Generation VI onward | 18 standard types | Fairy added. Ghost and Dark attacks become neutral against Steel. |

Remakes follow the generation in which the remake was released. For example, FireRed uses the II–V chart; Brilliant Diamond uses the VI+ chart. This tool teaches base main-series type effectiveness, not Pokémon GO or the card game. It excludes damage stats, STAB, abilities, special move overrides, weather, transformations, and Generation IX's special Stellar Terastallization rules. Dual-type answers multiply the two chart values; any zero makes the result zero. Mnemonics are imaginative memory cues, not real-world science.

## Restart your journey

“Continue your journey” depends on completed Ground Zero chapters for the selected game era. On **Overview**, choose **Restart journey** below the study-buddy picker:

- **Ground Zero lessons only** clears completed chapters and returns the journey button to **Start from Ground Zero**, retaining practice answers, mastery, reviews, XP, and training days.
- **All progress in this era** clears all of the above for the selected era. The same choice is available through **My progress → Reset this era**.

Both choices preserve the other game eras and your study buddy/settings. **Undo last reset** restores the most recent saved copy, even after refreshing. Undoing a lessons-only restart preserves practice earned since the restart. Undoing a full era reset replaces any new progress in that era with the pre-reset copy; its confirmation explains this. Export a backup from My progress if you want to retain multiple snapshots. Progress changes sync between open tabs of the same origin.

## Progress model

Progress is stored in this browser's local storage under `type-dojo-v1`. Each chart era has its own lessons, XP, and matchup records. Use a consistent origin (host and port) to keep using the same save. Clearing browser data removes local progress; export a backup first.

Three consecutive correct, unaided answers mark a matchup mastered. Misses and hints reset the unaided streak. Review intervals are 1 minute, 10 minutes, 1 day, 3 days, and then 7 days. New, missed, and overdue cells receive extra weight; sessions sample available result categories and do not repeat a question within a session. The standard ten-question immunity session contains five 0× matchups and five nonzero contrasts, in shuffled order, including resistance, neutral, and super-effective results.

Study priorities include types on either side of your attempted matchups, counting a type once per question even if it appears on both sides. Mistakes and hints on unmastered matchups rank ahead of ordinary refreshers. Mastered, up-to-date matchups leave the priority list; due reviews return. The six-question plan covers the displayed priority types and updates as you answer. It does not create unseen dual-type exercises for beginners. With little or no history, the home copy explains that the plan is still developing instead of claiming to know your weaknesses.

Challenge history is saved separately in each era's progress bucket. Existing version-1 backups without challenge history remain compatible and receive an empty challenge record. A full era reset clears its badge and scores; restarting lessons only retains them. Undo restores the corresponding saved progress.

Mastery counts every single-type cell, including neutral cells: 225, 289, or 324 depending on the era. Dual-type answers earn XP and count toward overall accuracy, but do not inflate single-type mastery. This is a practical self-study measure, not a guarantee of long-term retention. Correct unaided answers earn 10 XP, hinted correct answers 4, and mistakes 2. Ground Zero completion counts unaided correct answers, while overall accuracy includes correct answers with hints.

## Project structure

```text
index.html          Accessible app shell
server.js           Local static server (Node built-ins only)
src/data.js         Chart rules, generation overrides, mnemonics, lessons
src/progress.js     Adaptive sessions, mastery, save validation
src/app.js          UI and interaction flows
src/styles.css      Responsive interface and reduced-motion support
src/pokemon-theme.css Pokémon scenery, sprite layout, and battle styling
src/pokemon.js      Species typings, era-aware examples, and sprite selection
src/move-examples.js Verified species-specific move examples for each chart era
src/move-ui.css     Sprite type pictograms, directional battles, and card hover colors
src/sound.js        Gentle synthesized cues, mute, volume, and playback limits
src/sound-journey.css Sound controls and restart journey styling
src/study-plan.css  Personal study cards, graduation, and Type Hero badge styling
assets/            Local sprite images, source credits, and original scenery
tests/chart.test.js Historical chart fixtures and learning-system checks
tests/pokemon.test.js Sprite availability and complete defender-typing checks
tests/moves.test.js Learnset, game-era, and fixed-damage exception checks
tests/reset.test.js Scoped resets, persistent undo, and preservation of other eras
tests/sound.test.js Quiet playback, mute, visibility, and audio failure handling
tests/study.test.js Mixed immunity drills, graduation, study priorities, badges, and save migration
assets/data/move-evidence.json Extracted source evidence for offline verification
```

## Sources

- [PokéAPI species and move data](https://github.com/PokeAPI/api-data), with original source URLs retained in the move examples and extracted evidence. The upstream data license is preserved in `assets/data/SOURCE-LICENSE.txt`.
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

This is an unofficial fan learning tool. Pokémon images, names, and associated trademarks belong to their respective owners. Pokémon sprites are sourced from PokéAPI; the pixel-art scenery and interface decorations were created for this project. See [sprite attribution](assets/ATTRIBUTION.md) for details.
