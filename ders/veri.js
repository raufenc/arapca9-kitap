/* Arapça 9 · 1. Ünite ders seti — ders akışı, resimler, sözlük.
   Dil malzemesi veri-temel.js'te (GREETINGS, DEMO, PRONOUNS …); burada yalnız düzen var. */

const UNIT = {
  no: 1, ar: 'هَيَّا نَتَعَارَفْ', tr: 'Haydi Tanışalım', first: 10, last: 77,
  cover: 'img/s01_kapak.jpg',
  can: [
    'Selam verir, selamı alır; hâl hatır sorarım.',
    '28 harfi, harekeleri ve okuma işaretlerini tanırım.',
    'Kendimi ve arkadaşımı Arapça tanıtırım.',
    'Nereli olduğumu söyler, karşımdakine sorarım.'
  ]
};

/* Selamlaşma sahneleri: her selam çiftine bir resim */
const GREET_IMG = ['img/s09_hadis.jpg', 'img/s02_sabah.jpg', 'img/s06_karsilama.jpg', 'img/s04_koridor.jpg', 'img/s05_veda.jpg'];

/* Yönerge resimleri (dinle, tekrar et, oku, yaz) */
const CMD_IMG = ['img/y_dinle.jpg', 'img/y_tekrarla.jpg', 'img/y_oku.jpg', 'img/y_yaz.jpg'];

/* Kişi portreleri: zamirler ekranında konuşan / dinleyen / sözü edilen */
const PEOPLE = { ali: 'img/ali.jpg', yusuf: 'img/yusuf.jpg', fatma: 'img/fatma.jpg', zeynep: 'img/zeynep.jpg', hoca: 'img/ogretmen_e.jpg', hocaK: 'img/ogretmen_k.jpg' };
const PRONOUN_IMG = [PEOPLE.ali, PEOPLE.zeynep, PEOPLE.yusuf, PEOPLE.fatma, PEOPLE.ali, PEOPLE.zeynep];
const DEMO_IMG = [[PEOPLE.ali, PEOPLE.fatma], [PEOPLE.hoca, PEOPLE.hocaK], ['img/s07_sinif.jpg', 'img/s03_aksam.jpg']];

/* Şemsî kelimelerin anlamı (SOLARWORDS sırasıyla) */
const SOLAR_TR = ['aslan', 'kapı', 'tanışma', 'kar', 'yücelik', 'hesap', 'ekmek', 'defter', 'zikir', 'nar', 'zekât', 'yıl', 'güneş', 'arkadaş', 'subay', 'iyi, hoş', 'zarf', 'göz', 'ceylan', 'farz', 'ay', 'kelime', 'dil', 'anahtar', 'nur, ışık', 'telefon', 'vahiy', 'el'];
const LONG_TR = [['-dığı zaman', 'kapı', 'öğrenci', 'idi, oldu'], ['-sız, olmadan', 'nur, ışık', 'elçi', 'harfler'], ['babam', 'din', 'doktor', 'kalk (kıza)'], ['-e doğru', 'üzerinde', 'Selma (isim)', 'Musa (isim)']];
const TANWIN_TR = ['baba', 'ev', 'çiçek', 'okul'];

