# Eyuel — Local Music Player

Simple local music player built with React (in-browser JSX) that plays audio files from your device.

## Screenshot

Add a screenshot image named `screenshot.png` in this folder to show the app UI. The image will appear below once added.

![App Screenshot](screenshot.png)

**Features**

- **Local files:** Add audio files via file chooser; supports common formats (mp3, m4a, wav, ogg, flac, aac, webm).
- **Metadata:** Reads ID3 tags (title, artist, embedded cover) using `jsmediatags` when available.
- **Playback:** Play/pause, prev/next, seek, volume, shuffle, repeat, and a queue.
- **Keyboard:** Space = toggle play/pause, ArrowRight/Left = next/previous, `s` toggles shuffle, `r` cycles repeat.

**Files**

- File: [music.html](music/music.html) — app entry (loads React/Babel/jsmediatags and `app.jsx`).
- File: [app.jsx](music/app.jsx) — main React app (UI + logic).
- File: [app.css](music/app.css) — styles for desktop and mobile.

**How to run**

1. Open `music/music.html` in a Chromium-based browser for full functionality, or serve the folder via a simple static server (recommended).

Run a quick local static server from the `music` folder (examples):

```bash
# Python 3
python -m http.server 8000

# Node (http-server)
npx http-server -c-1
```

Then open http://localhost:8000/music.html (or open the local file directly — some browser features like directory access require HTTPS or localhost).

**Permissions & Notes**

- The app uses object URLs (URL.createObjectURL) to play local files; these are not persistent across browser sessions.
- For a better experience you can enable folder access via the File System Access API (Chromium browsers only). The code can be extended to call `showDirectoryPicker()` to import an entire folder — this requires HTTPS or localhost.
- Metadata extraction requires `jsmediatags` and works on many common files, but not all tags are guaranteed.
- Settings (volume, shuffle, repeat) are saved to `localStorage`.

**Browser support**

- Best experience in Chromium-based browsers (Chrome, Edge). Safari and Firefox support the core playback but may lack File System Access API.

**Troubleshooting**

- If audio does not start, click the play button to grant a user gesture (browsers restrict autoplay).
- If metadata (cover/title) is missing, the file may not contain ID3 tags.

**Development**

- This app uses in-browser Babel for quick local development. For production, consider a bundler (Vite/webpack) and prebuilt assets.

**License & Credits**

- Small personal project. Uses `jsmediatags` for ID3 parsing.

Enjoy — drop audio files into the app and press play.
