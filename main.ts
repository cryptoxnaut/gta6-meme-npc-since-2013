// main.ts — entry verifier for the gta6-meme-x-01 meme (v2).
//
// What this program does, in plain terms: it reads POST.json, the file that
// names the X post carrying the meme, and runs eight checks over it and over
// meme.png. It prints one PASS/FAIL line per check and exits 0 only when
// every check passes. It also copies POST.json into the output directory,
// because the gate reads the post's address from there, not from the repo.
//
// It needs nothing but the Node standard library, and it never touches the
// network. The grader runs it with MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// set; run it locally the same way:
//
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The eight checks:
//   1. post_file       — POST.json parses as a JSON object.
//   2. post_url        — its url is an X post address, with the handle in it.
//   3. post_handle     — the handle in POST.json is the handle in the url.
//   4. play_code       — the play code shows in the post's text.
//   5. makefun_mention — the post's text carries make.fun and/or @makefunai.
//   6. post_text       — the post's text fits X's 280-character limit.
//   7. meme_file       — meme.png exists, is a real PNG, and is not oversized.
//   8. meme_dimensions — meme.png is 1600 by 1600 pixels.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const POST_PATH = join(BOT_DIR, 'POST.json');
const MEME_PATH = join(BOT_DIR, 'meme.png');

// The meme file must stay under this many bytes. The picture we ship is
// about 2.3 MB, so five megabytes leaves room without letting a stray
// multi-megabyte file through.
const MEME_MAX_BYTES = 5_000_000;

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

type Outcome = { name: string; ok: boolean; detail: string };

const outcomes: Outcome[] = [];

function record(name: string, ok: boolean, detail: string): void {
  outcomes.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
}

function readPostFile(): { raw: Buffer | null; parsed: Record<string, unknown> } {
  let raw: Buffer | null = null;
  try {
    raw = readFileSync(POST_PATH);
  } catch {
    raw = null;
  }
  if (raw === null) {
    return { raw: null, parsed: {} };
  }
  try {
    const parsed: unknown = JSON.parse(raw.toString('utf8'));
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return { raw, parsed: parsed as Record<string, unknown> };
    }
    return { raw, parsed: {} };
  } catch {
    return { raw, parsed: {} };
  }
}

function fieldString(post: Record<string, unknown>, key: string): string {
  const value: unknown = post[key];
  return typeof value === 'string' ? value : '';
}

const { raw: postRaw, parsed: post } = readPostFile();

// 1. post_file — POST.json must parse as a JSON object.
record(
  'post_file',
  postRaw !== null && Object.keys(post).length > 0,
  postRaw === null
    ? `could not read ${POST_PATH}`
    : Object.keys(post).length > 0
      ? `POST.json parses as a JSON object with ${Object.keys(post).length} fields`
      : 'POST.json does not parse as a JSON object',
);

const url = fieldString(post, 'url');
const handle = fieldString(post, 'handle');
const text = fieldString(post, 'text');
const playCode = fieldString(post, 'play_code');

// 2. post_url — an X post address of the form
// https://x.com/<handle>/status/<digits>. The handle segment is part of the
// pattern on purpose: an address without it is not a post anyone can open.
// The id must also be a real post id: digits only, and under 2^64, the
// range the gate accepts for an X status id.
const urlPattern = /^https:\/\/x\.com\/([A-Za-z0-9_]{1,15})\/status\/([0-9]+)$/;
const urlMatch = urlPattern.exec(url);
const urlIdInRange =
  urlMatch !== null && BigInt(urlMatch[2]) < 18446744073709551616n;
record(
  'post_url',
  urlMatch !== null && urlIdInRange,
  urlMatch === null
    ? `url is not an X post address: ${url || '(missing)'}`
    : !urlIdInRange
      ? `status id ${urlMatch[2]} is outside the 64-bit range`
      : `url is an X post address for @${urlMatch[1]}, status ${urlMatch[2]}`,
);

// 3. post_handle — the handle POST.json names must be the handle in the url.
const urlHandle = urlMatch !== null ? urlMatch[1] : '';
record(
  'post_handle',
  handle.length > 0 && urlHandle.length > 0 && handle.toLowerCase() === urlHandle.toLowerCase(),
  handle.length === 0
    ? 'POST.json names no handle'
    : urlHandle.length === 0
      ? 'no handle could be read from the url'
      : handle.toLowerCase() === urlHandle.toLowerCase()
        ? `handle @${handle} matches the handle in the url`
        : `handle @${handle} does not match the handle in the url (@${urlHandle})`,
);

