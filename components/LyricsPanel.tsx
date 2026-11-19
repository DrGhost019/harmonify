"use client";

import React, { useEffect, useRef } from "react";
import { X, Music2, Disc3, Play } from "lucide-react";
import { useAudio } from "@/context/AudioContext";

function formatLineTime(seconds: number | null): string {
  if (seconds === null || isNaN(seconds)) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function LyricsPanel() {
  const {
    currentSong,
    lyrics,
    isLoadingLyrics,
    activeLyricIndex,
    isLyricsOpen,
    duration,
    toggleLyricsOpen,
    seek,
  } = useAudio();

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active lyric line smoothly to center of container
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeLineRef.current;
      const topOffset = el.offsetTop - container.offsetTop;
      const centerPos = topOffset - container.clientHeight / 2 + el.clientHeight / 2;
      container.scrollTo({
        top: Math.max(0, centerPos),
        behavior: "smooth",
      });
    }
  }, [activeLyricIndex]);

  if (!isLyricsOpen) return null;

  const handleLineClick = (lineTime: number | null, idx: number) => {
    if (lineTime !== null) {
      seek(lineTime);
    } else if (duration > 0 && lyrics && lyrics.lines.length > 0) {
      seek((idx / lyrics.lines.length) * duration);
    }
  };

  return (
    <aside className="w-84 md:w-96 bg-[var(--bg-sidebar)] rounded-lg flex flex-col p-4 gap-4 flex-shrink-0 overflow-hidden select-none shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <h3 className="font-bold text-sm text-[var(--text-primary)]">Now Playing</h3>
        <button
          onClick={toggleLyricsOpen}
          className="p-1 rounded-full text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Album Artwork & Details Card */}
      <div className="flex flex-col gap-3 flex-shrink-0">
        <div className="w-full aspect-square rounded-xl shadow-2xl overflow-hidden bg-[#242424] relative">
          {currentSong ? (
            <>
              <img
                key={currentSong.filename}
                src={currentSong.coverArt || `/api/cover?song=${encodeURIComponent(currentSong.filename)}`}
                alt={currentSong.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  parent?.querySelector(".fallback-lyrics-icon")?.classList.remove("hidden");
                }}
              />
              <div className="fallback-lyrics-icon hidden w-full h-full gradient-music flex items-center justify-center absolute inset-0">
                <Music2 className="w-16 h-16 text-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full gradient-music flex items-center justify-center">
              <Music2 className="w-16 h-16 text-white" />
            </div>
          )}
        </div>

        <div className="flex flex-col overflow-hidden">
          <h2
            className="text-lg font-black text-[var(--text-primary)] truncate"
            title={currentSong?.title}
          >
            {currentSong ? currentSong.title : "No track playing"}
          </h2>
          <p
            className="text-xs font-semibold text-[var(--text-secondary)] truncate hover:text-[var(--text-primary)] hover:underline mt-0.5"
            title={currentSong?.artist}
          >
            {currentSong ? currentSong.artist : "Select a song to start"}
          </p>
          {currentSong?.album && (
            <div
              className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] truncate mt-1"
              title={currentSong.album}
            >
              <Disc3 className="w-3.5 h-3.5 flex-shrink-0 text-[var(--accent)]" />
              <span className="truncate">{currentSong.album}</span>
            </div>
          )}
        </div>
      </div>

      {/* Full-Height Synced Lyrics Container */}
      <div className="flex-1 bg-[var(--bg-card)] rounded-xl p-4 flex flex-col overflow-hidden relative border border-white/5">
        {/* Lyrics Status Badge */}
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">
              {isLoadingLyrics
                ? "Finding Lyrics..."
                : lyrics?.synced
                ? "Synced Lyrics"
                : lyrics?.lines.length
                ? "Lyrics"
                : "No Lyrics"}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-medium">
            {lyrics?.lines.length ? "Click any line to jump" : ""}
          </span>
        </div>

        {/* Scrollable Lyric Lines */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto space-y-3 pr-2 scroll-smooth py-6 mask-fade"
        >
          {isLoadingLyrics ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span>Syncing song lyrics...</span>
            </div>
          ) : lyrics && lyrics.lines.length > 0 ? (
            lyrics.lines.map((line, idx) => {
              const isActive = idx === activeLyricIndex;
              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleLineClick(line.time, idx)}
                  className={`group relative p-2.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-between ${
                    isActive
                      ? "text-[var(--accent)] text-lg md:text-xl font-black scale-[1.03] origin-left bg-white/5 shadow-sm"
                      : "text-white/40 hover:text-white hover:bg-white/10 text-sm md:text-base font-bold hover:scale-[1.01] origin-left"
                  }`}
                >
                  <span className="flex-1 leading-snug">{line.text}</span>

                  {/* Play hint on hover */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex items-center gap-1 text-[11px] text-[var(--accent)] flex-shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {line.time !== null && (
                      <span className="tabular-nums font-semibold">
                        {formatLineTime(line.time)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-xs text-[var(--text-secondary)] text-center p-4">
              <Music2 className="w-8 h-8 text-[var(--text-muted)] mb-2" />
              <p>{currentSong ? "No lyrics available for this track" : "Play a song to view synced lyrics"}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
