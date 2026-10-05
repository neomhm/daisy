<?php
/* The password gate for the whole site.

   .htaccess sends every page of the site here (the rules are in deploy/gate.htaccess; deploying
   puts them in the live .htaccess). A visitor who has signed in gets the page they asked for;
   anyone else gets the sign-in screen below. Pictures, fonts, styles and scripts are not gated.

   Signing in sets a cookie that lasts 30 days. It is signed with a key that this file makes on the
   server the first time it runs and keeps outside the website's folder, so the key is never in the
   repository; deleting that file (/home/akiki/.akiki-gate-key) signs everybody out. The password is
   kept here only as a bcrypt hash: to change it, put the output of
   php -r 'echo password_hash("NEW PASSWORD", PASSWORD_BCRYPT, ["cost" => 13]);'
   in GATE_HASH. /?signout signs this browser out. */

const GATE_USER = 'tul1p';
const GATE_HASH = '$2y$13$87mJpMj/DT2CSJaxqlwGIe2jW.cgQAOoGqXcDhaIJp1AaAPvQvEQ2';
const GATE_DAYS = 30;
const GATE_COOKIE = 'akiki_gate';

// The signing key: made once, kept outside the site's folder (or, failing that, in a file Apache never serves).
function gate_key() {
  $places = [dirname(__DIR__) . '/.akiki-gate-key', __DIR__ . '/.ht-akiki-gate-key'];
  foreach ($places as $f) {
    if (is_file($f) && is_readable($f)) {
      $k = trim((string) file_get_contents($f));
      if (strlen($k) >= 64) return $k;
    }
  }
  $k = bin2hex(random_bytes(32));
  foreach ($places as $f) {
    if (@file_put_contents($f, $k, LOCK_EX) === strlen($k)) {
      @chmod($f, 0600);
      return $k;
    }
  }
  return null;
}

function gate_sign($exp, $key) {
  return hash_hmac('sha256', 'akiki-gate|' . $exp, $key);
}

function gate_signed_in($key) {
  $c = isset($_COOKIE[GATE_COOKIE]) ? (string) $_COOKIE[GATE_COOKIE] : '';
  if (!preg_match('/^(\d{10})\.([0-9a-f]{64})$/', $c, $m) || (int) $m[1] < time()) return false;
  return hash_equals(gate_sign($m[1], $key), $m[2]);
}

function gate_cookie($value, $exp) {
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
  header('Set-Cookie: ' . GATE_COOKIE . '=' . $value . '; Expires=' . gmdate('D, d M Y H:i:s', $exp) . ' GMT; Max-Age='
    . max(0, $exp - time()) . '; Path=/; HttpOnly; SameSite=Lax' . ($https ? '; Secure' : ''));
}

// The page asked for, as a file of the site: "/" is index.html, "/daisy" is daisy.html. Null if none.
function gate_page() {
  $path = rawurldecode((string) parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH));
  if ($path === '' || substr($path, -1) === '/') $path .= 'index.html';
  elseif (!preg_match('/\.html?$/i', $path) && is_file(__DIR__ . $path . '.html')) $path .= '.html';
  $root = realpath(__DIR__);
  $file = realpath(__DIR__ . $path);
  if ($file === false || strpos($file, $root . DIRECTORY_SEPARATOR) !== 0 || !preg_match('/\.html?$/i', $file) || !is_file($file)) return null;
  return $file;
}

// Where to send the browser back to: this same address (never another site's).
function gate_here() {
  $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/';
  return ($uri === '' || $uri[0] !== '/' || substr($uri, 0, 2) === '//') ? '/' : $uri;
}

header('X-Robots-Tag: noindex, nofollow');
header('Vary: Cookie');
$key = gate_key();
if ($key === null) {
  http_response_code(500);
  header('Content-Type: text/plain; charset=utf-8');
  echo "The sign-in could not keep its key on this server.\n";
  exit;
}

if (isset($_GET['signout'])) {
  gate_cookie('', 1);
  header('Location: /', true, 303);
  exit;
}

