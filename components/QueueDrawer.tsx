"use client";

import React from "react";
import { X, Music } from "lucide-react";
import { useAudio } from "@/context/AudioContext";

export default function QueueDrawer() {
  const { currentSong, queue, isQueueOpen, toggleQueue, playSong } = useAudio();

  if (!isQueueOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 w-84 max-h-[460px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-50 select-none">
      <div className="flex justify-between items-center pb-2 border-b border-[var(--border-subtle)]">
        <h3 className="font-bold text-sm text-[var(--text-primary)]">Play Queue</h3>
        <button
          onClick={toggleQueue}
          className="p-1 rounded-full text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition"
          title="Close Queue"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Now Playing */}
      <div>
        <h4 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          Now Playing
        </h4>
        {currentSong ? (
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-[#282828] relative">
              <img
                src={currentSong.coverArt || `/api/cover?song=${encodeURIComponent(currentSong.filename)}`}
                alt={currentSong.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  e.currentTarget.parentElement?.querySelector(".q-fallback")?.classList.remove("hidden");
                }}
              />
              <div className="q-fallback hidden w-full h-full gradient-music flex items-center justify-center absolute inset-0">
                <Music className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-[var(--accent)] truncate">
                {currentSong.title}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] truncate">
                {currentSong.artist}
              </span>
            </div>
            <span className="text-[11px] tabular-nums text-[var(--text-muted)] pr-1">
              {currentSong.durationFormatted}
            </span>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)] p-2">No song playing</div>
        )}
      </div>

      {/* Next Up */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <h4 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          Next Up
        </h4>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {queue.length > 0 ? (
            queue.map((song) => (
              <div
                key={song.filename}
                onClick={() => playSong(song)}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition group"
              >
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-[#282828] relative">
                  <img
                    src={song.coverArt || `/api/cover?song=${encodeURIComponent(song.filename)}`}
                    alt={song.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      e.currentTarget.parentElement?.querySelector(".q-item-fallback")?.classList.remove("hidden");
                    }}
                  />
                  <div className="q-item-fallback hidden w-full h-full gradient-music flex items-center justify-center absolute inset-0">
                    <Music className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate">
                    {song.title}
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)] truncate">
                    {song.artist}
                  </span>
                </div>
                <span className="text-[11px] tabular-nums text-[var(--text-muted)] pr-1">
                  {song.durationFormatted}
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-[var(--text-muted)] py-4 text-center">Queue is empty</div>
          )}
        </div>
      </div>
    </div>
  );
}
