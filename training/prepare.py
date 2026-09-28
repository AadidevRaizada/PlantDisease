"""Build a balanced, resized training set at data/images/<class_id>/*.jpg
from the raw dataset files in data/raw/ (fetch them with download.sh).

Class ids must match app/src/data/crops.ts.
"""

import argparse
import io
import random
import re
import shutil
import zipfile
from collections import defaultdict
from pathlib import Path

import pyarrow.parquet as pq
from PIL import Image

ROOT = Path(__file__).parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "images"
SIZE = 256  # stored short side; training crops to 224
OTHER = "other___unsupported"

PLANTVILLAGE_NAMES = [
    "Apple___Apple_scab", "Apple___Black_rot", "Apple___Cedar_apple_rust", "Apple___healthy", "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew", "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot", "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight", "Corn_(maize)___healthy", "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)", "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)", "Peach___Bacterial_spot", "Peach___healthy",
    "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy", "Potato___Early_blight", "Potato___Late_blight",
    "Potato___healthy", "Raspberry___healthy", "Soybean___healthy", "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch", "Strawberry___healthy", "Tomato___Bacterial_spot", "Tomato___Early_blight",
    "Tomato___Late_blight", "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite", "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus", "Tomato___healthy",
]

PV_MAP = {
    "Tomato___healthy": "tomato___healthy",
    "Tomato___Early_blight": "tomato___early_blight",
    "Tomato___Late_blight": "tomato___late_blight",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": "tomato___leaf_curl",
    "Tomato___Septoria_leaf_spot": "tomato___septoria_leaf_spot",
    "Tomato___Bacterial_spot": "tomato___bacterial_spot",
    "Tomato___Tomato_mosaic_virus": "tomato___mosaic_virus",
    "Tomato___Leaf_Mold": "tomato___leaf_mold",
    "Soybean___healthy": "soybean___healthy",
}


def pv_class(name: str) -> str | None:
    if name in PV_MAP:
        return PV_MAP[name]
    if name.startswith("Tomato"):
        return None  # tomato conditions we don't cover (spider mites, target spot)
    return OTHER


# parquet file -> (label names, label -> class id)
PARQUETS = {
    "sugarcane.parquet": (["Healthy", "Mosaic", "RedRot", "Rust", "Yellow"], {
        "Healthy": "sugarcane___healthy", "RedRot": "sugarcane___red_rot", "Rust": "sugarcane___rust",
        "Mosaic": "sugarcane___mosaic", "Yellow": "sugarcane___yellow_leaf"}.get),
    "cotton.parquet": (["Alternaria_Leaf", "Bacterial_Blight", "Fusarium_Wilt", "Healthy_Leaf", "Verticillium_Wilt"], {
        "Healthy_Leaf": "cotton___healthy", "Bacterial_Blight": "cotton___bacterial_blight",
        "Alternaria_Leaf": "cotton___alternaria_leaf_spot", "Fusarium_Wilt": "cotton___fusarium_wilt",
        "Verticillium_Wilt": "cotton___verticillium_wilt"}.get),
    "soybean.parquet": (["Bacterial_blight", "Frogeye", "Healthy", "Soyabean_rust"], {
        "Healthy": "soybean___healthy", "Soyabean_rust": "soybean___rust",
        "Bacterial_blight": "soybean___bacterial_blight", "Frogeye": "soybean___frogeye_leaf_spot"}.get),
    "plantvillage.parquet": (PLANTVILLAGE_NAMES, pv_class),
}

RICE_FOLDERS = {
    "bacterialblight": "rice___bacterial_leaf_blight", "blast": "rice___blast", "brownspot": "rice___brown_spot",
    "healthy": "rice___healthy", "tungro": "rice___tungro",
}


def save(data: bytes, dest: Path) -> bool:
    try:
        im = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        return False
    w, h = im.size
    s = SIZE / min(w, h)
    if s < 1:
        im = im.resize((round(w * s), round(h * s)), Image.BICUBIC)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=88)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-class", type=int, default=400)
    ap.add_argument("--other-per-label", type=int, default=20)
    ap.add_argument("--raw", type=Path, default=RAW)
    args = ap.parse_args()
    random.seed(0)
    shutil.rmtree(OUT, ignore_errors=True)
    counts: dict[str, int] = defaultdict(int)
    other_counts: dict[str, int] = defaultdict(int)

    def take(cls: str | None, src_label: str, data: bytes, name: str) -> None:
        if cls is None or counts[cls] >= args.per_class:
            return
        if cls == OTHER:
            if other_counts[src_label] >= args.other_per_label:
                return
            other_counts[src_label] += 1
        if save(data, OUT / cls / name):
            counts[cls] += 1

    for fname, (names, mapper) in PARQUETS.items():
        path = args.raw / fname
        if not path.exists():
            print("missing", path)
            continue
        table = pq.read_table(path)
        label_col = "label" if "label" in table.column_names else table.column_names[-1]
        images, labels = table.column("image"), table.column(label_col)
        order = list(range(table.num_rows))
        random.shuffle(order)
        for i in order:
            lab = labels[i].as_py()
            src = names[lab] if isinstance(lab, int) else str(lab)
            take(mapper(src), src, images[i].as_py()["bytes"], f"{path.stem}_{i}.jpg")
        print(f"read {fname}: {table.num_rows} rows")

    rice = args.raw / "rice.zip"
    if rice.exists():
        with zipfile.ZipFile(rice) as z:
            members = [m for m in z.namelist() if m.lower().endswith((".jpg", ".jpeg", ".png"))]
            random.shuffle(members)
            for k, m in enumerate(members):
                parts = [re.sub(r"[^a-z]", "", p.lower()) for p in Path(m).parts[:-1]]
                cls = next((RICE_FOLDERS[p] for p in reversed(parts) if p in RICE_FOLDERS), None)
                take(cls, "", z.read(m), f"rice_{k}.jpg")
        print(f"read rice.zip: {len(members)} images")

    print("\nImages per class:")
    for c in sorted(counts):
        print(f"  {c:40s} {counts[c]}")
    print(f"total {sum(counts.values())} images in {len(counts)} classes")


if __name__ == "__main__":
    main()
