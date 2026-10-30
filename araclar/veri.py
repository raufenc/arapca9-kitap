"""1. ünite verisini (book-data.js) tam kitapla birleştirir ve book-data.js'yi yeniden yazar.

    /usr/local/bin/python3 araclar/veri.py <kaynak klasörü>

Girdi: kaynak/cikti/sayfalar.json, kaynak/plan.json, kaynak/etkinlikler.json, kaynak/belgeler.json,
       activities.js (1. ünite bölümleri). İlk çalıştırmada 1. ünite verisi araclar/book-unit1.json olarak saklanır.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
KAY = pathlib.Path(sys.argv[1])
H = re.compile(r'[ً-ٰٟـ]')
yukle = lambda p: json.loads(p.read_text(encoding='utf-8'))

u1_yol = ROOT / 'araclar/book-unit1.json'
if not u1_yol.exists():
    js = (ROOT / 'book-data.js').read_text(encoding='utf-8')
    u1_yol.write_text(js[js.index('{'):js.rindex('}') + 1], encoding='utf-8')
U1 = yukle(u1_yol)
sayfalar = {s['number']: s for s in yukle(KAY / 'cikti/sayfalar.json')}
plan = yukle(KAY / 'plan.json')
etkinlikler = yukle(KAY / 'etkinlikler.json')
belgeler = yukle(KAY / 'belgeler.json')
u1_sayfa = {p['number']: p for p in U1['pages']}

# kaynaklar
kaynaklar = list(U1['resources'])
medya = list(U1['media'])
media_ids = {m['id'] for m in medya}
etk_ids = {a['id'] for a in etkinlikler}
for r in plan:
    k = {x: r[x] for x in ('id', 'page', 'kind', 'title', 'label', 'url', 'rect')}
    k['media'] = None
    t = r.get('target')
    if r['kind'] in ('audio', 'video') and t:
        ext = 'mp3' if r['kind'] == 'audio' else 'mp4'
        if (ROOT / f'assets/media/{t}.{ext}').exists():
            k['media'] = t
            if t not in media_ids:
                medya.append({'id': t, 'src': f'assets/media/{t}.{ext}', 'page': r['page'], 'kind': r['kind'], 'title': r['title']})
                media_ids.add(t)
    elif t in etk_ids:
        k['activity'] = t
    elif t in belgeler:
        b = belgeler[t]
        k['document'] = {'src': b['src'], 'pages': b['pages'], 'kind': r['kind']}
    kaynaklar.append(k)
kaynaklar.sort(key=lambda r: (r['page'], int(r['id'].split('-r')[1])))

# sayfalar
pages = []
SON = 218  # 217 basılı sayfa + arka kapak
KAPAK = {0: 'kapak-on', SON: 'kapak-arka'}
for n in range(0, SON + 1):
    if n in u1_sayfa:
        pages.append(u1_sayfa[n])
        continue
    s = sayfalar.get(n, {'text': ''})
    ad = KAPAK.get(n, f'{n:03d}')
    pages.append({'number': n, 'image': f'assets/pages/{ad}.webp', 'thumb': f'assets/thumbs/{ad}.webp',
                  'text': s['text'], 'resources': [r['id'] for r in kaynaklar if r['page'] == n], 'hotspots': []})


# etkinlik bölgeleri (araclar/bolgeler.py)
bolgeler = yukle(KAY / 'bolgeler.json') if (KAY / 'bolgeler.json').exists() else {}
for pg in pages:
    pg['regions'] = bolgeler.get(str(pg['number']), [])


# içindekiler
def ders_basligi(n, hangi):
    for l in sayfalar[n]['text'].split('\n'):
        c = H.sub('', l).replace('أ', 'ا').strip()
        if 'الدرس' in c and hangi in c and ':' in c:
            parca = [x.strip() for x in c.split(':')]
            return next((x for x in parca if 'الدرس' not in x), '')
    return ''


def ilk(sart, bas, son):
    return next((n for n in range(bas, son) if sart(sayfalar[n]['text'])), None)


def baslik(s):  # Türkçe büyük/küçük harf: str.title() 'İ'yi bozuyor
    return ' '.join(w[0] + w[1:].replace('I', 'ı').replace('İ', 'i').lower() for w in s.split())


UNITELER = [(1, 10, 77, 'HAYDİ TANIŞALIM'), (2, 78, 119, 'OKULDAYIM'), (3, 120, 165, 'EVDEYİM'), (4, 166, 203, 'HAYATIMDAN BİR GÜN')]
ders2 = {1: 48, 2: 100, 3: 146, 4: 186}
bolumler = [{'page': 0, 'title': 'Kapak', 'group': 'KİTAP'}, {'page': 7, 'title': 'İçindekiler'}]
icerik_js = (ROOT / 'activities.js').read_text(encoding='utf-8')
for u, bas, son, ad in UNITELER:
    grup = f'{u}. ÜNİTE · {ad}'
    if u == 1:
        for c in re.finditer(r"\{page:(\d+),title:'([^']+)'(?:,group:'([^']+)')?\}", icerik_js):
            p, t = int(c.group(1)), c.group(2)
            bolumler.append({'page': p, 'title': t, **({'group': grup} if p == 10 else {})})
        continue
    d1, d2 = bas + 2, ders2[u]
    ar1, ar2 = ders_basligi(bas, 'اول') or ders_basligi(d1, 'اول'), ders_basligi(d2, 'الثاني')
    sonu = ilk(lambda t: 'التدريبات' in H.sub('', t)[:120], d2 + 1, son + 1)
    bolumler += [{'page': bas, 'title': 'Üniteye giriş', 'group': grup},
                 {'page': d1, 'title': '1. ders', 'arabic': ar1},
                 {'page': d2, 'title': '2. ders', 'arabic': ar2}]
    if sonu:
        bolumler.append({'page': sonu, 'title': 'Ünite sonu çalışmaları'})
bolumler += [{'page': 204, 'title': 'Sözlük', 'group': 'EKLER', 'arabic': 'القاموس'}, {'page': 215, 'title': 'Cevap anahtarı ve kaynaklar'},
             {'page': SON, 'title': 'Arka kapak'}]
bolumler.sort(key=lambda c: c['page'])

aktiviteler = U1['activities'] + etkinlikler
kitap = {
    'id': 'aihl-arabic9-2026', 'version': '3.0.0', 'title': 'Arapça 9',
    'unitTitle': 'Arapça 9', 'unitArabic': 'اللُّغَةُ العَرَبِيَّةُ',
    'firstPage': 0, 'lastPage': SON,
    'source': {**U1['source'], 'pages': 218},
    'units': [{'number': u, 'first': b, 'last': s, 'title': baslik(a)} for u, b, s, a in UNITELER],
    'pages': pages, 'resources': kaynaklar, 'media': medya, 'activities': aktiviteler, 'chapters': bolumler,
    'stats': {'pages': len(pages), 'qr': len(kaynaklar),
              'audio': sum(m['kind'] == 'audio' for m in medya), 'video': sum(m['kind'] == 'video' for m in medya),
              'activities': len(aktiviteler), 'documents': sum(bool(r.get('document')) for r in kaynaklar),
              'local': sum(bool(r.get('media') or r.get('activity') or r.get('document')) for r in kaynaklar)},
    'build': '2026-10-27'
}
(ROOT / 'book-data.js').write_text('window.BOOK = ' + json.dumps(kitap, ensure_ascii=False, separators=(',', ':')) + ';', encoding='utf-8')
print(json.dumps(kitap['stats'], ensure_ascii=False))
print(len(bolumler), 'bölüm:', ' | '.join(f"{c['page']} {c['title']}" for c in bolumler if c['page'] >= 78))
eksik = [r['id'] for r in kaynaklar if r['kind'] != 'external' and not (r.get('media') or r.get('activity') or r.get('document'))]
print('yerel içeriği olmayan karekod:', len(eksik), eksik[:20])
