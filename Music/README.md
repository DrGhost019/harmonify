# 🎵 Music Directory (`music` / `Music`)

Place your songs in this folder! Harmonify automatically discovers, indexes, and streams every audio file placed here.

---

## 🎧 Supported Audio Formats

Harmonify supports all major high-fidelity and compressed audio formats:

- **MP3** (`.mp3`)
- **FLAC** (`.flac`) - Lossless high resolution
- **WAV** (`.wav`) - Uncompressed audio
- **OGG** (`.ogg`) - Ogg Vorbis container
- **M4A / AAC** (`.m4a`, `.aac`) - Advanced Audio Coding

> [!TIP]
> You can also choose **any** folder on your computer by clicking the **"📁 Choose Music Folder"** pill at the top of the app, or simply drag and drop audio files or folders directly into the Harmonify window!

---

## 🏷️ Naming Convention (For Optimal Lyrics Matching)

Harmonify features an intelligent name parser and also reads embedded ID3 tags directly. For files without embedded metadata, use one of the following formats for automatic lyrics matching:

### Format 1: `Title - Artist.mp3` (Recommended ✅)
```text
Blinding Lights - The Weeknd.mp3
Bohemian Rhapsody - Queen.mp3
Starboy - The Weeknd.mp3
```

### Format 2: `Artist - Title.mp3`
```text
The Weeknd - Blinding Lights.mp3
Queen - Bohemian Rhapsody.mp3
Travis Scott - 90210.mp3
```

### With Featured Artists:
```text
90210 (feat. Kacy Hill) - Travis Scott.mp3
Sicko Mode feat. Drake - Travis Scott.mp3
```

---

## 🎤 How Lyrics Work

Harmonify automatically queries lyrics across multiple providers in parallel:

1. **LRCLIB** - High-accuracy database featuring **real-time synced karaoke lyrics** with millisecond timestamps.
2. **Lyrics.ovh** - Fast, lightweight global lyrics fallback.
3. **Some Random API** - Backup lyrics source (configured via `.env`).

### Synced Lyrics Features:
- **Interactive Karaoke**: Active lines highlight in bright accent color and auto-scroll to center.
- **Click-to-Seek**: Click any lyric line to instantly jump the audio playback to that exact second!
- **Automatic Caching**: Lyrics are cached locally for instantaneous offline loading on repeat listens.

---

## 📂 Example Folder Structure

```text
Music/
├── Blinding Lights - The Weeknd.mp3
├── Bohemian Rhapsody - Queen.flac
├── Starlight Echoes - Harmonify.mp3
├── Synthwave Harmony - Harmonify.mp3
└── README.md
```
