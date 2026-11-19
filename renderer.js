/**
 * Harmonify - Spotify Edition Renderer Process
 * Full-featured desktop music player with synced lyrics, metadata extraction,
 * multiple themes, audio visualization, and interactive controls.
 */

const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");
const { Howl, Howler } = require("howler/dist/howler.core.min.js");

// ==========================================================================
// Application State
// ==========================================================================
let songs = []; // Array of song objects: { id, filename, fullPath, title, artist, album, duration, durationFormatted, coverArt }
let displayedSongs = [];
let currentSongIndex = -1;
let currentHowl = null;
let currentFilter = "all"; // 'all' | 'favorites' | 'recent'
let currentSort = "default"; // 'default' | 'title' | 'artist' | 'duration'
let searchQuery = "";
let shuffleMode = false;
let repeatMode = "none"; // 'none' | 'all' | 'one'
let shuffledIndices = [];
let shufflePointer = 0;
let favorites = JSON.parse(localStorage.getItem("harmonify_favorites") || "[]");
let recentSongs = JSON.parse(localStorage.getItem("harmonify_recents") || "[]");
let lyricsCache = JSON.parse(localStorage.getItem("harmonify_lyrics_cache") || "{}");
let activeLyrics = []; // Array of { time: number | null, text: string }
let isSyncedLyrics = false;
let activeLyricIndex = -1;
let userIsScrubbing = false;
let isMuted = false;
let currentVolume = parseFloat(localStorage.getItem("harmonify_volume") || "0.85");
let lastNonZeroVolume = currentVolume > 0 ? currentVolume : 0.85;
let musicFolder = localStorage.getItem("harmonify_music_folder") || path.join(__dirname, "Music");
let isStarfieldActive = localStorage.getItem("harmonify_starfield") !== "false";
let isLyricsPanelOpen = localStorage.getItem("harmonify_lyrics_open") !== "false";
let visualizerAnimationId = null;

// Supported audio formats
const SUPPORTED_EXTS = [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"];

// ==========================================================================
// DOM Elements
// ==========================================================================
const songListEl = document.getElementById("song-list");
const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search-btn");
const themeSelect = document.getElementById("theme-select");
const starToggleBtn = document.getElementById("star-toggle-btn");
const changeFolderBtn = document.getElementById("change-folder-btn");
const currentFolderLabel = document.getElementById("current-folder-label");

// Navigation & Sidebar
const navAll = document.getElementById("nav-all");
const navFavorites = document.getElementById("nav-favorites");
const navRecent = document.getElementById("nav-recent");
const favCountBadge = document.getElementById("fav-count-badge");
const sidebarTotalSongs = document.getElementById("sidebar-total-songs");
const sidebarFavSongs = document.getElementById("sidebar-fav-songs");
const sidebarCardAll = document.getElementById("sidebar-card-all");
const sidebarCardFavs = document.getElementById("sidebar-card-favs");

// Banner & Hero
const greetingTitle = document.getElementById("greeting-title");
const bannerTitle = document.getElementById("banner-title");
const bannerStats = document.getElementById("banner-stats");
const bannerCoverBg = document.getElementById("banner-cover-bg");
const heroPlayBtn = document.getElementById("hero-play-btn");
const heroPlayIcon = document.getElementById("hero-play-icon");
const heroShuffleBtn = document.getElementById("hero-shuffle-btn");
const chipAll = document.getElementById("chip-all");
const chipFavs = document.getElementById("chip-favs");
const sortSelect = document.getElementById("sort-select");
const quickFavCard = document.getElementById("quick-fav-card");
const quickAllCard = document.getElementById("quick-all-card");

// Lyrics & Side Panel
const lyricsPanel = document.getElementById("lyrics-panel");
const closeLyricsBtn = document.getElementById("close-lyrics-btn");
const lyricsToggleBtn = document.getElementById("lyrics-toggle-btn");
const lyricsDisplay = document.getElementById("lyrics-display");
const lyricsSourceBadge = document.getElementById("lyrics-source-badge");
const lyricsHint = document.getElementById("lyrics-hint");
const panelArtCover = document.getElementById("panel-art-cover");
const panelSongTitle = document.getElementById("panel-song-title");
const panelSongArtist = document.getElementById("panel-song-artist");

// Bottom Player Bar
const playerArt = document.getElementById("player-art");
const playerSongTitle = document.getElementById("player-song-title");
const playerSongArtist = document.getElementById("player-song-artist");
const playerFavBtn = document.getElementById("player-fav-btn");
const playPauseBtn = document.getElementById("play-pause-btn");
const playPauseIcon = document.getElementById("play-pause-icon");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const repeatBtn = document.getElementById("repeat-btn");
const progressSlider = document.getElementById("progress");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const volumeSlider = document.getElementById("volume-slider");
const volumeIcon = document.getElementById("volume-icon");
const volumeSvg = document.getElementById("volume-svg");
const queueToggleBtn = document.getElementById("queue-toggle-btn");
const queueDrawer = document.getElementById("queue-drawer");
const closeQueueBtn = document.getElementById("close-queue-btn");
const queueNowPlaying = document.getElementById("queue-now-playing");
const queueList = document.getElementById("queue-list");

// ==========================================================================
// Initialization
// ==========================================================================
function initApp() {
  initTheme();
  initGreeting();
  initVolume();
  initStarfield();
  initLyricsPanel();
  initFolder();
  setupEventListeners();
  loadMusicFromFolder(musicFolder);
}

// Set up time-based greeting
function initGreeting() {
  const hour = new Date().getHours();
  let greeting = "Good day";
  if (hour >= 5 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";
  greetingTitle.textContent = greeting;
}

// Apply saved theme
function initTheme() {
  const savedTheme = localStorage.getItem("selectedTheme") || "dark";
  document.body.className = savedTheme;
  themeSelect.value = savedTheme;
}

function applyTheme(theme) {
  document.body.className = theme;
  localStorage.setItem("selectedTheme", theme);
  updateSliderFills();
}

// Initialize volume
function initVolume() {
  Howler.volume(currentVolume);
  volumeSlider.value = Math.round(currentVolume * 100);
  updateVolumeIcon(currentVolume);
  updateSliderProgress(volumeSlider, currentVolume * 100);
}

// Initialize ambient starfield
function initStarfield() {
  const canvas = document.getElementById("star-rain");
  if (!isStarfieldActive) {
    canvas.classList.add("hidden");
    starToggleBtn.classList.remove("active");
  } else {
    canvas.classList.remove("hidden");
    starToggleBtn.classList.add("active");
  }
}

// Initialize lyrics panel state
function initLyricsPanel() {
  if (isLyricsPanelOpen) {
    lyricsPanel.classList.remove("collapsed");
    lyricsToggleBtn.classList.add("active");
  } else {
    lyricsPanel.classList.add("collapsed");
    lyricsToggleBtn.classList.remove("active");
  }
}

// Display folder name
function initFolder() {
  const folderName = path.basename(musicFolder) || "Music";
  currentFolderLabel.textContent = folderName;
  currentFolderLabel.title = musicFolder;
}

// ==========================================================================
// Library & Music Loading
// ==========================================================================
function loadMusicFromFolder(folderPath) {
  musicFolder = folderPath;
  localStorage.setItem("harmonify_music_folder", folderPath);
  initFolder();

  // Ensure directory exists
  if (!fs.existsSync(folderPath)) {
    try {
      fs.mkdirSync(folderPath, { recursive: true });
    } catch (err) {
      console.warn("Could not create music directory:", err);
    }
  }

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error("Error reading music folder:", err);
      songs = [];
      refreshView();
      return;
    }

    const audioFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return SUPPORTED_EXTS.includes(ext);
    });

    songs = audioFiles.map((filename, index) => {
      const parsed = parseSongName(filename);
      return {
        id: index,
        filename,
        fullPath: path.join(folderPath, filename),
        title: parsed.title,
        artist: parsed.artist,
        album: "Local Track",
        duration: 0,
        durationFormatted: "--:--",
        coverArt: null,
      };
    });

    refreshView();
    extractMetadataAsync();
  });
}

