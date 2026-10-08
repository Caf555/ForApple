#!/usr/bin/env python3
"""《畫海人》批次生圖：呼叫本機 ComfyUI 工作流，產生遊戲用圖片（從《千秋硯》的 batch.py 複製改寫）。
工作流檔案共用 千秋硯/tools/生圖/workflows/。

用法（在儲存庫根目錄）：
  python 畫海人/tools/生圖/batch.py                      # 產生清單中所有還沒有的圖
  python 畫海人/tools/生圖/batch.py --names 幕_群島夜海   # 只產生指定的圖
  python 畫海人/tools/生圖/batch.py --names 幕_群島夜海 --force --seed-offset 1   # 換一個種子重畫
  python 畫海人/tools/生圖/batch.py --dry-run             # 只列出要做什麼，不實際生圖
  python 畫海人/tools/生圖/batch.py --rebuild             # 不生圖，只用已有的原圖重新產生網頁用檔案

需要：Python 3.9 以上、Pillow（pip install pillow）、正在執行的 ComfyUI（預設 http://127.0.0.1:8188）。
"""
import argparse
import copy
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit('需要 Pillow：請先執行  pip install pillow')

HERE = Path(__file__).resolve().parent
GAME = HERE.parent.parent            # 畫海人/
WORKFLOWS = GAME.parent / '千秋硯' / 'tools' / '生圖' / 'workflows'
IMG = GAME / 'img'
RAW = HERE / '原圖'                  # 保存 ComfyUI 輸出的原始 PNG（供圖生圖參考與重新裁切）
MANIFEST = IMG / 'manifest.json'
WEB_WIDTHS = {'scene': (1200, 700)}   # 劇情動畫的正方形插圖
SQUARE = {'char': 512, 'enemy': 512, 'item': 256}


def log(msg):
    print(msg, flush=True)


# ───────── ComfyUI API ─────────
class Comfy:
    def __init__(self, server):
        self.server = server.rstrip('/')
        self.client_id = str(uuid.uuid4())

    def _req(self, path, data=None, headers=None, timeout=60):
        req = urllib.request.Request(self.server + path, data=data, headers=headers or {})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()

    def check(self):
        try:
            self._req('/system_stats', timeout=5)
        except Exception as e:
            sys.exit(f'連不到 ComfyUI（{self.server}）：{e}\n請確認 ComfyUI 已經啟動，或用 --server 指定網址。')

    def upload(self, path):
        boundary = uuid.uuid4().hex
        body = b''.join([
            f'--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n'.encode(),
            f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{path.name}"\r\nContent-Type: image/png\r\n\r\n'.encode(),
            path.read_bytes(),
            f'\r\n--{boundary}--\r\n'.encode(),
        ])
        res = json.loads(self._req('/upload/image', body, {'Content-Type': f'multipart/form-data; boundary={boundary}'}))
        return (res['subfolder'] + '/' + res['name']) if res.get('subfolder') else res['name']

    def run(self, workflow, save_node, timeout=900):
        data = json.dumps({'prompt': workflow, 'client_id': self.client_id}).encode()
        try:
            res = json.loads(self._req('/prompt', data, {'Content-Type': 'application/json'}))
        except urllib.error.HTTPError as e:
            raise RuntimeError(f'ComfyUI 拒絕了工作流：{e.read().decode(errors="replace")[:500]}')
        pid = res['prompt_id']
        start = time.time()
        while time.time() - start < timeout:
            hist = json.loads(self._req(f'/history/{pid}'))
            if pid in hist:
                entry = hist[pid]
                status = entry.get('status', {})
                if status.get('status_str') == 'error':
                    raise RuntimeError(f'生圖失敗：{json.dumps(status.get("messages", []), ensure_ascii=False)[:500]}')
                images = entry.get('outputs', {}).get(save_node, {}).get('images', [])
                if images:
                    im = images[0]
                    q = urllib.parse.urlencode({'filename': im['filename'], 'subfolder': im.get('subfolder', ''), 'type': im.get('type', 'output')})
                    return self._req(f'/view?{q}', timeout=120)
            time.sleep(1)
        raise RuntimeError('等待逾時')


