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

  // Modal Launcher for AIOps Console
  function createModal() {
    if (document.getElementById('console-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'console-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <div>
            <span class="badge-success">Enterprise Architecture</span>
            <h3 id="modal-title" style="margin-top: 0.5rem; font-size: 1.25rem; color: var(--text-primary);">AIOps Sentinel Console</h3>
          </div>
          <button id="modal-close-btn" class="modal-close" aria-label="Close dialog">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
            GitHub Pages serves the static public website and engineering documentation. 
            The full dynamic application (Next.js 14 frontend, FastAPI backend, PostgreSQL, and Redis) runs in a containerized cloud environment.
          </p>
          <div style="background-color: var(--surface-raised); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.5rem;">Access Environments:</div>
            <ul style="font-size: 0.85rem; color: var(--text-secondary); padding-left: 1.25rem; line-height: 1.6;">
              <li><strong>Local Dev:</strong> Console runs at <code>http://localhost:3000</code></li>
              <li><strong>Self-Hosted / Cloud:</strong> Deploy via <code>docker compose up -d</code></li>
            </ul>
          </div>
          <div style="margin-bottom: 1.25rem;">
            <label for="custom-console-url" style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Custom Console Endpoint (optional):
            </label>
            <input type="text" id="custom-console-url" placeholder="e.g. http://localhost:3000 or https://console.example.com" 
              style="width: 100%; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid var(--border); background-color: var(--surface-card); color: var(--text-primary); font-size: 0.85rem; font-family: var(--font-mono);" />
          </div>
        </div>
        <div class="modal-footer">
          <button id="modal-launch-btn" class="btn-primary" style="cursor: pointer; border: none;">Connect to Console</button>
          <a href="docs.html#deployment" class="btn-secondary">Deployment Runbook</a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('modal-close-btn');
    const inputUrl = document.getElementById('custom-console-url');
    const launchBtn = document.getElementById('modal-launch-btn');

    const savedUrl = localStorage.getItem('aiops_app_url') || '';
    if (savedUrl) inputUrl.value = savedUrl;

    function closeModal() {
      modal.classList.remove('active');
    }

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    launchBtn.addEventListener('click', () => {
      const url = inputUrl.value.trim() || 'http://localhost:3000';
      localStorage.setItem('aiops_app_url', url);
      window.open(url + '/login', '_blank');
      closeModal();
    });
  }

  function handleConsoleAction(e, targetPath) {
    e.preventDefault();
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const configuredUrl = window.AIOPS_APP_URL || localStorage.getItem('aiops_app_url');

    if (configuredUrl) {
      window.location.href = configuredUrl + (targetPath || '/login');
      return;
    }

    if (isLocalhost) {
      window.location.href = 'http://localhost:3000' + (targetPath || '/login');
      return;
    }

    createModal();
    const modal = document.getElementById('console-modal');
    if (modal) modal.classList.add('active');
  }

  document.querySelectorAll('.app-signin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleConsoleAction(e, '/login'));
  });

  document.querySelectorAll('.app-launch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleConsoleAction(e, '/overview'));
  });
})();