// Parse artist and title from standard song filename
function parseSongName(filename) {
  const ext = path.extname(filename);
  let cleanName = path.basename(filename, ext).trim();
  let artist = "Unknown Artist";
  let title = cleanName;

  const separators = [" - ", " – ", " — "];
  for (const sep of separators) {
    if (cleanName.includes(sep)) {
      const parts = cleanName.split(sep);
      const part1 = parts[0].trim();
      const part2 = parts.slice(1).join(sep).trim();

      const indicators = /feat\.?|ft\.?|\(.*?\)|\[.*?\]|official|remix/i;
      if (indicators.test(part1) && !indicators.test(part2)) {
        title = part1;
        artist = part2;
      } else {
        artist = part1;
        title = part2;
      }
      break;
    }
  }

  // Strip excessive bracketed tags from title
  title = title
    .replace(/\s*\((?:official|video|audio|lyric|lyrics|hd|hq|music|remastered).*?\)/gi, "")
    .replace(/\s*\[(?:official|video|audio|lyric|lyrics|remix|remastered).*?\]/gi, "")
    .replace(/\s*feat\..*$/i, "")
    .replace(/\s*ft\..*$/i, "")
    .trim();

  return { artist: artist || "Unknown Artist", title: title || cleanName };
}

// Asynchronously extract ID3 tags & embedded cover pictures via main IPC
async function extractMetadataAsync() {
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    try {
      const meta = await ipcRenderer.invoke("parse-metadata", song.fullPath);
      if (meta) {
        if (meta.title) song.title = meta.title;
        if (meta.artist) song.artist = meta.artist;
        if (meta.album) song.album = meta.album;
        if (meta.coverArt) song.coverArt = meta.coverArt;
        if (meta.duration) {
          song.duration = meta.duration;
          song.durationFormatted = formatTime(meta.duration);
        }
        updateTrackRowDisplay(song);
        if (currentSongIndex === i) {
          updateNowPlayingCard(song);
        }
      }
    } catch (e) {
      // Ignore individual file parse errors
    }
  }
}

// Update specific track row in the DOM after metadata loads
function updateTrackRowDisplay(song) {
  const row = document.querySelector(`.track-row[data-id="${song.id}"]`);
  if (!row) return;

  const titleEl = row.querySelector(".track-title-text");
  const artistSub = row.querySelector(".track-artist-sub");
  const colArtist = row.querySelector(".track-col-artist");
  const durEl = row.querySelector(".track-col-duration");
  const thumb = row.querySelector(".track-thumb");

  if (titleEl) titleEl.textContent = song.title;
  if (artistSub) artistSub.textContent = song.artist;
  if (colArtist) colArtist.textContent = song.artist;
  if (durEl && song.durationFormatted !== "--:--") durEl.textContent = song.durationFormatted;

  if (thumb && song.coverArt) {
    thumb.style.backgroundImage = `url("${song.coverArt}")`;
    thumb.innerHTML = "";
  }
}

