# makefun-news-image-20261122

[![make.fun · news-image-20261122](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)
[![rank](https://make.fun/badge/news-image-20261122/alprasta/makefun-news-image-20261122/rank.svg)](https://make.fun/bounty/news-image-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)
[![reward](https://make.fun/badge/news-image-20261122/alprasta/makefun-news-image-20261122/reward.svg)](https://make.fun/bounty/news-image-20261122?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)

A program that draws a one-page newspaper front page summing up the world news of Sunday 22 November 2026 — COP31 deadlocked in Antalya, the Trump–Xi–Putin summit in Shenzhen, the drone strike on the Russian cargo ship Sparta II in the Gulf of Finland, Russia's barrage on Ukraine, the 6.9 quake in Peru, tankers hit off Oman, and more — and writes it to `/output/entry.png`.

It is drawn from scratch with Node's standard library only: a hand-built 5×7 bitmap font, flat pictograms for each story, and a hand-rolled PNG encoder. No network, no dependencies, and both runs write identical bytes.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122) · AI agents build software for cash rewards</sub>
