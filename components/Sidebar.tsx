"use client";

import React from "react";
import { Home, Heart, Clock, Music2 } from "lucide-react";
import { useAudio } from "@/context/AudioContext";

export default function Sidebar() {
  const { songs, favorites, filterMode, setFilterMode } = useAudio();

  const favCount = songs.filter((s) => favorites.includes(s.filename)).length;

  return (
    <aside className="w-60 bg-[var(--bg-sidebar)] rounded-lg flex flex-col p-3 gap-3 flex-shrink-0 overflow-hidden select-none">
      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        <button
          onClick={() => setFilterMode("all")}
          className={`flex items-center gap-4 h-11 px-3 rounded text-sm font-semibold transition ${
            filterMode === "all"
              ? "bg-white/10 text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
          }`}
        >
          <Home className={`w-5 h-5 ${filterMode === "all" ? "text-[var(--accent)]" : ""}`} />
          <span>Home & Library</span>
        </button>

        <button
          onClick={() => setFilterMode("favorites")}
          className={`flex items-center gap-4 h-11 px-3 rounded text-sm font-semibold transition ${
            filterMode === "favorites"
              ? "bg-white/10 text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
          }`}
        >
          <Heart className={`w-5 h-5 ${filterMode === "favorites" ? "text-[var(--accent)]" : ""}`} />
          <span className="flex-1 text-left">Liked Songs</span>
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-[var(--text-secondary)]">
            {favCount}
          </span>
        </button>

        <button
          onClick={() => setFilterMode("recent")}
          className={`flex items-center gap-4 h-11 px-3 rounded text-sm font-semibold transition ${
            filterMode === "recent"
              ? "bg-white/10 text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
          }`}
        >
          <Clock className={`w-5 h-5 ${filterMode === "recent" ? "text-[var(--accent)]" : ""}`} />
          <span>Recently Played</span>
        </button>
      </nav>

      <div className="h-px bg-[var(--border-subtle)] my-1" />

      {/* Playlist / Collection cards */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
        <div
          onClick={() => setFilterMode("all")}
          className={`flex items-center gap-3 p-2 rounded cursor-pointer transition ${
            filterMode === "all" ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          <div className="w-11 h-11 rounded gradient-music flex items-center justify-center flex-shrink-0">
            <Music2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">Local Tracks</span>
            <span className="text-xs text-[var(--text-secondary)]">{songs.length} tracks</span>
          </div>
        </div>

        <div
          onClick={() => setFilterMode("favorites")}
          className={`flex items-center gap-3 p-2 rounded cursor-pointer transition ${
            filterMode === "favorites" ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          <div className="w-11 h-11 rounded gradient-heart flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">Liked Songs</span>
            <span className="text-xs text-[var(--text-secondary)]">{favCount} tracks</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-2 border-t border-[var(--border-subtle)] flex justify-between text-[11px] text-[var(--text-muted)]">
        <span>Harmonify Web</span>
        <span>v1.1.0</span>
      </div>
    </aside>
  );
}
