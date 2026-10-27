"""Her sayfadaki numaralı etkinliklerin sınırlarını PDF'ten çıkarır (bolgeler.json).

    /usr/local/bin/python3 araclar/bolgeler.py <kitap.pdf> <çıktı.json> [önizleme klasörü sayfa,sayfa,...]

Etkinlik başlığı: sağ kenarda kalın 24 punto numara (AdobeArabic-Bold); bölüm başlıkları (القراءة…) numarasız sınırdır. Etkinlik o başlıktan bir sonraki başlığa
ya da sayfa altbilgisine kadar uzanır; kenardaki karekod sütunu da içinde kalır. İlk başlıktan önce yeterince yüksek
içerik varsa numarasız bir bölge olarak eklenir. Koordinatlar sayfanın yüzdesidir: [x, y, w, h].
"""
import json, re, sys
import pymupdf

pdf, out = sys.argv[1], sys.argv[2]
doc = pymupdf.open(pdf)
UST, ALT = 0.062, 0.935  # sayfa başlığı ve altbilgi sınırları (sayfa yüksekliğinin oranı)
X0, X1 = 0.035, 0.965


def basliklar(p):
    W = p.rect.width
    bul = []
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                t = s['text'].strip()
                if re.fullmatch(r'\d{1,2}', t) and s['size'] >= 20 and 'Bold' in s['font'] and s['bbox'][0] > W * .7 \
                        and s['color'] != 0xffffff:
                    bul.append((s['bbox'][1], int(t)))
                elif 'AbdoLineBold' in s['font'] and 16 <= s['size'] <= 20 and s['color'] not in (0x231f20, 0xffffff) \
                        and 2 < len(t) < 40 and s['bbox'][1] > p.rect.height * UST:
                    bul.append((s['bbox'][1] - 4, None))  # bölüm başlığı (القراءة, الاستماع…)
            satir = re.sub(r'[\u064B-\u065F\u0670\u0640\s]', '', ''.join(x['text'] for x in l['spans']))
            if 'التقييمالذاتي' in satir:
                bul.append((l['bbox'][1] - 8, None))  # öz değerlendirme tablosu ayrı blok
    bul = sorted(set(bul), key=lambda x: x[0])
    temiz = []
    for y, n in bul:  # aynı satırdaki tekrarları ele; numara bölüm başlığından önceliklidir
        if temiz and y - temiz[-1][0] < 14:
            if n is not None and temiz[-1][1] is None:
                temiz[-1] = (y, n)
            continue
        temiz.append((y, n))
    return temiz


def icerik_ust(p):
    H = p.rect.height
    ys = [b[1] for b in p.get_text('blocks') if b[1] > H * UST and b[3] < H * ALT and b[4].strip()]
    ys += [i['bbox'][1] for i in p.get_image_info() if H * UST < i['bbox'][1] < H * ALT]
    return min(ys) if ys else None


# uzun etkinlikler: sayfa görselindeki boş satır aralıklarından parçalara bölünür
import pathlib
import numpy as np
from PIL import Image
SAYFALAR = pathlib.Path(__file__).resolve().parent.parent / 'assets/pages'
UZUN, HEDEF, EN_AZ = .45, .34, .12  # sayfa yüksekliği oranları


def bosluklar(n, y0, y1, H):
    im = np.asarray(Image.open(SAYFALAR / f'{n:03d}.webp').convert('L'), dtype=np.uint8)
    k = im.shape[0] / H
    a, b = int(y0 * k), int(y1 * k)
    w = im.shape[1]
    serit = im[a:b, int(w * .12):int(w * .88)]
    dolu = (serit < 232).mean(axis=1)  # satırdaki mürekkep oranı
    bos = dolu < .004
    kosu, bas = [], None
    for i, v in enumerate(list(bos) + [False]):
        if v and bas is None:
            bas = i
        elif not v and bas is not None:
            if i - bas >= 6:
                kosu.append(((a + (bas + i) / 2) / k, (i - bas) / k))  # (orta y, kalınlık) PDF biriminde
            bas = None
    return kosu


