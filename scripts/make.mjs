#!/usr/bin/env node
// Uso: node scripts/make.mjs "Billie Jean" "Michael Jackson" [--duration 15|30] [--start 52] [--bpm 117] [--no-render]
//      node scripts/make.mjs public/songs/<slug>/song.json
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const duration = Number(flag('duration', 30)); const start = flag('start'); const bpm = flag('bpm');
const noRender = args.includes('--no-render'); if (noRender) args.splice(args.indexOf('--no-render'), 1);
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const missing = [];
const found = (dir, base, exts) => exts.map((e) => `${base}.${e}`).find((f) => fs.existsSync(path.join(dir, f)));

let cfg, dir;
if (args[0]?.endsWith('.json')) { cfg = JSON.parse(fs.readFileSync(args[0], 'utf8')); dir = path.dirname(args[0]); }
else {
  const [title, artist] = args; if (!title || !artist) { console.error('Falta título y artista.'); process.exit(1); }
  const slug = slugify(`${artist}-${title}`); dir = `public/songs/${slug}`; fs.mkdirSync(dir, {recursive: true});
  const jf = path.join(dir, 'song.json');
  cfg = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')) : {slug, title, artist, audioStart: 0, colors: {primary: '#b44cff', secondary: '#5b2bff', accent: '#ff5aa5'}};
}
const slug = cfg.slug; cfg.duration = duration === 15 ? 15 : 30;
if (start !== undefined) cfg.audioStart = Number(start); if (bpm) cfg.bpm = Number(bpm);

// 1) Metadatos + portada (iTunes Search API pública)
if (!found(dir, 'cover', ['jpg', 'png'])) {
  try {
    const r = await fetch(`https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${encodeURIComponent(cfg.title + ' ' + cfg.artist)}`, {signal: AbortSignal.timeout(15000)});
    const hit = (await r.json()).results?.[0];
    if (!hit) throw new Error('sin resultados');
    cfg.title = hit.trackName; cfg.artist = hit.artistName; cfg.album = hit.collectionName;
    const img = await fetch(hit.artworkUrl100.replace('100x100bb', '1000x1000bb')); fs.writeFileSync(path.join(dir, 'cover.jpg'), Buffer.from(await img.arrayBuffer()));
  } catch (e) { missing.push(`PORTADA/metadatos: no se pudieron descargar (${e.message}). Pon la imagen en ${dir}/cover.jpg`); }
}
const cover = found(dir, 'cover', ['jpg', 'png', 'jpeg']); cfg.cover = cover && `songs/${slug}/${cover}`;
// 2) Foto del artista (sin fuente automática: aporta tú una con derechos)
const photo = found(dir, 'photo', ['png', 'jpg', 'jpeg']); cfg.photo = photo && `songs/${slug}/${photo}`;
if (!photo) missing.push(`FOTO del artista: falta ${dir}/photo.png (PNG recortado ideal). Se usa la portada en su lugar.`);
// 3) Colores desde la portada (ffmpeg -> 16x16 RGB, elige los más vivos)
if (cover && !cfg.colorsLocked) {
  const px = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(dir, cover), '-vf', 'scale=16:16', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 1e6});
  const list = []; for (let i = 0; i < px.length; i += 3) { const [r, g, b] = [px[i], px[i + 1], px[i + 2]]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); list.push({r, g, b, s: (mx - mn) * (0.4 + mx / 255)}); }
  list.sort((a, b) => b.s - a.s); const pick = [list[0]]; for (const c of list) if (pick.length < 3 && pick.every((p) => Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) > 140)) pick.push(c);
  const boost = ({r, g, b}) => '#' + [r, g, b].map((v) => Math.min(255, Math.round(v * 1.15 + 15)).toString(16).padStart(2, '0')).join('');
  while (pick.length < 3) pick.push(pick[0]); cfg.colors = {primary: boost(pick[0]), secondary: boost(pick[1]), accent: boost(pick[2])};
}
// 4) Audio: archivo autorizado en la carpeta (audio.mp3/wav/m4a/flac) -> recorte con ffmpeg
const src = found(dir, 'source', ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg']);
// 4b) Letras (lyrics.pdf/.txt) + audio -> alineación forzada automática y elección del estribillo (scripts/align_lyrics.py)
if (src && found(dir, 'lyrics', ['pdf', 'txt']) && !args.includes('--no-align')) {
  try {
    execFileSync('python3', ['scripts/align_lyrics.py', dir, '--duration', String(cfg.duration)], {stdio: 'inherit'});
    const an = JSON.parse(fs.readFileSync(path.join(dir, 'analysis.json'), 'utf8'));
    if (start === undefined) cfg.audioStart = an.audioStart; cfg.bpm = an.bpm; cfg.beats = an.beats;
    cfg.alignReport = JSON.parse(fs.readFileSync(path.join(dir, 'lyrics.align.json'), 'utf8')).lines.filter((l) => l.approx).map((l) => `${l.start}s "${l.text}"`);
  } catch (e) { missing.push('ALINEACIÓN automática falló (' + e.message + '). Pon lyrics.lrc manualmente.'); }
}
if (src) {
  fs.mkdirSync('.cache', {recursive: true});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(cfg.audioStart), '-t', String(cfg.duration), '-i', path.join(dir, src), '-b:a', '256k', path.join(dir, 'clip.mp3')]);
  cfg.audio = `songs/${slug}/clip.mp3`;
} else if (!(cfg.audio && fs.existsSync(`public/${cfg.audio}`))) { cfg.audio = undefined; missing.push(`AUDIO: falta ${dir}/source.mp3 (archivo que tengas autorizado). El video saldrá SIN sonido.`); }
// 5) Letras sincronizadas: lyrics.lrc propio/licenciado ([mm:ss.xx] texto). Marcas: *rosa*  _cursiva_
const lrc = found(dir, 'lyrics', ['lrc']);
if (lrc) {
  const al = fs.existsSync(path.join(dir, 'lyrics.align.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'lyrics.align.json'), 'utf8')).lines : [];
  cfg.lyrics = fs.readFileSync(path.join(dir, lrc), 'utf8').split('\n').map((l) => l.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.+)$/)).filter(Boolean).map((m, i) => ({t: +m[1] * 60 + +m[2], ...(al[i] ? {end: al[i].end} : {}), text: m[3].trim()}));
}
else missing.push(`LETRAS: falta ${dir}/lyrics.pdf o lyrics.lrc con marcas de tiempo. Sin ellas la escena 3 muestra solo título y artista (no se inventan letras).`);

if (src) cfg.songLength = Math.round(+execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, src)]).toString());
fs.writeFileSync(path.join(dir, 'song.json'), JSON.stringify(cfg, null, 2));
if (cfg.alignReport?.length) console.log(`ℹ Líneas con alineación aproximada: ${cfg.alignReport.join(' | ')}`);
console.log(`\n== ${cfg.title} — ${cfg.artist} (${cfg.duration}s) ==`);
missing.forEach((m) => console.log('⚠ FALTA ' + m));
if (noRender) process.exit(0);
const out = `out/${slug}-${cfg.duration}s.mp4`; fs.mkdirSync('out', {recursive: true});
const chrome = process.env.CHROME_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
try {
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', 'MusicVideo', out, `--props=${path.join(dir, 'song.json')}`, ...(chrome ? [`--browser-executable=${chrome}`, '--chrome-mode=chrome-for-testing'] : [])], {stdio: 'inherit'});
  console.log(`\n✅ Video exportado: ${out}`);
} catch { console.error('\n❌ El render falló: NO se generó el MP4.'); process.exit(1); }
