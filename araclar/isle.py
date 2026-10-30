"""plan.json'daki özgün dosyaları okuyucuya hazırlar.

    /usr/local/bin/python3 araclar/isle.py <kaynak klasörü> medya|etkinlik|belge|sayfa

medya    : sesler 80 kbps MP3, videolar 720p H.264 (CRF 30, slow) → assets/media
etkinlik : Storyline/H5P/HTML paketleri → assets/activities/<kimlik> (CSP, analitik kapalı, H5P köprüsü,
           1600 px üstü resimler küçültülür, saydamlığı olmayan büyük PNG'ler aynı adla JPEG olur)
belge    : PDF + sayfa görselleri → assets/documents
sayfa    : pdf-cikar.py çıktısındaki 1. ünite dışı sayfalar ve kapak → assets/pages, assets/thumbs
Var olan çıktı dosyaları atlanır; yeniden üretmek için silin.
"""
import io, json, pathlib, re, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parent.parent
KAY = pathlib.Path(sys.argv[1])
ASAMA = sys.argv[2]
PLAN = json.loads((KAY / 'plan.json').read_text())
FF = '/Users/raufenc/pinokio/bin/miniconda/bin/ffmpeg'
A = ROOT / 'assets'
CSP = ("default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; "
       "img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; "
       "object-src 'none'; base-uri 'self'; form-action 'none'")
ATLA = {'.xsd', '.zip', '.docx', '.DS_Store'}


def tekil(kind):
    seen = {}
    for r in PLAN:
        if r['src'] and r['target'] and (r['kind'] in kind if isinstance(kind, tuple) else r['kind'] == kind):
            seen.setdefault(r['target'], r)
    return list(seen.values())


