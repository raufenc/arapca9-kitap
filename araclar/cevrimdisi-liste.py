"""Çevrimdışı kayıt listesini (offline-files.json) üretir.

Kitaba dosya eklenince ya da değişince yayından önce çalıştır:
    python3 araclar/cevrimdisi-liste.py

İndirilecek dosyaların listesi şifreyle kilitlenir (araclar/kilitle.mjs); şifre depoda DURMAZ:
A9_SIFRE ortam değişkeninden ya da ../arapca9-kaynak/indirme-sifresi.txt dosyasından okunur.
Şifreyi değiştirmek için o dosyayı değiştirip bu betiği yeniden çalıştır.
"""
import hashlib, json, os, pathlib, shutil, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_DIRS = {'.git', 'araclar', '.claude'}
SIFRE_DOSYASI = pathlib.Path(__file__).resolve().parents[2] / 'arapca9-kaynak/indirme-sifresi.txt'
NODE = shutil.which('node') or '/Users/raufenc/pinokio/bin/miniconda/bin/node'
SKIP_FILES = {'.DS_Store', '.nojekyll', 'README.md', 'sw.js', 'offline-files.json'}
SHELL = ['index.html', 'reader.css', 'reader.js', 'book-data.js', 'activities.js', 'activity-bridge.js',
         'activity-host.html', 'activity-host.js', 'activity-h5p.js', 'activity-h5p.css',
         'vendor/page-flip.browser.js', 'manifest.webmanifest']


def rank(path):
    # önce kitabın açılması için gerekenler, sonra sayfalar, en son ağır medya
    if path in SHELL or path.startswith('assets/fonts/') or path.startswith('assets/icon'):
        return 0
    if path.startswith('assets/thumbs/') or path.startswith('assets/pages/'):
        return 1
    if path.startswith('assets/activities/_storyline/'):
        return 2
    if path.startswith('assets/activities/'):
        return 3
    if path.startswith('assets/documents/'):
        return 4
    return 5


files = []
for f in sorted(ROOT.rglob('*')):
    rel = f.relative_to(ROOT)
    if not f.is_file() or rel.parts[0] in SKIP_DIRS or f.name in SKIP_FILES:
        continue
    files.append((rel.as_posix(), f.stat().st_size))
files.sort(key=lambda x: (rank(x[0]), x[0]))

# her etkinliğin açılışta istediği kod dosyaları: sayfa açıkken arka planda ısıtılır
boot = {}
for path, _ in files:
    parts = path.split('/')
    if len(parts) > 3 and parts[:2] == ['assets', 'activities'] and parts[2] != '_storyline':
        if path.rsplit('.', 1)[-1] in ('html', 'js', 'css') and '/lms/' not in path:
            boot.setdefault(parts[2], []).append(path)

shared = ['activity-host.html', 'activity-host.js', 'activity-bridge.js', 'activity-h5p.js', 'activity-h5p.css'] + \
         [p for p, _ in files if p.startswith('assets/activities/_storyline/') and not p.endswith('mobile.min.js')]

version = hashlib.sha1(json.dumps(files).encode()).hexdigest()[:10]
sifre = os.environ.get('A9_SIFRE') or SIFRE_DOSYASI.read_text(encoding='utf-8').strip()
kilit = subprocess.run([NODE, str(ROOT / 'araclar/kilitle.mjs')], input=json.dumps({'password': sifre, 'data': files}),
                       capture_output=True, text=True, check=True).stdout
out = {'version': version, 'total': sum(s for _, s in files), 'count': len(files), 'locked': json.loads(kilit),
       'boot': boot, 'shared': shared}
(ROOT / 'offline-files.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(files)} dosya, {out["total"] / 1048576:.1f} MB, sürüm {version}')
