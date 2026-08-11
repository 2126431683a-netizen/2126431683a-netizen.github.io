(() => {
  const body = document.body;
  const menuButton = document.querySelector('.menu-button');
  const navLinks = document.querySelector('.nav-links');

  const closeMenu = () => {
    body.classList.remove('menu-open');
    if (menuButton) {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', '打开导航');
    }
  };

  if (menuButton && navLinks) {
    menuButton.addEventListener('click', () => {
      const isOpen = body.classList.toggle('menu-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute('aria-label', isOpen ? '关闭导航' : '打开导航');
    });

    navLinks.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  const currentPage = body.dataset.page;
  if (currentPage) {
    document.querySelectorAll('[data-nav]').forEach((link) => {
      if (link.dataset.nav === currentPage) link.setAttribute('aria-current', 'page');
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('[data-reveal]');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('revealed'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const terminal = document.querySelector('[data-project-terminal]');
  if (terminal) {
    const tabs = [...terminal.querySelectorAll('.terminal-tab')];
    const media = terminal.querySelector('.terminal-media');
    const image = terminal.querySelector('[data-terminal-image]');
    const code = terminal.querySelector('[data-terminal-code]');
    const title = terminal.querySelector('[data-terminal-title]');
    const meta = terminal.querySelector('[data-terminal-meta]');
    const description = terminal.querySelector('[data-terminal-description]');
    const detailLink = terminal.querySelector('[data-terminal-detail]');
    const demoLink = terminal.querySelector('[data-terminal-demo]');

    const selectProject = (tab) => {
      tabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
      media.classList.add('is-changing');
      window.setTimeout(() => {
        image.src = tab.dataset.image;
        image.alt = tab.dataset.alt;
        code.textContent = tab.dataset.code;
        title.textContent = tab.dataset.title;
        meta.textContent = tab.dataset.meta;
        description.textContent = tab.dataset.description;
        detailLink.href = tab.dataset.detail;
        demoLink.href = tab.dataset.demo;
        media.classList.remove('is-changing');
      }, reducedMotion ? 0 : 150);
    };

    tabs.forEach((tab) => tab.addEventListener('click', () => selectProject(tab)));
  }

  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const image = lightbox.querySelector('img');
    const caption = lightbox.querySelector('.lightbox-caption');
    const closeButton = lightbox.querySelector('.lightbox-close');

    document.querySelectorAll('[data-lightbox]').forEach((button) => {
      button.addEventListener('click', () => {
        image.src = button.dataset.lightbox;
        image.alt = button.dataset.caption || '项目截图';
        caption.textContent = button.dataset.caption || '项目截图';
        lightbox.showModal();
      });
    });

    closeButton?.addEventListener('click', () => lightbox.close());
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) lightbox.close();
    });
  }

  const genreFilter = document.querySelector('[data-genre-filter]');
  if (genreFilter) {
    const filterButtons = [...genreFilter.querySelectorAll('[data-genre]')];
    const genrePanels = [...document.querySelectorAll('[data-genre-panel]')];
    const count = genreFilter.querySelector('[data-genre-count]');

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const selectedGenre = button.dataset.genre;
        let visibleCount = 0;

        filterButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        genrePanels.forEach((panel) => {
          const isVisible = selectedGenre === 'all' || panel.dataset.genrePanel === selectedGenre;
          panel.hidden = !isVisible;
          if (isVisible) visibleCount += 1;
        });
        if (count) count.textContent = `${visibleCount} 个类型拆解`;
      });
    });
  }

  document.querySelectorAll('[data-year]').forEach((item) => {
    item.textContent = String(new Date().getFullYear());
  });
})();
