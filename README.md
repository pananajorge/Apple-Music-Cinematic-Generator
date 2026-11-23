# Apple Music Cinematic Generator

Plantilla maestra Remotion (1080×1920, 30 fps) para videos de 15 / 30 s. Solo cambian los datos de `song.json`; las escenas no se tocan.

## Generar un video
```bash
npm install
node scripts/make.mjs "Billie Jean" "Michael Jackson" --duration 30 --start 52 --bpm 117
```
El script: busca metadatos + portada (iTunes Search API), saca los colores de la portada, recorta el audio con ffmpeg, lee letras y renderiza `out/<slug>-30s.mp4`. Al terminar lista **exactamente lo que falta**.

Carpeta de la canción: `public/songs/<slug>/`
| Archivo | Para qué | Si falta |
|---|---|---|
| `cover.jpg` | portada (se descarga sola si hay red) | degradado de colores |
| `photo.png` | foto del artista (PNG recortado ideal) | se usa la portada |
| `source.mp3` | audio que tengas autorizado | video sin sonido |
| `lyrics.lrc` | letras con tiempos `[00:52.30] texto` (tuyas/licenciadas) | escena 3 muestra título y artista |

Marcado en letras: `*palabra*` = rosa, `_palabra_` = cursiva elegante rosa.
`--start` = segundo de la canción donde empieza el clip (hazlo coincidir con el estribillo); `--bpm` ajusta los cortes de escena al pulso.

Vista previa: `npm run studio`. Ejemplo: `npm run example` → `out/example-30s.mp4`.
Si Chromium no se descarga, define `CHROME_PATH=/ruta/a/chrome`.

## Estructura
`src/timeline.ts` tiempos · `src/scenes/` Intro(1+2), Lyrics(3), Artist(4), Player(5+6) · `src/theme.tsx` easing, ambiente, pulso.
