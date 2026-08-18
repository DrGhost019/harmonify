console.log("Renderer ready");
const fs = require("fs");
const path = require("path");
const { Howl } = require("howler");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const lyricsDisplay = document.getElementById("lyrics-display");
const nowPlayingEl = document.getElementById("now-playing");
let currentSong = null;
let currentIndex = -1;
let lyrics = [];
let lyricsCache = {};
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
let showFavoritesOnly = false;
let shuffleMode = false;
let repeatMode = "none";
let shuffledIndices = [];
let shuffleCurrentIndex = 0;
const musicFolder = path.join(__dirname, "Music");
let songs = [];

fs.readdir(musicFolder, (err, files) => {
  if (err) {
    console.error("Error reading music folder:", err);
    return;
  }
  songs = files.filter((file) => file.endsWith(".mp3"));
  displaySongs(songs);
});

function displaySongs(list) {
  const container = document.getElementById("song-list");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; padding: 20px; color: var(--text-color); opacity: 0.7;">No songs available</p>';
    return;
  }

  list.forEach((song) => {
    const songItem = document.createElement("div");
    songItem.className = "song-item";

    const btn = document.createElement("button");
    btn.className = "song-btn";
    btn.textContent = song.replace(".mp3", "");
    btn.onclick = () => {
      currentIndex = songs.indexOf(song);
      playSong(path.join(musicFolder, song));
      fetchLyrics(song);
    };

    const heartBtn = document.createElement("button");
    heartBtn.className = "heart-btn";
    heartBtn.innerHTML = favorites.includes(song) ? "♥" : "♡";

    if (favorites.includes(song)) {
      heartBtn.classList.add("liked");
    }

    heartBtn.onclick = (e) => {
      e.stopPropagation();
      toggleFavorite(song, heartBtn);
    };

    songItem.appendChild(btn);
    songItem.appendChild(heartBtn);
    container.appendChild(songItem);
  });
}

function toggleFavorite(songName, heartBtn) {
  const index = favorites.indexOf(songName);

  if (index === -1) {
    favorites.push(songName);
    heartBtn.innerHTML = "♥";
    heartBtn.classList.add("liked");
    console.log(`Added to favorites: ${songName}`);
  } else {
    favorites.splice(index, 1);
    heartBtn.innerHTML = "♡";
    heartBtn.classList.remove("liked");
    console.log(`Removed from favorites: ${songName}`);
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));

  if (showFavoritesOnly) {
    applyFilters();
  }
}

function toggleFavoritesFilter() {
  const favoriteBtn = document.getElementById("favorite-btn");
  showFavoritesOnly = !showFavoritesOnly;

  if (showFavoritesOnly) {
    favoriteBtn.classList.add("active");
    console.log("Showing favorites only");
  } else {
    favoriteBtn.classList.remove("active");
    console.log("Showing all songs");
  }

  applyFilters();
}

function applyFilters() {
  const searchTerm = document
    .getElementById("search-input")
    .value.toLowerCase()
    .trim();
  let filteredSongs = [...songs];

  if (showFavoritesOnly) {
    filteredSongs = filteredSongs.filter((song) => favorites.includes(song));
  }

  if (searchTerm !== "") {
    filteredSongs = filteredSongs.filter((song) =>
      song.toLowerCase().includes(searchTerm),
    );
  }

  displaySongs(filteredSongs);

  if (filteredSongs.length === 0) {
    const container = document.getElementById("song-list");
    if (showFavoritesOnly && searchTerm === "") {
      container.innerHTML =
        '<p style="text-align: center; padding: 20px; color: var(--text-color); opacity: 0.7;">No favorite songs yet. Click ♡ to add!</p>';
    } else if (showFavoritesOnly && searchTerm !== "") {
      container.innerHTML =
        '<p style="text-align: center; padding: 20px; color: var(--text-color); opacity: 0.7;">No favorites matching "' +
        searchTerm +
        '"</p>';
    } else {
      container.innerHTML =
        '<p style="text-align: center; padding: 20px; color: var(--text-color); opacity: 0.7;">No songs found matching "' +
        searchTerm +
        '"</p>';
    }
  }
}

