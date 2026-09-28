# 🌱 Plant Doctor

Leaf disease detection + (coming soon) a plant-growing simulator game, for the most common crops of Maharashtra. It runs entirely in the browser as an installable PWA, with English and मराठी text and speech.

**Crops:** 🎋 Sugarcane (ऊस) · ☁️ Cotton (कापूस) · 🫘 Soybean (सोयाबीन) · 🌾 Rice (भात) · 🍅 Tomato (टोमॅटो)

## Use it
Open the GitHub Pages link for this repo on any phone or computer, then tap **Install / Add to Home screen**. Nothing to set up.

## Run locally (one click)
Requires [Node.js 20+](https://nodejs.org).

- **Windows:** double-click `setup.bat`
- **Mac / Linux:** `./setup.sh`

Or manually:
```bash
cd app
npm install
npm run dev
```
Open http://localhost:5173.

**Testing on your phone:** the camera needs HTTPS off-localhost. Run `npm run dev:https` (or `setup.bat https`), open the `https://<your-pc-ip>:5173` address it prints on your phone (same Wi-Fi), and accept the certificate warning.

## Status
| Step | State |
|---|---|
| 1. PWA + camera + result flow + EN/मराठी TTS | ✅ done (runs in **demo mode** until a model is added) |
| 2. Train model (PlantVillage + PlantDoc + crop-specific sets) | ⏳ see `training/` |
| 3. Reference-image matching | ⏳ |
| 4. Simulator game | ⏳ |
| 5. GitHub Pages auto-deploy | ✅ `.github/workflows/deploy.yml` |

## Project layout
```
app/          React + Vite + TypeScript PWA
  src/data/crops.ts        disease knowledge base (EN + मराठी)
  src/lib/classifier.ts    ONNX Runtime Web inference (demo fallback)
  src/lib/tts.ts           Web Speech API (en-IN / mr-IN)
  public/models/           drop model.onnx + labels.json here
training/     dataset list + training pipeline
```

> Disease text is general guidance. Confirm with your local Krishi Vigyan Kendra before spraying.