// ==========================================================================
// View Filtering & Rendering
// ==========================================================================
function refreshView() {
  updateSidebarCounters();

  // Apply Filter
  let filtered = [...songs];
  if (currentFilter === "favorites") {
    filtered = filtered.filter((s) => favorites.includes(s.filename));
  } else if (currentFilter === "recent") {
    filtered = recentSongs
      .map((name) => songs.find((s) => s.filename === name))
      .filter(Boolean);
  }

  // Apply Search
  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        s.filename.toLowerCase().includes(q)
    );
  }

  // Apply Sorting
  if (currentSort === "title") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (currentSort === "artist") {
    filtered.sort((a, b) => a.artist.localeCompare(b.artist));
  } else if (currentSort === "duration") {
    filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  displayedSongs = filtered;
  renderTrackList(displayedSongs);
  updateBannerHeader();
}

function updateSidebarCounters() {
  const favCount = songs.filter((s) => favorites.includes(s.filename)).length;
  favCountBadge.textContent = favCount;
  sidebarFavSongs.textContent = `${favCount} tracks`;
  sidebarTotalSongs.textContent = `${songs.length} tracks`;
}

function updateBannerHeader() {
  if (currentFilter === "favorites") {
    bannerTitle.textContent = "Liked Songs";
    bannerCoverBg.className = "banner-cover-inner gradient-heart";
    bannerStats.textContent = `${displayedSongs.length} songs favorited`;
  } else if (currentFilter === "recent") {
    bannerTitle.textContent = "Recently Played";
    bannerCoverBg.className = "banner-cover-inner gradient-music";
    bannerStats.textContent = `${displayedSongs.length} songs recently played`;
  } else if (searchQuery.trim() !== "") {
    bannerTitle.textContent = `Search: "${searchQuery}"`;
    bannerCoverBg.className = "banner-cover-inner gradient-music";
    bannerStats.textContent = `${displayedSongs.length} songs found`;
  } else {
    bannerTitle.textContent = "Local Library";
    bannerCoverBg.className = "banner-cover-inner gradient-music";
    bannerStats.textContent = `${songs.length} songs in collection`;
  }
}

function renderTrackList(trackList) {
  songListEl.innerHTML = "";

  if (trackList.length === 0) {
    let emptyMsg = "No songs found in this folder.";
    let subMsg = "Add audio files to your Music folder or click 'Choose Music Folder' above.";
    if (currentFilter === "favorites") {
      emptyMsg = "No liked songs yet.";
      subMsg = "Click the ♡ icon on any song to save it to your Liked Songs.";
    } else if (searchQuery !== "") {
      emptyMsg = `No results found for "${searchQuery}"`;
      subMsg = "Check your spelling or search by another keyword.";
    }
    songListEl.innerHTML = `
      <div class="empty-state">
        <h3>${emptyMsg}</h3>
        <p>${subMsg}</p>
      </div>
    `;
    return;
  }

  trackList.forEach((song, idx) => {
    const isPlaying = currentSongIndex === song.id && currentHowl && currentHowl.playing();
    const isActive = currentSongIndex === song.id;
    const isFav = favorites.includes(song.filename);

    const row = document.createElement("div");
    row.className = `track-row ${isActive ? "active" : ""} ${isPlaying ? "playing" : ""}`;
    row.dataset.id = song.id;

    // Cover thumbnail
    const thumbStyle = song.coverArt
      ? `style="background-image: url('${song.coverArt}')"`
      : "";
    const thumbInner = song.coverArt
      ? ""
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;

    row.innerHTML = `
      <div class="track-row-index">
        <span class="index-num">${idx + 1}</span>
        <button class="row-play-btn" title="Play">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="${isPlaying ? "M6 19h4V5H6v14zm8-14v14h4V5h-4z" : "M8 5v14l11-7z"}"/>
          </svg>
        </button>
        <div class="equalizer-anim">
          <span></span><span></span><span></span>
        </div>
      </div>

      <div class="track-col-title">
        <div class="track-thumb ${!song.coverArt ? "gradient-music" : ""}" ${thumbStyle}>
          ${thumbInner}
        </div>
        <div class="track-name-block">
          <span class="track-title-text">${escapeHtml(song.title)}</span>
          <span class="track-artist-sub">${escapeHtml(song.artist)}</span>
        </div>
      </div>

      <div class="track-col-artist">${escapeHtml(song.artist)}</div>
      <div class="track-col-duration">${song.durationFormatted}</div>

      <div class="track-col-fav">
        <button class="row-fav-btn ${isFav ? "liked" : ""}" title="${isFav ? "Remove from favorites" : "Save to favorites"}">
          ${isFav ? "♥" : "♡"}
        </button>
      </div>
    `;

    // Click row to play
    row.addEventListener("click", (e) => {
      if (e.target.closest(".row-fav-btn")) return;
      playSongByIndex(song.id);
    });

    // Favorite button
    const favBtn = row.querySelector(".row-fav-btn");
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(song.filename);
    });

    songListEl.appendChild(row);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================================================
// Playback Engine (Howler)
// ==========================================================================
function playSongByIndex(index) {
  if (index < 0 || index >= songs.length) return;

  const song = songs[index];
  currentSongIndex = index;

  // Add to recents
  recentSongs = [song.filename, ...recentSongs.filter((f) => f !== song.filename)].slice(0, 30);
  localStorage.setItem("harmonify_recents", JSON.stringify(recentSongs));

  if (currentHowl) {
    currentHowl.stop();
    currentHowl.unload();
  }

  currentHowl = new Howl({
    src: [song.fullPath],
    html5: true, // Native HTML5 audio for smooth streaming of local files
    volume: isMuted ? 0 : currentVolume,
    onload: () => {
      const dur = currentHowl.duration();
      if (dur && dur > 0) {
        song.duration = dur;
        song.durationFormatted = formatTime(dur);
        progressSlider.max = Math.floor(dur);
        durationEl.textContent = song.durationFormatted;
      }
    },
    onplay: () => {
      updatePlayPauseIcons(true);
      highlightActiveTrackRow();
      requestAnimationFrame(updatePlaybackProgress);
      setupAudioVisualizer();
    },
    onpause: () => {
      updatePlayPauseIcons(false);
      highlightActiveTrackRow();
    },
    onstop: () => {
      updatePlayPauseIcons(false);
      highlightActiveTrackRow();
    },
    onend: () => {
      if (repeatMode === "one") {
        currentHowl.play();
      } else {
        playNextSong();
      }
    },
  });

  currentHowl.play();
  updateNowPlayingCard(song);
  updateQueueDrawer();
  fetchLyrics(song);
}

function togglePlayPause() {
  if (!currentHowl) {
    if (displayedSongs.length > 0) {
      playSongByIndex(displayedSongs[0].id);
    } else if (songs.length > 0) {
      playSongByIndex(0);
    }
    return;
  }

  if (currentHowl.playing()) {
    currentHowl.pause();
  } else {
    currentHowl.play();
  }
}

function playNextSong() {
  if (songs.length === 0) return;

  let nextIndex;
  if (shuffleMode) {
    nextIndex = getNextShuffleIndex();
    if (nextIndex === null) return;
  } else {
    if (currentSongIndex < songs.length - 1) {
      nextIndex = currentSongIndex + 1;
    } else if (repeatMode === "all") {
      nextIndex = 0;
    } else {
      return;
    }
  }

  playSongByIndex(nextIndex);
}

function playPrevSong() {
  if (songs.length === 0) return;

  // If already playing past 3 seconds, seek to start instead of previous song
  if (currentHowl && currentHowl.seek() > 3) {
    currentHowl.seek(0);
    return;
  }

  let prevIndex;
  if (shuffleMode) {
    prevIndex = getPrevShuffleIndex();
    if (prevIndex === null) return;
  } else {
    if (currentSongIndex > 0) {
      prevIndex = currentSongIndex - 1;
    } else if (repeatMode === "all") {
      prevIndex = songs.length - 1;
    } else {
      return;
    }
  }

  playSongByIndex(prevIndex);
}

// ==========================================================================
// Shuffle & Repeat Handlers
// ==========================================================================
function toggleShuffle() {
  shuffleMode = !shuffleMode;
  shuffleBtn.classList.toggle("active", shuffleMode);
  heroShuffleBtn.classList.toggle("active", shuffleMode);

  if (shuffleMode) {
    generateShuffledIndices();
    const curr = shuffledIndices.indexOf(currentSongIndex);
    shufflePointer = curr !== -1 ? curr : 0;
  }
}

function generateShuffledIndices() {
  shuffledIndices = songs.map((_, i) => i);
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }
}