function parseSongName(songName) {
  const cleanName = songName.replace(".mp3", "").trim();
  let artist = "",
    title = "";

  const separators = [" - ", " – ", " — "];
  let separatorFound = false;
  let part1 = "",
    part2 = "";

  for (const sep of separators) {
    const idx = cleanName.indexOf(sep);
    if (idx !== -1) {
      part1 = cleanName.substring(0, idx).trim();
      part2 = cleanName.substring(idx + sep.length).trim();
      separatorFound = true;
      break;
    }
  }

  if (!separatorFound) {
    title = cleanName;
    artist = "Unknown";
  } else {
    const indicators = {
      hasFeat: /feat\.?|ft\.?/i,
      hasParentheses: /\(.*\)/,
      hasBrackets: /\[.*\]/,
      hasOfficial: /official|video|audio|lyric|remix/i,
    };

    const part1IsTitle =
      indicators.hasFeat.test(part1) ||
      indicators.hasParentheses.test(part1) ||
      indicators.hasBrackets.test(part1) ||
      indicators.hasOfficial.test(part1);

    const part2IsTitle =
      indicators.hasFeat.test(part2) ||
      indicators.hasParentheses.test(part2) ||
      indicators.hasBrackets.test(part2) ||
      indicators.hasOfficial.test(part2);

    if (part1IsTitle && !part2IsTitle) {
      title = part1;
      artist = part2;
    } else if (part2IsTitle && !part1IsTitle) {
      artist = part1;
      title = part2;
    } else {
      title = part1;
      artist = part2;
    }
  }

  title = title
    .replace(
      /\s*\((?:official|video|audio|lyric|lyrics|hd|hq|music).*?\)/gi,
      "",
    )
    .trim();
  title = title
    .replace(
      /\s*\[(?:official|video|audio|lyric|lyrics|remix|remastered).*?\]/gi,
      "",
    )
    .trim();
  title = title.replace(/\s*feat\..*$/i, "").trim();
  title = title.replace(/\s*ft\..*$/i, "").trim();

  if (artist && title.toLowerCase().includes(artist.toLowerCase())) {
    title = title.replace(new RegExp(artist, "gi"), "").trim();
  }

  return { artist, title };
}

function playSong(filePath) {
  if (currentSong) currentSong.stop();
  currentSong = new Howl({
    src: [filePath],
    html5: true,
    onplay: () => requestAnimationFrame(updateProgress),
    onload: () => {
      const duration = currentSong.duration();
      progress.max = Math.floor(duration);
      durationEl.textContent = formatTime(duration);
    },
    onend: () => {
      if (repeatMode === "one") {
        currentSong.play();
        return;
      }
      playNextSong();
    },
  });
  nowPlayingEl.textContent = `Now Playing: ${songs[currentIndex].replace(".mp3", "")}`;
  currentSong.play();
}

function generateShuffledIndices() {
  shuffledIndices = songs.map((_, index) => index);
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [
      shuffledIndices[j],
      shuffledIndices[i],
    ];
  }
  shuffleCurrentIndex = 0;
}

function getNextShuffleIndex() {
  shuffleCurrentIndex++;
  if (shuffleCurrentIndex >= shuffledIndices.length) {
    if (repeatMode === "all") {
      generateShuffledIndices();
    } else {
      shuffleCurrentIndex = shuffledIndices.length - 1;
      return null;
    }
  }
  return shuffledIndices[shuffleCurrentIndex];
}

function getPrevShuffleIndex() {
  shuffleCurrentIndex--;
  if (shuffleCurrentIndex < 0) {
    shuffleCurrentIndex = 0;
    return null;
  }
  return shuffledIndices[shuffleCurrentIndex];
}

