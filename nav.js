/* Develop 드롭다운: 데스크톱은 hover(CSS), 터치·키보드는 클릭/ESC로 열고 닫는다 */
(function () {
  var dd = document.querySelector('.dd');
  if (!dd) return;
  var t = dd.querySelector('.dd-t');
  function close() { dd.classList.remove('open'); t.setAttribute('aria-expanded', 'false'); }
  t.addEventListener('click', function (e) {
    e.stopPropagation();
    var o = dd.classList.toggle('open');
    t.setAttribute('aria-expanded', o ? 'true' : 'false');
  });
  document.addEventListener('click', function (e) { if (!dd.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
