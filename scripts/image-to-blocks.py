"""
画像のシルエットを Unicode の四分割ブロック文字（▘▝▖▗▀▄▌▐▚▞▛▜▙▟█）に変換する。
GitHub アバター（狐）から src/data/ascii.ts の FOX を作るのに使ったスクリプト。

使い方（Pillow が必要: pip install pillow）:
    python scripts/image-to-blocks.py avatar.png --cols 34
    python scripts/image-to-blocks.py avatar.png --cols 34 --threshold 0.45 --invert

暗い部分を「塗り」とみなす。白背景に黒いシルエットの画像を想定（逆の場合は --invert）。
文字セルは JetBrains Mono（幅 0.6em・行の高さ 1.32em）を前提に縦横比を補正している。
"""
import argparse
import json
import sys

from PIL import Image, ImageOps

QUAD = {
    (0, 0, 0, 0): " ", (1, 0, 0, 0): "▘", (0, 1, 0, 0): "▝", (0, 0, 1, 0): "▖", (0, 0, 0, 1): "▗",
    (1, 1, 0, 0): "▀", (0, 0, 1, 1): "▄", (1, 0, 1, 0): "▌", (0, 1, 0, 1): "▐",
    (1, 0, 0, 1): "▚", (0, 1, 1, 0): "▞", (1, 1, 1, 0): "▛", (1, 1, 0, 1): "▜",
    (1, 0, 1, 1): "▙", (0, 1, 1, 1): "▟", (1, 1, 1, 1): "█",
}
CELL_W, CELL_H = 0.6, 1.32


def convert(path: str, cols: int, threshold: float, invert: bool) -> list[str]:
    img = Image.open(path).convert("L")
    if not invert:
        img = ImageOps.invert(img)  # 暗い部分（シルエット）を明るくして「塗り」として扱う
    bbox = img.point(lambda v: 255 if v > 100 else 0).getbbox()
    if bbox:
        img = img.crop(bbox)
    w, h = img.size
    rows = max(1, round((h / w) * (cols * CELL_W) / CELL_H))
    small = img.resize((cols * 2, rows * 2), Image.Resampling.BOX)
    px = small.load()
    lines = []
    for r in range(rows):
        line = ""
        for c in range(cols):
            key = tuple(1 if px[c * 2 + dx, r * 2 + dy] / 255 >= threshold else 0 for dy in (0, 1) for dx in (0, 1))
            line += QUAD[key]
        lines.append(line.rstrip())
    while lines and not lines[-1]:
        lines.pop()
    return lines


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("image")
    parser.add_argument("--cols", type=int, default=34, help="横幅（文字数）")
    parser.add_argument("--threshold", type=float, default=0.5, help="塗りとみなす濃さ（0〜1）")
    parser.add_argument("--invert", action="store_true", help="明るい部分を塗りとみなす")
    args = parser.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")
    lines = convert(args.image, args.cols, args.threshold, args.invert)
    print("export const FOX = [")
    for line in lines:
        print(f"  {json.dumps(line, ensure_ascii=False)},")
    print("].join('\\n');")


if __name__ == "__main__":
    main()