function toggleRepeat() {
  const repeatBtn = document.getElementById("repeat-btn");

  if (repeatMode === "none") {
    repeatMode = "all";
    repeatBtn.classList.add("active");
    repeatBtn.classList.remove("repeat-one");
  } else if (repeatMode === "all") {
    repeatMode = "one";
    repeatBtn.classList.add("repeat-one");
  } else {
    repeatMode = "none";
    repeatBtn.classList.remove("active", "repeat-one");
  }
}

function toggleShuffle() {
  const shuffleBtn = document.getElementById("shuffle-btn");
  shuffleMode = !shuffleMode;

  if (shuffleMode) {
    shuffleBtn.classList.add("active");
    generateShuffledIndices();
    const currentRealIndex = currentIndex;
    shuffleCurrentIndex = shuffledIndices.indexOf(currentRealIndex);
    if (shuffleCurrentIndex === -1) shuffleCurrentIndex = 0;
  } else {
    shuffleBtn.classList.remove("active");
  }
}

async function playNextSong() {
  let nextIndex;

  if (shuffleMode) {
    nextIndex = getNextShuffleIndex();
    if (nextIndex === null) return;
  } else {
    if (currentIndex < songs.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (repeatMode === "all") {
      nextIndex = 0;
    } else {
      return;
    }
  }

  currentIndex = nextIndex;
  try {
    playSong(path.join(musicFolder, songs[currentIndex]));
    fetchLyrics(songs[currentIndex]);
  } catch (error) {
    console.error("Error getting next song path:", error);
  }
}

async function playPrevSong() {
  let prevIndex;

  if (shuffleMode) {
    prevIndex = getPrevShuffleIndex();
    if (prevIndex === null) return;
  } else {
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    } else if (repeatMode === "all") {
      prevIndex = songs.length - 1;
    } else {
      return;
    }
  }

  currentIndex = prevIndex;
  try {
    playSong(path.join(musicFolder, songs[currentIndex]));
    fetchLyrics(songs[currentIndex]);
  } catch (error) {
    console.error("Error getting previous song path:", error);
  }
}

async function fetchLyrics(songName) {
  const cleanName = songName.replace(".mp3", "");

  if (lyricsCache[cleanName]) {
    lyrics = lyricsCache[cleanName];
    displayLyrics();
    return;
  }

  lyricsDisplay.innerHTML = "<p>Searching lyrics...</p>";

  const { artist, title } = parseSongName(songName);

  const sources = [
    { name: "LRCLIB", fn: () => fetchFromLRCLIB(artist, title) },
    { name: "Lyrics.ovh", fn: () => fetchFromLyricsOvh(artist, title) },
    { name: "Some Random API", fn: () => fetchFromSomeRandomAPI(title) },
  ];

  const promises = sources.map((source) => {
    return Promise.race([
      source.fn().then((result) => ({ name: source.name, result })),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000),
      ),
    ]).catch((err) => ({ name: source.name, result: null }));
  });

  try {
    const results = await Promise.all(promises);

    for (const { name, result } of results) {
      if (result && result.trim().length > 20) {
        lyrics = result.split("\n").filter((line) => line.trim() !== "");
        lyricsCache[cleanName] = lyrics;
        displayLyrics();
        return;
      }
    }

    lyricsDisplay.innerHTML = "<p>Could not find lyrics</p>";
    lyrics = [];
  } catch (error) {
    lyricsDisplay.innerHTML = "<p>Error searching lyrics</p>";
    lyrics = [];
  }
}

async function fetchFromLRCLIB(artist, title) {
  try {
    const response = await fetch(
      `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.plainLyrics || data.syncedLyrics || null;
  } catch (error) {
    return null;
  }
}

async function fetchFromLyricsOvh(artist, title) {
  try {
    const response = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.lyrics || null;
  } catch (error) {
    return null;
  }
}

async function fetchFromSomeRandomAPI(title) {
  try {
    const token = process.env.SOME_RANDOM_API_TOKEN;

    if (!token) {
      console.warn("Some Random API token not found in .env file");
      return null;
    }

    const response = await fetch(
      `https://some-random-api.com/lyrics?title=${encodeURIComponent(title)}`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.error) return null;
    return data.lyrics;
  } catch (error) {
    console.log("Some Random API error:", error.message);
    return null;
  }
}

function displayLyrics() {
  lyricsDisplay.innerHTML = "";
  if (lyrics.length === 0) {
    lyricsDisplay.innerHTML = "<p>No lyrics available</p>";
    return;
  }
  lyrics.forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    lyricsDisplay.appendChild(p);
  });
}

