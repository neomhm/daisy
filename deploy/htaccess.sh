#!/bin/sh
# Puts the password gate's rules (deploy/gate.htaccess) at the end of the live site's .htaccess,
# replacing the block a previous deploy put there and keeping everything else in the file (cPanel
# keeps some of its own settings there). Run by .cpanel.yml at each deploy, from the repository's
# folder, with the site's folder as its argument.
set -e
PATH=/usr/bin:/bin
site=${1:?usage: deploy/htaccess.sh SITE_FOLDER}
live="${site%/}/.htaccess"
tmp="$live.akiki-new"
touch "$live"
sed '/^# BEGIN akiki gate$/,/^# END akiki gate$/d' "$live" > "$tmp"
if [ -s "$tmp" ] && [ -n "$(tail -c 1 "$tmp")" ]; then echo >> "$tmp"; fi
cat deploy/gate.htaccess >> "$tmp"
chmod 644 "$tmp"
mv "$tmp" "$live"