function getNextShuffleIndex() {
  shufflePointer++;
  if (shufflePointer >= shuffledIndices.length) {
    if (repeatMode === "all") {
      generateShuffledIndices();
      shufflePointer = 0;
    } else {
      shufflePointer = shuffledIndices.length - 1;
      return null;
    }
  }
  return shuffledIndices[shufflePointer];
}

function getPrevShuffleIndex() {
  shufflePointer--;
  if (shufflePointer < 0) {
    shufflePointer = 0;
    return null;
  }
  return shuffledIndices[shufflePointer];
}

function toggleRepeat() {
  if (repeatMode === "none") {
    repeatMode = "all";
    repeatBtn.classList.add("active");
    repeatBtn.title = "Repeat All (Ctrl+R)";
  } else if (repeatMode === "all") {
    repeatMode = "one";
    repeatBtn.classList.add("active");
    repeatBtn.title = "Repeat One (Ctrl+R)";
    repeatBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
      </svg>
      <span class="control-dot" style="opacity: 1;"></span>
      <span style="position: absolute; top: -6px; right: -6px; font-size: 10px; font-weight: 800; background: var(--accent); color: #000; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center;">1</span>
    `;
    return;
  } else {
    repeatMode = "none";
    repeatBtn.classList.remove("active");
    repeatBtn.title = "Repeat Off (Ctrl+R)";
    repeatBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
      </svg>
      <span class="control-dot"></span>
    `;
    return;
  }
}

// ==========================================================================
// Scrubber & Progress
// ==========================================================================
function updatePlaybackProgress() {
  if (!currentHowl || !currentHowl.playing()) return;

  const seek = currentHowl.seek();
  if (typeof seek === "number" && !userIsScrubbing) {
    progressSlider.value = Math.floor(seek);
    currentTimeEl.textContent = formatTime(seek);
    updateSliderProgress(progressSlider, (seek / (currentHowl.duration() || 1)) * 100);

    // Sync active lyric line
    if (isSyncedLyrics && activeLyrics.length > 0) {
      updateActiveLyricLine(seek);
    }
  }

  requestAnimationFrame(updatePlaybackProgress);
}

