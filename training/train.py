"""Fine-tune MobileNetV3 on data/images and save runs/best.pt.

    python train.py --epochs 12
"""

import argparse
import os
import json
import random
import time
from collections import defaultdict
from pathlib import Path

import timm
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms as T

ROOT = Path(__file__).parent
DATA = ROOT / "data" / "images"
RUNS = ROOT / "runs"
MEAN, STD = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)
ARCH = "mobilenetv3_large_100"

train_tf = T.Compose([
    T.RandomResizedCrop(224, scale=(0.45, 1.0)),
    T.RandomHorizontalFlip(),
    T.RandomVerticalFlip(),
    T.RandomRotation(20),
    T.ColorJitter(0.35, 0.35, 0.3, 0.03),
    T.RandomApply([T.GaussianBlur(5, (0.1, 2.0))], p=0.2),
    T.ToTensor(),
    T.Normalize(MEAN, STD),
])
# Matches the app: centre square crop, resized to 224.
eval_tf = T.Compose([T.Resize(224), T.CenterCrop(224), T.ToTensor(), T.Normalize(MEAN, STD)])


def split(ds: datasets.ImageFolder, val_frac: float = 0.15, seed: int = 0):
    by_class = defaultdict(list)
    for i, (_, y) in enumerate(ds.samples):
        by_class[y].append(i)
    rng = random.Random(seed)
    train_idx, val_idx = [], []
    for idx in by_class.values():
        rng.shuffle(idx)
        k = max(1, int(len(idx) * val_frac))
        val_idx += idx[:k]
        train_idx += idx[k:]
    return train_idx, val_idx


def evaluate(model, loader, n_classes, device):
    model.eval()
    correct, total = torch.zeros(n_classes), torch.zeros(n_classes)
    with torch.no_grad(), torch.autocast("cuda", enabled=device == "cuda"):
        for x, y in loader:
            pred = model(x.to(device, non_blocking=True)).argmax(1).cpu()
            for t, p in zip(y, pred):
                total[t] += 1
                correct[t] += int(t == p)
    return (correct.sum() / total.sum()).item(), (correct / total.clamp(min=1)).tolist()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--batch", type=int, default=48)
    ap.add_argument("--lr", type=float, default=6e-4)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        torch.set_num_threads(max(1, (os.cpu_count() or 4) - args.workers))
    base = datasets.ImageFolder(DATA)
    classes = base.classes
    train_idx, val_idx = split(base)
    train_ds = Subset(datasets.ImageFolder(DATA, train_tf), train_idx)
    val_ds = Subset(datasets.ImageFolder(DATA, eval_tf), val_idx)
    print(f"{len(classes)} classes, {len(train_idx)} train / {len(val_idx)} val, device={device}")

    kw = dict(num_workers=args.workers, pin_memory=device == "cuda", persistent_workers=args.workers > 0)
    train_dl = DataLoader(train_ds, args.batch, shuffle=True, drop_last=True, **kw)
    val_dl = DataLoader(val_ds, args.batch * 2, **kw)

    model = timm.create_model(ARCH, pretrained=True, num_classes=len(classes)).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.02)
    steps = args.epochs * len(train_dl)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, args.lr, total_steps=steps, pct_start=0.1)
    scaler = torch.amp.GradScaler(enabled=device == "cuda")
    loss_fn = nn.CrossEntropyLoss(label_smoothing=0.1)

    RUNS.mkdir(exist_ok=True)
    best = 0.0
    for epoch in range(1, args.epochs + 1):
        model.train()
        t0, running = time.time(), 0.0
        for x, y in train_dl:
            x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
            with torch.autocast("cuda", enabled=device == "cuda"):
                loss = loss_fn(model(x), y)
            opt.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.step(opt)
            scaler.update()
            sched.step()
            running += loss.item()
        acc, per_class = evaluate(model, val_dl, len(classes), device)
        print(f"epoch {epoch:2d}  loss {running / len(train_dl):.3f}  val_acc {acc:.4f}  ({time.time() - t0:.0f}s)")
        if acc > best:
            best = acc
            torch.save({"arch": ARCH, "classes": classes, "state_dict": model.state_dict(), "val_idx": val_idx},
                       RUNS / "best.pt")
            metrics = {"val_acc": acc, "per_class": dict(zip(classes, per_class))}
            (RUNS / "metrics.json").write_text(json.dumps(metrics, indent=2))

    print(f"\nbest val acc {best:.4f}")
    for c, a in json.loads((RUNS / "metrics.json").read_text())["per_class"].items():
        print(f"  {c:40s} {a:.3f}")


if __name__ == "__main__":
    main()
