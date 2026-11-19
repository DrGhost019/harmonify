"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Howl, Howler } from "howler";
import { Song, LyricsPayload, ThemeId, RepeatMode, FilterMode, SortMode } from "@/types";

interface AudioContextType {
  songs: Song[];
  displayedSongs: Song[];
  currentSong: Song | null;
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  favorites: string[];
  recents: string[];
  queue: Song[];
  lyrics: LyricsPayload | null;
  isLoadingLyrics: boolean;
  activeLyricIndex: number;
  isLyricsOpen: boolean;
  isStarfieldOpen: boolean;
  theme: ThemeId;
  searchQuery: string;
  filterMode: FilterMode;
  sortMode: SortMode;
  isQueueOpen: boolean;
  playSong: (song: Song) => void;
  playSongByIndex: (index: number) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleFavorite: (filename: string) => void;
  setTheme: (theme: ThemeId) => void;
  toggleLyricsOpen: () => void;
  toggleStarfield: () => void;
  toggleQueue: () => void;
  setSearchQuery: (q: string) => void;
  setFilterMode: (f: FilterMode) => void;
  setSortMode: (s: SortMode) => void;
  reloadSongs: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shuffleMode, setShuffleMode] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [lyrics, setLyrics] = useState<LyricsPayload | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(-1);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(true);
  const [isStarfieldOpen, setIsStarfieldOpen] = useState<boolean>(true);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [theme, setThemeState] = useState<ThemeId>("dark");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const howlRef = useRef<Howl | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastVolumeRef = useRef<number>(0.85);
  const shuffledIndicesRef = useRef<number[]>([]);
  const shufflePointerRef = useRef<number>(0);
  const lyricsRef = useRef<LyricsPayload | null>(null);

  // Load initial settings from localStorage on client
  useEffect(() => {
    try {
      const savedTheme = (localStorage.getItem("harmonify_theme") as ThemeId) || "dark";
      setThemeState(savedTheme);
      document.body.className = savedTheme;

      const savedFavs = JSON.parse(localStorage.getItem("harmonify_favorites") || "[]");
      setFavorites(savedFavs);

      const savedRecents = JSON.parse(localStorage.getItem("harmonify_recents") || "[]");
      setRecents(savedRecents);

      const savedVol = parseFloat(localStorage.getItem("harmonify_volume") || "0.85");
      setVolumeState(savedVol);
      Howler.volume(savedVol);

      const savedStarfield = localStorage.getItem("harmonify_starfield") !== "false";
      setIsStarfieldOpen(savedStarfield);

      const savedLyricsOpen = localStorage.getItem("harmonify_lyrics_open") !== "false";
      setIsLyricsOpen(savedLyricsOpen);
    } catch (e) {
      console.warn("Error reading localStorage:", e);
    }

    reloadSongs();
  }, []);

  const reloadSongs = async () => {
    try {
      const res = await fetch("/api/songs");
      if (res.ok) {
        const data = await res.json();
        setSongs(data.songs || []);
      }
    } catch (err) {
      console.error("Failed to load songs from API:", err);
    }
  };

  const currentSong = currentSongIndex >= 0 && currentSongIndex < songs.length ? songs[currentSongIndex] : null;

  // Track progress and active lyric
  const updateProgress = useCallback(() => {
    if (howlRef.current && howlRef.current.playing()) {
      const seekPos = howlRef.current.seek();
      if (typeof seekPos === "number") {
        setCurrentTime(seekPos);

        // Update active lyric line from live ref
        const currentLyrics = lyricsRef.current;
        if (currentLyrics && currentLyrics.lines.length > 0) {
          let idx = -1;
          for (let i = 0; i < currentLyrics.lines.length; i++) {
            const line = currentLyrics.lines[i];
            if (line.time !== null && seekPos >= line.time) {
              idx = i;
            } else if (line.time !== null && seekPos < line.time) {
              break;
            }
          }
          setActiveLyricIndex(idx);
        }
      }
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  // Fetch lyrics when song changes
  const fetchSongLyrics = async (song: Song) => {
    setIsLoadingLyrics(true);
    setLyrics(null);
    lyricsRef.current = null;
    setActiveLyricIndex(-1);

    try {
      const url = `/api/lyrics?filename=${encodeURIComponent(song.filename)}&artist=${encodeURIComponent(song.artist)}&title=${encodeURIComponent(song.title)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: LyricsPayload = await res.json();
        setLyrics(data);
        lyricsRef.current = data;

        // If audio is already active, immediately calculate current lyric line
        if (howlRef.current) {
          const seekPos = howlRef.current.seek();
          if (typeof seekPos === "number" && data.lines.length > 0) {
            let idx = -1;
            for (let i = 0; i < data.lines.length; i++) {
              const line = data.lines[i];
              if (line.time !== null && seekPos >= line.time) {
                idx = i;
              } else if (line.time !== null && seekPos < line.time) {
                break;
              }
            }
            setActiveLyricIndex(idx);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch lyrics:", err);
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const playSongByIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= songs.length) return;
      const song = songs[index];
      setCurrentSongIndex(index);

      // Update recents
      const updatedRecents = [song.filename, ...recents.filter((f) => f !== song.filename)].slice(0, 30);
      setRecents(updatedRecents);
      localStorage.setItem("harmonify_recents", JSON.stringify(updatedRecents));

      if (howlRef.current) {
        howlRef.current.stop();
        howlRef.current.unload();
      }

      const howl = new Howl({
        src: [song.streamUrl],
        html5: true,
        volume: isMuted ? 0 : volume,
        onload: () => {
          const dur = howl.duration();
          if (dur && dur > 0) setDuration(dur);
        },
        onplay: () => {
          setIsPlaying(true);
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = requestAnimationFrame(updateProgress);
        },
        onpause: () => setIsPlaying(false),
        onstop: () => setIsPlaying(false),
        onend: () => {
          if (repeatMode === "one") {
            howl.play();
          } else {
            playNext();
          }
        },
      });

      howlRef.current = howl;
      howl.play();
      fetchSongLyrics(song);

      // Lazily fetch embedded cover art & album details for active song
      if (!song.coverArt) {
        fetch(`/api/metadata?song=${encodeURIComponent(song.filename)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((meta) => {
            if (meta && meta.coverArt) {
              setSongs((prev) =>
                prev.map((s) =>
                  s.id === song.id
                    ? {
                        ...s,
                        coverArt: meta.coverArt,
                        album: meta.album || s.album,
                        title: meta.title || s.title,
                        artist: meta.artist || s.artist,
                      }
                    : s
                )
              );
            }
          })
          .catch(() => {});
      }
    },
    [songs, recents, isMuted, volume, repeatMode, updateProgress]
  );

  const playSong = useCallback(
    (song: Song) => {
      const idx = songs.findIndex((s) => s.id === song.id || s.filename === song.filename);
      if (idx !== -1) playSongByIndex(idx);
    },
    [songs, playSongByIndex]
  );

  const togglePlayPause = useCallback(() => {
    if (!howlRef.current) {
      if (songs.length > 0) playSongByIndex(0);
      return;
    }
    if (howlRef.current.playing()) {
      howlRef.current.pause();
    } else {
      howlRef.current.play();
    }
  }, [songs, playSongByIndex]);

  const generateShuffled = useCallback(() => {
    const indices = songs.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    shuffledIndicesRef.current = indices;
    shufflePointerRef.current = 0;
  }, [songs]);

  const playNext = useCallback(() => {
    if (songs.length === 0) return;
    let nextIdx: number;

    if (shuffleMode) {
      shufflePointerRef.current++;
      if (shufflePointerRef.current >= shuffledIndicesRef.current.length) {
        if (repeatMode === "all") {
          generateShuffled();
          shufflePointerRef.current = 0;
        } else {
          return;
        }
      }
      nextIdx = shuffledIndicesRef.current[shufflePointerRef.current];
    } else {
      if (currentSongIndex < songs.length - 1) {
        nextIdx = currentSongIndex + 1;
      } else if (repeatMode === "all") {
        nextIdx = 0;
      } else {
        return;
      }
    }

    playSongByIndex(nextIdx);
  }, [songs, shuffleMode, repeatMode, currentSongIndex, playSongByIndex, generateShuffled]);

  const playPrev = useCallback(() => {
    if (songs.length === 0) return;
    if (howlRef.current && typeof howlRef.current.seek() === "number" && (howlRef.current.seek() as number) > 3) {
      howlRef.current.seek(0);
      setCurrentTime(0);
      return;
    }

    let prevIdx: number;
    if (shuffleMode) {
      shufflePointerRef.current--;
      if (shufflePointerRef.current < 0) {
        shufflePointerRef.current = 0;
        return;
      }
      prevIdx = shuffledIndicesRef.current[shufflePointerRef.current];
    } else {
      if (currentSongIndex > 0) {
        prevIdx = currentSongIndex - 1;
      } else if (repeatMode === "all") {
        prevIdx = songs.length - 1;
      } else {
        return;
      }
    }

    playSongByIndex(prevIdx);
  }, [songs, shuffleMode, repeatMode, currentSongIndex, playSongByIndex]);

  const seek = (seconds: number) => {
    if (howlRef.current) {
      howlRef.current.seek(seconds);
      setCurrentTime(seconds);

      // Immediately synchronize active lyric line
      const currentLyrics = lyricsRef.current;
      if (currentLyrics && currentLyrics.lines.length > 0) {
        let idx = -1;
        for (let i = 0; i < currentLyrics.lines.length; i++) {
          const line = currentLyrics.lines[i];
          if (line.time !== null && seconds >= line.time) {
            idx = i;
          } else if (line.time !== null && seconds < line.time) {
            break;
          }
        }
        setActiveLyricIndex(idx);
      }

      // Automatically play if paused when user jumps to a part of the song
      if (!howlRef.current.playing()) {
        howlRef.current.play();
        setIsPlaying(true);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    }
  };

  const setVolume = (val: number) => {
    val = Math.max(0, Math.min(1, val));
    setVolumeState(val);
    setIsMuted(val === 0);
    Howler.volume(val);
    if (val > 0) lastVolumeRef.current = val;
    localStorage.setItem("harmonify_volume", val.toString());
  };

  const toggleMute = () => {
    if (isMuted || volume === 0) {
      setVolume(lastVolumeRef.current || 0.85);
    } else {
      lastVolumeRef.current = volume;
      setVolume(0);
    }
  };

  const toggleShuffle = () => {
    const next = !shuffleMode;
    setShuffleMode(next);
    if (next) generateShuffled();
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === "none") return "all";
      if (prev === "all") return "one";
      return "none";
    });
  };

  const toggleFavorite = (filename: string) => {
    setFavorites((prev) => {
      const next = prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename];
      localStorage.setItem("harmonify_favorites", JSON.stringify(next));
      return next;
    });
  };

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    document.body.className = newTheme;
    localStorage.setItem("harmonify_theme", newTheme);
  };

  const toggleLyricsOpen = () => {
    setIsLyricsOpen((prev) => {
      const next = !prev;
      localStorage.setItem("harmonify_lyrics_open", next.toString());
      return next;
    });
  };

  const toggleStarfield = () => {
    setIsStarfieldOpen((prev) => {
      const next = !prev;
      localStorage.setItem("harmonify_starfield", next.toString());
      return next;
    });
  };

  const toggleQueue = () => setIsQueueOpen((prev) => !prev);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);

      if (e.key === " " && !isInput) {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "ArrowLeft" && !isInput) {
        e.preventDefault();
        seek(Math.max(0, currentTime - 5));
      } else if (e.key === "ArrowRight" && !isInput) {
        e.preventDefault();
        seek(Math.min(duration, currentTime + 5));
      } else if (e.key === "ArrowUp" && !isInput) {
        e.preventDefault();
        setVolume(volume + 0.05);
      } else if (e.key === "ArrowDown" && !isInput) {
        e.preventDefault();
        setVolume(volume - 0.05);
      } else if ((e.key === "m" || e.key === "M") && !isInput) {
        e.preventDefault();
        toggleMute();
      } else if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        toggleShuffle();
      } else if (e.ctrlKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        toggleRepeat();
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      } else if (e.key === "Escape") {
        if (isQueueOpen) setIsQueueOpen(false);
        else if (searchQuery) setSearchQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, seek, currentTime, duration, setVolume, volume, toggleMute, toggleShuffle, toggleRepeat, isQueueOpen, searchQuery]);

  // Compute displayed songs based on filter, search, and sort
  const displayedSongs = React.useMemo(() => {
    let result = [...songs];

    if (filterMode === "favorites") {
      result = result.filter((s) => favorites.includes(s.filename));
    } else if (filterMode === "recent") {
      result = recents
        .map((fn) => songs.find((s) => s.filename === fn))
        .filter((s): s is Song => Boolean(s));
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q) ||
          s.filename.toLowerCase().includes(q)
      );
    }

    if (sortMode === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === "artist") {
      result.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (sortMode === "album") {
      result.sort((a, b) => a.album.localeCompare(b.album));
    } else if (sortMode === "duration") {
      result.sort((a, b) => b.duration - a.duration);
    }

    return result;
  }, [songs, filterMode, favorites, recents, searchQuery, sortMode]);

  const queue = songs.slice(currentSongIndex + 1, currentSongIndex + 16);

  return (
    <AudioContext.Provider
      value={{
        songs,
        displayedSongs,
        currentSong,
        currentSongIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        shuffleMode,
        repeatMode,
        favorites,
        recents,
        queue,
        lyrics,
        isLoadingLyrics,
        activeLyricIndex,
        isLyricsOpen,
        isStarfieldOpen,
        theme,
        searchQuery,
        filterMode,
        sortMode,
        isQueueOpen,
        playSong,
        playSongByIndex,
        togglePlayPause,
        playNext,
        playPrev,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        toggleFavorite,
        setTheme,
        toggleLyricsOpen,
        toggleStarfield,
        toggleQueue,
        setSearchQuery,
        setFilterMode,
        setSortMode,
        reloadSongs,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used within an AudioProvider");
  return context;
}
