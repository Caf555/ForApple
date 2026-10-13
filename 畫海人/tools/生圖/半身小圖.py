"""戰鬥畫面的角色半身小圖：照 半身小圖.json 從定稿立繪裁出頭到胸口，存進 img/char/，並更新 img/manifest.json

用法：python 畫海人/tools/生圖/半身小圖.py [--src 立繪資料夾]
"""
import argparse, json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
GAME = HERE.parent.parent
OUT = GAME / 'img' / 'char'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=str(HERE / '定稿'), help='放 立繪_名字.webp 的資料夾')
    a = ap.parse_args()
    cfg = json.loads((HERE / '半身小圖.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True, exist_ok=True)
    w, h = cfg['size']
    names = []
    for name, (cx, top, bw) in cfg['box'].items():
        src = Path(a.src) / f'立繪_{name}.webp'
        if not src.exists():
            print(f'找不到 {src}，跳過')
            continue
        im = Image.open(src).convert('RGB')
        bh = round(bw * 1.2)
        im = im.crop((cx - bw // 2, top, cx - bw // 2 + bw, top + bh)).resize((w, h), Image.LANCZOS)
        im.save(OUT / f'角_{name}.webp', 'WEBP', quality=85, method=6)
        names.append(f'角_{name}')
        print(f'角_{name}.webp')
    man_path = GAME / 'img' / 'manifest.json'
    man = json.loads(man_path.read_text(encoding='utf-8'))
    man['char'] = sorted(set(man.get('char', [])) | set(names))
    man_path.write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
