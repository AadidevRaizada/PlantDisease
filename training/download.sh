#!/usr/bin/env sh
# Downloads the raw datasets (~565 MB) into data/raw. Safe to re-run: curl resumes partial files.
set -e
cd "$(dirname "$0")"
mkdir -p data/raw
H=https://huggingface.co/datasets
get() { echo "-> $1"; curl -L -C - --retry 5 -o "data/raw/$1" "$2"; }
get soybean.parquet      "$H/anandvermagmailcom/soybean-leaf-diseases/resolve/main/data/train-00000-of-00001.parquet"
get sugarcane.parquet    "$H/YaswanthReddy23/Sugarcane_leaf/resolve/main/data/train-00000-of-00001.parquet"
get cotton.parquet       "$H/Project-AgML/cotton_leaf_disease_classification/resolve/main/raw/train-00000-of-00001.parquet"
get rice.zip             "$H/sharmin3/Rice-Leaf-Disease/resolve/main/Rice%20Leaf%20Disease-20241115T062818Z-001.zip"
get plantvillage.parquet "$H/BrandonFors/Plant-Diseases-PlantVillage-Dataset/resolve/main/data/test-00000-of-00001.parquet"
