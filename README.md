# daisy

Website source code for AKIKI.AI.

## What's where

- `public/`: the website itself. Everything in this folder is copied to the live site.
  - `public/index.html`: Daisy's team of flowers. `public/butterfly.html`: Butterfly's team of insects. The logo and name in the header open a page switcher (`public/switch.js`) to move between the two. `switch.js` also runs the section bar (one chip per model, the one being read marked) and, on phones, the sticky header, the switcher as a bottom sheet, and the back-to-top button. It also folds each model description to two lines with a "Read more".
  - `public/butterfly.svg`, `public/butterfly-grey.svg`: Butterfly's logo and its header version. Drawn by `tools/make_butterfly.py`; the insects' pixel icons come from `tools/make_pixel_icons.py --insects`.
  - `public/fonts/akiki-pixel.woff2`: the AKIKI Pixel colour font (the whole alphabet), used for the logo word in the header, the motto headline, the model names and the box titles. Typing "akiki" in it draws the logo word. Built by `tools/make_akiki_font.py`.
  - `public/pixel-band.svg`: the pixel stripe that leads into the models. Drawn by `tools/make_pixel_band.py`.
  - `public/gears.svg`: the turning gear train behind the box stack at the top. Drawn by `tools/make_gears.py`, 4.3 boxes tall for the eleven boxes on Daisy's page; the Butterfly page shows only its top.
  - The flower logos (`public/thistle.svg`, `public/iris.svg`, `public/bouquet.svg` and the rest) come from `tools/make_flowers.py`; the pixel icons in the boxes from `tools/make_pixel_icons.py`.
  - `public/versions.js`: the motion of the version tabs on the model cards. The tabs also work without it.
- `.cpanel.yml`: tells cPanel to copy `public/` into `/home/akiki/public_html/` when you deploy.
- `tools/`: scripts that draw the logos. They are not part of the live site.
- `brand/`: the AKIKI logo (SVG and PNG, for light and dark backgrounds) and icon. Not part of the live site.

## Putting changes live

The site is deployed from the `main` branch with cPanel's Git Version Control:

1. In cPanel, open **Git™ Version Control** and click **Manage** next to `daisy`.
2. Open the **Pull or Deploy** tab.
3. Click **Update from Remote**, then **Deploy HEAD Commit**.

Deploying copies files over the live site but never deletes anything there. If a file is removed from `public/`, delete it from `public_html` in cPanel's File Manager too.
