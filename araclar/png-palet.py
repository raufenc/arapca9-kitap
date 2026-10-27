"""Etkinliklerdeki büyük PNG'leri 256 renk palete indirir (saydamlık korunur, ad değişmez, yalnızca küçülürse yazılır).

    /usr/local/bin/python3 araclar/png-palet.py [en küçük bayt, varsayılan 150000]
"""
import io, pathlib, sys
from concurrent.futures import ProcessPoolExecutor
from PIL import Image

ACTS = pathlib.Path(__file__).resolve().parent.parent / 'assets/activities'
ESIK = int(sys.argv[1]) if len(sys.argv) > 1 else 150_000


def isle(f):
    once = f.stat().st_size
    try:
        im = Image.open(f)
        if im.mode == 'P':
            return 0
        q = im.convert('RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
        b = io.BytesIO(); q.save(b, 'PNG', optimize=True)
    except Exception:
        return 0
    if b.tell() < once * .8:
        f.write_bytes(b.getvalue())
        return once - b.tell()
    return 0


if __name__ == '__main__':
    fs = [f for f in ACTS.rglob('*.png') if f.stat().st_size > ESIK]
    with ProcessPoolExecutor() as ex:
        k = sum(ex.map(isle, fs, chunksize=4))
    print(f'{len(fs)} PNG, {k / 1048576:.0f} MB kazanç')
