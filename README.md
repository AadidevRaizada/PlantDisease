# 🌱 Plant Doctor · पीक डॉक्टर

A cozy, bilingual (English / मराठी) farm helper for the most common crops of Maharashtra.
It is an installable web app (PWA) that runs fully in the browser, even offline, on phones, tablets and computers.

**Crops:** 🎋 Sugarcane (ऊस) · ☁️ Cotton (कापूस) · 🫘 Soybean (सोयाबीन) · 🌾 Rice (भात) · 🍅 Tomato (टोमॅटो)

## What it does
- **📷 Check a leaf.** Take or upload a photo. An on-device AI model identifies the crop and the disease (26 conditions,
  plus "not a supported crop"), shows the closest matching photos from its reference database, and explains the
  symptoms and treatment. 🔊 reads it aloud in English or Marathi.
- **🌱 Grow & learn.** A farming game. Pick a crop and season, change the temperature, humidity, rain and fertiliser,
  and watch diseases appear when the weather suits them. Water, drain, spray or use neem traps to save the harvest.
  Guided by Shetkari Dada, with sounds generated in code.
- **📔 Disease diary.** Every disease you meet in the game or find with the camera is collected here.

## Use it
Open the GitHub Pages link for this repo, then **Install / Add to Home screen**. Nothing to set up.

## Run it locally (one click)
Needs [Node.js 20+](https://nodejs.org).

- **Windows:** double-click `setup.bat`
- **Mac / Linux:** `./setup.sh`

Or by hand:
```bash
cd app
npm install
npm run dev
```
Then open http://localhost:5173.

**Using your phone's camera:** run `setup.bat https` (or `npm run dev:https`), open the `https://<your-pc-ip>:5173`
address it prints on your phone (same Wi-Fi), and accept the certificate warning.

## Retrain the model
See [training/README.md](training/README.md). All datasets come from Hugging Face with no login needed.

## Tech
React + Vite + TypeScript · ONNX Runtime Web (WebGPU/WASM) · MobileNetV3 trained with PyTorch/timm ·
Web Speech API · Web Audio API (all sounds generated in code) · hand-drawn SVG art · vite-plugin-pwa ·
GitHub Actions → GitHub Pages.

```
app/            the web app
  src/data/       crops, diseases and simulator settings (EN + मराठी)
  src/game/       simulator engine + game screen
  src/lib/        classifier, speech, sound synth
  src/components/ screens and SVG art
  public/models/  model.onnx, labels.json, refs.json
training/       dataset download, training and export scripts
```

> Disease text is general guidance. Confirm with your local Krishi Vigyan Kendra before spraying.
