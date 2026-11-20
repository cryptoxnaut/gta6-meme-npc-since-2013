// gta6-meme-x-01 entry program, v2 "Still waiting for the player since 2013"
// (Node 22, standard library only, no network).
//
// The entry is the X post itself: the house reads the post from X and hands
// its first picture and its text to the judge. This program does two things:
//   1. copies POST.json from the repository root to the output directory,
//      where the gate reads it (that copy is the program's only output file);
//   2. checks the entry's own files and prints a PASS / FAIL report:
//      POST.json parses and is small enough, its url is either a real X post
//      address or the clearly-marked placeholder that means "not posted
//      yet", the handle named in POST.json is the handle in that address,
//      the post text carries the play code and make.fun (or @makefunai),
//      and the meme picture exists and is a real PNG / JPEG / WebP under the
//      size limit.
// It exits 0 when everything checks out (a placeholder url is a warning,
// not a failure: the post goes up later and POST.json is updated then), and
// 1 when something is actually wrong.
//
// The post_url pattern below matches the full X address including the handle
// segment (https://x.com/<handle>/status/<id>); a pattern without the handle
// segment failed the house's own check on v1, so it is written out in full
// here, and the handle in the address is checked against POST.json's handle
// by the post_handle check further down.
//
// Run it the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const POST_URL_PLACEHOLDER = 'TO_BE_FILLED_AFTER_POSTING';
const POST_JSON_MAX_BYTES = 16384;
const MEME_MAX_BYTES = 5_000_000;

const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
function check(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
}

// --- read POST.json -------------------------------------------------------
let post: Record<string, unknown> | null = null;
let postBytes = 0;
try {
  const raw = readFileSync(join(BOT_DIR, 'POST.json'));
  postBytes = raw.length;
  post = JSON.parse(raw.toString('utf8')) as Record<string, unknown>;
  check(
    'post_file',
    post !== null && typeof post === 'object' && !Array.isArray(post) && postBytes <= POST_JSON_MAX_BYTES,
    `POST.json parses as a JSON object, ${postBytes} bytes (cap ${POST_JSON_MAX_BYTES})`,
  );
} catch (err) {
  check('post_file', false, `POST.json could not be read or parsed: ${(err as Error).message}`);
}

// --- the post's address ---------------------------------------------------
const url = typeof post?.url === 'string' ? post.url : '';
const xPostPattern = /^https?:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/([A-Za-z0-9_]+\/status|i\/web\/status)\/\d+$/;
if (url === POST_URL_PLACEHOLDER) {
  check(
    'post_url',
    true,
    `url is the placeholder ${POST_URL_PLACEHOLDER}: post not up yet, fill it in after posting`,
  );
} else {
  check('post_url', xPostPattern.test(url), `url is an X post address: ${url || '(missing)'}`);
}

// --- the post's handle ----------------------------------------------------
// The house refuses a post entered by another account, so the handle named
// in POST.json must be the handle in the post's own address. A url for a
// different handle would otherwise pass the checks above.
const handle = typeof post?.handle === 'string' ? post.handle : '';
const handleInUrl = url.match(
  /^https?:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/([A-Za-z0-9_]+)\/status\/\d+$/,
)?.[3];
if (url === POST_URL_PLACEHOLDER) {
  check(
    'post_handle',
    true,
    'handle check skipped until the post is up (url is still the placeholder)',
  );
} else if (handleInUrl === undefined) {
  check(
    'post_handle',
    handle !== '',
    'url is the i/web/status form, so no handle can be read from it; POST.json names a handle',
  );
} else {
  check(
    'post_handle',
    handle !== '' && handle.toLowerCase() === handleInUrl.toLowerCase(),
    `handle in POST.json (${handle || '(missing)'}) matches the handle in the url (${handleInUrl})`,
  );
}

// --- the post's text ------------------------------------------------------
const text = typeof post?.text === 'string' ? post.text : '';
const playCode = typeof post?.play_code === 'string' ? post.play_code : '';
const codePattern = /^makefun-[a-z]+-[a-z]+-[a-z]+$/;
check(
  'play_code',
  codePattern.test(playCode) && text.includes(playCode),
  `play code ${playCode || '(missing)'} appears in the post text`,
);
const mentionsMakefun = /make\.fun/i.test(text) || /@makefunai/i.test(text);
check(
  'makefun_mention',
  mentionsMakefun,
  'post text carries make.fun (link or written out) and/or @makefunai',
);
check(
  'post_text',
  text.length > 0 && text.length <= 1100,
  `post text is ${text.length} characters (the judge reads about 1100 bytes of it)`,
);

// --- the meme picture -----------------------------------------------------
const candidates = ['meme.png', 'meme.jpg', 'meme.jpeg', 'meme.webp'];
let memeName = '';
let memeBytes = 0;
let memeKind = '';
let memeWidth = 0;
let memeHeight = 0;
for (const name of candidates) {
  try {
    const buf = readFileSync(join(BOT_DIR, name));
    memeName = name;
    memeBytes = buf.length;
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      memeKind = 'PNG';
      // PNG IHDR: width and height are the two big-endian uint32s at bytes 16 and 20.
      memeWidth = buf.readUInt32BE(16);
      memeHeight = buf.readUInt32BE(20);
    } else if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) memeKind = 'JPEG';
    else if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') memeKind = 'WebP';
    break;
  } catch {
    // no such file here; try the next candidate name
  }
}
check(
  'meme_file',
  memeName !== '' && memeKind !== '' && memeBytes > 0 && memeBytes <= MEME_MAX_BYTES,
  memeName === ''
    ? 'no meme.png / meme.jpg / meme.webp in the repository root'
    : `${memeName} is a valid ${memeKind}, ${memeBytes} bytes (cap ${MEME_MAX_BYTES})`,
);
// The judge reads the picture shrunk to 480 by 480, so a square picture
// keeps the composition intact; a PNG carries its size in the header.
check(
  'meme_dimensions',
  memeKind === 'PNG'
    ? memeWidth === 1600 && memeHeight === 1600
    : memeKind !== '',
  memeKind === 'PNG'
    ? `meme.png is ${memeWidth}x${memeHeight} (expected 1600x1600)`
    : `${memeName} is a ${memeKind}, so no header size is read`,
);

// --- copy POST.json to the output directory (the gate reads it there) -----
mkdirSync(OUTPUT_DIR, { recursive: true });
try {
  copyFileSync(join(BOT_DIR, 'POST.json'), join(OUTPUT_DIR, 'POST.json'));
} catch (err) {
  console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}

// --- report ---------------------------------------------------------------
let failures = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}: ${c.detail}`);
  if (!c.ok) failures += 1;
}
if (failures > 0) {
  console.log(`RESULT: FAIL (${failures} check${failures === 1 ? '' : 's'} failed)`);
  process.exit(1);
}
console.log('RESULT: PASS — entry files check out');
