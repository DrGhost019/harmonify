export interface Song {
  id: number;
  filename: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  durationFormatted: string;
  coverArt: string | null;
  streamUrl: string;
}

export interface LyricLine {
  time: number | null;
  text: string;
}

export interface LyricsPayload {
  source: string;
  synced: string | null;
  plain: string | null;
  lines: LyricLine[];
}

export type ThemeId =
  | "dark"
  | "black-yellow"
  | "blue"
  | "grass-purple"
  | "purple-yellow"
  | "orange-skyblue"
  | "red-green"
  | "light";

export type RepeatMode = "none" | "all" | "one";
export type FilterMode = "all" | "favorites" | "recent";
export type SortMode = "default" | "title" | "artist" | "album" | "duration";
