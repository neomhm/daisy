<?php
ob_start();   // nothing printed by accident (a server warning, say) may stop the sign-in cookie being set
/* The password gate for the whole site.

   .htaccess sends every page of the site here (the rules are in deploy/gate.htaccess; deploying
   puts them in the live .htaccess). A visitor who has signed in gets the page they asked for;
   anyone else gets the sign-in screen below. Pictures, fonts, styles and scripts are not gated.

   Signing in sets a cookie that lasts 30 days. It is signed with a key that this file makes on the
   server the first time it runs and keeps outside the website's folder, so the key is never in the
   repository; deleting that file (/home/akiki/.akiki-gate-key) signs everybody out. The password is
   kept here only as a bcrypt hash: to change it, put the output of
   php -r 'echo password_hash("NEW PASSWORD", PASSWORD_BCRYPT, ["cost" => 13]);'
   in GATE_HASH. The name is checked whatever its capitals, the password exactly (spaces around
   either are left out). /?signout signs this browser out.

   The sign-in form is sent to /gate.php itself, never to a page's address: some servers drop what a
   form carries when its address is quietly handed over to a script. The screen also sends the name
   and password in a header of its own (X-Akiki-Sign-In), which reaches the server either way.

   When signing in fails, the screen says why: the name, the password, nothing reaching the server
   (with what the server did receive), or (right after a good sign-in) the sign-in not being kept by
   the browser or not read back by the server.
   SESSIONS AND TRY-IT TICKETS (2026-10-08): the cookie also carries a random SESSION id (32 hex) and
   the IDENTITY of who signed in, both under its signature (exp.sid.identity.signature), so two
   browsers are told apart. While the gate has one shared name and password the identity is
   "shared:<name>"; per-person accounts would set the person's own id in gate_identity_for() and
   nothing else changes. A cookie of the older form (exp.signature) still signs in and is given a
   session id the next time a page is loaded. /gate.php?tryit=... carries the Workbench's Try it: the
   page's question goes into a private spool with one ticket for it, and Daisy's worker on our own
   machine fetches it and posts the answer back (see "TRY IT" below); the secret that signs tickets
   and the worker's requests is never in this repository: it is the file /home/akiki/.akiki-tryit-secret.
   Without it, Try it says it is not switched on. */

const GATE_USER = 'Tul1p';
const GATE_HASH = '$2y$13$n3k3Jytb7kIXmH5IjPkXvOGKar7A9HyTxeS9xl6kKA8lw3zZd.dsm';
const GATE_DAYS = 30;
const GATE_COOKIE = 'akiki_gate';