def medya():
    (A / 'media').mkdir(exist_ok=True)
    isler = []
    for r in tekil('audio'):
        isler.append((r['src'], A / 'media' / f"{r['target']}.mp3",
                      ['-vn', '-ac', '2', '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '80k']))
    for r in tekil('video'):
        isler.append((r['src'], A / 'media' / f"{r['target']}.mp4",
                      ['-vf', 'scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p',
                       '-c:a', 'aac', '-b:a', '80k', '-ac', '2', '-movflags', '+faststart']))

    def calistir(is_):
        src, out, args = is_
        if out.exists():
            return f'var  {out.name}'
        tmp = out.with_suffix('.tmp' + out.suffix)
        subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-i', src, *args, str(tmp)], check=True)
        tmp.rename(out)
        return f'{out.stat().st_size / 1048576:6.1f} MB  {out.name}'

    with ThreadPoolExecutor(4) as ex:
        for satir in ex.map(calistir, isler):
            print(satir, flush=True)


def resim_kucult(f):
    from PIL import Image
    try:
        im = Image.open(f)
        im.load()
    except Exception:
        return 0
    once = f.stat().st_size
    if once < 200_000:
        return 0
    w, h = im.size
    if max(w, h) > 1600:
        k = 1600 / max(w, h)
        im = im.resize((round(w * k), round(h * k)), Image.LANCZOS)
    saydam = im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getextrema()[3][0] < 255
    buf = io.BytesIO()
    if f.suffix.lower() == '.png' and saydam:
        im.save(buf, 'PNG', optimize=True)
    else:
        im.convert('RGB').save(buf, 'JPEG', quality=85, optimize=True, progressive=True)
    if buf.tell() < once:
        f.write_bytes(buf.getvalue())
        return once - buf.tell()
    return 0


def h5p_kopru(html):
    html = re.sub(r'<link rel="stylesheet" href="\.\./\.\./\.\./activity-h5p\.css(?:\?v=[^"]+)?">', '', html)
    if 'H5P.CoursePresentation 1.26' in html:
        html = html.replace('class="h5p-iframe"', 'class="h5p-iframe book-h5p-cp"', 1)
    html = re.sub(r'<script[^>]*src="(?:SCORM_API_wrapper\.js|h5p-adaptor\.js|\.\./\.\./\.\./activity-(?:standalone|h5p)\.js)(?:\?v=[^"]+)?"[^>]*>\s*</script>', '', html)
    return '<link rel="stylesheet" href="../../../activity-h5p.css"><script src="../../../activity-h5p.js"></script></head>'.join(html.rsplit('</head>', 1))


def etkinlik():
    kayitlar = []
    toplam_kazanc = 0
    for r in tekil(('practice', 'game', 'song')):
        src = pathlib.Path(r['src'])
        if src.suffix == '.pdf':
            continue
        paket = src if src.is_dir() else src.parent
        hedef = A / 'activities' / r['target']
        ust = {p.name for p in paket.iterdir()}
        if 'index_lms.html' in ust:
            engine, giris = 'storyline', 'index_lms.html'
        elif 'index.html' in ust and 'H5PIntegration' in (paket / 'index.html').read_text(errors='ignore'):
            engine, giris = 'h5p', 'index.html'
        else:
            engine, giris = 'html', 'index.html' if 'index.html' in ust else 'story.html'
        if not hedef.exists():
            for f in paket.rglob('*'):
                if f.is_dir() or f.suffix in ATLA or f.name in ATLA:
                    continue
                out = hedef / f.relative_to(paket)
                out.parent.mkdir(parents=True, exist_ok=True)
                if f.suffix.lower() == '.html':
                    html = f.read_text(encoding='utf-8-sig', errors='replace')
                    html = re.sub(r'<head([^>]*)>', lambda m: m.group(0) + f'\n<meta http-equiv="Content-Security-Policy" content="{CSP}">', html, count=1, flags=re.I)
                    html = html.replace('suppressAnalytics: false', 'suppressAnalytics: true')
                    if engine == 'h5p' and f.name == giris and f.parent == paket:
                        html = h5p_kopru(html)
                    out.write_text(html, encoding='utf-8')
                else:
                    shutil.copy2(f, out)
            imgs = [f for f in hedef.rglob('*') if f.suffix.lower() in ('.png', '.jpg', '.jpeg')]
            with ThreadPoolExecutor(8) as ex:
                kazanc = sum(ex.map(resim_kucult, imgs))
            toplam_kazanc += kazanc
            print(f"{r['target']:16} {engine:9} {sum(f.stat().st_size for f in hedef.rglob('*') if f.is_file()) / 1048576:6.1f} MB  (-{kazanc / 1048576:.1f} MB resim)", flush=True)
        item = {'id': r['target'], 'page': r['page'], 'title': r['title'], 'src': f"assets/activities/{r['target']}/{giris}",
                'engine': engine, 'sourceFolder': paket.name, 'resourceId': r['id']}
        if engine == 'h5p' and 'book-h5p-cp' in (hedef / giris).read_text(errors='ignore'):
            item['viewport'] = {'width': 960, 'height': 580}
        kayitlar.append(item)
    (KAY / 'etkinlikler.json').write_text(json.dumps(kayitlar, ensure_ascii=False, indent=1))
    print(len(kayitlar), 'etkinlik; resimlerden', round(toplam_kazanc / 1048576), 'MB kazanç')


def belge():
    import pymupdf
    from PIL import Image
    (A / 'documents').mkdir(exist_ok=True)
    kayit = {}
    for r in tekil(('document', 'game', 'assessment')):
        src = pathlib.Path(r['src'])
        if src.suffix.lower() != '.pdf':
            continue
        t = r['target']
        shutil.copy2(src, A / 'documents' / f'{t}.pdf')
        doc = pymupdf.open(src)
        sayfalar = []
        for i, p in enumerate(doc, 1):
            out = A / 'documents' / f'{t}-{i}.webp'
            if not out.exists():
                z = 1600 / p.rect.width
                pix = p.get_pixmap(matrix=pymupdf.Matrix(z, z), alpha=False)
                Image.frombytes('RGB', [pix.width, pix.height], pix.samples).save(out, 'WEBP', quality=80, method=6)
            sayfalar.append(f'assets/documents/{out.name}')
        kayit[t] = {'src': f'assets/documents/{t}.pdf', 'pages': sayfalar, 'text': [p.get_text() for p in doc]}
        print(f'{t:20} {len(sayfalar):3} sayfa', flush=True)
    (KAY / 'belgeler.json').write_text(json.dumps(kayit, ensure_ascii=False))


def sayfa():
    c = KAY / 'cikti'
    for kl in ('pages', 'thumbs'):
        for f in (c / kl).glob('*.webp'):
            ad = f.name  # kapak-on.webp = sayfa 0, kapak-arka.webp = son sayfa
            if ad[:3].isdigit() and 10 <= int(ad[:3]) <= 77:
                continue  # 1. ünite görselleri yerinde kalır
            out = A / kl / ad
            if not out.exists():
                shutil.copy2(f, out)
    print('sayfalar:', len(list((A / 'pages').glob('*.webp'))))


{'medya': medya, 'etkinlik': etkinlik, 'belge': belge, 'sayfa': sayfa}[ASAMA]()