$failed = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $user = strtolower(trim(isset($_POST['user']) ? (string) $_POST['user'] : ''));
  $pass = isset($_POST['pass']) ? (string) $_POST['pass'] : '';
  $ok = hash_equals(GATE_USER, $user) & password_verify($pass, GATE_HASH);   // both checked, every time
  if ($ok) {
    $exp = time() + GATE_DAYS * 86400;
    gate_cookie($exp . '.' . gate_sign($exp, $key), $exp);
  } else {
    usleep(900000);   // slows down guessing
  }
  if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => (bool) $ok]);
    exit;
  }
  if ($ok) {
    header('Location: ' . gate_here(), true, 303);
    exit;
  }
  $failed = true;
} elseif (gate_signed_in($key)) {
  $file = gate_page();
  if ($file === null) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    echo "<!doctype html>\n<meta charset=\"utf-8\"><title>Not found</title><p>There is no such page. <a href=\"/\">AKIKI.AI</a></p>\n";
    exit;
  }
  $etag = '"' . dechex(filemtime($file)) . '-' . dechex(filesize($file)) . '"';
  header('Content-Type: text/html; charset=utf-8');
  header('Cache-Control: private, no-cache');
  header('ETag: ' . $etag);
  header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($file)) . ' GMT');
  if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
    http_response_code(304);
    exit;
  }
  if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') readfile($file);
  exit;
}

