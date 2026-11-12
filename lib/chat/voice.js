import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';

// Voice messages recorded in the browser arrive as WebM/Opus (Chrome, Android), Ogg/Opus
// (Firefox) or MP4/AAC (iPhone). The platforms want something else:
//   WhatsApp  -> Ogg/Opus, which shows as a voice note
//   Messenger -> MP3, which plays as an audio clip
// so every recording is re-encoded with ffmpeg before it is sent.
//
// ffmpeg only ever reads the one temp file we write: the input format is forced from a short
// allowlist (checked against the file's first bytes) and only the "file" protocol is allowed,
// so a crafted upload can't make it open playlists, URLs or other files.

export const MAX_VOICE_BYTES = 10 * 1024 * 1024;
const MAX_SECONDS = 300;
const TIMEOUT_MS = 60000;

const webm = { demux: 'matroska', ok: b => b.length > 4 && b.readUInt32BE(0) === 0x1a45dfa3 };
const INPUT = {
  'audio/webm': webm,
  'video/webm': webm,
  'audio/ogg': { demux: 'ogg', ok: b => b.slice(0, 4).toString('ascii') === 'OggS' },
  'audio/mp4': { demux: 'mov', ok: b => b.slice(4, 8).toString('ascii') === 'ftyp' },
  'audio/x-m4a': { demux: 'mov', ok: b => b.slice(4, 8).toString('ascii') === 'ftyp' },
};

const OUTPUT = {
  whatsapp: { args: ['-c:a', 'libopus', '-b:a', '32k', '-ac', '1', '-ar', '48000', '-application', 'voip', '-f', 'ogg'], mime: 'audio/ogg', ext: '.ogg' },
  messenger: { args: ['-c:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', '-ar', '44100', '-f', 'mp3'], mime: 'audio/mpeg', ext: '.mp3' },
};

export class VoiceError extends Error {
  constructor(code) { super(code); this.code = code; }
}

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let err = '';
    p.stderr.on('data', d => { if (err.length < 4000) err += d; });
    const timer = setTimeout(() => p.kill('SIGKILL'), TIMEOUT_MS);
    p.on('error', e => { clearTimeout(timer); reject(e); });
    p.on('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(err.trim().split('\n').pop() || `ffmpeg exit ${code}`)); });
  });
}

// buffer + recorded mime -> { buffer, mime, name } ready for sendMessage().
export async function toVoice(buffer, mime, platform) {
  const m = String(mime || '').split(';')[0].trim().toLowerCase();
  const input = INPUT[m];
  if (!input || !input.ok(buffer)) throw new VoiceError('unsupported_type');
  if (buffer.length > MAX_VOICE_BYTES) throw new VoiceError('file_too_large');
  if (!ffmpegPath) throw new VoiceError('voice_failed');
  const out = OUTPUT[platform === 'messenger' ? 'messenger' : 'whatsapp'];

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppvoice-'));
  const inFile = path.join(dir, 'in');
  const outFile = path.join(dir, `out${out.ext}`);
  try {
    fs.writeFileSync(inFile, buffer);
    await run([
      '-hide_banner', '-nostdin', '-loglevel', 'error', '-protocol_whitelist', 'file',
      '-f', input.demux, '-i', inFile,
      '-vn', '-sn', '-dn', '-map_metadata', '-1', '-t', String(MAX_SECONDS),
      ...out.args, '-y', outFile,
    ]);
    const result = fs.readFileSync(outFile);
    if (!result.length) throw new Error('empty output');
    return { buffer: result, mime: out.mime, name: `voice-${crypto.randomBytes(4).toString('hex')}${out.ext}` };
  } catch (e) {
    if (e instanceof VoiceError) throw e;
    console.warn('voice convert failed:', e.message);
    throw new VoiceError('voice_failed');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
