(function(){
  window.Admin = window.Admin || {};
  const { data } = Admin.state;

  function setFaviconLink(href){
    let link = document.querySelector('link[rel="icon"]#site-favicon');
    if (!link){
      link = document.createElement('link');
      link.rel = 'icon';
      link.id = 'site-favicon';
      document.head.appendChild(link);
    }
    link.href = href;
  }

  // --- Bind generator controls ---
  function bindFaviconGenerator(){
    const btn = document.getElementById('gen-favicon-btn');
    const btnUseAsLogo = document.getElementById('use-favicon-as-logo-btn');
    const c1 = document.getElementById('ico-color-1');
    const c2 = document.getElementById('ico-color-2');
    const sizeSel = document.getElementById('ico-size');
    const prev = document.getElementById('favicon-preview');
    const toast = document.getElementById('gen-favicon-toast');

    const modeLightning = document.getElementById('ico-mode-lightning');
    const modeInitials  = document.getElementById('ico-mode-initials');
    const initialsWrap  = document.getElementById('ico-initials-wrap');
    const initialsEl    = document.getElementById('ico-initials');

    if (!btn || !c1 || !c2 || !sizeSel || !prev) return;

    const getMode = () => (modeInitials && modeInitials.checked ? 'initials' : 'lightning');

    const fallbackInitials = (data.config.brandText || data.config.name || 'ISP').split(/\s+/).map(w => w[0] || '').join('').slice(0,2).toUpperCase() || 'I';
    if (initialsEl && !initialsEl.value) initialsEl.value = fallbackInitials;

    function refreshInitialsVisibility(){
      if (!initialsWrap) return;
      initialsWrap.classList.toggle('hidden', getMode() !== 'initials');
    }

    function renderPreview(){
      if (!Utils.generateIconDataURL) return;
      const mode = getMode();
      const png = Utils.generateIconDataURL({
        size: 128,
        from: c1.value,
        to: c2.value,
        mode,
        initials: mode === 'initials' ? (initialsEl?.value || fallbackInitials).toUpperCase() : ''
      });
      prev.src = png;
      setFaviconLink(png);
    }

    function showToast(msg='Generated ✓'){
      if (!toast) return;
      toast.textContent = msg;
      toast.style.opacity = '1';
      setTimeout(() => toast.style.opacity = '0', 1200);
    }

    [c1, c2, sizeSel].forEach(el => el && el.addEventListener('input', renderPreview));
    if (initialsEl) initialsEl.addEventListener('input', renderPreview);
    if (modeLightning) modeLightning.addEventListener('change', () => { refreshInitialsVisibility(); renderPreview(); });
    if (modeInitials)  modeInitials.addEventListener('change',  () => { refreshInitialsVisibility(); renderPreview(); });

    refreshInitialsVisibility();
    renderPreview();

    btn.addEventListener('click', () => {
      const mode = getMode();
      const size = Number(sizeSel.value) || 256;
      const png = Utils.generateIconDataURL({
        size,
        from: c1.value,
        to: c2.value,
        mode,
        initials: mode === 'initials' ? (initialsEl?.value || fallbackInitials).toUpperCase() : ''
      });

      data.config.favicon = png;

      if (!data.config.brandLogo) {
        data.config.brandLogo = png;
        const imgPrev = document.getElementById('brand-logo-preview');
        if (imgPrev){ imgPrev.src = png; imgPrev.classList.remove('hidden'); }
        const txtPrev = document.getElementById('brand-text-preview');
        if (txtPrev){ txtPrev.classList.add('hidden'); }
        if (btnUseAsLogo) btnUseAsLogo.classList.add('hidden');
      } else {
        if (btnUseAsLogo) btnUseAsLogo.classList.remove('hidden');
      }

      prev.src = png;
      setFaviconLink(png);
      showToast();
    });

    if (btnUseAsLogo){
      btnUseAsLogo.addEventListener('click', () => {
        if (!data.config.favicon) return;
        data.config.brandLogo = data.config.favicon;
        const imgPrev = document.getElementById('brand-logo-preview');
        if (imgPrev){ imgPrev.src = data.config.brandLogo; imgPrev.classList.remove('hidden'); }
        const txtPrev = document.getElementById('brand-text-preview');
        if (txtPrev){ txtPrev.classList.add('hidden'); }
        btnUseAsLogo.classList.add('hidden');
        showToast('Set as Logo ✓');
      });
    }
  }

  function init(){
    const modeText = document.getElementById('brand-mode-text');
    const modeLogo = document.getElementById('brand-mode-logo');
    const modeBoth = document.getElementById('brand-mode-both');
    const brandText = document.getElementById('brand-text');
    const fileInput = document.getElementById('brand-logo-file');
    const clearBtn  = document.getElementById('clear-logo-btn');
    const imgPrev   = document.getElementById('brand-logo-preview');
    const txtPrev   = document.getElementById('brand-text-preview');

    if (!modeText || !modeLogo || !modeBoth || !brandText) return;

    const mode = data.config.brandMode || 'text';
    if (mode === 'logo') modeLogo.checked = true;
    else if (mode === 'both') modeBoth.checked = true;
    else modeText.checked = true;

    brandText.value = data.config.brandText || data.config.name || 'ISP';

    function refresh(){
      const selected = document.querySelector('input[name="brand-mode"]:checked')?.value || 'text';
      const hasLogo = !!data.config.brandLogo;

      if (selected === 'logo'){
        if (imgPrev){ imgPrev.src = data.config.brandLogo || ''; imgPrev.classList.toggle('hidden', !hasLogo); }
        if (txtPrev) txtPrev.classList.add('hidden');
      } else if (selected === 'text'){
        if (imgPrev) imgPrev.classList.add('hidden');
        if (txtPrev){ txtPrev.textContent = brandText.value || 'ISP'; txtPrev.classList.remove('hidden'); }
      } else {
        if (imgPrev){ imgPrev.src = data.config.brandLogo || ''; imgPrev.classList.toggle('hidden', !hasLogo); }
        if (txtPrev){ txtPrev.textContent = brandText.value || 'ISP'; txtPrev.classList.remove('hidden'); }
      }
    }

    if (!Admin.state.brandingInitDone){
      [modeText, modeLogo, modeBoth].forEach(r => r.addEventListener('change', refresh));
      brandText.addEventListener('input', refresh);

      if (fileInput){
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => { data.config.brandLogo = String(reader.result || ''); refresh(); };
          reader.readAsDataURL(file);
        });
      }
      if (clearBtn){
        clearBtn.addEventListener('click', () => { data.config.brandLogo = ''; refresh(); });
      }
      Admin.state.brandingInitDone = true;
    }

    if (imgPrev && data.config.brandLogo) imgPrev.src = data.config.brandLogo;
    refresh();
    bindFaviconGenerator();
  }

  function save(){
    const mode = document.querySelector('input[name="brand-mode"]:checked')?.value || 'text';
    const brandTextEl = document.getElementById('brand-text');
    data.config.brandMode = mode;
    data.config.brandText = brandTextEl?.value?.trim() || (data.config.name || 'ISP');
    Admin.cloud.saveToCloud();
  }

  (function wireFaviconSizeNote(){
  const sizeSel = document.getElementById('ico-size');
  const note = document.getElementById('favicon-preview-size');
  if (!sizeSel || !note) return;

  const update = () => {
    const v = sizeSel.value || '256';
    note.textContent = v ? `${v} × ${v}` : '';
  };
  sizeSel.addEventListener('change', update);
  update();
})();

  Admin.branding = { init, save };
})();