function updateSliderProgress(slider, percent) {
  percent = Math.max(0, Math.min(100, percent));
  const accentColor = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#1ed760";
  const sliderBg = getComputedStyle(document.body).getPropertyValue("--slider-bg").trim() || "#4d4d4d";
  slider.style.background = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percent}%, ${sliderBg} ${percent}%, ${sliderBg} 100%)`;
}

function updateSliderFills() {
  if (currentHowl) {
    const percent = (currentHowl.seek() / (currentHowl.duration() || 1)) * 100;
    updateSliderProgress(progressSlider, percent);
  }
  updateSliderProgress(volumeSlider, currentVolume * 100);
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// ==========================================================================
// Volume & Mute Controls
// ==========================================================================
function setVolume(val, save = true) {
  val = Math.max(0, Math.min(1, val));
  currentVolume = val;
  isMuted = val === 0;

  Howler.volume(val);
  volumeSlider.value = Math.round(val * 100);
  updateSliderProgress(volumeSlider, val * 100);
  updateVolumeIcon(val);

  if (val > 0) lastNonZeroVolume = val;
  if (save) localStorage.setItem("harmonify_volume", val.toString());
}

function toggleMute() {
  if (isMuted || currentVolume === 0) {
    setVolume(lastNonZeroVolume || 0.85);
  } else {
    lastNonZeroVolume = currentVolume;
    setVolume(0);
  }
}

function updateVolumeIcon(vol) {
  if (vol === 0 || isMuted) {
    // Muted icon
    volumeSvg.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
  } else if (vol < 0.5) {
    // Low volume
    volumeSvg.innerHTML = `<path d="M7 9v6h4l5 5V4L11 9H7zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>`;
  } else {
    // High volume
    volumeSvg.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
  }
}

// ==========================================================================
// Favorites Management
// ==========================================================================
function toggleFavorite(filename) {
  const idx = favorites.indexOf(filename);
  if (idx === -1) {
    favorites.push(filename);
  } else {
    favorites.splice(idx, 1);
  }

  localStorage.setItem("harmonify_favorites", JSON.stringify(favorites));
  updateSidebarCounters();

  // Update current playing heart button if same song
  if (currentSongIndex >= 0 && songs[currentSongIndex].filename === filename) {
    const isFav = favorites.includes(filename);
    playerFavBtn.innerHTML = isFav ? "♥" : "♡";
    playerFavBtn.classList.toggle("liked", isFav);
  }

  refreshView();
}

// ==========================================================================
// UI Updates & Card Synchronization
// ==========================================================================
function updatePlayPauseIcons(isPlaying) {
  const playPath = "M8 5v14l11-7z";
  const pausePath = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";

  playPauseIcon.innerHTML = `<path d="${isPlaying ? pausePath : playPath}"/>`;
  heroPlayIcon.innerHTML = `<path d="${isPlaying ? pausePath : playPath}"/>`;
}

function highlightActiveTrackRow() {
  document.querySelectorAll(".track-row").forEach((row) => {
    const id = parseInt(row.dataset.id, 10);
    const isCurrent = id === currentSongIndex;
    const isPlaying = isCurrent && currentHowl && currentHowl.playing();

    row.classList.toggle("active", isCurrent);
    row.classList.toggle("playing", isPlaying);

    const playBtn = row.querySelector(".row-play-btn svg path");
    if (playBtn) {
      playBtn.setAttribute("d", isPlaying ? "M6 19h4V5H6v14zm8-14v14h4V5h-4z" : "M8 5v14l11-7z");
    }
  });
}

function updateNowPlayingCard(song) {
  // Bottom Player
  playerSongTitle.textContent = song.title;
  playerSongTitle.title = song.title;
  playerSongArtist.textContent = song.artist;

  const isFav = favorites.includes(song.filename);
  playerFavBtn.innerHTML = isFav ? "♥" : "♡";
  playerFavBtn.classList.toggle("liked", isFav);

  if (song.coverArt) {
    playerArt.style.backgroundImage = `url("${song.coverArt}")`;
    playerArt.innerHTML = "";
  } else {
    playerArt.style.backgroundImage = "none";
    playerArt.className = "mini-art gradient-music";
    playerArt.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
  }

  // Right Side Panel
  panelSongTitle.textContent = song.title;
  panelSongArtist.textContent = song.artist;

  if (song.coverArt) {
    panelArtCover.style.backgroundImage = `url("${song.coverArt}")`;
    panelArtCover.innerHTML = "";
  } else {
    panelArtCover.style.backgroundImage = "none";
    panelArtCover.className = "panel-art-placeholder gradient-music";
    panelArtCover.innerHTML = `<svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
  }
}

// ==========================================================================
// Synced Lyrics Engine (LRCLIB, Lyrics.ovh, Some Random API)
// ==========================================================================
async function fetchLyrics(song) {
  const cacheKey = `${song.artist} - ${song.title}`.toLowerCase();

  if (lyricsCache[cacheKey]) {
    loadLyricsIntoUI(lyricsCache[cacheKey]);
    return;
  }

  lyricsDisplay.innerHTML = `<div class="lyrics-placeholder"><p>Searching lyrics for "${escapeHtml(song.title)}"...</p></div>`;
  lyricsSourceBadge.textContent = "Searching...";

  const sources = [
    { name: "LRCLIB", fn: () => fetchLRCLIB(song.artist, song.title) },
    { name: "Lyrics.ovh", fn: () => fetchLyricsOvh(song.artist, song.title) },
    { name: "Some Random API", fn: () => fetchSomeRandomAPI(song.title) },
  ];

  // Parallel race with 5-second timeout
  const promises = sources.map((s) =>
    Promise.race([
      s.fn().then((res) => ({ name: s.name, res })),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
    ]).catch(() => ({ name: s.name, res: null }))
  );

  try {
    const results = await Promise.all(promises);

    for (const { name, res } of results) {
      if (res && (res.synced || (res.plain && res.plain.trim().length > 15))) {
        const payload = {
          source: name,
          synced: res.synced || null,
          plain: res.plain || null,
        };
        lyricsCache[cacheKey] = payload;
        localStorage.setItem("harmonify_lyrics_cache", JSON.stringify(lyricsCache));
        loadLyricsIntoUI(payload);
        return;
      }
    }

    lyricsDisplay.innerHTML = `<div class="lyrics-placeholder"><p>No lyrics found for this song</p></div>`;
    lyricsSourceBadge.textContent = "No Lyrics";
    activeLyrics = [];
    isSyncedLyrics = false;
  } catch (err) {
    lyricsDisplay.innerHTML = `<div class="lyrics-placeholder"><p>Error fetching lyrics</p></div>`;
    lyricsSourceBadge.textContent = "Error";
    activeLyrics = [];
    isSyncedLyrics = false;
  }
}

async function fetchLRCLIB(artist, title) {
  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      synced: data.syncedLyrics || null,
      plain: data.plainLyrics || null,
    };
  } catch (e) {
    return null;
  }
}

async function fetchLyricsOvh(artist, title) {
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.lyrics ? { plain: data.lyrics, synced: null } : null;
  } catch (e) {
    return null;
  }
}

async function fetchSomeRandomAPI(title) {
  try {
    const token = process.env.SOME_RANDOM_API_TOKEN;
    const headers = token ? { Authorization: token } : {};
    const url = `https://some-random-api.com/lyrics?title=${encodeURIComponent(title)}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.lyrics ? { plain: data.lyrics, synced: null } : null;
  } catch (e) {
    return null;
  }
}

