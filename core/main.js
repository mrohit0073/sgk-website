(function(){
  document.addEventListener('DOMContentLoaded', init);

  function init(){
    // Init Mobile Menu (from Utils)
    if (Utils.initMobileMenu) Utils.initMobileMenu();

    if (!window.FIREBASE_CONFIG || !window.firebase){
      console.error('Firebase not loaded or FIREBASE_CONFIG missing.');
      hideLoaderWithError('Configuration error.');
      return;
    }
    try { firebase.initializeApp(window.FIREBASE_CONFIG); } catch(e){}
    const db = firebase.firestore();
    db.collection('settings').doc('siteData').get()
      .then(doc => {
        if (!doc.exists){ hideLoaderWithError('No Data Found'); return; }
        let cloudData = doc.data();

        cloudData.config = cloudData.config || {};
        const T = window.ISP_TEMPLATE || {};
        cloudData.config.name     = cloudData.config.name     || T.defaultBrand || 'ISP';
        cloudData.config.areaName = cloudData.config.areaName || T.defaultCities || '';
        cloudData.config.phone    = cloudData.config.phone    || T.defaultPhone || '';
        cloudData.config.upiId    = cloudData.config.upiId    || T.defaultUpi || '';
        cloudData.config.address  = cloudData.config.address  || T.defaultAddress || '';
        cloudData.config.whatsapp = cloudData.config.whatsapp || T.defaultWhatsapp || '';

        // Branding defaults
        if (!cloudData.config.brandMode) cloudData.config.brandMode = 'text';    // 'text'|'logo'|'both'
        if (!cloudData.config.brandText) cloudData.config.brandText = cloudData.config.name || 'ISP';
        if (!('brandLogo' in cloudData.config)) cloudData.config.brandLogo = '';

        cloudData.footer = cloudData.footer || {
          about: '',
          email: T.defaultEmail || '',
          facebook: (T.defaultSocials||{}).facebook||'',
          instagram: (T.defaultSocials||{}).instagram||'',
          twitter: (T.defaultSocials||{}).twitter||''
        };
        // Ensure support hours exist (matches Admin default)
        if (!('hours' in cloudData.footer)) {
          cloudData.footer.hours = '10 AM – 7 PM';
        }

        // Normalize zones objects -> arrays
        if (cloudData.zones){
          cloudData.zones = cloudData.zones.map(zone => {
            if (Array.isArray(zone.points)){
              zone.points = zone.points.map(p => (p && typeof p === 'object' && !Array.isArray(p)) ? [p.lat, p.lng] : p);
            }
            return zone;
          });
        }
        window.startApp(cloudData);
      })
      .catch(err => { console.error(err); hideLoaderWithError('Connection Failed: ' + err.message); });
  }

  function hideLoaderWithError(msg){
    const loader = document.getElementById('site-loader');
    const err = document.getElementById('error-msg');
    if (err){ err.innerText = msg || 'Error'; err.classList.remove('hidden'); }
    if (loader) loader.style.display = 'flex';
  }

  function setSiteFavicon(href){
    let link = document.querySelector('link[rel="icon"]#site-favicon');
    if (!link){
      link = document.createElement('link');
      link.rel = 'icon';
      link.id = 'site-favicon';
      document.head.appendChild(link);
    }
    link.href = href;
  }

  function applyBranding(conf){
    const mode = conf.brandMode || 'text';
    const text = conf.brandText || conf.name || 'ISP';
    const logo = conf.brandLogo || '';

    const navLogo  = document.getElementById('nav-brand-logo');
    const navText  = document.getElementById('nav-brand-name');
    const footLogo = document.getElementById('footer-brand-logo');
    const footText = document.getElementById('footer-brand');

    const hasLogo = !!logo;
    if (navLogo && hasLogo){ navLogo.src = logo; navLogo.alt = text; }
    if (footLogo && hasLogo){ footLogo.src = logo; footLogo.alt = text; }

    const showText = (mode === 'text' || mode === 'both');
    const showLogo = (mode === 'logo' || mode === 'both') && hasLogo;
    if (navText){ navText.textContent = text; navText.classList.toggle('hidden', !showText); }
    if (footText){ footText.textContent = text; footText.classList.toggle('hidden', !showText); }
    if (navLogo){ navLogo.classList.toggle('hidden', !showLogo); }
    if (footLogo){ footLogo.classList.toggle('hidden', !showLogo); }

    // BRANDING: Favicon Selection
    if (conf.brandLogo) {
      setSiteFavicon(conf.brandLogo);
    } else if (conf.favicon) {
      setSiteFavicon(conf.favicon);
    } else {
      // Use Shared Utility for generation
      if (Utils.generateIconDataURL) {
         setSiteFavicon(Utils.generateIconDataURL());
      }
    }
  }

  function setSiteTitle(conf) {
    const brand = (conf && (conf.brandText || conf.name)) || 'ISP';
    const suffix = (conf && conf.titleSuffix) || 'Next-Gen Fiber';
    document.title = `${brand} | ${suffix}`;
    const og = document.querySelector('meta[property="og:title"]');
    if (og) og.setAttribute('content', document.title);
    const tw = document.querySelector('meta[name="twitter:title"]');
    if (tw) tw.setAttribute('content', document.title);
  }

  window.startApp = function(cloudData){
    window.ISP_DATA = cloudData || {};
    const config = window.ISP_DATA.config || {};
    const plans  = window.ISP_DATA.plans  || [];
    const zones  = window.ISP_DATA.zones  || [];
    const footer = window.ISP_DATA.footer || {};

    // Phone buttons
    const telHref = Utils.getTelHref(config);
    const navPhoneSource = document.getElementById('nav-phone'); if (navPhoneSource) navPhoneSource.href = telHref;
    const navPhoneDesktop = document.getElementById('nav-phone-desktop'); if (navPhoneDesktop) navPhoneDesktop.href = telHref;
    const navPhoneMobile = document.getElementById('mobile-call-now'); if (navPhoneMobile) navPhoneMobile.href = telHref;

    // Text & Branding
    Utils.setTxt('nav-brand-name', config.name || 'ISP');
    if (document.getElementById('upi-display')) Utils.setTxt('upi-display', config.upiId || '');
    Utils.setTxt('footer-copy-name', config.name || '');
    
    setSiteTitle(config);
    applyBranding(config);

    // WhatsApp
    const waNumber = Utils.getCleanWaNumber(config);
    const socialWa = document.getElementById('social-wa');
    if (socialWa){
      if (waNumber){ socialWa.href = `https://wa.me/${waNumber}`; socialWa.classList.remove('hidden'); socialWa.classList.add('flex'); }
      else { socialWa.classList.add('hidden'); socialWa.classList.remove('flex'); socialWa.removeAttribute('href'); }
    }

    // QR code
    const qrImg = document.getElementById('qr-code-img');
    if (qrImg && config.upiId){
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(config.upiId)}`;
    }

    // City badges
    const locContainer = document.getElementById('location-badge-container');
    const cityHeader = document.getElementById('city-availability-header');
    if (locContainer && config.areaName){
      const cities = config.areaName.split(',').map(c => c.trim()).filter(Boolean);
      if (cityHeader && cities.length>0) cityHeader.innerText = 'AVAILABLE IN ';
      locContainer.innerHTML = cities.map(city => `
        <div class="inline-flex items-center gap-2 glass-panel px-3 py-1.5 rounded-md border border-white/10 transition hover:border-cyan-400 cursor-default bg-black/40">
          <i class="fas fa-map-marker-alt text-cyan-400 text-[10px]"></i>
          <span class="text-[10px] font-bold text-white uppercase tracking-widest">${city}</span>
        </div>`).join('');
    }

    // Footer & socials
    Utils.setTxt('footer-about', footer.about || 'Experience high-speed internet.');
    Utils.setTxt('footer-address', config.address || 'Contact Support');
    Utils.setTxt('footer-email', footer.email || 'support@example.com');
    Utils.setTxt('footer-phone', config.phone || '');
    if (footer.email) Utils.setHref('footer-email', `mailto:${footer.email}`);

    // Support Hours (shows "Support: 10 AM – 7 PM" if available)
    if (footer.hours && footer.hours.trim() !== '') {
      Utils.setTxt('footer-hours', `Support: ${footer.hours}`);
    } else {
      Utils.setTxt('footer-hours', '');
    }

    const setupSocial = (id, url) => { const el = document.getElementById(id); if (!el) return; if (url && url.trim()!==''){ el.href = url; el.classList.remove('hidden'); el.classList.add('flex'); } else { el.classList.add('hidden'); el.classList.remove('flex'); el.removeAttribute('href'); } };
    setupSocial('social-fb', footer.facebook);
    setupSocial('social-insta', footer.instagram);
    setupSocial('social-tw', footer.twitter);

    // Initialize features
    if (window.populateZoneDropdown) populateZoneDropdown(config, zones);
    if (window.renderPlans) renderPlans(plans, zones, 'All');
    if (document.getElementById('map') && window.MapCore) MapCore.initMap(zones);
    if (window.initTilt) initTilt();
    if (window.MapCore) MapCore.checkGlobalStatus(zones);

    // Hide loader
    const loader = document.getElementById('site-loader'); if (loader) loader.style.display = 'none';
  };
})();
