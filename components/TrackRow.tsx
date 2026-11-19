"use client";

import React from "react";
import { Play, Pause, Heart, Music } from "lucide-react";
import { Song } from "@/types";
import { useAudio } from "@/context/AudioContext";

interface TrackRowProps {
  song: Song;
  index: number;
}

export default function TrackRow({ song, index }: TrackRowProps) {
  const { currentSong, isPlaying, playSong, togglePlayPause, favorites, toggleFavorite } = useAudio();

  const isCurrent = currentSong?.filename === song.filename;
  const isCurrentlyPlaying = isCurrent && isPlaying;
  const isFav = favorites.includes(song.filename);

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".fav-btn")) return;
    if (isCurrent) {
      togglePlayPause();
    } else {
      playSong(song);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group grid grid-cols-[40px_minmax(200px,4fr)_minmax(140px,3fr)_44px_72px] items-center px-4 py-2 rounded text-sm text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)] cursor-pointer transition select-none ${
        isCurrent ? "bg-white/10" : ""
      }`}
    >
      {/* 1. Index / Play / Equalizer */}
      <div className="flex items-center w-6">
        {isCurrentlyPlaying ? (
          <>
            <div className="flex items-end gap-0.5 h-3.5 w-3.5 group-hover:hidden">
              <span className="w-1 bg-[var(--accent)] rounded-sm equalizer-bar-1" />
              <span className="w-1 bg-[var(--accent)] rounded-sm equalizer-bar-2" />
              <span className="w-1 bg-[var(--accent)] rounded-sm equalizer-bar-3" />
            </div>
            <button className="hidden group-hover:inline-flex text-[var(--text-primary)]">
              <Pause className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <span className={`tabular-nums group-hover:hidden ${isCurrent ? "text-[var(--accent)] font-bold" : ""}`}>
              {index + 1}
            </span>
            <button className="hidden group-hover:inline-flex text-[var(--text-primary)]">
              <Play className="w-4 h-4 fill-current" />
            </button>
          </>
        )}
      </div>

      {/* 2. Cover & Title (Large) with Artist below */}
      <div className="flex items-center gap-3 overflow-hidden pr-2">
        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-[#282828] relative shadow-sm">
          <img
            src={song.coverArt || `/api/cover?song=${encodeURIComponent(song.filename)}`}
            alt={song.title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const parent = e.currentTarget.parentElement;
              parent?.querySelector(".fallback-icon")?.classList.remove("hidden");
            }}
          />
          <div className="fallback-icon hidden w-full h-full gradient-music flex items-center justify-center absolute inset-0">
            <Music className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="flex flex-col min-w-0 overflow-hidden leading-tight">
          <span
            className={`font-semibold text-sm truncate ${
              isCurrent ? "text-[var(--accent)] font-bold" : "text-[var(--text-primary)]"
            }`}
            title={song.title}
          >
            {song.title}
          </span>
          <span
            className="text-xs text-[var(--text-secondary)] truncate hover:text-[var(--text-primary)] hover:underline mt-0.5"
            title={song.artist}
          >
            {song.artist}
          </span>
        </div>
      </div>

      {/* 3. Album Column */}
      <div
        className="truncate pr-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title={song.album}
      >
        {song.album}
      </div>

      {/* 4. Favorite Heart */}
      <div className="flex justify-center items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(song.filename);
          }}
          className={`fav-btn p-1 transition ${
            isFav
              ? "text-[var(--accent)] opacity-100"
              : "text-[var(--text-secondary)] hover:text-white opacity-0 group-hover:opacity-100"
          }`}
          title={isFav ? "Remove from favorites" : "Save to favorites"}
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* 5. Final Column: Song Duration */}
      <div className="text-right text-xs md:text-sm tabular-nums text-[var(--text-secondary)] pr-3">
        {song.durationFormatted}
      </div>
    </div>
  );
}
