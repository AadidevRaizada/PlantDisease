Put the trained model here:

- `model.onnx`  – image classifier, input `[1,3,224,224]` float32 (ImageNet-normalised RGB), output logits
- `labels.json` – array of class ids in output order, e.g. `["tomato___early_blight", ...]`

Class ids must match the `id`s in `src/data/crops.ts`. Until these files exist the app runs in DEMO mode.