function parseLRC(lrcText) {
  const lines = lrcText.split("\n");
  const parsed = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{1,3})?\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const matches = [...line.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = line.replace(timeRegex, "").trim();
      for (const m of matches) {
        const min = parseInt(m[1], 10);
        const sec = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3, "0").slice(0, 3), 10) : 0;
        const total = min * 60 + sec + ms / 1000;
        parsed.push({ time: total, text: text || "♪" });
      }
    } else if (!line.startsWith("[") || !line.endsWith("]")) {
      parsed.push({ time: null, text: line });
    }
  }

  parsed.sort((a, b) => (a.time || 0) - (b.time || 0));
  return parsed;
}

function loadLyricsIntoUI(payload) {
  lyricsDisplay.innerHTML = "";
  activeLyricIndex = -1;

  if (payload.synced) {
    isSyncedLyrics = true;
    activeLyrics = parseLRC(payload.synced);
    lyricsSourceBadge.textContent = `${payload.source} (Synced)`;
    lyricsHint.textContent = "Click any line to seek";
  } else if (payload.plain) {
    isSyncedLyrics = false;
    activeLyrics = payload.plain
      .split("\n")
      .map((l) => ({ time: null, text: l.trim() }))
      .filter((l) => l.text !== "");
    lyricsSourceBadge.textContent = payload.source;
    lyricsHint.textContent = "Plain Lyrics";
  } else {
    lyricsDisplay.innerHTML = `<div class="lyrics-placeholder"><p>No lyrics available</p></div>`;
    activeLyrics = [];
    isSyncedLyrics = false;
    return;
  }

  activeLyrics.forEach((item, idx) => {
    const lineEl = document.createElement("div");
    lineEl.className = "lyric-line";
    lineEl.dataset.index = idx;
    lineEl.textContent = item.text;

    if (item.time !== null) {
      lineEl.addEventListener("click", () => {
        if (currentHowl) {
          currentHowl.seek(item.time);
          progressSlider.value = Math.floor(item.time);
          currentTimeEl.textContent = formatTime(item.time);
          updateActiveLyricLine(item.time, true);
        }
      });
    }

    lyricsDisplay.appendChild(lineEl);
  });
}

