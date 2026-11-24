// AIOps Sentinel GitHub Pages Scripts
(function () {
  const themeToggle = document.getElementById('theme-toggle');
  const storedTheme = localStorage.getItem('aiops-theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      if (themeToggle) themeToggle.textContent = '☀️';
    } else {
      document.documentElement.classList.remove('dark');
      if (themeToggle) themeToggle.textContent = '🌙';
    }
    localStorage.setItem('aiops-theme', theme);
  }

  applyTheme(storedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // Mobile menu toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }

  // Active navigation highlighting
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();
