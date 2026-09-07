// Runs before first paint (see app/layout.tsx) so the page never flashes the
// wrong theme. A choice saved by the "Light / Dark" toggle (localStorage key
// "theme") wins; otherwise the system preference is followed.
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var theme = saved === 'dark' || saved === 'light' ? saved : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
