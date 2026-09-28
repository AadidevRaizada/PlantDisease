# Training (step 2, not yet implemented)

Goal: one classifier whose labels are `<crop>___<condition>`, matching the ids in `app/src/data/crops.ts`.
Export it to `app/public/models/model.onnx` plus `labels.json`.

## Datasets
| Crop | Source |
|---|---|
| Tomato | Kaggle `abdallahalidev/plantvillage-dataset` (lab photos) + PlantDoc (field photos, github.com/pratikkayal/PlantDoc-Dataset) |
| Soybean | PlantVillage (healthy only), so add a Kaggle soybean leaf disease set (rust / yellow mosaic) |
| Rice | Kaggle rice leaf disease sets (blast, bacterial leaf blight, brown spot) |
| Cotton | Kaggle cotton disease sets (bacterial blight, curl virus) |
| Sugarcane | Kaggle sugarcane leaf disease sets (red rot, rust, healthy) |

Exact Kaggle slugs for the crop-specific sets still need to be picked and checked for licence and quality.

## Plan
- Fine-tune `timm` MobileNetV3-Large / EfficientNet-B0 at 224px, with strong augmentation (field photos matter).
- Hold out PlantDoc-style field images for validation, not just lab images.
- `torch.onnx.export` with input `[1,3,224,224]`, ImageNet normalisation.
- Train on Kaggle or Colab's free GPU.