# ───────── 工作流填值 ─────────
def build(item, cfg, templates, comfy, dry):
    kind = item['kind']
    style = cfg['style']
    # 各類別可以有自己的風格；沒有的話，頭像類沿用 char、大圖沿用 bg
    style_text = style[kind]
    prompt = f"{style_text} {item['prompt']}"
    if item.get('transparent'):
        prompt += ' Transparent background with alpha channel.'
    use_edit = bool(item.get('ref'))
    nodes = cfg['nodes']['edit' if use_edit else 't2i']
    wf = copy.deepcopy(templates['edit' if use_edit else 't2i'])
    text = wf[nodes['text']]['inputs']
    text['prompt'] = prompt
    text['negative_prompt'] = style['negative']
    wf[nodes['seed']]['inputs']['noise_seed'] = item['_seed']
    wf[nodes['save']]['inputs']['filename_prefix'] = f"huahairen/{kind}_{item['seed']}"
    if use_edit:
        ref = RAW / f"{item['ref']}.png"
        if not ref.exists():
            raise RuntimeError(f"參考圖「{item['ref']}」還沒有產生，請先產生它")
        wf[nodes['image']]['inputs']['image'] = 'ref.png' if dry else comfy.upload(ref)
    else:
        w, h = item.get('size') or cfg['sizes'][kind]
        size = wf[nodes['size']]['inputs']
        size['width'], size['height'] = w, h
    return wf, nodes['save']


# ───────── 網頁用檔案 ─────────
def web_files(kind, name):
    if kind in WEB_WIDTHS:
        return [IMG / kind / f'{name}-{w}.webp' for w in WEB_WIDTHS[kind]]
    return [IMG / kind / f'{name}.webp']


def export(kind, name, raw_path):
    im = Image.open(raw_path)
    (IMG / kind).mkdir(parents=True, exist_ok=True)
    if kind in WEB_WIDTHS:
        im = im.convert('RGB')
        for w in WEB_WIDTHS[kind]:
            h = round(im.height * w / im.width)
            im.resize((w, h), Image.LANCZOS).save(IMG / kind / f'{name}-{w}.webp', 'WEBP', quality=80, method=6)
    else:
        side = SQUARE[kind]
        has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        im = im.convert('RGBA' if has_alpha else 'RGB')
        s = min(im.size)
        left, top = (im.width - s) // 2, (im.height - s) // 2
        im = im.crop((left, top, left + s, top + s)).resize((side, side), Image.LANCZOS)
        im.save(IMG / kind / f'{name}.webp', 'WEBP', quality=82, method=6)
        return has_alpha
    return None


def update_manifest():
    man = {k: [] for k in WEB_WIDTHS}
    for kind in man:
        for f in sorted((IMG / kind).glob('*.webp')) if (IMG / kind).exists() else []:
            stem = f.stem
            if kind in WEB_WIDTHS:
                small = f'-{WEB_WIDTHS[kind][-1]}'
                if not stem.endswith(small):
                    continue
                stem = stem[:-len(small)]
            man[kind].append(stem)
    IMG.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return man


def review_page(cfg, list_path):
    """產生審圖頁：在瀏覽器打開 審圖.html，逐張檢查"""
    rows = []
    for it in reversed(cfg['items']):  # 新加的排在最前面
        files = web_files(it['kind'], it['name'])
        src = '../../img/' + files[-1].relative_to(IMG).as_posix() if files[-1].exists() else ''
        img = f'<img src="{urllib.parse.quote(src)}" loading="lazy">' if src else '<div class="none">尚未產生</div>'
        rows.append(f'<figure class="{it["kind"]}">{img}<figcaption><b>{it["name"]}</b>　種子 {it["seed"]}{"　參考：" + it["ref"] if it.get("ref") else ""}<br><small>{it["prompt"]}</small></figcaption></figure>')
    html = f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>審圖：{list_path.stem}</title>
