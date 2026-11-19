"use client";

import React, { useMemo } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Mic2,
  ListMusic,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  Music2,
} from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import WaveformTimeline from "./WaveformTimeline";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function BottomPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffleMode,
    repeatMode,
    favorites,
    isLyricsOpen,
    isQueueOpen,
    togglePlayPause,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    toggleLyricsOpen,
    toggleQueue,
  } = useAudio();

  const isFav = currentSong ? favorites.includes(currentSong.filename) : false;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  const VolumeIcon = useMemo(() => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  }, [isMuted, volume]);

  return (
    <footer className="h-[84px] bg-[var(--bg-player)] border-t border-[var(--border-subtle)] grid grid-cols-[minmax(180px,1fr)_minmax(320px,2fr)_minmax(180px,1fr)] items-center px-4 z-40 select-none">
      {/* Left: Track Details */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-[#282828] relative shadow-md">
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
                  parent?.querySelector(".fallback-player-icon")?.classList.remove("hidden");
                }}
              />
              <div className="fallback-player-icon hidden w-full h-full gradient-music flex items-center justify-center absolute inset-0">
                <Music2 className="w-6 h-6 text-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full gradient-music flex items-center justify-center">
              <Music2 className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        <div className="flex flex-col overflow-hidden max-w-[180px] md:max-w-[240px]">
          <span
            className="text-sm font-semibold text-[var(--text-primary)] truncate"
            title={currentSong ? `${currentSong.title} • ${currentSong.album}` : undefined}
          >
            {currentSong ? currentSong.title : "No song selected"}
          </span>
          <span
            className="text-xs text-[var(--text-secondary)] truncate hover:text-[var(--text-primary)] hover:underline mt-0.5"
            title={currentSong ? currentSong.artist : undefined}
          >
            {currentSong ? currentSong.artist : "Harmonify"}
          </span>
        </div>

        {currentSong && (
          <button
            onClick={() => toggleFavorite(currentSong.filename)}
            className={`p-1.5 transition ${
              isFav ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-white"
            }`}
            title={isFav ? "Remove from Liked Songs" : "Save to Liked Songs"}
          >
            <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex flex-col items-center gap-1.5">
        {/* Buttons */}
        <div className="flex items-center gap-5">
          <button
            onClick={toggleShuffle}
            className={`transition relative hover:scale-110 ${
              shuffleMode ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-white"
            }`}
            title="Toggle Shuffle (Ctrl+S)"
          >
            <Shuffle className="w-4 h-4" />
            {shuffleMode && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />}
          </button>

          <button
            onClick={playPrev}
            className="text-[var(--text-secondary)] hover:text-white hover:scale-110 transition"
            title="Previous (Left Arrow)"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 shadow transition"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={playNext}
            className="text-[var(--text-secondary)] hover:text-white hover:scale-110 transition"
            title="Next (Right Arrow)"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`transition relative hover:scale-110 ${
              repeatMode !== "none" ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-white"
            }`}
            title={`Repeat: ${repeatMode} (Ctrl+R)`}
          >
            {repeatMode === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            {repeatMode !== "none" && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />
            )}
          </button>
        </div>

        {/* Animated Waveform Scrubber */}
        <div className="w-full max-w-xl flex items-center gap-2.5">
          <span className="text-[11px] tabular-nums text-[var(--text-secondary)] min-w-[34px] text-right font-medium">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 flex items-center">
            <WaveformTimeline
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              songKey={currentSong?.filename || "harmonify"}
              onSeek={seek}
            />
          </div>
          <span className="text-[11px] tabular-nums text-[var(--text-secondary)] min-w-[34px] font-medium">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Lyrics, Queue, Volume */}
      <div className="flex items-center justify-end gap-3.5">
        <button
          onClick={toggleLyricsOpen}
          className={`transition hover:scale-110 ${
            isLyricsOpen ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-white"
          }`}
          title="Toggle Lyrics"
        >
          <Mic2 className="w-4 h-4" />
        </button>

        <button
          onClick={toggleQueue}
          className={`transition hover:scale-110 ${
            isQueueOpen ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-white"
          }`}
          title="Toggle Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Volume */}
        <div className="flex items-center gap-2 w-32">
          <button
            onClick={toggleMute}
            className="text-[var(--text-secondary)] hover:text-white transition"
            title="Mute / Unmute (M)"
          >
            <VolumeIcon className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center h-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volumePercent}
              onChange={(e) => setVolume(parseFloat(e.target.value) / 100)}
              className="w-full h-1 hover:h-1.5 transition-all"
              style={{
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${volumePercent}%, var(--slider-bg) ${volumePercent}%, var(--slider-bg) 100%)`,
              }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
