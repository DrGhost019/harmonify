"use client";

import React from "react";
import { Search, Sparkles, X, RefreshCw } from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import { ThemeId } from "@/types";
import Logo from "./Logo";

export default function TopBar() {
  const {
    songs,
    searchQuery,
    setSearchQuery,
    theme,
    setTheme,
    isStarfieldOpen,
    toggleStarfield,
    reloadSongs,
  } = useAudio();

  return (
    <header className="h-14 px-4 flex items-center justify-between gap-4 flex-shrink-0 z-20 select-none">
      {/* Brand & Library Status */}
      <div className="flex items-center gap-4 min-w-[280px]">
        <div className="flex items-center gap-2.5 select-none group">
          <Logo className="w-8 h-8 text-[var(--accent)] flex-shrink-0 transition-transform duration-300 group-hover:scale-105" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-black text-base tracking-tight text-[var(--text-primary)] leading-tight">
              <span>Harmonify</span>
              <span className="text-[var(--text-secondary)] font-normal text-xs hidden lg:inline">— Listen to your dreams</span>
            </div>
            <span className="text-[10px] font-semibold tracking-wider text-[var(--accent)] lg:hidden">
              Listen to your dreams
            </span>
          </div>
        </div>

        {/* Collection Status Pill & Refresh */}
        <button
          onClick={() => reloadSongs()}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          title="Click to refresh local library"
        >
          <RefreshCw className="w-3 h-3 hover:rotate-180 transition-transform duration-500" />
          <span>{songs.length} Tracks</span>
        </button>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-lg flex justify-center">
        <div className="relative w-full flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          <input
            id="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="What do you want to play? (Press '/' to search)"
            className="w-full h-10 pl-10 pr-9 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-sm font-medium border border-transparent hover:border-[var(--border-subtle)] focus:border-[var(--text-primary)] focus:bg-[var(--bg-card-hover)] outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-[var(--text-secondary)] hover:text-white flex items-center justify-center text-xs"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 min-w-[240px] justify-end">
        {/* Starfield Ambient Toggle */}
        <button
          onClick={toggleStarfield}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
            isStarfieldOpen
              ? "bg-[var(--accent)] text-black border-[var(--accent)] shadow-sm"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
          }`}
          title="Toggle Ambient Starfield Animation"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Starfield</span>
        </button>

        {/* Theme Selector Dropdown */}
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeId)}
          className="h-8 px-3 rounded-full text-xs font-semibold bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-focus)] outline-none cursor-pointer transition"
          title="Choose Theme"
        >
          <option value="dark">Spotify Dark</option>
          <option value="black-yellow">Midnight Gold</option>
          <option value="blue">Cyberpunk Blue</option>
          <option value="grass-purple">Emerald Neon</option>
          <option value="purple-yellow">Cyber Violet</option>
          <option value="orange-skyblue">Sunset Orange</option>
          <option value="red-green">Crimson Rose</option>
          <option value="light">Crisp Light</option>
        </select>
      </div>
    </header>
  );
}