function updateActiveLyricLine(currentTime, forceScroll = false) {
  if (!isSyncedLyrics || activeLyrics.length === 0) return;

  // Find line matching current time
  let newIdx = -1;
  for (let i = 0; i < activeLyrics.length; i++) {
    if (activeLyrics[i].time !== null && currentTime >= activeLyrics[i].time) {
      newIdx = i;
    } else if (activeLyrics[i].time !== null && currentTime < activeLyrics[i].time) {
      break;
    }
  }

  if (newIdx !== activeLyricIndex || forceScroll) {
    activeLyricIndex = newIdx;

    const allLines = lyricsDisplay.querySelectorAll(".lyric-line");
    allLines.forEach((el, i) => {
      el.classList.toggle("active", i === activeLyricIndex);
    });

    if (activeLyricIndex >= 0 && allLines[activeLyricIndex]) {
      allLines[activeLyricIndex].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }
}

// ==========================================================================
// Real-time Audio Visualizer
// ==========================================================================
let visualizerCanvas = document.getElementById("audio-visualizer");
let visualizerCtx = visualizerCanvas ? visualizerCanvas.getContext("2d") : null;

function setupAudioVisualizer() {
  if (visualizerAnimationId) cancelAnimationFrame(visualizerAnimationId);

  const canvas = document.getElementById("audio-visualizer");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const numBars = 32;
  const barWidth = canvas.width / numBars;

  function renderVisualizer() {
    if (!currentHowl || !currentHowl.playing()) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const accentColor = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#1ed760";
    ctx.fillStyle = accentColor;

    const time = Date.now() / 200;
    for (let i = 0; i < numBars; i++) {
      // Harmonic wave simulation based on audio seek time
      const freq = Math.sin(time + i * 0.3) * 0.5 + 0.5;
      const height = Math.max(4, freq * (canvas.height - 6));
      const x = i * barWidth;
      const y = canvas.height - height;

      ctx.beginPath();
      ctx.roundRect(x + 1, y, barWidth - 2, height, [2, 2, 0, 0]);
      ctx.fill();
    }

    visualizerAnimationId = requestAnimationFrame(renderVisualizer);
  }

  renderVisualizer();
}

// ==========================================================================
// Play Queue Drawer
// ==========================================================================
function updateQueueDrawer() {
  if (currentSongIndex >= 0 && songs[currentSongIndex]) {
    queueNowPlaying.textContent = `${songs[currentSongIndex].title} — ${songs[currentSongIndex].artist}`;
  } else {
    queueNowPlaying.textContent = "No song playing";
  }

  queueList.innerHTML = "";
  const upcoming = songs.slice(currentSongIndex + 1, currentSongIndex + 16);
  if (upcoming.length === 0) {
    queueList.innerHTML = `<div class="queue-item" style="opacity: 0.5;">Queue is empty</div>`;
    return;
  }

  upcoming.forEach((s) => {
    const item = document.createElement("div");
    item.className = "queue-item";
    item.textContent = `${s.title} — ${s.artist}`;
    item.addEventListener("click", () => playSongByIndex(s.id));
    queueList.appendChild(item);
  });
}

// ==========================================================================
// Ambient Starfield Canvas Animation
// ==========================================================================
const starCanvas = document.getElementById("star-rain");
const starCtx = starCanvas.getContext("2d");
let stars = [];
const STAR_COUNT = 45;

function resizeStarCanvas() {
  starCanvas.width = window.innerWidth;
  starCanvas.height = window.innerHeight;
}
resizeStarCanvas();
window.addEventListener("resize", resizeStarCanvas);

class AmbientStar {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * starCanvas.width;
    this.y = initial ? Math.random() * starCanvas.height : -10;
    this.size = Math.random() * 2.2 + 0.8;
    this.speed = Math.random() * 1.5 + 0.5;
    this.opacity = Math.random() * 0.5 + 0.2;
    this.twinkleSpeed = Math.random() * 0.02 + 0.008;
    this.twinkleDirection = 1;
  }

  update() {
    this.y += this.speed;
    this.opacity += this.twinkleSpeed * this.twinkleDirection;
    if (this.opacity >= 0.7 || this.opacity <= 0.2) {
      this.twinkleDirection *= -1;
    }
    if (this.y > starCanvas.height + 10) {
      this.reset();
    }
  }

  draw(accentColor) {
    starCtx.save();
    starCtx.globalAlpha = this.opacity;
    starCtx.fillStyle = accentColor;
    starCtx.shadowBlur = 8;
    starCtx.shadowColor = accentColor;

    starCtx.beginPath();
    starCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    starCtx.fill();
    starCtx.restore();
  }
}

function initStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(new AmbientStar());
  }
}
initStars();

function animateStarfield() {
  if (isStarfieldActive) {
    starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
    const accentColor = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#1ed760";
    stars.forEach((star) => {
      star.update();
      star.draw(accentColor);
    });
  }
  requestAnimationFrame(animateStarfield);
}
animateStarfield();

// Cursor glow coordinate tracking
const cursorGlow = document.getElementById("cursor-glow");
window.addEventListener("mousemove", (e) => {
  if (cursorGlow) {
    cursorGlow.style.left = `${e.clientX}px`;
    cursorGlow.style.top = `${e.clientY}px`;
  }
});