// The sign-in screen.
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>AKIKI.AI · Sign in</title>
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#151d25">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>
    /* The sign-in screen: the whole team's tiles in a ring round the panel, on the workbench's dark
       field. Each letter typed lights the next tile; while the name and password are checked a
       light runs round the ring. Right, the tiles fly into the middle and the site comes up; wrong,
       they flash red and the panel shakes. */
    @font-face { font-family: "AKIKI Pixel"; src: url("/fonts/akiki-pixel.woff2?v=4") format("woff2"); font-display: block; }
    :root { color-scheme: dark; --amber: #ffc14d; --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body {
      display: grid;
      place-items: center;
      min-height: 100svh;
      overflow: hidden;
      background:
        radial-gradient(ellipse at 20% 15%, rgba(53, 173, 176, .2), transparent 55%),
        radial-gradient(ellipse at 85% 90%, rgba(194, 84, 158, .16), transparent 50%),
        linear-gradient(160deg, #1d2833, #0f151b);
      color: #c9d4de;
      font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
    }
    body::before {   /* the field's fine dot grid */
      content: "";
      position: fixed;
      inset: 0;
      background-image: radial-gradient(rgba(255, 255, 255, .08) 1px, transparent 1.6px);
      background-size: 18px 18px;
      pointer-events: none;
    }
    body::after {   /* the site's light page, which shows through when the gate opens */
      content: "";
      position: fixed;
      inset: 0;
      background: #f6f8fa;
      opacity: 0;
      pointer-events: none;
      transition: opacity .45s ease-in;
    }
    body.is-leaving::after { opacity: 1; }

    /* The ring is 6 squares by 6, or 6 by 8 on a tall phone, or 8 by 6 on a short wide screen
       (a phone on its side); each tile has its place in each (--sx/--sy, --px/--py, --lx/--ly). */
    .gate {
      --W: 6;
      --H: 6;
      --c: min(92vw / (var(--W) + .12 * (var(--W) - 1)), 88svh / (var(--H) + .12 * (var(--H) - 1)), 91px);
      --g: calc(var(--c) * .12);
      --u: calc(var(--c) * .066);
      --step: calc(var(--c) + var(--g));
      position: relative;
      width: calc(var(--W) * var(--step) - var(--g));
      height: calc(var(--H) * var(--step) - var(--g));
    }
    .t, .e {
      --x: var(--sx);
      --y: var(--sy);
      position: absolute;
      left: calc(var(--x) * var(--step));
      top: calc(var(--y) * var(--step));
      width: var(--c);
      height: var(--c);
      border-radius: calc(var(--c) * .14);
    }
    .e { background: rgba(255, 255, 255, .03); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08); }
    .e:not(.sq) { display: none; }
    @media (max-aspect-ratio: 4/5) {
      .gate { --H: 8; }
      .t, .e { --x: var(--px); --y: var(--py); }
      .e.sq { display: none; }
      .e.pt { display: block; }
    }
    @media (min-aspect-ratio: 3/2) and (max-height: 560px) {
      .gate { --W: 8; }
      .t, .e { --x: var(--lx); --y: var(--ly); }
      .e.sq { display: none; }
      .e.ls { display: block; }
      .fields { grid-template-columns: 1fr 1fr; }
      .sub { display: none; }
    }
    .t {
      --dx: calc(((var(--W) - 1) / 2 - var(--x)) * var(--step));
      --dy: calc(((var(--H) - 1) / 2 - var(--y)) * var(--step));
      filter: grayscale(.7) brightness(.42);
      transition: filter .35s, box-shadow .35s, transform .35s, opacity .35s;
    }
    .t svg { display: block; width: 100%; height: 100%; border-radius: inherit; }
    .t::after {   /* the red of a wrong password */
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: #ff5a52;
      opacity: 0;
    }
    .t.is-on, .t.is-glint, .is-open .t {
      filter: none;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, .85), 0 0 calc(var(--u) * 5) color-mix(in srgb, var(--tc) 75%, transparent);
    }
    .t.is-on { animation: pop .35s cubic-bezier(.3, 1.6, .5, 1); }
    .t.is-glint { transition-duration: .6s; box-shadow: none; filter: grayscale(.2) brightness(.8); }
    @keyframes pop { 40% { transform: scale(1.12); } }
    .is-checking .t { animation: chase .95s linear infinite; animation-delay: calc(var(--i) * 52ms); }
    @keyframes chase {
      0%, 34%, 100% { filter: grayscale(.7) brightness(.42); box-shadow: none; transform: none; }
      8% { filter: none; transform: scale(1.07); box-shadow: 0 0 0 2px #fff, 0 0 calc(var(--u) * 6) var(--tc); }
    }
    .is-open .t { transform: scale(1.06); }
    .is-leaving .t {
      opacity: 0;
      transform: translate(var(--dx), var(--dy)) scale(.3) rotate(8deg);
      transition: transform .75s cubic-bezier(.6, 0, .3, 1) calc(var(--i) * 14ms), opacity .55s ease-in calc(.2s + var(--i) * 14ms);
    }
    .is-leaving .e { opacity: 0; transition: opacity .4s; }
    .is-wrong .t::after { animation: wrong .62s ease-out; animation-delay: calc(var(--i) * 22ms); }
    @keyframes wrong { 25% { opacity: .78; } }

    .panel {
      position: absolute;
      left: var(--step);
      top: var(--step);
      width: calc((var(--W) - 2) * var(--step) - var(--g));
      height: calc((var(--H) - 2) * var(--step) - var(--g));
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: calc(var(--u) * 2.2);
      padding: calc(var(--u) * 4.5);
      border-radius: calc(var(--u) * 3);
      background: linear-gradient(rgba(33, 45, 57, .94), rgba(13, 19, 25, .96));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .1), 0 0 0 1px rgba(255, 255, 255, .08), 0 30px 60px -22px rgba(0, 0, 0, .85);
      transition: transform .7s cubic-bezier(.6, 0, .3, 1), opacity .5s ease-in .15s;
    }
    .is-leaving .panel { transform: scale(1.12); opacity: 0; }
    .is-wrong .panel { animation: shake .5s cubic-bezier(.36, .07, .19, .97); }
    @keyframes shake { 15%, 55% { transform: translateX(-9px); } 35%, 75% { transform: translateX(9px); } 90% { transform: translateX(-3px); } }
    .panel > * { flex: none; }
    .head { text-align: center; }
    .logo { display: block; font-family: "AKIKI Pixel", var(--mono); font-size: max(22px, calc(var(--u) * 7)); line-height: 1; color: #e6edf3; }
    .fields { display: grid; gap: calc(var(--u) * 2.2); }
    .sub { display: block; margin-top: calc(var(--u) * 1.6); color: rgba(255, 255, 255, .4); font: calc(var(--u) * 2.3)/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; }
    label { display: block; margin-bottom: calc(var(--u) * 1); color: rgba(255, 255, 255, .45); font: calc(var(--u) * 2.9)/1 "AKIKI Pixel", var(--mono); }
    .screen { position: relative; display: block; border-radius: calc(var(--u) * 1.6); }
    .screen::after {   /* scan lines, like the workbench's screens */
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: repeating-linear-gradient(transparent 0 2px, rgba(0, 0, 0, .18) 2px 3px);
      pointer-events: none;
    }
    input {
      display: block;
      width: 100%;
      height: max(38px, calc(var(--u) * 7.6));
      margin: 0;
      padding: 0 calc(var(--u) * 2.6);
      border: 0;
      border-radius: inherit;
      background: radial-gradient(ellipse at 50% 0%, #1c2630, #0a0f14 75%);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .07), inset 0 3px 12px rgba(0, 0, 0, .7);
      color: var(--amber);
      caret-color: var(--amber);
      font: max(16px, calc(var(--u) * 3.3))/1 var(--mono);
      letter-spacing: .08em;
      text-shadow: 0 0 8px rgba(255, 170, 40, .65);
      transition: box-shadow .2s;
    }
    input:focus { outline: none; box-shadow: inset 0 0 0 1px rgba(255, 193, 77, .6), 0 0 0 3px rgba(255, 193, 77, .14), inset 0 3px 12px rgba(0, 0, 0, .7); }
    .key {
      position: relative;
      display: block;
      width: 100%;
      height: max(44px, calc(var(--u) * 9));
      margin-top: calc(var(--u) * 1);
      padding: 0;
      border: 0;
      border-radius: calc(var(--u) * 2.2);
      background: #05080b;   /* the key's side, seen under its face */
      box-shadow: 0 0 0 1px rgba(255, 255, 255, .07), 0 14px 26px -12px rgba(0, 0, 0, .95);
      color: var(--amber);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .key-face {
      position: absolute;
      inset: 0 0 6px;
      display: grid;
      place-items: center;
      border-radius: inherit;
      background: linear-gradient(#2f3e4c, #1b252f);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .17), inset 0 0 0 1px rgba(255, 255, 255, .06);
      transition: transform .09s, filter .2s;
    }
    .key:hover .key-face { filter: brightness(1.16); }
    .key:active .key-face { transform: translateY(5px); }
    .key:focus-visible { outline: 2px solid #7fd6d8; outline-offset: 3px; }
    .key svg { display: block; height: max(13px, calc(var(--u) * 3.4)); overflow: visible; filter: drop-shadow(0 0 3px rgba(255, 170, 40, .85)); }
    .key svg path { fill: none; stroke: currentColor; stroke-width: .78; stroke-linecap: round; }
    .key svg .off { opacity: .1; }
    .msg { min-height: 1.3em; margin: 0; color: #ff8a80; font: max(11px, calc(var(--u) * 2.3))/1.3 var(--mono); text-align: center; }
    @media (prefers-reduced-motion: reduce) {
      .t, .t.is-on, .is-checking .t, .is-wrong .t::after, .is-wrong .panel { animation: none; transition: none; }
      .is-leaving .t, .is-leaving .panel { transition: opacity .3s; transform: none; }
    }
  </style>
</head>
<body>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <symbol id="px-bouquet" viewBox="0 0 40 40"><rect width="40" height="40" fill="#35adb0"/><g fill="#ffffff"><rect x="11.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-orchid" viewBox="0 0 40 40"><rect width="40" height="40" fill="#c2549e"/><g fill="#ffffff"><rect x="5.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-tulip" viewBox="0 0 40 40"><rect width="40" height="40" fill="#3aa56f"/><g fill="#ffffff"><rect x="5.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-jasmine" viewBox="0 0 40 40"><rect width="40" height="40" fill="#a06fc2"/><g fill="#ffffff"><rect x="17.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-daisy" viewBox="0 0 40 40"><rect width="40" height="40" fill="#ec8e4a"/><g fill="#ffffff"><rect x="17.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-magnolia" viewBox="0 0 40 40"><rect width="40" height="40" fill="#de7c95"/><g fill="#ffffff"><rect x="11.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-iris" viewBox="0 0 40 40"><rect width="40" height="40" fill="#7c8acb"/><g fill="#ffffff"><rect x="11.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-thistle" viewBox="0 0 40 40"><rect width="40" height="40" fill="#94549f"/><g fill="#ffffff"><rect x="5.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-lily" viewBox="0 0 40 40"><rect width="40" height="40" fill="#e65b56"/><g fill="#ffffff"><rect x="5.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-butterfly" viewBox="0 0 40 40"><rect width="40" height="40" fill="#2fb39a"/><g fill="#ffffff"><rect x="5.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-cricket" viewBox="0 0 40 40"><rect width="40" height="40" fill="#3aa56f"/><g fill="#ffffff"><rect x="5.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-bees" viewBox="0 0 40 40"><rect width="40" height="40" fill="#f0a444"/><g fill="#ffffff"><rect x="5.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-ants" viewBox="0 0 40 40"><rect width="40" height="40" fill="#a0452e"/><g fill="#ffffff"><rect x="5.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-mantis" viewBox="0 0 40 40"><rect width="40" height="40" fill="#7fae3e"/><g fill="#ffffff"><rect x="11.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-ladybug" viewBox="0 0 40 40"><rect width="40" height="40" fill="#e65b56"/><g fill="#ffffff"><rect x="17.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-cicada" viewBox="0 0 40 40"><rect width="40" height="40" fill="#8a80cf"/><g fill="#ffffff"><rect x="5.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-dragonfly" viewBox="0 0 40 40"><rect width="40" height="40" fill="#6592b4"/><g fill="#ffffff"><rect x="5.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="5.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="29.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
    <symbol id="px-firefly" viewBox="0 0 40 40"><rect width="40" height="40" fill="#ec8e4a"/><g fill="#ffffff"><rect x="11.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="5.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="11.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="17.48" width="5.04" height="5.04" rx="1.14"/><rect x="11.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="23.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="23.48" width="5.04" height="5.04" rx="1.14"/></g><g fill="#f2b632"><rect x="11.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="17.48" y="29.48" width="5.04" height="5.04" rx="1.14"/><rect x="23.48" y="29.48" width="5.04" height="5.04" rx="1.14"/></g></symbol>
  </svg>
  <main class="gate<?php if ($failed) echo ' is-wrong'; ?>">
    <div class="ring" aria-hidden="true">
      <i class="t" style="--sx:0;--sy:0;--px:0;--py:0;--lx:0;--ly:0;--i:0;--tc:#c2549e"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-orchid"/></svg></i>
      <i class="t" style="--sx:1;--sy:0;--px:1;--py:0;--lx:1;--ly:0;--i:1;--tc:#2fb39a"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-butterfly"/></svg></i>
      <i class="t" style="--sx:2;--sy:0;--px:2;--py:0;--lx:2;--ly:0;--i:2;--tc:#3aa56f"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-tulip"/></svg></i>
      <i class="t" style="--sx:3;--sy:0;--px:4;--py:0;--lx:4;--ly:0;--i:3;--tc:#f0a444"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-bees"/></svg></i>
      <i class="t" style="--sx:4;--sy:0;--px:5;--py:0;--lx:5;--ly:0;--i:4;--tc:#a06fc2"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-jasmine"/></svg></i>
      <i class="t" style="--sx:5;--sy:0;--px:5;--py:1;--lx:6;--ly:0;--i:5;--tc:#3aa56f"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-cricket"/></svg></i>
      <i class="t" style="--sx:5;--sy:1;--px:5;--py:2;--lx:7;--ly:0;--i:6;--tc:#ec8e4a"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-daisy"/></svg></i>
      <i class="t" style="--sx:5;--sy:3;--px:5;--py:3;--lx:7;--ly:2;--i:7;--tc:#a0452e"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-ants"/></svg></i>
      <i class="t" style="--sx:5;--sy:4;--px:5;--py:5;--lx:7;--ly:3;--i:8;--tc:#de7c95"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-magnolia"/></svg></i>
      <i class="t" style="--sx:5;--sy:5;--px:5;--py:6;--lx:7;--ly:5;--i:9;--tc:#7fae3e"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-mantis"/></svg></i>
      <i class="t" style="--sx:4;--sy:5;--px:4;--py:7;--lx:6;--ly:5;--i:10;--tc:#7c8acb"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-iris"/></svg></i>
      <i class="t" style="--sx:3;--sy:5;--px:3;--py:7;--lx:5;--ly:5;--i:11;--tc:#e65b56"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-ladybug"/></svg></i>
      <i class="t" style="--sx:2;--sy:5;--px:1;--py:7;--lx:3;--ly:5;--i:12;--tc:#94549f"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-thistle"/></svg></i>
      <i class="t" style="--sx:1;--sy:5;--px:0;--py:7;--lx:2;--ly:5;--i:13;--tc:#8a80cf"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-cicada"/></svg></i>
      <i class="t" style="--sx:0;--sy:4;--px:0;--py:6;--lx:1;--ly:5;--i:14;--tc:#e65b56"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-lily"/></svg></i>
      <i class="t" style="--sx:0;--sy:3;--px:0;--py:4;--lx:0;--ly:5;--i:15;--tc:#6592b4"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-dragonfly"/></svg></i>
      <i class="t" style="--sx:0;--sy:2;--px:0;--py:3;--lx:0;--ly:3;--i:16;--tc:#35adb0"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-bouquet"/></svg></i>
      <i class="t" style="--sx:0;--sy:1;--px:0;--py:1;--lx:0;--ly:2;--i:17;--tc:#ec8e4a"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-firefly"/></svg></i>
      <i class="e sq" style="--sx:5;--sy:2"></i>
      <i class="e sq" style="--sx:0;--sy:5"></i>
      <i class="e pt" style="--px:3;--py:0"></i>
      <i class="e pt" style="--px:5;--py:4"></i>
      <i class="e pt" style="--px:5;--py:7"></i>
      <i class="e pt" style="--px:2;--py:7"></i>
      <i class="e pt" style="--px:0;--py:5"></i>
      <i class="e pt" style="--px:0;--py:2"></i>
      <i class="e ls" style="--lx:3;--ly:0"></i>
      <i class="e ls" style="--lx:7;--ly:1"></i>
      <i class="e ls" style="--lx:7;--ly:4"></i>
      <i class="e ls" style="--lx:4;--ly:5"></i>
      <i class="e ls" style="--lx:0;--ly:4"></i>
      <i class="e ls" style="--lx:0;--ly:1"></i>
    </div>
    <form class="panel" method="post" autocomplete="on">
      <div class="head"><span class="logo">akiki</span><span class="sub">private preview</span></div>
      <div class="fields">
        <div>
          <label for="user">name</label>
          <span class="screen"><input id="user" name="user" type="text" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" required></span>
        </div>
        <div>
          <label for="pass">password</label>
          <span class="screen"><input id="pass" name="pass" type="password" autocomplete="current-password" required></span>
        </div>
      </div>
      <button class="key" type="submit" aria-label="Open"><span class="key-face"><svg viewBox="0 0 23 7" aria-hidden="true"><path class="off" d="M0.5 0.5h0M4.5 0.5h0M1.5 1.5h0M2.5 1.5h0M3.5 1.5h0M1.5 2.5h0M2.5 2.5h0M3.5 2.5h0M1.5 3.5h0M2.5 3.5h0M3.5 3.5h0M1.5 4.5h0M2.5 4.5h0M3.5 4.5h0M1.5 5.5h0M2.5 5.5h0M3.5 5.5h0M0.5 6.5h0M4.5 6.5h0M6.5 0.5h0M7.5 0.5h0M8.5 0.5h0M9.5 0.5h0M10.5 0.5h0M6.5 1.5h0M7.5 1.5h0M8.5 1.5h0M9.5 1.5h0M10.5 1.5h0M10.5 2.5h0M7.5 3.5h0M8.5 3.5h0M9.5 3.5h0M10.5 4.5h0M7.5 5.5h0M8.5 5.5h0M9.5 5.5h0M10.5 5.5h0M7.5 6.5h0M8.5 6.5h0M9.5 6.5h0M10.5 6.5h0M12.5 0.5h0M13.5 0.5h0M14.5 0.5h0M15.5 0.5h0M16.5 0.5h0M12.5 1.5h0M13.5 1.5h0M14.5 1.5h0M15.5 1.5h0M16.5 1.5h0M12.5 2.5h0M16.5 2.5h0M13.5 3.5h0M14.5 3.5h0M15.5 3.5h0M13.5 5.5h0M14.5 5.5h0M15.5 5.5h0M16.5 5.5h0M12.5 6.5h0M16.5 6.5h0M18.5 0.5h0M19.5 0.5h0M20.5 0.5h0M21.5 0.5h0M22.5 0.5h0M18.5 1.5h0M19.5 1.5h0M20.5 1.5h0M21.5 1.5h0M22.5 1.5h0M19.5 2.5h0M22.5 2.5h0M20.5 3.5h0M21.5 3.5h0M19.5 4.5h0M20.5 4.5h0M21.5 4.5h0M19.5 5.5h0M20.5 5.5h0M21.5 5.5h0M19.5 6.5h0M20.5 6.5h0M21.5 6.5h0"/><path d="M1.5 0.5h0M2.5 0.5h0M3.5 0.5h0M0.5 1.5h0M4.5 1.5h0M0.5 2.5h0M4.5 2.5h0M0.5 3.5h0M4.5 3.5h0M0.5 4.5h0M4.5 4.5h0M0.5 5.5h0M4.5 5.5h0M1.5 6.5h0M2.5 6.5h0M3.5 6.5h0M6.5 2.5h0M7.5 2.5h0M8.5 2.5h0M9.5 2.5h0M6.5 3.5h0M10.5 3.5h0M6.5 4.5h0M7.5 4.5h0M8.5 4.5h0M9.5 4.5h0M6.5 5.5h0M6.5 6.5h0M13.5 2.5h0M14.5 2.5h0M15.5 2.5h0M12.5 3.5h0M16.5 3.5h0M12.5 4.5h0M13.5 4.5h0M14.5 4.5h0M15.5 4.5h0M16.5 4.5h0M12.5 5.5h0M13.5 6.5h0M14.5 6.5h0M15.5 6.5h0M18.5 2.5h0M20.5 2.5h0M21.5 2.5h0M18.5 3.5h0M19.5 3.5h0M22.5 3.5h0M18.5 4.5h0M22.5 4.5h0M18.5 5.5h0M22.5 5.5h0M18.5 6.5h0M22.5 6.5h0"/></svg></span></button>
      <p class="msg" role="status"><?php if ($failed) echo 'That is not it. Try again.'; ?></p>
    </form>
  </main>
  <script>
    (() => {
      const gate = document.querySelector('.gate');
      const form = gate.querySelector('form');
      const user = form.querySelector('#user'), pass = form.querySelector('#pass');
      const msg = form.querySelector('.msg');
      const tiles = [...gate.querySelectorAll('.t')].sort((a, b) => a.style.getPropertyValue('--i') - b.style.getPropertyValue('--i'));
      const still = window.matchMedia('(prefers-reduced-motion: reduce)');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      let busy = false;

      // Each letter typed, in either box, lights the next tile round the ring.
      const light = () => {
        const n = user.value.length + pass.value.length;
        tiles.forEach((t, i) => t.classList.toggle('is-on', i < n));
      };
      form.addEventListener('input', light);
      light();
      (failed => { if (failed) setTimeout(() => gate.classList.remove('is-wrong'), 900); })(gate.classList.contains('is-wrong'));
      user.focus();

      // While nothing is typed, now and then a tile glints.
      setInterval(() => {
        if (busy || still.matches || user.value || pass.value || document.hidden) return;
        const t = tiles[Math.floor(Math.random() * tiles.length)];
        t.classList.add('is-glint');
        setTimeout(() => t.classList.remove('is-glint'), 700);
      }, 1500);

      form.addEventListener('submit', async e => {
        e.preventDefault();
        if (busy) return;
        busy = true;
        msg.textContent = '';
        gate.classList.remove('is-wrong');
        gate.classList.add('is-checking');
        const t0 = performance.now();
        let ok = false;
        try {
          const r = await fetch(location.href, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, credentials: 'same-origin' });
          ok = (await r.json()).ok === true;
        } catch (err) {
          form.submit();   // the plain way, without the show
          return;
        }
        await wait(Math.max(0, (still.matches ? 0 : 1000) - (performance.now() - t0)));
        gate.classList.remove('is-checking');
        if (ok) {   // every tile lights, they fly into the middle, and the site comes up
          tiles.forEach(t => t.classList.add('is-on'));
          gate.classList.add('is-open');
          await wait(still.matches ? 0 : 420);
          gate.classList.add('is-leaving');
          await wait(still.matches ? 150 : 560);
          document.body.classList.add('is-leaving');
          await wait(still.matches ? 150 : 480);
          location.replace(location.href);
          return;
        }
        void gate.offsetWidth;
        gate.classList.add('is-wrong');
        msg.textContent = 'That is not it. Try again.';
        pass.value = '';
        light();
        pass.focus();
        await wait(900);
        gate.classList.remove('is-wrong');
        busy = false;
      });
    })();
  </script>
</body>
</html>
