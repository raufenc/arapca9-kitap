"""Kitap PDF'inden sayfa görsellerini, küçük resimleri, arama metnini ve karekodları çıkarır.

    /usr/local/bin/python3 araclar/pdf-cikar.py <kitap.pdf> <çıktı klasörü>

PDF'in 1. sayfası kapak (ön + arka yan yana); sonraki her PDF sayfası basılı sayfa (PDF n+1 = basılı n).
Çıktı: pages/NNN.webp (1600 px), thumbs/NNN.webp (180 px), kapak görselleri, sayfalar.json.
Gerekenler: pymupdf, Pillow, zxing-cpp.
"""
import io, json, pathlib, re, sys
from concurrent.futures import ProcessPoolExecutor

import pymupdf
import zxingcpp
from PIL import Image

W, H, TW, TH = 1600, 2257, 180, 254
HAREKE = re.compile(r'[ً-ٰٟـ\s]')
# karekodun altındaki etiketten içerik türü (PDF'te harfler bölünmüş olabilir, iskelet üzerinden bakılır)
TURLER = [('الواجب', 'external'), ('رسوم', 'video'), ('العرض', 'video'), ('أغنية', 'video'), ('فيديو', 'video'),
          ('صوت', 'audio'), ('لعبة', 'game'), ('لعبه', 'game'), ('تقييم', 'assessment'), ('نشاط', 'practice')]


def iskelet(s):
    return HAREKE.sub('', s).replace('أ', 'ا').replace('إ', 'ا').replace('ة', 'ه')


def tur(etiket):
    sk = iskelet(etiket).replace('ه', 'ة')
    for anahtar, t in TURLER:
        if iskelet(anahtar).replace('ه', 'ة') in sk:
            return t
    return 'external'


def render(page, clip=None):
    rect = clip or page.rect
    zoom = W / rect.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=clip, alpha=False)
    im = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
    return im.resize((W, H), Image.LANCZOS) if im.size != (W, H) else im


def karekodlar(page, im):
    pw, ph = page.rect.width, page.rect.height
    kelimeler = page.get_text('words')
    sonuc = []
    for b in zxingcpp.read_barcodes(im, formats=zxingcpp.BarcodeFormat.QRCode):
        p = b.position
        xs = [p.top_left.x, p.top_right.x, p.bottom_left.x, p.bottom_right.x]
        ys = [p.top_left.y, p.top_right.y, p.bottom_left.y, p.bottom_right.y]
        x0, y0, x1, y1 = min(xs) / W, min(ys) / H, max(xs) / W, max(ys) / H
        # zxing modül sınırını verir; sessiz bölgeyi de kapsayacak kadar büyüt
        px, py = (x1 - x0) * .08, (y1 - y0) * .08
        x0, y0, x1, y1 = max(0, x0 - px), max(0, y0 - py), min(1, x1 + px), min(1, y1 + py)
        # etiket: karekodun hemen altındaki (ya da üstündeki) kısa yazı
        bx0, bx1 = (x0 - (x1 - x0) * .25) * pw, (x1 + (x1 - x0) * .25) * pw
        alt = [w for w in kelimeler if bx0 <= (w[0] + w[2]) / 2 <= bx1 and y1 * ph - 2 <= (w[1] + w[3]) / 2 <= (y1 + (y1 - y0) * .75) * ph]
        ust = [w for w in kelimeler if bx0 <= (w[0] + w[2]) / 2 <= bx1 and (y0 - (y1 - y0) * .5) * ph <= (w[1] + w[3]) / 2 <= y0 * ph + 2]
        etiket = ' '.join(w[4] for w in sorted(alt or ust, key=lambda w: (round(w[1]), -w[0])))
        sonuc.append({'rect': [round(x0 * 100, 4), round(y0 * 100, 4), round((x1 - x0) * 100, 4), round((y1 - y0) * 100, 4)],
                      'url': b.text, 'label': etiket, 'kind': tur(etiket)})
    return sorted(sonuc, key=lambda q: (q['rect'][1], -q['rect'][0]))


def sayfa_isle(args):
    pdf, out, i = args
    doc = pymupdf.open(pdf)
    page = doc[i]
    num = i  # PDF i+1 = basılı i
    im = render(page)
    im.save(out / 'pages' / f'{num:03d}.webp', 'WEBP', quality=82, method=6)
    im.resize((TW, TH), Image.LANCZOS).save(out / 'thumbs' / f'{num:03d}.webp', 'WEBP', quality=78, method=6)
    return {'number': num, 'image': f'assets/pages/{num:03d}.webp', 'thumb': f'assets/thumbs/{num:03d}.webp',
            'text': page.get_text(), 'qr': karekodlar(page, im)}


def kapak(pdf, out):
    page = pymupdf.open(pdf)[0]
    r = page.rect
    # kitap sağdan sola: açık kapakta ön yüz SOLDA, arka yüz SAĞDA durur
    yarim = {'kapak-on': pymupdf.Rect(r.x0, r.y0, r.x0 + r.width / 2, r.y1),
             'kapak-arka': pymupdf.Rect(r.x0 + r.width / 2, r.y0, r.x1, r.y1)}
    for ad, clip in yarim.items():
        im = render(page, clip)
        im.save(out / 'pages' / f'{ad}.webp', 'WEBP', quality=82, method=6)
        im.resize((TW, TH), Image.LANCZOS).save(out / 'thumbs' / f'{ad}.webp', 'WEBP', quality=78, method=6)


def main():
    pdf, out = sys.argv[1], pathlib.Path(sys.argv[2])
    (out / 'pages').mkdir(parents=True, exist_ok=True)
    (out / 'thumbs').mkdir(parents=True, exist_ok=True)
    n = pymupdf.open(pdf).page_count
    kapak(pdf, out)
    with ProcessPoolExecutor() as ex:
        sayfalar = list(ex.map(sayfa_isle, [(pdf, out, i) for i in range(1, n)]))
    (out / 'sayfalar.json').write_text(json.dumps(sayfalar, ensure_ascii=False, indent=0), encoding='utf-8')
    qr = sum(len(s['qr']) for s in sayfalar)
    print(f'{len(sayfalar)} sayfa, {qr} karekod')


if __name__ == '__main__':
    main()
