/* Kitaptan ders setine geçiş: açık sayfanın tahta ekranına götürür (1. ünite) */
(() => {
  const a = document.getElementById('setLink'); if (!a) return;
  const upd = () => { const m = /#p=(\d+)/.exec(location.hash), p = m ? +m[1] : 0; a.href = 'ders/index.html' + (p >= 10 && p <= 77 ? '#s=' + p : '#ana'); };
  a.addEventListener('pointerdown', upd); a.addEventListener('focus', upd); a.addEventListener('click', upd);
})();
