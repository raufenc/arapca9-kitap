"""Storyline paketlerindeki aynı oynatıcı motorunu (html5/lib + lms/scormdriver.js) tek kopyada toplar.

    python3 araclar/storyline-tekille.py

Aynı sürümdeki motorlar assets/activities/_storyline (ilk sürüm) ya da _storyline-<özet> altında paylaşılır;
paketlerin index_lms.html ve story.html dosyaları oraya bakacak şekilde güncellenir. Tekrar çalıştırmak güvenlidir.
"""
import hashlib, pathlib, shutil

ACTS = pathlib.Path(__file__).resolve().parent.parent / 'assets/activities'


def ozet(lib, drv):
    h = hashlib.md5()
    for f in sorted(lib.rglob('*')):
        if f.is_file() and f.name != 'bootstrapper.min.js':  # paylaşılan kopyada yamalı
            h.update(str(f.relative_to(lib)).encode()); h.update(f.read_bytes())
    h.update(drv.read_bytes())
    return h.hexdigest()[:10]


def paylasilan(ad, kaynak):
    hedef = ACTS / ad
    if hedef.exists():
        return
    shutil.copytree(kaynak / 'html5/lib', hedef / 'html5/lib')
    (hedef / 'lms').mkdir(parents=True)
    shutil.copy2(kaynak / 'lms/scormdriver.js', hedef / 'lms/scormdriver.js')
    b = hedef / 'html5/lib/scripts/bootstrapper.min.js'
    s = b.read_text(encoding='utf-8-sig')
    for eski, yeni in [('e.DATA_PATH_BASE+"/html5/lib/scripts"', f'e.DATA_PATH_BASE+"/../{ad}/html5/lib/scripts"'),
                       ('e.DATA_PATH_BASE+"/html5/lib/stylesheets"', f'e.DATA_PATH_BASE+"/../{ad}/html5/lib/stylesheets"'),
                       ('href="html5/lib/stylesheets/\'', f'href="../{ad}/html5/lib/stylesheets/\'')]:
        assert s.count(eski) == 1, (ad, eski)
        s = s.replace(eski, yeni)
    b.write_text(s, encoding='utf-8')


mevcut = ACTS / '_storyline'
ad_of = {ozet(mevcut / 'html5/lib', mevcut / 'lms/scormdriver.js'): '_storyline'} if mevcut.exists() else {}
kazanc, n = 0, 0
for p in sorted(ACTS.iterdir()):
    if p.name.startswith('_') or not (p / 'html5/lib').is_dir() or not (p / 'lms/scormdriver.js').exists():
        continue
    o = ozet(p / 'html5/lib', p / 'lms/scormdriver.js')
    ad = ad_of.setdefault(o, f'_storyline-{o}')
    paylasilan(ad, p)
    for giris in ('index_lms.html', 'story.html'):
        f = p / giris
        if f.exists():
            s = f.read_text(encoding='utf-8')
            s = s.replace('src="lms/scormdriver.js"', f'src="../{ad}/lms/scormdriver.js"')
            s = s.replace('src="html5/lib/scripts/bootstrapper.min.js"', f'src="../{ad}/html5/lib/scripts/bootstrapper.min.js"')
            f.write_text(s, encoding='utf-8')
    kazanc += sum(f.stat().st_size for f in (p / 'html5/lib').rglob('*') if f.is_file()) + (p / 'lms/scormdriver.js').stat().st_size
    shutil.rmtree(p / 'html5/lib'); (p / 'lms/scormdriver.js').unlink(); n += 1
print(f'{n} paket tekilleşti, {kazanc / 1048576:.1f} MB kazanç; motor sürümleri: {sorted(set(ad_of.values()))}')
