# Arapça 9 · Haydi Tanışalım

Sayfa çevirmeli etkileşimli kitap (1. ünite, s. 10–77): sesler, videolar, etkinlikler, alıştırmalar.

Canlı: https://raufenc.github.io/arapca9-kitap/

- Kitap çevrimdışı kaydedilebilir (üst çubuktaki indirme düğmesi); `sw.js` önbelleği yönetir.
- Dosya ekleyip değiştirince yayından önce: `python3 araclar/cevrimdisi-liste.py`
- İndirme (çevrimdışı kayıt ve PDF) şifre ister. İndirilecek dosya listesi şifreyle kilitlenir (AES-256-GCM, PBKDF2). Şifre depoda durmaz: `../arapca9-kaynak/indirme-sifresi.txt` ya da `A9_SIFRE`. Şifreyi değiştirmek için o dosyayı değiştir, liste betiğini yeniden çalıştır.
- Kitap sağdan sola: ön kapak (`kapak-on`) tek başına, iç kapak boş, 1. sayfa solda; arka kapak (`kapak-arka`) en sonda tek başına.
- 21 Storyline etkinliği ortak motoru `assets/activities/_storyline/` altından kullanır.
- Yazılı etkinlikler (222 etkinlik) etkileşimli: işaretle, doğru/yanlış, şekil, boşluğa kart koy, cümle diz, çizgiyle eşleştir, bulmaca. Cevaplar `cevaplar.js`, cevap anahtarı resimleri `assets/keys/`. Motor `reader.js` içinde `qz*` işlevleri; veri `../arapca9-kaynak/cevap/` altında üretilir (`python3 derle.py x`).
- Cevaplar `cevaplar.js` içinde açık durur; site herkese açık olduğu için meraklı bir öğrenci bulabilir.
- Yazılı etkinliklerde (Kasım 2026, paket 2): "Yanlışları tekrar dene" (yalnız kırmızılar silinir), Kontrol et'te kısa yumuşak ses (panelden sessize alınır), bölgesinde kitabın ses karekodu olan 29 etkinlikte doğru çözümden sonra "Dinle", kartları ve bulmaca karelerini parmakla/fareyle sürükle-bırak, İçindekiler panelinde ünite ünite ilerleme özeti.
- Üst çubuktaki ekran simgesi "tahta modu"nu açar (büyük yazı ve düğmeler, puan sayısı gizli; telefonda gizli). Dokunmatik ekranda sayfadaki etkinlik kutusu artık dokununca açılır (sayfa çevirme kütüphanesi dokunuşta "click" üretmiyordu).
