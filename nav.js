/* 드롭다운(Develop, Community): 데스크톱은 hover(CSS), 터치·키보드는 클릭/ESC로 열고 닫는다 */
(function () {
  var dds = document.querySelectorAll('.dd');
  if (!dds.length) return;
  function closeAll(except) { dds.forEach(function (d) { if (d !== except) { d.classList.remove('open'); d.querySelector('.dd-t').setAttribute('aria-expanded', 'false'); } }); }
  dds.forEach(function (dd) {
    var t = dd.querySelector('.dd-t');
    t.addEventListener('click', function (e) {
      e.stopPropagation();
      closeAll(dd);
      var o = dd.classList.toggle('open');
      t.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function (e) { dds.forEach(function (d) { if (!d.contains(e.target)) { d.classList.remove('open'); d.querySelector('.dd-t').setAttribute('aria-expanded', 'false'); } }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });
})();
