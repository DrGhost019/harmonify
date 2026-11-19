"use client";

import React, { useMemo } from "react";
import { Play, Pause, Shuffle, Clock, Music2, Heart } from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import TrackRow from "./TrackRow";
import { SortMode } from "@/types";

export default function MainView() {
  const {
    displayedSongs,
    songs,
    isPlaying,
    togglePlayPause,
    playSongByIndex,
    shuffleMode,
    toggleShuffle,
    filterMode,
    setFilterMode,
    sortMode,
    setSortMode,
    searchQuery,
  } = useAudio();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const bannerTitle = useMemo(() => {
    if (filterMode === "favorites") return "Liked Songs";
    if (filterMode === "recent") return "Recently Played";
    if (searchQuery.trim() !== "") return `Search: "${searchQuery}"`;
    return "Local Library";
  }, [filterMode, searchQuery]);

  return (
    <main className="flex-1 bg-[var(--bg-base)] rounded-lg overflow-y-auto overflow-x-hidden relative flex flex-col select-none">
      {/* Hero Header */}
      <div className="p-8 pb-4 flex flex-col gap-6" style={{ background: "var(--hero-gradient)" }}>
        {/* Dynamic Greeting */}
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">{greeting}</h2>
          <span className="text-sm text-[var(--text-secondary)]">Welcome back to your music collection</span>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          <div
            onClick={() => {
              setFilterMode("favorites");
              if (displayedSongs.length > 0) playSongByIndex(displayedSongs[0].id);
            }}
            className="group flex items-center bg-white/10 hover:bg-white/20 rounded h-14 overflow-hidden cursor-pointer transition relative"
          >
            <div className="w-14 h-14 gradient-heart flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="font-bold text-sm px-3 truncate flex-1 text-[var(--text-primary)]">Liked Songs</span>
            <button className="w-9 h-9 rounded-full bg-[var(--accent)] text-black flex items-center justify-center mr-3 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition shadow-lg hover:scale-105">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>
          </div>

          <div
            onClick={() => {
              setFilterMode("all");
              if (displayedSongs.length > 0) playSongByIndex(displayedSongs[0].id);
            }}
            className="group flex items-center bg-white/10 hover:bg-white/20 rounded h-14 overflow-hidden cursor-pointer transition relative"
          >
            <div className="w-14 h-14 gradient-music flex items-center justify-center flex-shrink-0">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-sm px-3 truncate flex-1 text-[var(--text-primary)]">All Songs</span>
            <button className="w-9 h-9 rounded-full bg-[var(--accent)] text-black flex items-center justify-center mr-3 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition shadow-lg hover:scale-105">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>
          </div>
        </div>

        {/* Hero Playlist Banner */}
        <div className="flex items-end gap-6 pt-2">
          <div className="w-40 h-40 rounded shadow-2xl overflow-hidden flex-shrink-0">
            <div
              className={`w-full h-full flex items-center justify-center ${
                filterMode === "favorites" ? "gradient-heart" : "gradient-music"
              }`}
            >
              {filterMode === "favorites" ? (
                <Heart className="w-16 h-16 text-white fill-white" />
              ) : (
                <Music2 className="w-16 h-16 text-white" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--text-primary)]">COLLECTION</span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[var(--text-primary)]">
              {bannerTitle}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              <span className="font-bold text-[var(--text-primary)]">Harmonify</span> •{" "}
              <span className="text-[var(--accent)] font-medium">Listen to your dreams</span> •{" "}
              <span>{displayedSongs.length} tracks</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-gradient-to-b from-black/20 to-transparent">
        <div className="flex items-center gap-5">
          {/* Big Green Play Button */}
          <button
            onClick={togglePlayPause}
            className="w-14 h-14 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
            title="Play / Pause"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-0.5" />
            )}
          </button>

          {/* Shuffle Toggle */}
          <button
            onClick={toggleShuffle}
            className={`p-2 transition hover:scale-110 ${
              shuffleMode ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-white"
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Filter Chips */}
          <div className="flex gap-2 ml-2">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                filterMode === "all"
                  ? "bg-white text-black font-bold"
                  : "bg-white/10 text-[var(--text-secondary)] hover:bg-white/20 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode("favorites")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                filterMode === "favorites"
                  ? "bg-white text-black font-bold"
                  : "bg-white/10 text-[var(--text-secondary)] hover:bg-white/20 hover:text-white"
              }`}
            >
              Liked
            </button>
          </div>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>Sort by:</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold cursor-pointer outline-none"
          >
            <option value="default" className="bg-[var(--bg-card)] text-white">Default</option>
            <option value="title" className="bg-[var(--bg-card)] text-white">Title (A-Z)</option>
            <option value="artist" className="bg-[var(--bg-card)] text-white">Artist (A-Z)</option>
            <option value="album" className="bg-[var(--bg-card)] text-white">Album (A-Z)</option>
            <option value="duration" className="bg-[var(--bg-card)] text-white">Duration</option>
          </select>
        </div>
      </div>

      {/* Spotify Track Table */}
      <div className="px-8 pb-8 flex-1">
        <div className="grid grid-cols-[40px_minmax(200px,4fr)_minmax(140px,3fr)_44px_72px] px-4 py-2 border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          <div>#</div>
          <div>Title</div>
          <div>Album</div>
          <div className="flex justify-center"></div>
          <div className="text-right flex items-center justify-end pr-3">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Song Rows */}
        <div className="flex flex-col gap-0.5">
          {displayedSongs.length > 0 ? (
            displayedSongs.map((song, i) => <TrackRow key={song.filename} song={song} index={i} />)
          ) : (
            <div className="text-center py-16 text-[var(--text-secondary)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                {filterMode === "favorites"
                  ? "No liked songs yet"
                  : searchQuery
                  ? `No results for "${searchQuery}"`
                  : "No songs available"}
              </h3>
              <p className="text-xs">
                {filterMode === "favorites"
                  ? "Click the heart icon on any track to add it to your Liked Songs."
                  : "Add audio files to your Music folder to expand your library."}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
