"""Build a balanced, resized training set at data/images/<class_id>/*.jpg.

Instead of downloading whole datasets, this asks the Hugging Face
datasets-server for rows of one label at a time and downloads only the images
it needs, so it works on slow connections. Re-running resumes where it stopped.

Class ids must match app/src/data/crops.ts.
"""

import argparse
import io
import json
import random
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
OUT = ROOT / "data" / "images"
API = "https://datasets-server.huggingface.co"
SIZE = 256  # stored short side; training crops to 224
OTHER = "other___unsupported"

TOMATO = {
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

PLANTDOC = {
    "Tomato leaf": "tomato___healthy",
    "Tomato Early blight leaf": "tomato___early_blight",
    "Tomato leaf late blight": "tomato___late_blight",
    "Tomato leaf yellow virus": "tomato___leaf_curl",
    "Tomato Septoria leaf spot": "tomato___septoria_leaf_spot",
    "Tomato leaf bacterial spot": "tomato___bacterial_spot",
    "Tomato leaf mosaic virus": "tomato___mosaic_virus",
    "Tomato mold leaf": "tomato___leaf_mold",
    "Soyabean leaf": "soybean___healthy",
}

# (dataset, config, split, {source label: class id}, "field" photos?)
# Field photos are taken first so lab photos never crowd them out.
SOURCES = [
    ("Project-AgML/plant_doc_classification", "default", "train", PLANTDOC, True),
    ("YaswanthReddy23/Sugarcane_leaf", "default", "train", {
        "Healthy": "sugarcane___healthy", "RedRot": "sugarcane___red_rot", "Rust": "sugarcane___rust",
        "Mosaic": "sugarcane___mosaic", "Yellow": "sugarcane___yellow_leaf"}, True),
    ("Project-AgML/cotton_leaf_disease_classification", "raw", "train", {
        "Healthy_Leaf": "cotton___healthy", "Bacterial_Blight": "cotton___bacterial_blight",
        "Alternaria_Leaf": "cotton___alternaria_leaf_spot", "Fusarium_Wilt": "cotton___fusarium_wilt",
        "Verticillium_Wilt": "cotton___verticillium_wilt"}, True),
    ("anandvermagmailcom/soybean-leaf-diseases", "default", "train", {
        "Healthy": "soybean___healthy", "Soyabean_rust": "soybean___rust",
        "Bacterial_blight": "soybean___bacterial_blight", "Frogeye": "soybean___frogeye_leaf_spot"}, True),
    ("Project-AgML/rice_leaf_disease_classification_india", "default", "train", {
        "Bacterialblight": "rice___bacterial_leaf_blight", "Blast": "rice___blast",
        "Brownspot": "rice___brown_spot", "Tungro": "rice___tungro"}, True),
    ("Project-AgML/rice_leaf_disease_classification", "default", "train", {
        "Healthy_Rice_Leaf": "rice___healthy", "Bacterial_Leaf_Blight": "rice___bacterial_leaf_blight",
        "Leaf_Blast": "rice___blast", "Brown_Spot": "rice___brown_spot"}, True),
    ("BrandonFors/Plant-Diseases-PlantVillage-Dataset", "default", "train", TOMATO, False),
]
# PlantVillage / PlantDoc labels of other plants become the "not supported" class.
OTHER_SOURCES = [
    ("BrandonFors/Plant-Diseases-PlantVillage-Dataset", "default", "train", False),
    ("Project-AgML/plant_doc_classification", "default", "train", True),
]


def get_json(url: str, tries: int = 5):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # rate limits / transient errors
            if i == tries - 1:
                raise
            print(f"  retry ({e})")
            time.sleep(3 * (i + 1))


def label_names(ds: str, config: str) -> list[str]:
    info = get_json(f"{API}/info?dataset={urllib.parse.quote(ds)}")
    return info["dataset_info"][config]["features"]["label"]["names"]


def rows_for_label(ds: str, config: str, split: str, label: int, want: int) -> list[str]:
    """Image URLs for up to `want` rows with this label, spread across the label."""
    where = urllib.parse.quote('"label"=' + str(label))
    q = lambda off, n: (
        f"{API}/filter?dataset={urllib.parse.quote(ds)}&config={config}&split={split}"
        f"&where={where}&offset={off}&length={n}"
    )
    first = get_json(q(0, 1))
    total = first.get("num_rows_total", 0)
    if not total:
        return []
    pages = list(range(0, total, 100))
    random.shuffle(pages)
    urls: list[str] = []
    for off in pages:
        if len(urls) >= want:
            break
        page = get_json(q(off, 100))
        urls += [r["row"]["image"]["src"] for r in page["rows"]]
    random.shuffle(urls)
    return urls[:want]


def fetch(url: str, dest: Path) -> bool:
    if dest.exists():
        return True
    for i in range(3):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                im = Image.open(io.BytesIO(r.read())).convert("RGB")
            w, h = im.size
            s = SIZE / min(w, h)
            if s < 1:
                im = im.resize((round(w * s), round(h * s)), Image.BICUBIC)
            dest.parent.mkdir(parents=True, exist_ok=True)
            im.save(dest, "JPEG", quality=88)
            return True
        except Exception:
            time.sleep(2 * (i + 1))
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-class", type=int, default=300)
    ap.add_argument("--other", type=int, default=400)
    ap.add_argument("--workers", type=int, default=16)
    args = ap.parse_args()
    random.seed(0)

    # plan: which URLs go to which class
    counts = defaultdict(int, {p.name: len(list(p.glob("*.jpg"))) for p in OUT.glob("*") if p.is_dir()})
    jobs: list[tuple[str, Path]] = []
    planned = defaultdict(int, counts)

    for ds, config, split, mapping, _ in SOURCES:
        names = label_names(ds, config)
        tag = ds.split("/")[1][:10]
        for idx, name in enumerate(names):
            cls = mapping.get(name)
            need = args.per_class - planned[cls] if cls else 0
            if need <= 0:
                continue
            urls = rows_for_label(ds, config, split, idx, need)
            print(f"{cls:40s} +{len(urls):4d}  from {ds} [{name}]")
            for k, u in enumerate(urls):
                jobs.append((u, OUT / cls / f"{tag}_{idx}_{k}.jpg"))
            planned[cls] += len(urls)

    if planned[OTHER] < args.other:
        for ds, config, split, field in OTHER_SOURCES:
            names = label_names(ds, config)
            others = [i for i, n in enumerate(names) if n not in TOMATO and n not in PLANTDOC and not n.startswith("Tomato")]
            per = max(4, (args.other // 2) // len(others))
            tag = ds.split("/")[1][:10]
            for idx in others:
                urls = rows_for_label(ds, config, split, idx, per)
                for k, u in enumerate(urls):
                    jobs.append((u, OUT / OTHER / f"{tag}_{idx}_{k}.jpg"))
                planned[OTHER] += len(urls)
            print(f"{OTHER:40s} {planned[OTHER]:4d} planned after {ds}")

    jobs = [(u, d) for u, d in jobs if not d.exists()]
    print(f"\ndownloading {len(jobs)} images with {args.workers} workers…")
    done = 0
    with ThreadPoolExecutor(args.workers) as pool:
        for ok in pool.map(lambda j: fetch(*j), jobs):
            done += 1
            if done % 200 == 0:
                print(f"  {done}/{len(jobs)}", flush=True)

    print("\nImages per class:")
    for p in sorted(OUT.glob("*")):
        print(f"  {p.name:40s} {len(list(p.glob('*.jpg')))}")


if __name__ == "__main__":
    main()