/* Dersler: her ekran = {t: tür, p: kitap sayfası, …}. Sıra, kitabın sırasıdır. */
const LESSONS = [
  { id: 'selam', no: 1, tr: 'Selamlaşma', ar: 'التَّحِيَّةُ', pages: [10, 21], img: 'img/s02_sabah.jpg',
    screens: [
      { t: 'cover', p: 10 },
      { t: 'greet', p: 12, ar: 'التَّحِيَّةُ', tr: 'Bir selamla başla' },
      { t: 'situation', p: 18, ar: 'مَاذَا تَقُولُ؟', tr: 'Duruma uygun karşılık ver' },
      { t: 'quiz', p: 18, ar: 'اِسْتَمِعْ وَأَجِبْ', tr: 'Dinle ve karşılık ver', q: 'GREETQUIZ' }
    ] },
  { id: 'harf', no: 2, tr: 'Harfler ve harekeler', ar: 'الْحُرُوفُ وَالْحَرَكَاتُ', pages: [13, 33], img: 'img/s07_sinif.jpg',
    screens: [
      { t: 'letters', p: 13, ar: 'الْحُرُوفُ الْعَرَبِيَّةُ', tr: '28 harfi tanı' },
      { t: 'families', p: 16, ar: 'اُنْظُرْ إِلَى النِّقَاطِ', tr: 'Noktalar harfi değiştirir' },
      { t: 'vowels', p: 14, ar: 'الْحَرَكَاتُ', tr: 'Bir harf, üç kısa ses' },
      { t: 'forms', p: 22, ar: 'كِتَابَةُ الْحُرُوفِ', tr: 'Harf, kelimenin içinde biçim değiştirir' },
      { t: 'nonjoin', p: 32, ar: 'سِتَّةُ حُرُوفٍ', tr: 'Kendisinden sonrakine bağlanmayan altı harf' },
      { t: 'join', p: 31, ar: 'رَكِّبِ الْحُرُوفَ', tr: 'Harflerden kelimeye' }
    ] },
  { id: 'isaret', no: 3, tr: 'Okuma işaretleri', ar: 'السُّكُونُ وَالشَّدَّةُ وَالتَّنْوِينُ', pages: [34, 47], img: 'img/s11_aracilik.jpg',
    screens: [
      { t: 'sukun', p: 34, ar: 'السُّكُونُ', tr: 'Harekesiz harf: araya ses ekleme' },
      { t: 'shadda', p: 35, ar: 'الشَّدَّةُ', tr: 'İki harf, tek işaret' },
      { t: 'tanwin', p: 38, ar: 'التَّنْوِينُ', tr: 'Kelimenin sonundaki üç ses' },
      { t: 'long', p: 40, ar: 'الْحَرَكَاتُ الطَّوِيلَةُ', tr: 'Kısa sesi uzat' },
      { t: 'commands', p: 42, ar: 'اِسْتَمِعْ، أَعِدْ، اِقْرَأْ، اُكْتُبْ', tr: 'Sınıfın yönergeleri', d: 'COMMANDS1', img: CMD_IMG },
      { t: 'quiz', p: 46, ar: 'تَحَقَّقْ مِنْ قِرَاءَتِكَ', tr: 'Okuma bilgini dene', q: 'READQUIZ' }
    ] },
  { id: 'tanis', no: 4, tr: 'Tanışma', ar: 'التَّعَارُفُ', pages: [48, 65], img: 'img/s14_rehber.jpg',
    screens: [
      { t: 'dialogue', p: 48, ar: 'مَا اسْمُكَ؟', tr: 'Ali ile Ahmet tanışıyor', img: 'img/s14_rehber.jpg' },
      { t: 'demo', p: 55, ar: 'هٰذَا / هٰذِهِ', tr: 'Birini göstererek tanıt' },
      { t: 'quiz', p: 63, ar: 'قَدِّمْ زَمِيلَكَ', tr: 'Arkadaşını doğru ifadeyle tanıt', q: 'DEMOQUIZ' },
      { t: 'pronouns', p: 59, ar: 'أَنَا، أَنْتَ، هُوَ، هِيَ', tr: 'Konuşan, dinleyen, sözü edilen' },
      { t: 'who', p: 52, ar: 'مَنْ؟', tr: '“Kim?” sorusunu cevapla' },
      { t: 'names', p: 60, ar: 'مَا اسْمُكَ؟', tr: 'Kişi değişince ek de değişir' },
      { t: 'countries', p: 54, ar: 'مِنْ أَيْنَ؟', tr: 'Nereli olduğunu söyle', img: 'img/s08_tanistirma.jpg' }
    ] },
  { id: 'kalip', no: 5, tr: 'Kalıpları kullan', ar: 'نَتَكَلَّمُ', pages: [57, 69], img: 'img/s13_isaret.jpg',
    screens: [
      { t: 'sunmoon', p: 61, ar: 'الشَّمْسِيَّةُ وَالْقَمَرِيَّةُ', tr: 'Lâm her zaman okunur mu?' },
      { t: 'classify', p: 62, ar: 'صَنِّفِ الْكَلِمَاتِ', tr: 'Dinle: şemsî mi, kamerî mi?' },
      { t: 'commands', p: 57, ar: 'تَكَلَّمْ، اُسْكُتْ، تَعَالَ، اِذْهَبْ', tr: 'Kime sesleniyorsun?', d: 'COMMANDS2' },
      { t: 'build', p: 69, ar: 'رَتِّبِ الْكَلِمَاتِ', tr: 'Soruyu ve cevabı kur' },
      { t: 'roleplay', p: 66, ar: 'تَعَارَفْ مَعَ زَمِيلِكَ', tr: 'Konuşma sırası sende', img: 'img/s12_proje.jpg' }
    ] },
  { id: 'deger', no: 6, tr: 'Değerlendirme', ar: 'التَّقْوِيمُ', pages: [70, 77], img: 'img/s12_proje.jpg',
    screens: [
      { t: 'quiz', p: 70, ar: 'مَاذَا تَعَلَّمْتَ؟', tr: 'Ünite sonu uygulaması', q: 'FINALQUIZ', final: true },
      { t: 'finish', p: 77, ar: 'أَسْتَطِيعُ أَنْ أَتَعَارَفَ', tr: 'Artık kendini tanıtabilirsin' }
    ] }
];

/* Cümle kurma (build) ve oyunlar için cümleler: [doğru dizilim, Türkçe, ses] */
const SENTENCES = [
  [['مَا', 'اسْمُكَ؟'], 'Adın ne?', null],
  [['اِسْمِي', 'أَحْمَدُ.'], 'Adım Ahmet.', null],
  [['مِنْ', 'أَيْنَ', 'أَنْتَ؟'], 'Nerelisin?', 109],
  [['أَنَا', 'مِنْ', 'أَنْقَرَةَ.'], 'Ben Ankaralıyım.', 110],
  [['هَلْ', 'أَنْتَ', 'طَالِبٌ؟'], 'Sen öğrenci misin?', null],
  [['نَعَمْ،', 'أَنَا', 'طَالِبٌ.'], 'Evet, ben öğrenciyim.', 108],
  [['هٰذِهِ', 'مُدَرِّسَةٌ.'], 'Bu bir öğretmen (kadın).', 123],
  [['مَا', 'اسْمُهَا؟'], 'Onun (kadın) adı ne?', 150],
  [['كَيْفَ', 'حَالُكَ؟'], 'Nasılsın?', 12],
  [['أَنَا', 'بِخَيْرٍ،', 'الْحَمْدُ', 'لِلّٰهِ.'], 'İyiyim, Allah’a şükür.', 13]
];