// The signing key: made once, kept outside the site's folder (or, failing that, in a file Apache never serves).
function gate_key() {
  $places = [dirname(__DIR__) . '/.akiki-gate-key', __DIR__ . '/.ht-akiki-gate-key'];
  foreach ($places as $f) {
    if (@is_file($f) && @is_readable($f)) {
      $k = trim((string) @file_get_contents($f));
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

// The password's bcrypt hash: the file /home/akiki/.akiki-gate-hash when it is there (outside the site and
// this public repository: put a new, long password's hash there and the one below stops counting), else GATE_HASH.
function gate_hash() {
  $f = dirname(__DIR__) . '/.akiki-gate-hash';
  if (@is_file($f) && @is_readable($f)) {
    $h = trim((string) @file_get_contents($f, false, null, 0, 200));
    if (preg_match('/^\$2y\$\d\d\$[.\/A-Za-z0-9]{53}$/D', $h)) return $h;
  }
  return GATE_HASH;
}
function gate_sign($exp, $key) {   // the older cookie form, still accepted
  return hash_hmac('sha256', 'akiki-gate|' . $exp, $key);
}
function gate_sign2($exp, $sid, $ident, $key) {
  return hash_hmac('sha256', 'akiki-gate|v2|' . $exp . '|' . $sid . '|' . $ident, $key);
}
// Who signed in, as the try-it service is told: the HOOK for per-person accounts (return the
// person's own id here, 1-48 of a-z 0-9 _ : -). Today there is one shared name.
function gate_identity_for($user) {
  return 'shared:' . substr(preg_replace('/[^a-z0-9_-]/', '', strtolower((string) $user)), 0, 40);
}
function gate_new_sid() {
  return bin2hex(random_bytes(16));
}
function gate_cookie_value($exp, $sid, $ident, $key) {
  return $exp . '.' . $sid . '.' . $ident . '.' . gate_sign2($exp, $sid, $ident, $key);
}
// The sign-in cookie this request brought: ['state' => 'ok' | 'none' | 'old' (expired) | 'bad' (not
// signed with our key), 'exp', 'sid', 'ident']; sid is null for a cookie of the older form.
function gate_cookie_read($key) {
  $r = ['state' => 'bad', 'exp' => 0, 'sid' => null, 'ident' => null];
  $c = isset($_COOKIE[GATE_COOKIE]) ? (string) $_COOKIE[GATE_COOKIE] : '';
  if ($c === '') { $r['state'] = 'none'; return $r; }
  if (preg_match('/^(\d{10})\.([0-9a-f]{32})\.([a-z0-9_:-]{1,48})\.([0-9a-f]{64})$/D', $c, $m)) {
    if (!hash_equals(gate_sign2($m[1], $m[2], $m[3], $key), $m[4])) return $r;
    return ['state' => ((int) $m[1] < time()) ? 'old' : 'ok', 'exp' => (int) $m[1], 'sid' => $m[2], 'ident' => $m[3]];
  }
  if (preg_match('/^(\d{10})\.([0-9a-f]{64})$/D', $c, $m)) {
    if (!hash_equals(gate_sign($m[1], $key), $m[2])) return $r;
    return ['state' => ((int) $m[1] < time()) ? 'old' : 'ok', 'exp' => (int) $m[1], 'sid' => null, 'ident' => gate_identity_for(GATE_USER), 'old' => $c];
  }
  return $r;
}
// A cookie of the older form, signed in: given a session id (its expiry kept). -> the session id.
function gate_upgrade(&$read, $key) {
  if ($read['state'] !== 'ok' || $read['sid'] !== null) return $read['sid'];
  // derived from the old cookie itself, so one old cookie is ONE session however often it is replayed
  // without taking the new cookie (review 2026-10-08)
  $read['sid'] = substr(hash_hmac('sha256', 'akiki-gate|sid|' . $read['old'], $key), 0, 32);
  gate_cookie(gate_cookie_value($read['exp'], $read['sid'], $read['ident'], $key), $read['exp']);
  return $read['sid'];
}

function gate_cookie($value, $exp) {
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
  header('Set-Cookie: ' . GATE_COOKIE . '=' . $value . '; Expires=' . gmdate('D, d M Y H:i:s', $exp) . ' GMT; Max-Age='
    . max(0, $exp - time()) . '; Path=/; HttpOnly; SameSite=Lax' . ($https ? '; Secure' : ''), false);
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

// An address on this site to send the browser back to (never another site's, nor the gate itself).
function gate_local($uri) {
  $uri = (string) $uri;
  if ($uri === '' || $uri[0] !== '/' || substr($uri, 0, 2) === '//' || strpos($uri, '\\') !== false
      || preg_match('/[\x00-\x1f]/', $uri) || strpos($uri, '/gate.php') === 0) return '/';
  return $uri;
}
function gate_here() {
  return gate_local(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/');
}

// The name and password sent: from the form's fields; else from the request's body, read
// directly; else from the X-Akiki-Sign-In header (base64 of "name", a new line, "password").
function gate_credentials() {
  $user = isset($_POST['user']) ? (string) $_POST['user'] : '';
  $pass = isset($_POST['pass']) ? (string) $_POST['pass'] : '';
  if ($user === '' && $pass === '') {
    $body = [];
    parse_str((string) @file_get_contents('php://input'), $body);
    $user = isset($body['user']) ? (string) $body['user'] : '';
    $pass = isset($body['pass']) ? (string) $body['pass'] : '';
  }
  if ($user === '' && $pass === '' && isset($_SERVER['HTTP_X_AKIKI_SIGN_IN'])) {
    $pair = explode("\n", (string) base64_decode((string) $_SERVER['HTTP_X_AKIKI_SIGN_IN'], true), 2);
    if (count($pair) === 2) list($user, $pass) = $pair;
  }
  return [strtolower(trim($user)), trim($pass)];
}

// What the server received, when the name and password did not get through (no secrets in it).
function gate_saw() {
  $type = isset($_SERVER['CONTENT_TYPE']) ? (string) $_SERVER['CONTENT_TYPE'] : '';
  return 'got ' . $_SERVER['REQUEST_METHOD'] . ' ' . (preg_replace('/;.*/', '', $type) ?: 'no type')
    . ', ' . strlen((string) @file_get_contents('php://input')) . ' of '
    . (isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : '?') . ' bytes, '
    . (isset($_SERVER['HTTP_X_AKIKI_SIGN_IN']) ? 'header' : 'no header') . ', '
    . (count($_POST) ? count($_POST) . ' fields' : 'no fields') . ', '
    . substr(isset($_SERVER['SERVER_SOFTWARE']) ? (string) $_SERVER['SERVER_SOFTWARE'] : 'server', 0, 24)
    . ', PHP ' . PHP_VERSION;
}

// ---- TRY IT (the Workbench's "Try it"), a PULL design (Laurent, 2026-10-08): nothing on our own
// machine listens to the internet. Daisy's worker there asks THIS file for questions and posts the
// answers back; the visitor's page and the worker never meet.
//
// THE PAGE (signed in; header X-Akiki-Ticket: 1, same origin; a header of our own that another site's
// page cannot send without a CORS preflight, which this file never answers):
//   POST /gate.php?tryit=ask   body: {"message": ..., "tables"?: ...} (the exact bytes are kept)
//        -> {"ok": true, "rid"}  the question is in the spool, with a TICKET minted for it:
//           v1.SID.IDENTITY.RID.EXP.H.MAC   MAC = HMAC-SHA256(secret, "akiki-tryit|v1|SID|IDENTITY|RID|EXP|H")
//           SID the browser session (in the signed cookie), RID 128 random bits, EXP now + 60 s, H the
//           sha256 of the body. The worker checks the ticket ITSELF and keeps its own limits.
//   POST /gate.php?tryit=wait  body: {"rid"} -> {"done": false} while it waits (at most WAIT_S; one wait
//        per session and a few in all at a time), or {"done": true, "status", "answer"} once (the
//        answer file is deleted as it is read), only to the session that asked.
// THE WORKER (no cookie; header X-Tryit-Worker: v1.TS.NONCE.MAC, MAC = HMAC-SHA256(secret,
// "akiki-tryit-worker|v1|ACTION|TS|NONCE|sha256(body)"), TS within 60 s, each NONCE accepted once):
//   POST /gate.php?tryit=poll    -> {"job": {"rid", "ticket", "body", "ip"}} or {"job": null} after at
//                                   most POLL_S; every poll is the worker's heartbeat
//   POST /gate.php?tryit=answer  body: {"rid", "status", "answer"} -> {"ok": true}
// THE SPOOL: /home/akiki/.akiki-tryit-spool (0700, outside the site), one file per request, named only
// from hex the server made: q.RID.SID (waiting), c.RID.SID (claimed by the worker, an atomic rename),
// a.RID.SID (answered); ledgers of recent asks (s.SID per session, i.ADDR per address, g for all),
// w.* wait locks, n/ the worker's nonces. Everything stale is swept on every call: nothing a visitor
// typed stays more than two minutes (60 s waiting + 30 s claimed + 30 s answered). The secret is
// /home/akiki/.akiki-tryit-secret (0600), never in this repository; without it Try it is off.
const TRYIT_TTL = 60;
const TRYIT_PAGE_ORIGINS = ['https://akiki.ai', 'https://www.akiki.ai'];
const TRYIT_BODY_MAX = 24576;        // the page's request, as the worker's own ceiling
const TRYIT_ANSWER_MAX = 131072;     // what the worker may post back
const TRYIT_WAIT_S = 8;              // one page wait (a PHP process held; the page asks again)
const TRYIT_WAITS_AT_ONCE = 4;       // page waits held at once, in all (the site's PHP processes are few)
const TRYIT_POLL_S = 20;             // one worker poll (well under the 30 s limit and Cloudflare's 100 s)
const TRYIT_AWAY_S = 45;             // no poll for this long: "Daisy is not reachable right now"
const TRYIT_QUEUE_MAX = 30;          // questions waiting or being answered, in all
const TRYIT_SPOOL_BYTES = 4194304;   // questions and answers, in all
const TRYIT_SESSION_PER_MIN = 8;     // asks per browser session
const TRYIT_ADDR_PER_MIN = 12;       // asks per client address (an IPv6 address counts by its /64)
const TRYIT_ALL_PER_MIN = 60;        // asks from everybody together
const TRYIT_MIN_LEFT = 15;           // a question whose ticket has less left than this is not handed out
// Cloudflare's published ranges (https://www.cloudflare.com/ips-v4, ips-v6; 2026-10-08): only a request
// that comes FROM one of them may name the visitor's address in CF-Connecting-IP.
const TRYIT_CF = ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18',
  '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14',
  '172.64.0.0/13', '131.0.72.0/22', '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
  '2a06:98c0::/29', '2c0f:f248::/32'];
function tryit_out($status, $data) {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  if ($data !== null) echo json_encode($data);
}
function tryit_secret() {
  $f = dirname(__DIR__) . '/.akiki-tryit-secret';
  if (!@is_file($f) || !@is_readable($f) || (@fileperms($f) & 0077)) return null;   // readable by its owner only (chmod 600)
  $v = trim((string) @file_get_contents($f, false, null, 0, 200));
  return preg_match('/^[0-9a-f]{64}$/D', $v) ? $v : null;
}
function tryit_spool() {
  $d = dirname(__DIR__) . '/.akiki-tryit-spool';
  foreach ([$d, "$d/n"] as $x) {
    if (!@is_dir($x) && !@mkdir($x, 0700) && !@is_dir($x)) return null;
    @chmod($x, 0700);
  }
  return $d;
}
function tryit_body($max) {
  $len = isset($_SERVER['CONTENT_LENGTH']) ? (string) $_SERVER['CONTENT_LENGTH'] : '';
  if (!preg_match('/^[0-9]{1,7}$/D', $len) || (int) $len < 1 || (int) $len > $max) return null;
  $raw = (string) @file_get_contents('php://input', false, null, 0, $max + 1);
  return strlen($raw) === (int) $len ? $raw : null;
}
// Files older than their life are removed. -> [questions waiting or claimed, bytes of q/c/a].
function tryit_sweep($d) {
  $now = time();
  $life = ['q' => TRYIT_TTL, 'c' => 30, 'a' => 30, 's' => 60, 'i' => 60, 'g' => 60, 't' => 60, 'w' => 3600];
  $n = 0; $bytes = 0;
  foreach ((array) @scandir($d) as $f) {
    if ($f === '.' || $f === '..' || $f === 'n' || $f === 'seen' || $f === 'lock' || strncmp($f, 'w.slot', 6) === 0) continue;
    $p = "$d/$f";
    $m = @filemtime($p);
    $k = $f[0];
    if ($m === false) continue;
    if (!isset($life[$k]) || $now - $m > $life[$k]) { @unlink($p); continue; }
    if ($k === 'q' || $k === 'c') $n++;
    if ($k === 'q' || $k === 'c' || $k === 'a') $bytes += (int) @filesize($p);
  }
  foreach ((array) @scandir("$d/n") as $f) {
    if ($f !== '.' && $f !== '..' && $now - (int) @filemtime("$d/n/$f") > 180) @unlink("$d/n/$f");
  }
  return [$n, $bytes];
}
function tryit_put($d, $name, $data) {   // written whole, then renamed into place
  $tmp = "$d/t." . bin2hex(random_bytes(8));
  if (@file_put_contents($tmp, $data, LOCK_EX) !== strlen($data)) { @unlink($tmp); return false; }
  @chmod($tmp, 0600);
  if (!@rename($tmp, "$d/$name")) { @unlink($tmp); return false; }
  return true;
}
// A ledger of recent times (unix seconds, one per line): -> the ones younger than 60 s.
function tryit_recent($d, $name, $now) {
  return array_values(array_filter(explode("\n", (string) @file_get_contents("$d/$name")), function ($t) use ($now) {
    return $t !== '' && ctype_digit($t) && $now - (int) $t < 60;
  }));
}
function tryit_page_ok() {
  $origin = isset($_SERVER['HTTP_ORIGIN']) ? (string) $_SERVER['HTTP_ORIGIN'] : '';
  $site = isset($_SERVER['HTTP_SEC_FETCH_SITE']) ? (string) $_SERVER['HTTP_SEC_FETCH_SITE'] : '';
  return !(($origin !== '' && !in_array($origin, TRYIT_PAGE_ORIGINS, true)) || ($site !== '' && $site !== 'same-origin')
    || !isset($_SERVER['HTTP_X_AKIKI_TICKET']) || $_SERVER['HTTP_X_AKIKI_TICKET'] !== '1');
}
function tryit_in_cidr($ip, $cidr) {
  list($net, $bits) = explode('/', $cidr);
  $a = @inet_pton($ip); $b = @inet_pton($net);
  if ($a === false || $b === false || strlen($a) !== strlen($b)) return false;
  $bits = (int) $bits;
  $whole = intdiv($bits, 8);
  if (substr($a, 0, $whole) !== substr($b, 0, $whole)) return false;
  if ($bits % 8 === 0) return true;
  $mask = chr((0xff << (8 - $bits % 8)) & 0xff);
  return (substr($a, $whole, 1) & $mask) === (substr($b, $whole, 1) & $mask);
}
// The visitor's address, canonical: CF-Connecting-IP only from Cloudflare itself (anyone reaching this
// server directly would otherwise choose their own), an IPv6 address by its /64 (one visitor has 2^64).
function tryit_client_ip() {
  $peer = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
  $ip = $peer;
  $cf = isset($_SERVER['HTTP_CF_CONNECTING_IP']) ? trim((string) $_SERVER['HTTP_CF_CONNECTING_IP']) : '';
  if ($cf !== '' && filter_var($cf, FILTER_VALIDATE_IP)) {
    foreach (TRYIT_CF as $c) { if (tryit_in_cidr($peer, $c)) { $ip = $cf; break; } }
  }
  $bin = @inet_pton($ip);
  if ($bin === false) return 'unknown';
  if (strlen($bin) === 16) return inet_ntop(substr($bin, 0, 8) . str_repeat("\0", 8)) . '/64';
  return inet_ntop($bin);
}
function tryit_worker_ok($secret, $action, $raw, $d) {
  $h = isset($_SERVER['HTTP_X_TRYIT_WORKER']) ? (string) $_SERVER['HTTP_X_TRYIT_WORKER'] : '';
  if (!preg_match('/^v1\.([0-9]{10})\.([0-9a-f]{32})\.([0-9a-f]{64})$/D', $h, $m)) return false;
  if (abs(time() - (int) $m[1]) > 60) return false;
  $want = hash_hmac('sha256', "akiki-tryit-worker|v1|$action|{$m[1]}|{$m[2]}|" . hash('sha256', $raw), $secret);
  if (!hash_equals($want, $m[3])) return false;
  $fh = @fopen("$d/n/{$m[2]}", 'x');   // each nonce once: 'x' fails when the file exists
  if ($fh === false) return false;
  fclose($fh);
  return true;
}
function tryit_route($key) {
  $act = (string) $_GET['tryit'];
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Allow: POST'); tryit_out(405, ['ok' => false]); return; }
  if (function_exists('set_time_limit')) @set_time_limit(TRYIT_POLL_S + 15);
  $secret = tryit_secret();
  $d = tryit_spool();
  if ($act === 'poll' || $act === 'answer') {
    $raw = tryit_body($act === 'answer' ? TRYIT_ANSWER_MAX : 1024);
    if ($secret === null || $d === null || $raw === null || !tryit_worker_ok($secret, $act, $raw, $d)) { tryit_out(401, null); return; }
    $act === 'poll' ? tryit_poll($d) : tryit_answer($d, $raw);
    return;
  }
  if ($act !== 'ask' && $act !== 'wait') { tryit_out(404, ['ok' => false]); return; }
  if (!tryit_page_ok()) { tryit_out(403, ['ok' => false]); return; }
  $read = gate_cookie_read($key);
  if ($read['state'] !== 'ok') { tryit_out(401, ['ok' => false, 'why' => 'signin']); return; }
  $sid = (string) gate_upgrade($read, $key);
  $ident = (string) $read['ident'];
  if (!preg_match('/^[0-9a-f]{32}$/D', $sid) || !preg_match('/^[a-z0-9_:-]{1,48}$/D', $ident)) { tryit_out(401, ['ok' => false, 'why' => 'signin']); return; }
  if ($secret === null || $d === null) { tryit_out(503, ['ok' => false, 'why' => 'off']); return; }
  $act === 'ask' ? tryit_ask($d, $secret, $sid, $ident) : tryit_wait($d, $sid);
}
function tryit_away($d) {
  $m = @filemtime("$d/seen");
  return $m === false || time() - $m > TRYIT_AWAY_S;
}
function tryit_ask($d, $secret, $sid, $ident) {
  $raw = tryit_body(TRYIT_BODY_MAX);
  if ($raw === null) { tryit_out(413, ['ok' => false]); return; }
  $j = json_decode($raw, true);
  if (!is_array($j) || !isset($j['message']) || !is_string($j['message'])) { tryit_out(400, ['ok' => false]); return; }
  $lock = @fopen("$d/lock", 'c');
  if ($lock === false || !flock($lock, LOCK_EX)) { tryit_out(503, ['ok' => false, 'why' => 'busy']); return; }
  try {
    clearstatcache();
    list($n, $bytes) = tryit_sweep($d);    // swept first, whatever comes next
    if (tryit_away($d)) { tryit_out(503, ['ok' => false, 'why' => 'away']); return; }
    // what this session left behind when its page gave up: an unread answer, a question not yet taken
    foreach ((array) glob("$d/[qa].*.$sid") as $old) { @unlink($old); }
    if (glob("$d/c.*.$sid")) { tryit_out(429, ['ok' => false, 'why' => 'one']); return; }   // one being answered right now
    clearstatcache();
    list($n, $bytes) = tryit_sweep($d);
    if ($n >= TRYIT_QUEUE_MAX || $bytes + strlen($raw) > TRYIT_SPOOL_BYTES) { tryit_out(503, ['ok' => false, 'why' => 'busy']); return; }
    $now = time();
    $addr = substr(hash('sha256', 'akiki-tryit-addr|' . tryit_client_ip() . '|' . $secret), 0, 32);
    $ls = tryit_recent($d, "s.$sid", $now); $li = tryit_recent($d, "i.$addr", $now); $lg = tryit_recent($d, 'g', $now);
    if (count($lg) >= TRYIT_ALL_PER_MIN) { tryit_out(503, ['ok' => false, 'why' => 'busy']); return; }
    if (count($ls) >= TRYIT_SESSION_PER_MIN || count($li) >= TRYIT_ADDR_PER_MIN) { tryit_out(429, ['ok' => false, 'why' => 'rate']); return; }
    $rid = bin2hex(random_bytes(16));
    $exp = (string) ($now + TRYIT_TTL);
    $h = hash('sha256', $raw);
    $mac = hash_hmac('sha256', "akiki-tryit|v1|$sid|$ident|$rid|$exp|$h", $secret);
    $job = json_encode(['rid' => $rid, 'ticket' => "v1.$sid.$ident.$rid.$exp.$h.$mac", 'body' => $raw, 'ip' => tryit_client_ip()]);
    $ls[] = $li[] = $lg[] = (string) $now;
    if ($job === false || !tryit_put($d, "q.$rid.$sid", $job) || !tryit_put($d, "s.$sid", implode("\n", $ls))
        || !tryit_put($d, "i.$addr", implode("\n", $li)) || !tryit_put($d, 'g', implode("\n", $lg))) { tryit_out(503, ['ok' => false, 'why' => 'busy']); return; }
    tryit_out(200, ['ok' => true, 'rid' => $rid]);
  } finally {
    flock($lock, LOCK_UN);
    fclose($lock);
  }
}
function tryit_wait($d, $sid) {
  $raw = tryit_body(200);
  $j = $raw === null ? null : json_decode($raw, true);
  $rid = is_array($j) && isset($j['rid']) && is_string($j['rid']) ? $j['rid'] : '';
  if (!preg_match('/^[0-9a-f]{32}$/D', $rid)) { tryit_out(400, ['ok' => false]); return; }
  tryit_sweep($d);   // swept here too, whether Daisy's machine is there or not: nothing typed outlives its time
  // one wait per session, and a few in all: each holds one of the site's few PHP processes
  $mine = @fopen("$d/w.$sid", 'c');
  if ($mine === false || !flock($mine, LOCK_EX | LOCK_NB)) { tryit_out(429, ['ok' => false, 'why' => 'waiting']); return; }
  @touch("$d/w.$sid");   // in use: not swept
  $slot = null;
  for ($i = 0; $i < TRYIT_WAITS_AT_ONCE && $slot === null; $i++) {
    $s = @fopen("$d/w.slot$i", 'c');
    if ($s !== false && flock($s, LOCK_EX | LOCK_NB)) $slot = $s; elseif ($s !== false) fclose($s);
  }
  $end = microtime(true) + ($slot === null ? 0 : TRYIT_WAIT_S);   // no slot free: answer at once, the page asks again
  $out = ['done' => false];
  do {
    clearstatcache();
    $a = "$d/a.$rid.$sid";
    if (is_file($a)) {
      $got = (string) @file_get_contents($a, false, null, 0, TRYIT_ANSWER_MAX + 1);
      @unlink($a);
      $ans = json_decode($got, true);
      $out = is_array($ans) ? ['done' => true, 'status' => (int) $ans['status'], 'answer' => isset($ans['answer']) ? $ans['answer'] : null]
                            : ['done' => true, 'status' => 500, 'answer' => null];
      break;
    }
    if (!is_file("$d/q.$rid.$sid") && !is_file("$d/c.$rid.$sid")) {
      clearstatcache();
      if (is_file($a)) continue;   // the answer landed between the two looks (it is written before the claim goes)
      $out = ['done' => true, 'status' => 410, 'answer' => null];   // expired, or never this session's
      break;
    }
    if (tryit_away($d)) { $out = ['done' => true, 'status' => 503, 'why' => 'away', 'answer' => null]; break; }
    if (microtime(true) >= $end) break;
    usleep(250000);
  } while (true);
  if ($slot !== null) { flock($slot, LOCK_UN); fclose($slot); }
  flock($mine, LOCK_UN);
  fclose($mine);
  tryit_out(200, $out);
}
function tryit_beat($d) {   // the worker's heartbeat: "Daisy is not reachable" when it is older than TRYIT_AWAY_S
  @touch("$d/seen");
}
function tryit_poll($d) {
  tryit_beat($d);
  $end = microtime(true) + TRYIT_POLL_S;
  do {
    clearstatcache();
    tryit_sweep($d);
    $qs = (array) glob("$d/q.*");
    usort($qs, function ($x, $y) { return (int) @filemtime($x) - (int) @filemtime($y); });
    foreach ($qs as $q) {
      if (!preg_match('#/q\.([0-9a-f]{32})\.([0-9a-f]{32})$#D', $q, $m)) continue;
      $c = "$d/c.{$m[1]}.{$m[2]}";
      if (!@rename($q, $c)) continue;   // another poll claimed it first: rename is atomic
      @touch($c);
      $job = json_decode((string) @file_get_contents($c), true);
      $exp = is_array($job) && isset($job['ticket']) && is_string($job['ticket']) ? (int) (explode('.', $job['ticket'])[4] ?? 0) : 0;
      if ($exp - time() < TRYIT_MIN_LEFT) { @unlink($c); continue; }   // too late to answer in time: dropped, the page says so
      tryit_out(200, ['job' => $job]);
      return;
    }
    tryit_beat($d);
    usleep(300000);
  } while (microtime(true) < $end);
  tryit_out(200, ['job' => null]);
}
function tryit_answer($d, $raw) {
  $j = json_decode($raw, true);
  $rid = is_array($j) && isset($j['rid']) && is_string($j['rid']) ? $j['rid'] : '';
  if (!preg_match('/^[0-9a-f]{32}$/D', $rid) || !isset($j['status']) || !is_int($j['status'])) { tryit_out(400, ['ok' => false]); return; }
  $cs = (array) glob("$d/c.$rid.*");
  if (count($cs) !== 1 || !preg_match('#/c\.[0-9a-f]{32}\.([0-9a-f]{32})$#D', $cs[0], $m)) { tryit_out(404, ['ok' => false]); return; }
  $data = json_encode(['status' => $j['status'], 'answer' => isset($j['answer']) && is_array($j['answer']) ? $j['answer'] : null]);
  if ($data === false || !tryit_put($d, "a.$rid.{$m[1]}", $data)) { tryit_out(503, ['ok' => false]); return; }
  @unlink($cs[0]);
  tryit_out(200, ['ok' => true]);
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

if (isset($_GET['tryit']) && is_string($_GET['tryit'])) {
  tryit_route($key);
  exit;
}
if (isset($_GET['signout'])) {
  gate_cookie('', 1);
  header('Location: /', true, 303);
  exit;
}

$failed = '';   // why signing in just failed: 'name', 'password' or 'empty'
$saw = '';
$read = gate_cookie_read($key);
$cookie = $read['state'];
$to = gate_local(isset($_POST['to']) ? $_POST['to'] : gate_here());   // the page to go on to
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  list($user, $pass) = gate_credentials();
  $name_ok = hash_equals(strtolower(GATE_USER), $user);
  $pass_ok = password_verify($pass, gate_hash());   // checked whatever the name, every time
  $ok = $name_ok && $pass_ok;
  if ($ok) {
    $exp = time() + GATE_DAYS * 86400;
    gate_cookie(gate_cookie_value($exp, gate_new_sid(), gate_identity_for(GATE_USER), $key), $exp);
  } else {
    usleep(900000);   // slows down guessing
    $failed = ($user === '' && $pass === '') ? 'empty' : ($name_ok ? 'password' : 'name');
    if ($failed === 'empty') $saw = gate_saw();
  }
  if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => $ok, 'why' => $failed, 'saw' => $saw]);
    exit;
  }
  if ($ok) {
    header('Location: ' . $to, true, 303);
    exit;
  }
} elseif ($cookie === 'ok') {
  if (strpos((string) parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH), '/gate.php') === 0) {
    header('Location: /', true, 303);   // signed in already: on to the site
    exit;
  }
  gate_upgrade($read, $key);
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
    .saw { display: block; margin-top: 4px; color: rgba(255, 255, 255, .45); font-size: 10px; line-height: 1.35; overflow-wrap: anywhere; user-select: all; }
    .saw:empty { display: none; }
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
  <main class="gate<?php if ($failed) echo ' is-wrong'; ?>" data-cookie="<?php echo $cookie; ?>">
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
    <form class="panel" method="post" action="/gate.php" autocomplete="on">
      <input type="hidden" name="to" value="<?php echo htmlspecialchars($to, ENT_QUOTES, 'UTF-8'); ?>">
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
      <p class="msg" role="status"><?php
        $why = ['name' => 'That is not the name.', 'password' => 'That is not the password.',
                'empty' => 'The name and password did not reach the server.'];
        if ($failed) echo $why[$failed];
      ?><small class="saw"><?php echo htmlspecialchars($saw, ENT_QUOTES, 'UTF-8'); ?></small></p>
    </form>
  </main>
  <script>
    (() => {
      const gate = document.querySelector('.gate');
      const form = gate.querySelector('form');
      const user = form.querySelector('#user'), pass = form.querySelector('#pass');
      const msg = form.querySelector('.msg');
      const tell = (text, saw) => {   // the message under the key, and what the server received, if told
        msg.textContent = text;
        if (!saw) return;
        const small = document.createElement('small');
        small.className = 'saw';
        small.textContent = saw;
        msg.append(small);
      };
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
      const WHY = {
        name: 'That is not the name.',
        password: 'That is not the password.',
        empty: 'The name and password did not reach the server.',
      };
      // Signed in a moment ago, yet back here: the sign-in was not kept, or not read back.
      try {
        const just = +sessionStorage.getItem('akiki-gate-in') || 0;
        sessionStorage.removeItem('akiki-gate-in');
        if (Date.now() - just < 20000) {
          tell(gate.dataset.cookie === 'none'
            ? 'The password was right, but this browser did not keep the sign-in. Are cookies blocked for this site?'
            : 'The password was right, but the server could not read the sign-in back.');
        }
      } catch (err) { /* no storage: nothing to tell */ }
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
        let ok = false, why = '', saw = '';
        try {
          // To /gate.php itself, as a plain form, with the name and password in a header as well.
          const pair = new TextEncoder().encode(user.value + '\n' + pass.value);
          const r = await fetch('/gate.php', {
            method: 'POST',
            body: new URLSearchParams(new FormData(form)),
            headers: { Accept: 'application/json', 'X-Akiki-Sign-In': btoa(String.fromCharCode(...pair)) },
            credentials: 'same-origin',
          });
          const answer = await r.json();
          ok = answer.ok === true;
          why = answer.why || '';
          saw = answer.saw || '';
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
          try { sessionStorage.setItem('akiki-gate-in', String(Date.now())); } catch (err) { /* fine */ }
          location.replace(location.href);
          return;
        }
        void gate.offsetWidth;
        gate.classList.add('is-wrong');
        tell(WHY[why] || 'That did not work. Try again.', saw);
        if (why !== 'name') pass.value = '';
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
