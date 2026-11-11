/* Tipps: Filter + Detailansicht (native <dialog>).
   Die Tipps stehen komplett im HTML (auch ohne JavaScript lesbar);
   dieses Skript filtert nur und öffnet die Detailansicht. */
(function () {
  'use strict';

  var list = document.getElementById('tipsList');
  var dlg = document.getElementById('tipDialog');
  if (!list || !dlg) return;

  var items = Array.prototype.slice.call(list.querySelectorAll('.tip'));
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var count = document.getElementById('tipsCount');

  function apply(cat) {
    var n = 0;
    items.forEach(function (item) {
      var show = cat === 'Alle' || item.getAttribute('data-cat') === cat;
      item.hidden = !show;
      if (show) n++;
    });
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === cat)); });
    if (count) count.textContent = n + (n === 1 ? ' Tipp' : ' Tipps') + (cat === 'Alle' ? '' : ' in „' + cat + '“');
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-filter')); }); });

  var last = null;
  function open(item) {
    last = item.querySelector('.tip__open');
    dlg.querySelector('.tip-dialog__cat').textContent = item.getAttribute('data-cat');
    dlg.querySelector('.tip-dialog__title').textContent = item.querySelector('h2').textContent;
    dlg.querySelector('.tip-dialog__text').innerHTML = item.querySelector('.tip__full-body').innerHTML;
    dlg.querySelector('.tip-dialog__action p').innerHTML = item.querySelector('.tip__full-action').innerHTML;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }

  items.forEach(function (item) {
    item.addEventListener('click', function () { open(item); });
  });
  dlg.querySelector('.tip-dialog__close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });   /* Klick auf den Hintergrund */
  dlg.addEventListener('close', function () { if (last) last.focus(); });

  apply('Alle');
})();