def parcala(n, y0, y1, H, numarali):
    if y1 - y0 <= H * UZUN:
        return [(y0, y1, None)]
    aday = bosluklar(n, y0, y1, H)
    px = lambda t: t * 2257 / H  # sayfa görseli pikseli
    if sum(1 for _, t in aday if px(t) < 12) >= 6:
        return [(y0, y1, None)]  # ızgara (kelime avı, bulmaca): parçalanırsa etkinlik bozulur, bütün kalır
    aday = [(y, t) for y, t in aday if px(t) >= 14]
    baslik_alt = next((y for y, _ in aday if y > y0 + 14), None) if numarali else None
    aday = [(y, t) for y, t in aday if (baslik_alt is None or y > baslik_alt + 4) and y1 - y > H * EN_AZ and y - y0 > H * EN_AZ]
    parca = max(2, round((y1 - y0) / (H * HEDEF)))
    kesikler = []
    for j in range(1, parca):
        ideal = y0 + (y1 - y0) * j / parca
        yakin = [(abs(y - ideal) - t * 2, y) for y, t in aday if abs(y - ideal) < H * .11 and all(abs(y - c) > H * EN_AZ for c in kesikler)]
        if yakin:
            kesikler.append(min(yakin)[1])
    if not kesikler:
        return [(y0, y1, None)]  # bölünemiyor (ızgara, tablo…): bütün kalır
    sinir = [y0] + sorted(kesikler) + [y1]
    bas_bant = (y0, baslik_alt) if baslik_alt else None
    return [(sinir[i], sinir[i + 1], bas_bant if i > 0 else None) for i in range(len(sinir) - 1)]


sonuc = {}
for n in range(1, doc.page_count):
    p = doc[n]
    W, H = p.rect.width, p.rect.height
    bs = basliklar(p)
    if not bs:
        continue
    alt = H * ALT
    bolge = []
    ilk_y = bs[0][0] - 7
    ust = icerik_ust(p)
    if ust is not None and ilk_y - ust > H * .12:
        bolge.append({'n': None, 'y0': max(H * UST, ust - 6), 'y1': ilk_y})
    for i, (y, num) in enumerate(bs):
        y0 = y - 7
        y1 = bs[i + 1][0] - 7 if i + 1 < len(bs) else alt
        if y1 - y0 > H * (.04 if num is not None else .08):  # ders şeridi gibi ince numarasız bantlar elenir
            bolge.append({'n': num, 'y0': y0, 'y1': y1})
    yuzde = lambda a, b: [round(X0 * 100, 2), round(a / H * 100, 2), round((X1 - X0) * 100, 2), round((b - a) / H * 100, 2)]
    liste = []
    for b in bolge:
        parcalar = parcala(n, b['y0'], b['y1'], H, b['n'] is not None)
        for k, (a, c, bas) in enumerate(parcalar):
            r = {'n': b['n'], 'rect': yuzde(a, c)}
            if len(parcalar) > 1:
                r['part'] = f'{k + 1}/{len(parcalar)}'
            if bas:
                r['head'] = yuzde(*bas)
            liste.append(r)
    sonuc[n] = liste

pathlib_out = open(out, 'w', encoding='utf-8')
json.dump(sonuc, pathlib_out, ensure_ascii=False)
pathlib_out.close()
print(len(sonuc), 'sayfa,', sum(len(v) for v in sonuc.values()), 'bölge')

if len(sys.argv) > 3:
    import io, pathlib
    from PIL import Image, ImageDraw
    kl = pathlib.Path(sys.argv[3]); kl.mkdir(parents=True, exist_ok=True)
    for n in map(int, sys.argv[4].split(',')):
        pix = doc[n].get_pixmap(matrix=pymupdf.Matrix(1.2, 1.2))
        im = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB'); d = ImageDraw.Draw(im)
        for i, b in enumerate(sonuc.get(n, [])):
            x, y, w, h = [v / 100 for v in b['rect']]
            c = ['#e2534a', '#2d7fd3', '#2fa577', '#f0a03c', '#8b62d6'][i % 5]
            d.rectangle([x * im.width, y * im.height, (x + w) * im.width, (y + h) * im.height], outline=c, width=4)
            d.text((x * im.width + 8, y * im.height + 6), str(b['n']), fill=c)
        im.save(kl / f'{n:03d}.png')
