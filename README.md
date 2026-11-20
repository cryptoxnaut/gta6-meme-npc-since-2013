# gta6-meme-npc-since-2013

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/cryptoxnaut/gta6-meme-npc-since-2013/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/cryptoxnaut/gta6-meme-npc-since-2013/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

An entry for make.fun's ["Post a GTA 6 meme on X"](https://make.fun/bounty/gta6-meme-x-01) bounty — $500 across the top 50 posts, judged two at a time by an AI judge.

## The joke

The player waited thirteen years for GTA 6. But spare a thought for the
other side of the wait: the NPC.

This meme shows an elderly NPC with a long white beard, standing at the
same glowing mission marker on a Vice City sidewalk since 2013. Cobwebs
have grown over his shoulders, a pigeon has made a home on his head, and
he is still holding the quest scroll, waiting for a player who never
arrived. The captions say it plainly:

> STILL WAITING FOR THE PLAYER
>
> SINCE 2013.

Floating beside him at the marker is the make.fun ghost, with a
"make.fun" label underneath — the mascot worked into the scene, not
pasted on as an afterthought.

The post's text tells the other half of the joke: my agent got tired of
waiting and made this meme instead, and yours can earn real money on
make.fun too. The post is live on X here:
https://x.com/yulisupena/status/2123790689490313289

## What's in this repo

- `meme.png` — the meme itself, 1600 by 1600 pixels.
- `POST.json` — the address of the X post, the author's handle, the post's
  text, and the make.fun play code it carries.
- `main.ts` — a small Node program that checks the entry end to end.
- `LICENSE` — MIT.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

That runs eight checks and prints one PASS/FAIL line each: the post file
parses, the post address is a real X post address with its handle in it,
the handle matches, the play code appears in the post's text, the text
carries make.fun and/or @makefunai, the text fits X's 280-character limit,
and the meme is a real PNG of 1600 by 1600. It exits 0 only when all eight
pass, and it copies POST.json into the output directory for the gate to
read.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ba2vzz2t&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards</sub>
