# Reward codes: the cheat sheet

## 1. How players earn codes

Five milestones each give a code, once per browser, shown on the chapter card and in the journal under **Reward codes** (with a Copy button). A code looks like `LR-8ENWV-VR104-Y2J5Y-RN33G`. It records the milestone, a random id for that player's browser, the day it was earned and the hours played, sealed so typos and casual edits don't pass.

| Milestone | Code name | Reward | How it's delivered |
|---|---|---|---|
| Finish The Labyrinth of Roots | Into the Roots | World-map wallpaper (desktop + phone) | Download buttons in the game |
| Finish The Siege of Rahdaria | Rahdaria Stands | Name in the credits (Wayfarers) | Google Form + script |
| Finish The Unmapped | Drawn Back In | Art pack (50 emblems, medallions, maps) | Download buttons in the game |
| Reach level 50 | Ringwarden | The Fiftieth Ring, printable Relicsong card | Download buttons in the game |
| Beat the Hollow Twin (Rimehold) | Twinbreaker | A key for the full game, for a friend | Google Form + script |

The downloads need nothing from you. The files are in the repo's `rewards/` folder and served from the public site.

## 2. Checking a code by hand

- **Reward Code Desk** (private page): https://claude.ai/artifact/W9xz7aM3VLFyP81Rbxu1DA. Paste a code to see the milestone, the date and the hours played, plus warnings, and mark it claimed so nobody claims it twice.
- Or from the repo: `node tools/reward-codes.js LR-XXXXX-XXXXX-XXXXX-XXXXX`

## 3. The Google Form

Players send codes through your form: https://docs.google.com/forms/d/e/1FAIpQLScKRmtXk5TiPCCXAGPtkZmKzDHidkdhJd3B1S9_K4_pjKbFPA/viewform

It needs three short-answer questions. The script finds each one by a word in its title:
- a title with **code** in it (for example "Your reward code")
- a title with **name** in it (for example "Name for the credits")
- a title with **email** in it (or turn on Settings → Responses → Collect email addresses)

## 4. Setting up the script (once, about 10 minutes)

1. Open the form in edit mode. Click the **⋮** menu at the top right, then **Apps Script**.
2. Delete the code that's already in the editor. Paste in everything from `tools/claim-form.gs`:
   https://raw.githubusercontent.com/coderblack15/labyrinth-of-roots/main/tools/claim-form.gs. Click **Save** (the disk icon).
3. Click the **gear icon** (Project Settings) on the left. Scroll to **Script Properties**, then **Add script property**:
   - Property: `RW_KEY`
   - Value: the seal key from `index.html`. Search for `const RW_KEY`, take the three quoted pieces and join them into one line, without the quotes, spaces or `+` signs.
   - Click **Save script properties**.
4. Go back to the editor (the `< >` icon). In the function list at the top, pick **setup** and click **Run**.
5. Google asks for permission. Click **Review permissions**, choose your account, then **Advanced** → **Go to (your project) (unsafe)** → **Allow**. ("Unsafe" only means Google hasn't reviewed your own script.)
6. Open **Execution log**. It shows the link to a new spreadsheet called **Labyrinth of Roots rewards**, with three tabs:
   - **Claims**: every claim, with its result (Given / Held / Refused)
   - **Credits**: names for the credits
   - **Keys**: paste friend keys here, one per row in column A
7. Test it: earn a code in the game (or make one with `node tools/reward-codes.js --make 1`), send it through the form, and check that the email arrives and a row appears in **Claims**.

## 5. Making itch.io keys for the Keys sheet

1. On itch.io, go to **Dashboard**, open Labyrinth of Roots, and click **Edit game**.
2. At the top, open **Distribute** → **Download keys**.
3. Click **Generate new keys**. Choose an amount (10 is plenty to start) and **Generate**.
4. Click **Export** (or copy the key links), and paste them into column A of the **Keys** tab, one per row.

Each Twinbreaker claim takes the next unused key and writes the code next to it. When the keys run out, the script holds the claim and emails you to add more.

## 6. Turning claims on in the game

Right now `CLAIMS_OPEN = false`, so the game hides the form and says the credits and friend key are "coming". After the script passes your test in step 4.7, ask Claude to set `CLAIMS_OPEN` to `true` and republish. That switch is the only change needed.

## 7. When a claim arrives

Most claims need nothing from you. The script checks the seal, blocks repeats, emails the player and fills in the sheet. You get an email only when:
- **A new name goes into the credits.** Ask Claude to add the names to the game's Wayfarers list (a quick update), whenever a few have built up.
- **A claim is held** (too few hours played, a date in the future, or no keys left). Have a look. If it's fine, send the reward by hand and change its Result in **Claims** to `Given`.

## Limits worth knowing

- The seal's key ships inside the game, so a determined player who reads the source could forge a code. Keep rewards small, one per player per milestone.
- The download files are public in the repo. The code only puts the buttons in front of the player.
- Rewards stay free to get and never depend on luck.
