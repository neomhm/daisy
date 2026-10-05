# daisy

Website source code for AKIKI.AI.

## What's where

- `public/`: the website itself. Everything in this folder is copied to the live site.
  - `public/index.html`: the home page, one square board with every model's tile, Daisy's flowers and Butterfly's insects; `public/home.js` swaps neighbouring tiles every five seconds. Under the board, as a second screen, is the workbench; a little scroll either way glides the page from one to the other (also `home.js`). `public/daisy.html`: Daisy's team of flowers (PLAN). `public/butterfly.html`: Butterfly's team of insects (PLAN 2). `public/siren.html`: PLAN 3, a made-to-measure assistant: Siren (designed), the voice that lets a person talk to any of our models. For the rest PLAN 3 uses the models that already exist (Bouquet, Dragonfly, Mantis, Daisy, Orchid, Tulip, Butterfly's team) and the AI brain the person picks; it trains only Siren and, later, specialist modules no existing model covers, each to get its own sea-creature name and card. `public/workbench.html`: the workbench on a page of its own, where the models' tiles are dragged from a panel onto a template field; tiles side by side join with a magnet bar, and three dot-matrix screens add up the joined team's size, latency and weights on disk (`public/workbench.js`). **Every tile is described in one file, `public/tiles.js`**: its role, the kinds of data it accepts and hands on, what it needs attached, its status, its figures (`params`, `ms`, `mb`, left empty where a model has none yet) and its filter tags. `workbench.js` builds the panel from it on both pages (the workbench's markup is in both `index.html` and `workbench.html`, but the tiles are not: a new tile or a new figure goes in `tiles.js` only). Tiles are coloured by ROLE: a start (blue) takes the data in (a chat, a feeder, a scanner, or a model reading your files or database), a middle (amber) works on it, an end (teal) gives the result; Siren is a start and an end (both colours); an attachment (slate, dashed) such as a brain, a database or a documents folder snaps onto a tile that needs it rather than joining the chain (a copy is attached; the panel keeps its tile). Each tile keeps its own pixel drawing and its own colour as a strip along its foot; the roles' colours are the `--role-*` tokens in `style.css`. Tiles side by side pass their work left to right; tiles stacked in a column are alternatives; a tile touching Siren is a specialist she calls, whose answer comes back to her. The keys on the field's left: TesT checks, in order, that there is a start and an end, that the tiles are one piece and every chain runs from a start to an end, that every two touching tiles fit (what the left one hands on is something the right one accepts), and that every tile has what it needs attached; when a check fails it marks the tile at fault, says why in one sentence above the panel, and the panel shows only the tiles that would fit in its place ("Fits here"; pressing one swaps it in or attaches it; "Show all tiles" goes back). A clearly marked HOOK in `workbench.js` is where TesT will later run a sample through the real models (the connector on the person's own PC); today it makes no network call. Download is not ready yet; CODE opens an editor above the screens that writes, live, the Python joining the team (`team.py`): each model loaded from its own folder with its attachments, then called with what the models joined to it hand on (taken from `tiles.js`; the calls are a sketch of the wiring, not the models' own code). Between the screens and the tiles, chips filter the panel by kind: each tile's kinds are its `tags` in `tiles.js` (brains, voice, database, documents, website, code, checks; a new tag makes a new chip), and Ready lists the tiles that have measured figures. The logo and name in the header open a page switcher (`public/switch.js`) to move between the five. `switch.js` also shrinks the header by a third once the page scrolls (on every page), runs the section bar (one chip per model, the one being read marked) and, on phones, the switcher as a bottom sheet and the back-to-top button. It also folds each model description to two lines with a "Read more".
  - `public/butterfly.svg`, `public/butterfly-grey.svg`: Butterfly's logo and its header version. Drawn by `tools/make_butterfly.py`; the insects' pixel icons come from `tools/make_pixel_icons.py --insects`.
  - `public/siren.svg`, `public/siren-grey.svg`: Siren's logo (a spiral shell, the sea's voice) and its header version. Drawn by `tools/make_siren.py`; her pixel icon (and the AI brain's and "you"'s) comes from `tools/make_pixel_icons.py --sea`.
  - `public/fonts/akiki-pixel.woff2`: the AKIKI Pixel colour font (the whole alphabet), used for the logo word in the header, the motto headline, the model names and the box titles. Typing "akiki" in it draws the logo word. Built by `tools/make_akiki_font.py`.
  - `public/pixel-band.svg`: the pixel stripe that leads into the models. Drawn by `tools/make_pixel_band.py`.
  - `public/gears.svg`: the turning gear train behind the box stack at the top. Drawn by `tools/make_gears.py`.
  - The flower logos (`public/thistle.svg`, `public/iris.svg`, `public/bouquet.svg` and the rest) come from `tools/make_flowers.py`; the pixel icons in the boxes from `tools/make_pixel_icons.py`.
  - `public/versions.js`: the motion of the version tabs on the model cards. The tabs also work without it.
  - `public/gate.php`: the password gate, with its sign-in screen (see below).
- `.cpanel.yml`: tells cPanel to copy `public/` into `/home/akiki/public_html/` when you deploy, then to add the password gate's rules to the live `.htaccess` (`deploy/htaccess.sh`).
- `deploy/`: the password gate's rules for `.htaccess` (`deploy/gate.htaccess`) and the script that puts them into the live `.htaccess` at each deploy, keeping what else is in that file.
- `tools/`: scripts that draw the logos. They are not part of the live site.
- `brand/`: the AKIKI logo (SVG and PNG, for light and dark backgrounds) and icon. Not part of the live site.

## Putting changes live

The site is deployed from the `main` branch with cPanel's Git Version Control:

1. In cPanel, open **Git™ Version Control** and click **Manage** next to `daisy`.
2. Open the **Pull or Deploy** tab.
3. Click **Update from Remote**, then **Deploy HEAD Commit**.

Deploying copies files over the live site but never deletes anything there. If a file is removed from `public/`, delete it from `public_html` in cPanel's File Manager too.

## The password gate

Every page of the site asks for a name and a password first (the sign-in screen is in `public/gate.php`). Pictures, fonts, styles and scripts are not gated.

- Signing in lasts 30 days in that browser. Going to `/?signout` signs it out.
- The password is kept in `gate.php` only as a bcrypt hash (`GATE_HASH`). To change it, run `php -r 'echo password_hash("NEW PASSWORD", PASSWORD_BCRYPT, ["cost" => 13]);'` and put the result there. The name is `GATE_USER`.
- The key that signs the sign-in cookie is made by `gate.php` the first time it runs and kept outside the website, in `/home/akiki/.akiki-gate-key`. Deleting that file signs everybody out.
- This repository is public, so the pages' text can also be read on GitHub, and the password's hash is there too. To keep the pages truly private, make the repository private (cPanel then needs a deploy key to pull it).
- To take the gate away: delete the lines from `# BEGIN akiki gate` to `# END akiki gate` in `public_html/.htaccess` (cPanel's File Manager shows it once "Show Hidden Files" is ticked in its Settings), and remove the `deploy/htaccess.sh` line from `.cpanel.yml`, or the next deploy puts them back.
