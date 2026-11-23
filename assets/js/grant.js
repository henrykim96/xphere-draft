/* XPHERE site — grant.js (grant.html only). Runs after core.js.
   14-business-day calendar: three Mon–Sun weeks, weekends dimmed, the 14 business days light up in order once visible. */
(function () {
  'use strict';
  var cal = document.getElementById('gaCal');
  if (!cal) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, k = 0;
  for (var i = 0; i < 21; i++) {
    var c = document.createElement('i'), we = i % 7 >= 5;
    if (we) c.className = 'we';
    else { if (k < 14) { c.className = 'bd' + (k === 13 ? ' last' : ''); c.style.setProperty('--k', k); } k++; }
    cal.appendChild(c);
  }
  if (reduce || !('IntersectionObserver' in window)) { cal.classList.add('in'); return; }
  var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { cal.classList.add('in'); io.disconnect(); } }, { threshold: .6 });
  io.observe(cal);
})();