function updateProgress() {
  if (currentSong && currentSong.playing()) {
    const currentTime = currentSong.seek();
    progress.value = Math.floor(currentTime);
    currentTimeEl.textContent = formatTime(currentTime);
    requestAnimationFrame(updateProgress);
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

document.getElementById("play-btn").onclick = () => {
  if (currentSong && !currentSong.playing()) currentSong.play();
};
document.getElementById("pause-btn").onclick = () => {
  if (currentSong && currentSong.playing()) currentSong.pause();
};
document.getElementById("prev-btn").onclick = () => playPrevSong();
document.getElementById("next-btn").onclick = () => playNextSong();
document.getElementById("stop-btn").onclick = () => {
  if (currentSong) {
    currentSong.stop();
    currentSong = null;
    progress.value = 0;
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    nowPlayingEl.textContent = "No song selected";
    lyricsDisplay.innerHTML = "";
  }
};

progress.addEventListener("input", () => {
  if (currentSong) {
    currentSong.seek(progress.value);
    currentTimeEl.textContent = formatTime(progress.value);
  }
});

document.getElementById("shuffle-btn").onclick = () => toggleShuffle();
document.getElementById("repeat-btn").onclick = () => toggleRepeat();

const searchInput = document.getElementById("search-input");
searchInput.addEventListener("input", () => applyFilters());
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    searchInput.value = "";
    applyFilters();
    searchInput.blur();
  }
});

document.getElementById("favorite-btn").onclick = () => toggleFavoritesFilter();

const themeSelect = document.getElementById("theme-select");
function applyTheme(theme) {
  document.body.className = theme;
  localStorage.setItem("selectedTheme", theme);
}
const savedTheme = localStorage.getItem("selectedTheme") || "dark";
applyTheme(savedTheme);
themeSelect.value = savedTheme;
themeSelect.addEventListener("change", (e) => applyTheme(e.target.value));

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    toggleShuffle();
  }
  if (e.ctrlKey && e.key === "r") {
    e.preventDefault();
    toggleRepeat();
  }
  if (e.key === "m" || e.key === "M") {
    if (document.activeElement.tagName !== "INPUT") {
    }
  }
});

const canvas = document.getElementById("star-rain");
const ctx = canvas.getContext("2d");

let stars = [];
const STAR_COUNT = 50;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

class Star {
  constructor() {
    this.reset();
    this.y = Math.random() * canvas.height;
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = -10;
    this.size = Math.random() * 3 + 1;
    this.speed = Math.random() * 2 + 1;
    this.opacity = Math.random() * 0.5 + 0.3;
    this.twinkleSpeed = Math.random() * 0.02 + 0.01;
    this.twinkleDirection = 1;
  }

  update() {
    this.y += this.speed;

    this.opacity += this.twinkleSpeed * this.twinkleDirection;
    if (this.opacity >= 0.8 || this.opacity <= 0.3) {
      this.twinkleDirection *= -1;
    }

    if (this.y > canvas.height + 10) {
      this.reset();
    }
  }

  draw(color) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
    ctx.globalAlpha = this.opacity * 0.3;
    ctx.fill();

    ctx.restore();
  }
}

function createStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(new Star());
  }
}

createStars();

function animateStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const accentColor = getComputedStyle(document.body)
    .getPropertyValue("--accent-color")
    .trim();

  stars.forEach((star) => {
    star.update();
    star.draw(accentColor);
  });

  requestAnimationFrame(animateStars);
}

animateStars();

window.addEventListener("resize", () => {
  resizeCanvas();
  createStars();
});
