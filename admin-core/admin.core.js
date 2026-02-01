(function () {
  window.Admin = window.Admin || {};

  // Firebase bootstrap
  if (!window.FIREBASE_CONFIG || !window.firebase) {
    console.error('Firebase config missing on admin.');
    return;
  }
  try { firebase.initializeApp(window.FIREBASE_CONFIG); } catch (e) {}
  const db   = firebase.firestore();
  const auth = firebase.auth();

  // Global state
  const data = { config: {}, plans: [], zones: [], footer: {} };
  window.data = data; 

  // ---------- UI helpers for auth loading ----------
  function ensureAuthLoaderDOM(){
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    if (!document.getElementById('auth-loading-overlay')){
      const overlay = document.createElement('div');
      overlay.id = 'auth-loading-overlay';
      overlay.style.cssText = `
        position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.45); backdrop-filter: blur(2px); z-index: 50;
      `;
      overlay.innerHTML = `
        <div style="
          display:flex; flex-direction:column; gap:10px; align-items:center; 
          background: rgba(18,18,18,0.9); border:1px solid rgba(255,255,255,0.12);
          border-radius: 12px; padding: 16px 18px; color:#fff; min-width: 220px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.45);
        ">
          <div style="font-weight:700; letter-spacing:.3px">Signing in…</div>
          <div style="font-size:22px; color:#22d3ee">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
        </div>
      `;
      const cs = window.getComputedStyle(modal);
      if (cs.position === 'static') modal.style.position = 'relative';
      modal.appendChild(overlay);
    }
  }

  function setAuthLoading(isLoading){
    ensureAuthLoaderDOM();

    const overlay = document.getElementById('auth-loading-overlay');
    const loginBtn = document.getElementById('login-btn');
    const emailEl = document.getElementById('admin-email');
    const passEl  = document.getElementById('admin-pass');

    if (overlay) overlay.style.display = isLoading ? 'flex' : 'none';

    if (loginBtn){
      if (isLoading){
        loginBtn.dataset.__orig = loginBtn.dataset.__orig || loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Logging in…';
        loginBtn.setAttribute('disabled', 'disabled');
        loginBtn.style.opacity = '0.8';
        loginBtn.style.cursor = 'not-allowed';
      } else {
        if (loginBtn.dataset.__orig) loginBtn.innerHTML = loginBtn.dataset.__orig;
        loginBtn.removeAttribute('disabled');
        loginBtn.style.opacity = '';
        loginBtn.style.cursor = '';
      }
    }

    if (emailEl) emailEl.disabled = !!isLoading;
    if (passEl)  passEl.disabled  = !!isLoading;
  }

  function showLoginError(msg){
    const errEl = document.getElementById('login-error');
    if (errEl) {
      errEl.innerText = msg || 'Login failed.';
      errEl.style.display = 'block';
    } else {
      alert(msg || 'Login failed.');
    }
  }

  // Helpers (Using Shared Utils where possible)
  const Util = {
    numberOrZero(v){ const n = Number(v); return isNaN(n) ? 0 : n; },
    ensurePlanSchema(p){
      const n = Util.numberOrZero;
      p = p || {};
      p.name = p.name || 'NEW PLAN';
      p.speed = p.speed || '50 Mbps';
      p.highlight = !!p.highlight;
      p.linkedZones = Array.isArray(p.linkedZones) ? p.linkedZones : ['All'];
      p.features = Array.isArray(p.features) ? p.features : ['Unlimited Data'];
      p.rates = p.rates || {};
      p.rates['1 Month']  = n(p.rates['1 Month']);
      p.rates['3 Months'] = n(p.rates['3 Months']);
      p.rates['6 Months'] = n(p.rates['6 Months']);
      p.rates['1 Year']   = n(p.rates['1 Year']);
      p.installation = p.installation || {};
      p.installation['1 Month']  = n(p.installation['1 Month']);
      p.installation['LongTerm'] = n(p.installation['LongTerm']);
      return p;
    }
  };

  // Export
  Admin.firebase = { db, auth };
  Admin.state    = { data, brandingInitDone:false };
  Admin.util     = Util;

  // Queue Flush
  window.__adminQueue = window.__adminQueue || [];
  try {
    while (window.__adminQueue.length) {
      const fn = window.__adminQueue.shift();
      try { fn && fn(); } catch(e){ console.error(e); }
    }
  } catch(e){ console.error(e); }

  // -------- Cloud I/O ----------
  function zonesFromFirestore(zones){
    return (zones || []).map(zone => {
      if (Array.isArray(zone.points)) {
        zone.points = zone.points.map(p => (p && typeof p === 'object' && !Array.isArray(p)) ? [p.lat, p.lng] : p);
      }
      return zone;
    });
  }
  function zonesToFirestore(zones){
    return (zones || []).map(zone => {
      if (Array.isArray(zone.points)) {
        zone.points = zone.points.map(p => Array.isArray(p) ? ({ lat:p[0], lng:p[1] }) : p);
      }
      return zone;
    });
  }

  async function loadFromCloud(){
    try{
      const snap = await db.collection('settings').doc('siteData').get();
      if (snap.exists){
        const d = snap.data() || {};
        data.config = d.config || {};
        data.footer = d.footer || {};
        if (!('hours' in data.footer)) data.footer.hours = '10 AM – 7 PM';

        data.zones  = zonesFromFirestore(d.zones || []);
        data.plans  = (d.plans || []).map(Util.ensurePlanSchema);

        data.config.brandMode = data.config.brandMode || 'text';
        data.config.brandText = data.config.brandText || data.config.name || 'ISP';
        if (!('brandLogo' in data.config)) data.config.brandLogo = '';
      }
      populateUI();
      if (document.getElementById('admin-map') && Admin.map && Admin.map.init) {
        Admin.map.init();
      }
    }catch(err){ console.error(err); }
  }

  async function saveToCloud(){
    const btn = document.getElementById('save-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    scrapeDataFromUI();
    const toSave = JSON.parse(JSON.stringify(data));
    toSave.zones = zonesToFirestore(toSave.zones);

    try{
      await db.collection('settings').doc('siteData').set(toSave);
      if (btn) {
        btn.innerHTML = '<i class="fas fa-check"></i> SAVED';
        setTimeout(() => btn.innerHTML = '<i class="fas fa-save mr-1"></i> SAVE', 2000);
      }
    }catch(err){
      alert('Save Failed: ' + err.message);
      if (btn) btn.innerHTML = 'ERROR';
    }
  }
  Admin.cloud = { loadFromCloud, saveToCloud };
  window.saveToCloud = saveToCloud;

  // -------- Common UI ----------
  function scrapeDataFromUI(){
    data.config.name     = document.getElementById('conf-name').value;
    data.config.phone    = document.getElementById('conf-phone').value;
    data.config.upiId    = document.getElementById('conf-upi').value;
    data.config.areaName = document.getElementById('conf-area').value;
    data.config.address  = document.getElementById('foot-address').value;
    
    const titleSuffixEl = document.getElementById('conf-title-suffix');
    data.config.titleSuffix = titleSuffixEl ? titleSuffixEl.value.trim() : '';

    const wa = Utils.cleanDigits(document.getElementById('foot-wa')?.value || '');
    data.config.whatsapp = wa;

    data.footer = {
      about:     document.getElementById('foot-about').value,
      email:     document.getElementById('foot-email').value,
      facebook:  document.getElementById('foot-fb').value,
      instagram: document.getElementById('foot-insta').value,
      hours:     (document.getElementById('foot-hours')?.value || '').trim()
    };

    const mode = document.querySelector('input[name="brand-mode"]:checked')?.value || 'text';
    data.config.brandMode = mode;
    const brandTextEl = document.getElementById('brand-text');
    data.config.brandText = brandTextEl?.value?.trim() || (data.config.name || 'ISP');
  }
  Admin.ui = { scrapeDataFromUI };

  function populateUI(){
    document.getElementById('conf-name').value  = data.config.name || '';
    document.getElementById('conf-phone').value = data.config.phone || '';
    document.getElementById('conf-upi').value   = data.config.upiId || '';
    document.getElementById('conf-area').value  = data.config.areaName || '';
    
    const ts = document.getElementById('conf-title-suffix');
    if (ts) ts.value = data.config.titleSuffix || '';

    document.getElementById('foot-about').value   = data.footer.about || '';
    document.getElementById('foot-email').value   = data.footer.email || '';
    document.getElementById('foot-address').value = data.config.address || '';
    document.getElementById('foot-fb').value      = data.footer.facebook || '';
    document.getElementById('foot-insta').value   = data.footer.instagram || '';
    
    const hoursEl = document.getElementById('foot-hours');
    if (hoursEl) hoursEl.value = data.footer.hours || '10 AM – 7 PM';

    const waInput = document.getElementById('foot-wa');
    if (waInput){
      waInput.value = data.config.whatsapp || '';
      waInput.addEventListener('input', () => {
        const pos = waInput.selectionStart;
        waInput.value = Utils.cleanDigits(waInput.value);
        waInput.setSelectionRange(pos, pos);
      });
    }

    if (Admin.branding && Admin.branding.init) Admin.branding.init();
    if (Admin.status && Admin.status.render) Admin.status.render();
    if (Admin.plans  && Admin.plans.render)  Admin.plans.render();
  }
  Admin.ui.populateUI = populateUI;

  // -------- Mobile tabs centering helper ----------
  function centerMobileTab(tab){
    const strip = document.getElementById('mobile-tabs-strip');
    const btn = document.getElementById(`tab-${tab}-mobile`);
    if (!strip || !btn) return;

    // Compute scrollLeft that centers the button
    const desired =
      btn.offsetLeft + (btn.offsetWidth / 2) - (strip.clientWidth / 2);

    // Clamp within [0, maxScrollLeft]
    const maxScroll = strip.scrollWidth - strip.clientWidth;
    const target = Math.max(0, Math.min(maxScroll, desired));

    // Smooth scroll to center the item
    strip.scrollTo({ left: target, behavior: 'smooth' });
  }
  window.centerMobileTab = centerMobileTab;

  // -------- Tabs ----------
  function setAriaSelectedForTabs(tab){
    document.querySelectorAll('.tab-btn[data-tab]').forEach(el => {
      el.setAttribute('aria-selected', String(el.dataset.tab === tab));
    });
  }

  function switchTab(tab){
    // Hide all views, show selected
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const view = document.getElementById('view-'+tab);
    if (view) view.classList.remove('hidden');

    // Clear active on all tab buttons (mobile + desktop)
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    // Add active to all buttons that represent this tab
    document.querySelectorAll(`.tab-btn[data-tab="${tab}"]`).forEach(el => el.classList.add('active'));

    // Update aria-selected for accessibility
    setAriaSelectedForTabs(tab);

    // Center the active tab on the mobile strip if needed
    centerMobileTab(tab);

    // Lazy-init map when switching to it
    if (tab === 'map' && Admin.map && Admin.map.init && document.getElementById('admin-map')){
      setTimeout(() => Admin.map.init(), 150);
    }
    if (tab === 'branding' && Admin.branding && Admin.branding.init) {
      Admin.branding.init();
    }
  }
  window.switchTab = switchTab;

  function getActiveTab(){
    const el = document.querySelector('.tab-btn.active[data-tab]');
    return el ? el.dataset.tab : 'status';
  }
  window.getActiveTab = getActiveTab;

  // -------- Auth ----------
  auth.onAuthStateChanged(user => {
    setAuthLoading(false);

    if (user){
      document.getElementById('auth-modal').classList.add('hidden');
      document.getElementById('app-ui').classList.remove('hidden');
      loadFromCloud();

      // After UI is visible, ensure the currently active mobile tab is centered
      setTimeout(() => {
        centerMobileTab(getActiveTab());
      }, 0);

    } else {
      document.getElementById('auth-modal').classList.remove('hidden');
      document.getElementById('app-ui').classList.add('hidden');
    }
  });

  window.adminLogin = async function(){
    const e = document.getElementById('admin-email').value;
    const p = document.getElementById('admin-pass').value;

    const errEl = document.getElementById('login-error');
    if (errEl) { errEl.innerText = ''; errEl.style.display = 'none'; }

    setAuthLoading(true);
    try{
      await auth.signInWithEmailAndPassword(e, p);
    }catch(err){
      showLoginError(err?.message || 'Unable to sign in.');
      setAuthLoading(false);
    }
  };

  // Optional: Enter key submits login
  (function bindEnterForLogin(){
    const emailEl = document.getElementById('admin-email');
    const passEl  = document.getElementById('admin-pass');
    const handler = (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        window.adminLogin();
      }
    };
    if (emailEl) emailEl.addEventListener('keydown', handler);
    if (passEl)  passEl.addEventListener('keydown', handler);
  })();

  // ---- Password show/hide (eye icon) ----
(function wirePasswordToggle(){
  const pass = document.getElementById('admin-pass');
  const btn  = document.getElementById('toggle-pass');
  const icon = document.getElementById('toggle-pass-icon');
  if (!pass || !btn || !icon) return;

  // Switch type while preserving caret position
  function setType(type){
    if (!pass) return;
    if (pass.type === type) return;

    const selStart = pass.selectionStart;
    const selEnd = pass.selectionEnd;
    pass.setAttribute('type', type);
    // restore caret/selection if possible
    try {
      if (selStart != null && selEnd != null) {
        pass.setSelectionRange(selStart, selEnd);
      }
    } catch (e) {}
  }

  function updateVisual(isVisible){
    icon.className = isVisible ? 'fas fa-eye-slash' : 'fas fa-eye';
    btn.setAttribute('aria-pressed', String(!!isVisible));
    btn.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
  }

  // Click toggles persistent visibility
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const show = pass.type === 'password';
    setType(show ? 'text' : 'password');
    updateVisual(show);
    pass.focus({ preventScroll:true });
  });

  // Press-and-hold to peek (mouse/touch)
  let holding = false;
  const startPeek = (ev) => {
    ev.preventDefault();
    holding = true;
    setType('text');
    updateVisual(true);
  };
  const endPeek = () => {
    if (!holding) return;
    holding = false;
    setType('password');
    updateVisual(false);
  };

  btn.addEventListener('mousedown', startPeek);
  btn.addEventListener('touchstart', startPeek, { passive:false });
  window.addEventListener('mouseup', endPeek);
  window.addEventListener('mouseleave', endPeek);
  window.addEventListener('touchend', endPeek);

  // Escape hides if visible
  pass.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && pass.type === 'text') {
      setType('password');
      updateVisual(false);
      ev.stopPropagation();
    }
  });
})();
})();