// 4. play_code — the play code must appear in the post's text, as written.
record(
  'play_code',
  playCode.length > 0 && text.includes(playCode),
  playCode.length === 0
    ? 'POST.json names no play code'
    : text.includes(playCode)
      ? `play code ${playCode} appears in the post text`
      : `play code ${playCode} does not appear in the post text`,
);

// 5. makefun_mention — the post's text must carry make.fun (as a link or
// written out) and/or a tag of @makefunai.
const hasMakefunLink = /make\.fun/i.test(text);
const hasMakefunTag = /@makefunai(?![A-Za-z0-9_])/i.test(text);
record(
  'makefun_mention',
  hasMakefunLink || hasMakefunTag,
  hasMakefunLink && hasMakefunTag
    ? 'post text carries both make.fun and @makefunai'
    : hasMakefunLink
      ? 'post text carries make.fun'
      : hasMakefunTag
        ? 'post text carries @makefunai'
        : 'post text carries neither make.fun nor @makefunai',
);

// 6. post_text — the post's text must fit inside X's 280-character limit.
// Characters are counted by code point, so one emoji counts as one.
const textLength = Array.from(text).length;
record(
  'post_text',
  textLength > 0 && textLength <= 280,
  `post text is ${textLength} characters (limit 280)`,
);

// 7. meme_file — meme.png must exist, start with the PNG signature, and stay
// under the size cap.
let memeBytes: Buffer | null = null;
let memeDetail = '';
if (!existsSync(MEME_PATH)) {
  memeDetail = `meme.png is missing from ${BOT_DIR}`;
} else {
  memeBytes = readFileSync(MEME_PATH);
  const looksLikePng =
    memeBytes.length >= 8 && PNG_MAGIC.every((byte, i) => memeBytes?.[i] === byte);
  if (!looksLikePng) {
    memeDetail = `meme.png is ${memeBytes.length} bytes but does not start with the PNG signature`;
  } else if (memeBytes.length > MEME_MAX_BYTES) {
    memeDetail = `meme.png is a valid PNG but ${memeBytes.length} bytes, over the ${MEME_MAX_BYTES}-byte cap`;
  } else {
    memeDetail = `meme.png is a valid PNG, ${memeBytes.length} bytes`;
  }
}
record(
  'meme_file',
  memeBytes !== null &&
    memeBytes.length >= 8 &&
    PNG_MAGIC.every((byte, i) => memeBytes?.[i] === byte) &&
    memeBytes.length <= MEME_MAX_BYTES,
  memeDetail,
);

// 8. meme_dimensions — the picture must be 1600 by 1600. A PNG stores its
// width and height as big-endian 32-bit numbers inside the IHDR chunk that
// follows the 8-byte signature: the chunk's length takes bytes 8-11, the
// letters IHDR take bytes 12-15, the width takes bytes 16-19, and the
// height takes bytes 20-23.
let width = 0;
let height = 0;
if (memeBytes !== null && memeBytes.length >= 29) {
  width = memeBytes.readUInt32BE(16);
  height = memeBytes.readUInt32BE(20);
}
record(
  'meme_dimensions',
  width === 1600 && height === 1600,
  width === 0 && height === 0
    ? 'could not read dimensions from meme.png'
    : `meme.png is ${width}x${height} (expected 1600x1600)`,
);

// The gate reads POST.json from the output directory, so hand it over.
// This is a copy, not a check: the eight checks above decide the exit code,
// but a failed copy still fails the run, because the gate would find nothing.
let copied = false;
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyFileSync(POST_PATH, join(OUTPUT_DIR, 'POST.json'));
  copied = true;
} catch (err) {
  console.error(`could not copy POST.json to ${OUTPUT_DIR}: ${(err as Error).message}`);
}

const passed = outcomes.filter((outcome) => outcome.ok).length;
console.log(`${passed}/${outcomes.length} checks passed`);
process.exit(passed === outcomes.length && copied ? 0 : 1);
