# daisy

Website source code for AKIKI.AI.

## What's where

- `public/`: the website itself. Everything in this folder is copied to the live site.
  - `public/index.html`: the home page, one square board with every model's tile, Daisy's flowers and Butterfly's insects; `public/home.js` swaps neighbouring tiles every five seconds. Under the board, as a second screen, is the workbench; a little scroll either way glides the page from one to the other (also `home.js`). `public/daisy.html`: Daisy's team of flowers. `public/butterfly.html`: Butterfly's team of insects. `public/workbench.html`: the workbench on a page of its own, where the models' tiles are dragged from a panel onto a template field; tiles side by side join with a magnet bar, and three dot-matrix screens add up the joined team's size, latency and weights on disk (`public/workbench.js`; the figures are in each tile's `data-params`, `data-ms` and `data-mb`, left empty where a model has none yet, and the workbench's markup is in both `index.html` and `workbench.html`, so a new figure goes in both). The keys on the field's left: TesT sends a signal through the tiles and shows whether they are all joined into one model; Download is not ready yet; CODE opens an editor above the screens that writes, live, the Python joining the team (`team.py`): each model loaded from its own folder, then called with what the models joined to it hand on. What each model is given and hands on is set in `ROLES` in `workbench.js`; the calls are a sketch of the wiring, not the models' own code. The logo and name in the header open a page switcher (`public/switch.js`) to move between the four. `switch.js` also shrinks the header by a third once the page scrolls (on every page), runs the section bar (one chip per model, the one being read marked) and, on phones, the switcher as a bottom sheet and the back-to-top button. It also folds each model description to two lines with a "Read more".
  - `public/butterfly.svg`, `public/butterfly-grey.svg`: Butterfly's logo and its header version. Drawn by `tools/make_butterfly.py`; the insects' pixel icons come from `tools/make_pixel_icons.py --insects`.
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
