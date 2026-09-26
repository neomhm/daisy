# daisy

Website source code for AKIKI.AI.

## What's where

- `public/`: the website itself. Everything in this folder is copied to the live site.
- `.cpanel.yml`: tells cPanel to copy `public/` into `/home/akiki/public_html/` when you deploy.
- `tools/`: scripts that draw the logos. They are not part of the live site.

## Putting changes live

The site is deployed from the `main` branch with cPanel's Git Version Control:

1. In cPanel, open **Git™ Version Control** and click **Manage** next to `daisy`.
2. Open the **Pull or Deploy** tab.
3. Click **Update from Remote**, then **Deploy HEAD Commit**.

Deploying copies files over the live site but never deletes anything there. If a file is removed from `public/`, delete it from `public_html` in cPanel's File Manager too.
