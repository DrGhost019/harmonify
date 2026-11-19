const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
require("dotenv").config();

let musicMetadata = null;
import("music-metadata")
  .then((mm) => {
    musicMetadata = mm;
  })
  .catch((err) => {
    console.warn("Could not load music-metadata in main process:", err.message);
  });

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "Harmonify",
    backgroundColor: "#121212",
    autoHideMenuBar: true,
  });

  win.loadFile("index.html");

  // Select custom folder
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "Select Music Folder",
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Extract ID3 metadata & cover art
  ipcMain.handle("parse-metadata", async (event, filePath) => {
    if (!musicMetadata) return null;
    try {
      const meta = await musicMetadata.parseFile(filePath, { skipCovers: false });
      let coverArt = null;
      if (meta.common && meta.common.picture && meta.common.picture.length > 0) {
        const pic = meta.common.picture[0];
        const base64Str = Buffer.from(pic.data).toString("base64");
        coverArt = `data:${pic.format};base64,${base64Str}`;
      }
      return {
        title: meta.common ? meta.common.title : null,
        artist: meta.common ? meta.common.artist : null,
        album: meta.common ? meta.common.album : null,
        duration: meta.format ? meta.format.duration : null,
        coverArt,
      };
    } catch (err) {
      return null;
    }
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
