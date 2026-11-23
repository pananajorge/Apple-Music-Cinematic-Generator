export type LyricLine = {t: number; text: string}; // t = segundos en la CANCIÓN. Marcado: *rosa*  _cursiva rosa_
export type Colors = {primary: string; secondary: string; accent: string};
export type SongConfig = {
  slug: string;
  title: string;
  artist: string;
  album?: string;
  duration: 15 | 30;
  cover?: string; // ruta relativa a /public
  photo?: string; // foto del artista (PNG recortado ideal)
  audio?: string; // fragmento ya cortado
  audioStart: number; // segundo de la canción donde empieza el fragmento
  bpm?: number;
  lyrics?: LyricLine[];
  colors: Colors;
};