<style>body{{font-family:sans-serif;background:#222;color:#eee;margin:16px}}main{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}}
figure{{margin:0;background:#333;border-radius:8px;overflow:hidden}}img{{width:100%;display:block;background:repeating-conic-gradient(#555 0 25%,#444 0 50%) 0 0/20px 20px}}
figure.char img,figure.enemy img,figure.item img{{aspect-ratio:1}}figcaption{{padding:8px;font-size:13px}}small{{color:#aaa}}.none{{padding:40px;text-align:center;color:#888}}</style>
<h1>審圖：{list_path.stem}</h1><p>棋盤格底紋代表透明背景。不滿意的圖，記下名稱，用 --names 名稱 --force --seed-offset 1 重畫。</p>
<main>{"".join(rows)}</main>'''
    (HERE / '審圖.html').write_text(html, encoding='utf-8')


def main():
    ap = argparse.ArgumentParser(description='《畫海人》批次生圖')
    ap.add_argument('--list', help='只用這一份清單（預設：資料夾裡所有「清單_*.json」）')
    ap.add_argument('--server', default='http://127.0.0.1:8188')
    ap.add_argument('--only', choices=list(WEB_WIDTHS))
    ap.add_argument('--names', help='只產生這些名稱（逗號分隔）')
    ap.add_argument('--force', action='store_true', help='已經有的圖也重畫')
    ap.add_argument('--seed-offset', type=int, default=0, help='種子加上這個數字，用來重畫出不同的版本')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--rebuild', action='store_true', help='只用已有的原圖重新產生網頁檔案')
    args = ap.parse_args()

    # 每份清單都帶有自己的節點、尺寸與畫風；多份清單時合併 items
    paths = [Path(args.list)] if args.list else sorted(HERE.glob('清單_*.json'))
    cfg = None
    for path in paths:
        own = json.loads(path.read_text(encoding='utf-8'))
        if cfg is None:
            cfg = own
        else:
            cfg['style'].update(own.get('style', {}))
            cfg['sizes'].update(own.get('sizes', {}))
            cfg['items'] += own['items']
    list_path = paths[0] if len(paths) == 1 else HERE / '清單_全部.json'
    dup = {it['name'] for it in cfg['items'] if [x['name'] for x in cfg['items']].count(it['name']) > 1}
    if dup:
        sys.exit(f'清單裡有重複的名稱：{"、".join(sorted(dup))}')
    templates = {k: json.loads((WORKFLOWS / f'{k}.json').read_text(encoding='utf-8')) for k in ('t2i', 'edit')}
    names = set(args.names.split(',')) if args.names else None
    items = [it for it in cfg['items'] if (not args.only or it['kind'] == args.only) and (not names or it['name'] in names)]
    if names:
        missing = names - {it['name'] for it in cfg['items']}
        if missing:
            sys.exit(f'清單裡沒有：{"、".join(missing)}')
    # 有參考圖的排在後面
    items.sort(key=lambda it: 1 if it.get('ref') else 0)
    RAW.mkdir(parents=True, exist_ok=True)

    if args.rebuild:
        for it in items:
            raw = RAW / f"{it['name']}.png"
            if raw.exists():
                export(it['kind'], it['name'], raw)
                log(f'  重建 {it["name"]}')
        update_manifest(); review_page(cfg, list_path)
        return

    comfy = Comfy(args.server)
    if not args.dry_run:
        comfy.check()
    done = skipped = failed = 0
    t0 = time.time()
    for i, it in enumerate(items, 1):
        name, kind = it['name'], it['kind']
        it['_seed'] = it['seed'] + args.seed_offset
        if not args.force and all(f.exists() for f in web_files(kind, name)):
            skipped += 1
            continue
        tag = f'[{i}/{len(items)}] {kind} {name}' + (f'（參考 {it["ref"]}）' if it.get('ref') else '')
        try:
            wf, save_node = build(it, cfg, templates, comfy, args.dry_run)
            if args.dry_run:
                log(f'{tag}：會使用{"圖生圖" if it.get("ref") else "文生圖"}，種子 {it["_seed"]}')
                continue
            log(f'{tag}：生圖中……')
            png = comfy.run(wf, save_node)
            raw = RAW / f'{name}.png'
            raw.write_bytes(png)
            alpha = export(kind, name, raw)
            note = '' if alpha is None else ('（透明背景）' if alpha else '（注意：輸出沒有透明通道）')
            log(f'{tag}：完成{note}')
            done += 1
            review_page(cfg, list_path)   # 每完成一張就更新審圖頁，不必等整批跑完
        except Exception as e:
            failed += 1
            log(f'{tag}：失敗——{e}')
    man = update_manifest()
    review_page(cfg, list_path)
    total = sum(len(v) for v in man.values())
    log(f'\n完成 {done} 張、略過 {skipped} 張（已存在）、失敗 {failed} 張，用時 {int(time.time() - t0)} 秒。')
    log(f'圖片清單已更新：目前共有 {total} 張可用圖片。審圖請打開：{HERE / "審圖.html"}')


if __name__ == '__main__':
    main()
