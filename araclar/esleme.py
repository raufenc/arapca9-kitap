"""2–4. ünite ve ek sayfaların karekodlarını özgün dosyalara eşler; plan.json yazar.

    /usr/local/bin/python3 araclar/esleme.py <aktarım klasörü> <kaynak klasörü>

Girdi: pdf-cikar.py'nin sayfalar.json'u, Codex aktarımındaki book.json (temiz Arapça etiketler) ve içerik klasörleri.
1. ünite (s. 10–77) mevcut book-data.js'den aynen korunur; burada yalnızca diğer sayfalar eşlenir.
"""
import csv, json, pathlib, re, sys

AKT, KAY = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
I = AKT / 'icerik'
sayfalar = json.loads((KAY / 'cikti/sayfalar.json').read_text())
codex = json.loads((AKT / 'derleme/data/book.json').read_text())
HAREKE = re.compile(r'[ً-ٰٟـ]')
ARAP_RAKAM = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
UNITE = lambda p: 1 if p < 78 else 2 if p < 120 else 3 if p < 166 else 4

def temiz(s):
    return HAREKE.sub('', s or '').replace('\n', ' ').strip()

def numara(s):
    m = re.search(r'\d+', temiz(s).translate(ARAP_RAKAM))
    return int(m.group()) if m else None

# özgün dosya dizinleri
sesler = {}
for f in sorted((I / '9. sınıf/Sesler').rglob('*.mp3')):
    m = re.search(r'SES(\d{3})', f.name)
    if not m or 'Video Sesleri' in f.parts:
        continue
    n = int(m.group(1)); rev = 'rvz' in f.name
    if n not in sesler or (rev and 'rvz' not in sesler[n].name):
        sesler[n] = f
animasyon = {int(re.search(r'_a(\d+)', f.name).group(1)): f for f in (I / '9. sınıf/iar9 EBA Videolar').glob('iar9_s*_a*.mp4')}
video = {int(re.search(r'video(\d+)', f.name).group(1)): f for f in (I / '21_videolar +').glob('*.mp4')}
tanitim = {int(f.name[0]): f for f in (I / '9. sınıf/iar9 EBA Videolar').glob('[1-4]. *nite tanıtım.mp4')}
etkinlik = {}
with open(AKT / 'derleme/ozgun-etkinlik-envanteri.csv', newline='') as fh:
    for row in csv.DictReader(fh):
        if row['exerciseNumber']:
            etkinlik[int(row['exerciseNumber'])] = row
belge = lambda klasor, desen: next((f for f in (I / klasor).glob('*.pdf') if re.search(desen, f.name, re.I)), None)

kayit = []
sorun = []
for s in sayfalar:
    p = s['number']
    if 10 <= p <= 77:
        continue
    cx = [r for r in codex['resources'] if r['page'] == p]
    for k, q in enumerate(s['qr'], 1):
        c = next((r for r in cx if r['url'] == q['url']), None)
        etiket = temiz(c['label'] if c and c.get('label') else q['label'])
        sk = etiket.replace(' ', '')
        kind, n, u = q['kind'], numara(etiket), UNITE(p)
        r = {'id': f'p{p}-r{k}', 'page': p, 'rect': q['rect'], 'url': q['url'], 'label': etiket, 'kind': kind}
        if 'صوت' in sk:
            r.update(kind='audio', title=f'Dinleme {n}', src=sesler.get(n), target=f'audio-{n:03d}')
        elif 'سوم' in sk:
            r.update(kind='video', title=f'Animasyon {n}', src=animasyon.get(n), target=f'animation-{n:02d}')
        elif 'أغني' in sk or 'اغني' in sk:
            r.update(kind='song', title='Ünite şarkısı', src=I / f'25_sarkilar +/unite_{u}_yeni', target=f'song-{u}')
        elif 'يوالوحد' in sk or 'فيديوالوحد' in sk:
            r.update(kind='video', title='Ünite videosu', src=tanitim.get(u), target=f'unit-intro-{u}')
        elif 'العرض' in sk or 'فيديو' in sk or 'يو' in sk and kind == 'video':
            v = next((f for f in video.values() if re.search(rf'sy?f?{p}\.mp4$', f.name)), None)
            vn = int(re.search(r'video(\d+)', v.name).group(1)) if v else n
            r.update(kind='video', title=f'Sunu {n}' if 'العرض' in sk else f'Video {n}', src=v, target=f'video-{vn:02d}')
        elif 'الذ' in sk and 'لعبة' in sk:
            h = next((d for d in (I / 'Arp09_ihl_eicerik_html').glob(f'arp09.0{u}.*_s{p}_hafizakarti_*')), None)
            r.update(kind='game', title=f'Hafıza oyunu {n}', src=h and h / 'index.html', target=f'memory-{n}')
        elif 'لعبة' in sk:
            r.update(kind='game', title=f'Oyun {n}', src=belge('23_Oyun_Metinleri +', rf'Syf{p}_'), target=f'game-{p}')
        elif 'نشاط' in sk and 'تقييم' not in sk:
            e = etkinlik.get(n)
            r.update(kind='practice', title=f'Alıştırma {n}', src=AKT / e['entry'] if e else None, target=f'a{n:02d}', folder=e and e['sourceFolder'])
            if e and int(e['unit']) != u:
                sorun.append(f'{r["id"]}: e{n} ünite {e["unit"]} ama sayfa ünite {u}')
        elif 'الواجب' in sk or 'لواجب' in sk:
            r.update(kind='assessment', title='Ödev ölçeği', src=belge('24_Odev_Olcekleri +', rf'Syf{p}_'), target=f'rubric-{p}')
        elif 'تقييم' in sk:
            r.update(kind='assessment', title='Ünite değerlendirmesi', src=belge('07_calisma_sorulari', rf'unite_?{u}'), target=f'unit-{u}-worksheets')
        elif 'متابع' in sk:
            r.update(kind='document', title='Kontrol listesi', src=belge('22_Kontrol_Listeleri +', rf'Syf{p}_'), target=f'checklist-{p}')
        elif 'نصوص' in sk or 'ستماع' in sk:
            r.update(kind='document', title='Dinleme metinleri', src=I / f'9. sınıf/Belgeler/Unite{u}_dm.pdf', target=f'listening-{u}')
        elif 'مختصر' in sk:
            r.update(kind='practice', title='Ünite özeti', src=I / f'sunular.html/arp090{u}_unite_sunu', target=f'unit-summary-{u}')
        elif 'مفتاح' in sk:
            r.update(kind='document', title='Cevap anahtarı', src=next((I / '03_cevap_anahtari+').glob('*.pdf')), target='answer-key')
        elif 'مراجع' in sk:
            r.update(kind='document', title='Görsel kaynakça', src=next((I / '04_gorsel_kaynakca').glob('*.pdf')), target='image-credits')
        else:
            r.update(kind='external', title='EBA ünite sayfası' if 'موقع' in sk else 'Bağlantı', src=None, target=None)
        if r.get('target') and not r.get('src'):
            sorun.append(f'{r["id"]} {r["kind"]} "{etiket}": dosya bulunamadı')
        r['src'] = str(r['src']) if r.get('src') else None
        kayit.append(r)

(KAY / 'plan.json').write_text(json.dumps(kayit, ensure_ascii=False, indent=1))
say = {}
for r in kayit:
    say[r['kind']] = say.get(r['kind'], 0) + 1
print(len(kayit), 'karekod', say)
print('dosyasız:', sum(1 for r in kayit if not r['src']), '| sorun:', len(sorun))
print('\n'.join(sorun))