// ==========================================================================
// Event Listeners & Interactions
// ==========================================================================
function setupEventListeners() {
  // Navigation sidebar items
  navAll.addEventListener("click", () => {
    setActiveNav(navAll);
    currentFilter = "all";
    refreshView();
  });

  navFavorites.addEventListener("click", () => {
    setActiveNav(navFavorites);
    currentFilter = "favorites";
    refreshView();
  });

  navRecent.addEventListener("click", () => {
    setActiveNav(navRecent);
    currentFilter = "recent";
    refreshView();
  });

  sidebarCardAll.addEventListener("click", () => {
    setActiveNav(navAll);
    currentFilter = "all";
    refreshView();
  });

  sidebarCardFavs.addEventListener("click", () => {
    setActiveNav(navFavorites);
    currentFilter = "favorites";
    refreshView();
  });

  // Action chips
  chipAll.addEventListener("click", () => {
    setActiveNav(navAll);
    chipAll.classList.add("active");
    chipFavs.classList.remove("active");
    currentFilter = "all";
    refreshView();
  });

  chipFavs.addEventListener("click", () => {
    setActiveNav(navFavorites);
    chipFavs.classList.add("active");
    chipAll.classList.remove("active");
    currentFilter = "favorites";
    refreshView();
  });

  // Quick Cards
  quickFavCard.addEventListener("click", () => {
    setActiveNav(navFavorites);
    currentFilter = "favorites";
    refreshView();
    if (displayedSongs.length > 0) playSongByIndex(displayedSongs[0].id);
  });

  quickAllCard.addEventListener("click", () => {
    setActiveNav(navAll);
    currentFilter = "all";
    refreshView();
    if (displayedSongs.length > 0) playSongByIndex(displayedSongs[0].id);
  });

  // Sorting
  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    refreshView();
  });

  // Search
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? "block" : "none";
    refreshView();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    clearSearchBtn.style.display = "none";
    refreshView();
    searchInput.focus();
  });

  // Player controls
  playPauseBtn.addEventListener("click", togglePlayPause);
  heroPlayBtn.addEventListener("click", togglePlayPause);
  nextBtn.addEventListener("click", playNextSong);
  prevBtn.addEventListener("click", playPrevSong);
  shuffleBtn.addEventListener("click", toggleShuffle);
  heroShuffleBtn.addEventListener("click", toggleShuffle);
  repeatBtn.addEventListener("click", toggleRepeat);

  // Scrubber events
  progressSlider.addEventListener("mousedown", () => { userIsScrubbing = true; });
  progressSlider.addEventListener("touchstart", () => { userIsScrubbing = true; });

  progressSlider.addEventListener("input", () => {
    const val = parseFloat(progressSlider.value);
    currentTimeEl.textContent = formatTime(val);
    if (currentHowl) {
      updateSliderProgress(progressSlider, (val / (currentHowl.duration() || 1)) * 100);
    }
  });

  progressSlider.addEventListener("change", () => {
    const val = parseFloat(progressSlider.value);
    if (currentHowl) {
      currentHowl.seek(val);
    }
    userIsScrubbing = false;
  });

  // Volume slider & mute
  volumeSlider.addEventListener("input", (e) => {
    setVolume(parseFloat(e.target.value) / 100);
  });
  volumeIcon.addEventListener("click", toggleMute);

  // Heart favorite button in player
  playerFavBtn.addEventListener("click", () => {
    if (currentSongIndex >= 0 && songs[currentSongIndex]) {
      toggleFavorite(songs[currentSongIndex].filename);
    }
  });

  // Theme dropdown
  themeSelect.addEventListener("change", (e) => applyTheme(e.target.value));

  // Starfield toggle
  starToggleBtn.addEventListener("click", () => {
    isStarfieldActive = !isStarfieldActive;
    localStorage.setItem("harmonify_starfield", isStarfieldActive.toString());
    initStarfield();
  });

  // Lyrics panel toggle
  function toggleLyricsPanel() {
    isLyricsPanelOpen = !isLyricsPanelOpen;
    localStorage.setItem("harmonify_lyrics_open", isLyricsPanelOpen.toString());
    initLyricsPanel();
  }
  lyricsToggleBtn.addEventListener("click", toggleLyricsPanel);
  closeLyricsBtn.addEventListener("click", toggleLyricsPanel);

  // Queue drawer toggle
  queueToggleBtn.addEventListener("click", () => {
    queueDrawer.classList.toggle("open");
  });
  closeQueueBtn.addEventListener("click", () => {
    queueDrawer.classList.remove("open");
  });

  // Change music folder via native directory dialog
  changeFolderBtn.addEventListener("click", async () => {
    try {
      const selectedFolder = await ipcRenderer.invoke("select-folder");
      if (selectedFolder) {
        loadMusicFromFolder(selectedFolder);
      }
    } catch (err) {
      console.warn("Folder picker error:", err);
    }
  });

  // Drag and Drop audio files or folders into the window
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  window.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const firstFile = e.dataTransfer.files[0];
      const stats = fs.statSync(firstFile.path);

      if (stats.isDirectory()) {
        loadMusicFromFolder(firstFile.path);
      } else {
        const folder = path.dirname(firstFile.path);
        loadMusicFromFolder(folder);
      }
    }
  });

  // Global Keyboard Shortcuts
  document.addEventListener("keydown", (e) => {
    const isInputFocused = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName);

    if (e.key === " " && !isInputFocused) {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === "ArrowLeft" && !isInputFocused) {
      e.preventDefault();
      if (currentHowl) {
        const newTime = Math.max(0, currentHowl.seek() - 5);
        currentHowl.seek(newTime);
        progressSlider.value = Math.floor(newTime);
        currentTimeEl.textContent = formatTime(newTime);
      }
    } else if (e.key === "ArrowRight" && !isInputFocused) {
      e.preventDefault();
      if (currentHowl) {
        const newTime = Math.min(currentHowl.duration() || 0, currentHowl.seek() + 5);
        currentHowl.seek(newTime);
        progressSlider.value = Math.floor(newTime);
        currentTimeEl.textContent = formatTime(newTime);
      }
    } else if (e.key === "ArrowUp" && !isInputFocused) {
      e.preventDefault();
      setVolume(currentVolume + 0.05);
    } else if (e.key === "ArrowDown" && !isInputFocused) {
      e.preventDefault();
      setVolume(currentVolume - 0.05);
    } else if ((e.key === "m" || e.key === "M") && !isInputFocused) {
      e.preventDefault();
      toggleMute();
    } else if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      toggleShuffle();
    } else if (e.ctrlKey && (e.key === "r" || e.key === "R")) {
      e.preventDefault();
      toggleRepeat();
    } else if (e.key === "/" && !isInputFocused) {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === "Escape") {
      if (queueDrawer.classList.contains("open")) {
        queueDrawer.classList.remove("open");
      } else if (searchQuery) {
        searchInput.value = "";
        searchQuery = "";
        clearSearchBtn.style.display = "none";
        refreshView();
        searchInput.blur();
      }
    }
  });
}

function setActiveNav(activeBtn) {
  [navAll, navFavorites, navRecent].forEach((b) => b.classList.remove("active"));
  [sidebarCardAll, sidebarCardFavs].forEach((b) => b.classList.remove("active"));
  activeBtn.classList.add("active");
  if (activeBtn === navAll) sidebarCardAll.classList.add("active");
  if (activeBtn === navFavorites) sidebarCardFavs.classList.add("active");
}

// Start application
window.addEventListener("DOMContentLoaded", initApp);
