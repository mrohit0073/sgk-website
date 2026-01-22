
// =========================================================
//  SGK ENTERPRISES - BUSINESS LOGIC (CLOUD ENABLED)
// =========================================================

let currentSelectedPlan = null;

// -------------------- WhatsApp Helpers --------------------
function getCleanWaNumber(conf) {
  // Prefer config.whatsapp; fallback to config.phone. Keep digits only.
  const raw = (conf && conf.whatsapp && conf.whatsapp.trim())
    ? conf.whatsapp
    : (conf && conf.phone) || "";
  return raw.replace(/[^\d]/g, ""); // remove spaces, +, dashes etc.
}

function openWhatsAppWithMessage(number, message) {
  if (!number) {
    alert("WhatsApp number not configured yet.");
    return;
  }
  const url = `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  window.open(url, "_blank");
}

// Public utility you can call from any button: chatNow('optional message')
window.chatNow = function (preset) {
  const config = (window.ISP_DATA && window.ISP_DATA.config) || {};
  const waNumber = getCleanWaNumber(config);
  const msg = preset || "Hello, I have a question about your internet plans.";
  openWhatsAppWithMessage(waNumber, msg);
};

// Open WhatsApp directly for a plan (now includes Speed)
window.waPlan = function (planName) {
  const durationDropdown = document.getElementById('global-duration');
  const duration = durationDropdown ? durationDropdown.value : "1 Month";
  const data = window.ISP_DATA || {};
  const plans = data.plans || [];
  const config = data.config || {};
  const waNumber = getCleanWaNumber(config);

  const plan = plans.find(p => p.name === planName);
  const price = plan && plan.rates ? (plan.rates[duration] || plan.rates["1 Month"] || 0) : 0;
  const speed = plan && plan.speed ? plan.speed : "—";

  const msg =
    `*🟢 New Plan Enquiry*\n` +
    `*Plan:* ${planName}\n` +
    `*Speed:* ${speed}\n` +
    `*Duration:* ${duration}\n` +
    `*Price:* ₹${price}\n\n` +
    `I want to know more about this plan.`;

  openWhatsAppWithMessage(waNumber, msg);
};
// ----------------------------------------------------------


// Build a tel: href from config.phone (digits only)
function getTelHref(conf) {
  // Prefer phone; you can optionally fallback to whatsapp by replacing conf.phone with (conf.phone || conf.whatsapp)
  const raw = (conf && conf.phone) ? String(conf.phone) : '';
  const digits = raw.replace(/[^\d]/g, ''); // keep only digits
  if (!digits) return '#';
  return `tel:${digits}`;
}

// This function is called by index.html once Firestore data is retrieved
window.startApp = function (cloudData) {

  // --- CRITICAL FIX: CONVERT ZONES FOR FRONTEND ---
  // Firestore stores points as objects {lat:x, lng:y}. Leaflet needs [lat, lng].
  if (cloudData.zones) {
    cloudData.zones = cloudData.zones.map(zone => {
      if (Array.isArray(zone.points)) {
        zone.points = zone.points.map(p => {
          if (p && typeof p === 'object' && !Array.isArray(p)) {
            return [p.lat, p.lng];
          }
          return p;
        });
      }
      return zone;
    });
  }
  // --- END FIX ---

  // Assign Cloud Data to Global Context
  window.ISP_DATA = cloudData;

  // Shortcuts
  const config = window.ISP_DATA.config || {};
  const plans = window.ISP_DATA.plans || [];
  const zones = window.ISP_DATA.zones || [];
  const footer = window.ISP_DATA.footer || {};

  // Helper functions
  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };
  const setHref = (id, link) => { const el = document.getElementById(id); if (el) el.href = link; };

  // --- Phone / Call buttons (MOVED AFTER config) ---
  const telHref = getTelHref(config);

  // 1) Hidden or source anchor (if you keep one)
  const navPhoneSource = document.getElementById('nav-phone');
  if (navPhoneSource) navPhoneSource.href = telHref;

  // 2) Desktop button
  const navPhoneDesktop = document.getElementById('nav-phone-desktop');
  if (navPhoneDesktop) navPhoneDesktop.href = telHref;

  // 3) Mobile menu button
  const navPhoneMobile = document.getElementById('mobile-call-now');
  if (navPhoneMobile) navPhoneMobile.href = telHref;

  // --- 1. SETUP HEADER & HERO ---
  setTxt('nav-brand-name', config.name || "SGK NET");
  if (config.phone) setHref('footer-phone', `tel:${config.phone}`); // footer phone
  if (document.getElementById('upi-display')) setTxt('upi-display', config.upiId || "");
  if (document.getElementById('footer-copy-name')) setTxt('footer-copy-name', config.name || "");

  // WhatsApp wiring (hero CTA + footer icon)
  const waNumber = getCleanWaNumber(config);
  const heroWa = document.getElementById('hero-whatsapp');
  if (heroWa) {
    heroWa.href = waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent('Hi, I need a new connection')}`
      : '#';
    if (!waNumber) heroWa.addEventListener('click', (e) => { e.preventDefault(); alert('WhatsApp number not configured yet.'); });
  }

  const socialWa = document.getElementById('social-wa');
  if (socialWa) {
    if (waNumber) {
      socialWa.href = `https://wa.me/${waNumber}`;
      socialWa.classList.remove('hidden');
      socialWa.classList.add('flex');
    } else {
      // hide if not configured to avoid dead link
      socialWa.classList.add('hidden');
      socialWa.classList.remove('flex');
      socialWa.removeAttribute('href');
    }
  }

  // QR Code
  const qrImg = document.getElementById('qr-code-img');
  if (qrImg && config.upiId) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(config.upiId)}`;
  }

  // --- 2. CITY BADGES & HEADING ---
  const locContainer = document.getElementById('location-badge-container');
  const cityHeader = document.getElementById('city-availability-header');

  if (locContainer && config.areaName) {
    const cities = config.areaName.split(',').map(c => c.trim()).filter(c => c);

    if (cityHeader && cities.length > 0) {
      cityHeader.innerText = "AVAILABLE IN ";
    }

    locContainer.innerHTML = cities.map(city => `
      <div class="inline-flex items-center gap-2 glass-panel px-3 py-1.5 rounded-md border border-white/10 transition hover:border-cyan-400 cursor-default bg-black/40">
        <i class="fas fa-map-marker-alt text-cyan-400 text-[10px]"></i>
        <span class="text-[10px] font-bold text-white uppercase tracking-widest">${city}</span>
      </div>
    `).join('');
  }

  // --- 3. FOOTER & SOCIALS ---
  setTxt('footer-about', footer.about || "Experience high-speed internet.");
  setTxt('footer-address', config.address || "Contact Support");
  setTxt('footer-email', footer.email || "support@sgk.com");
  setTxt('footer-phone', config.phone || "");
  if (footer.email) setHref('footer-email', `mailto:${footer.email}`);

  const setupSocial = (id, url) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (url && url.trim() !== "") {
      el.href = url;
      el.classList.remove('hidden');
      el.classList.add('flex');
    } else {
      el.classList.add('hidden');
      el.classList.remove('flex');
      el.removeAttribute('href');
    }
  };

  setupSocial('social-fb', footer.facebook);
  setupSocial('social-insta', footer.instagram);
  setupSocial('social-tw', footer.twitter);
  // social-wa handled above (uses waNumber)

  // --- 4. INITIALIZE FEATURES ---
  populateZoneDropdown(config, zones);
  renderPlans(plans, zones, "All");

  if (document.getElementById('map')) initMap(zones);
  if (typeof initTilt === 'function') initTilt();
  checkGlobalStatus(zones);

  // Hide Loader
  const loader = document.getElementById('site-loader');
  if (loader) loader.style.display = 'none';
};

// --- ZONE DROPDOWN ---
function populateZoneDropdown(config, zones) {
  const select = document.getElementById('zone-selector');
  if (!select) return;

  select.innerHTML = '<option value="All">All Locations</option>';

  if (config.areaName) {
    const cities = config.areaName.split(',').map(s => s.trim()).filter(s => s);
    if (cities.length > 0) {
      cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.innerText = city; // no emoji so it remains consistent
        select.appendChild(opt);
      });
    }
  }

  // Set Default to "Dombivli" if available
  const defaultCity = "Dombivli";
  const hasOption = Array.from(select.options).some(opt => opt.value === defaultCity);

  if (hasOption) {
    select.value = defaultCity;
    // Render plans for default city immediately
    renderPlans(window.ISP_DATA.plans, zones, defaultCity);
    setTimeout(() => {
      if (typeof map !== 'undefined') {
        const firstZone = zones.find(z => z.city === defaultCity);
        if (firstZone && firstZone.points && firstZone.points.length > 0) {
          map.flyTo(firstZone.points[0], 15);
        }
      }
    }, 1000);
  }
}

// --- SMART FILTER LOGIC ---
window.filterPlansByZone = function () {
  const selectedValue = document.getElementById('zone-selector').value;
  const zones = window.ISP_DATA.zones || [];
  const plans = window.ISP_DATA.plans || [];

  renderPlans(plans, zones, selectedValue);

  if (typeof map !== 'undefined') {
    if (selectedValue !== 'All') {
      const firstZoneInCity = zones.find(z => z.city === selectedValue);
      if (firstZoneInCity && firstZoneInCity.points && firstZoneInCity.points.length > 0) {
        map.flyTo(firstZoneInCity.points[0], 15);
      }
    }
  }
};

// --- PLANS RENDERER ---
function renderPlans(plans, zones, filterSelection) {
  const container = document.getElementById('plans-container');
  if (!container) return;

  const filteredPlans = plans.filter(plan => {
    const linked = plan.linkedZones || ["All"];
    if (linked.includes("All")) return true;
    if (filterSelection === "All") return true;
    if (linked.includes(filterSelection)) return true;

    const zonesInThisCity = zones.filter(z => z.city === filterSelection).map(z => z.name);
    const isLinkedToZoneInCity = linked.some(link => zonesInThisCity.includes(link));
    return isLinkedToZoneInCity;
  });

  container.innerHTML = "";

  if (filteredPlans.length === 0) {
    container.innerHTML = `<div class="col-span-1 md:col-span-4 text-center text-gray-500 py-10 glass-panel rounded-xl"><p class="text-lg">No specific plans found for this selection.</p><p class="text-sm">Try selecting "All Locations".</p></div>`;
    return;
  }

  filteredPlans.forEach((plan) => {
    const isPop = plan.highlight;
    const wrapperClass = isPop ? "tilt-card relative group w-[85%] mx-auto md:w-full" : "tilt-card relative group w-[85%] mx-auto md:w-full mt-4 md:mt-4";
    const borderClass = isPop ? "border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] bg-[#1e1b4b]/80" : "border border-white/10 hover:border-cyan-500/30 bg-white/5";
    const badge = isPop ? `<div class="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-[10px] font-bold tracking-widest shadow-lg z-50 whitespace-nowrap">BEST SELLER</div>` : ``;

    const currentDuration = document.getElementById('global-duration') ? document.getElementById('global-duration').value : "1 Month";
    const defaultRate = (plan.rates && (plan.rates[currentDuration] || plan.rates["1 Month"])) || 0;

    const fees = plan.installation || { "1 Month": 1000, "LongTerm": 500 };
    const currentInstallFee = (currentDuration === "1 Month") ? fees["1 Month"] : fees["LongTerm"];
    let installHtml = currentInstallFee === 0 ? "FREE INSTALLATION" : `+ ₹${currentInstallFee} Installation`;
    let installClass = currentInstallFee === 0 ? "text-green-400 bg-green-500/20 border-green-500/30" : "text-red-400 bg-black/20 border-transparent";

    const featuresHtml = (plan.features || []).map(f => `<li class="flex items-center gap-3 text-gray-300 text-sm"><span class="bg-cyan-500/20 text-cyan-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px]"><i class="fas fa-check"></i></span> ${f}</li>`).join('');

    const html = `
      <div class="${wrapperClass}">
        ${badge}
        <div class="${borderClass} backdrop-blur-md rounded-2xl p-6 h-full flex flex-col items-center text-center transition-all duration-300 tilt-content">
          <div class="flex justify-center items-start mb-2 w-full">
            <h3 class="text-3xl md:text-xl font-bold text-white tracking-wide plan-name-header">${plan.name}</h3>
            ${isPop ? '<i class="fas fa-crown text-yellow-400 animate-pulse ml-2 mt-1"></i>' : ''}
          </div>
          <div class="text-cyan-400 font-bold text-xl md:text-lg mb-6 flex items-center gap-2">
            <i class="fas fa-tachometer-alt"></i> ${plan.speed}
          </div>
          <div class="mb-2">
            <span class="text-5xl md:text-4xl font-black text-white">₹<span class="price-display transition-opacity duration-200">${defaultRate}</span></span>
            <span class="period-display text-gray-500 text-sm font-medium transition-opacity duration-200">/mo</span>
          </div>
          <div class="install-display text-xs font-bold mb-8 inline-block py-1 px-2 rounded border ${installClass}">
            ${installHtml}
          </div>
          <ul class="space-y-3 mb-8 flex-1 w-full text-left inline-block max-w-[240px]">
            ${featuresHtml}
          </ul>
          <!-- SWITCH HERE if you want direct WhatsApp:
               onclick="waPlan('${plan.name}')"
               Otherwise keep modal flow: -->
          <button onclick="openLeadForm('${plan.name}')" class="plan-btn w-full block text-center py-3 rounded-xl font-bold text-lg md:text-sm transition-all duration-300 ${isPop ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-cyan-500 hover:text-black'}">
            CHOOSE PLAN
          </button>
        </div>
      </div>`;
    container.innerHTML += html;
  });

  setTimeout(() => { if (typeof initTilt === 'function') initTilt(); updateAllPrices(); }, 100);
}

// --- PRICE UPDATER ---
window.updateAllPrices = function () {
  const dropdown = document.getElementById('global-duration');
  if (!dropdown) return;
  const duration = dropdown.value;
  let periodText = "/mo";
  if (duration === "3 Months") periodText = "/3mo";
  else if (duration === "6 Months") periodText = "/6mo";
  else if (duration === "1 Year") periodText = "/yr";

  const cards = document.querySelectorAll('#plans-container > div');
  const plans = window.ISP_DATA.plans || [];

  cards.forEach(card => {
    const nameElement = card.querySelector('.plan-name-header');
    if (!nameElement) return;
    const planName = nameElement.innerText;
    const plan = plans.find(p => p.name === planName);
    if (!plan) return;

    const priceSpan = card.querySelector('.price-display');
    const periodSpan = card.querySelector('.period-display');
    const installDiv = card.querySelector('.install-display');

    if (priceSpan) {
      priceSpan.style.opacity = 0;
      setTimeout(() => { priceSpan.innerText = plan.rates[duration]; priceSpan.style.opacity = 1; }, 200);
    }
    if (periodSpan) periodSpan.innerText = periodText;

    if (installDiv) {
      const fees = plan.installation || { "1 Month": 1000, "LongTerm": 500 };
      let feeAmount = (duration === "1 Month") ? fees["1 Month"] : fees["LongTerm"];

      if (feeAmount === 0) {
        installDiv.innerHTML = `FREE INSTALLATION`;
        installDiv.className = "install-display text-xs font-bold text-green-400 mb-8 bg-green-500/20 border border-green-500/30 inline-block py-1 px-2 rounded transition-all duration-300";
      } else {
        installDiv.innerHTML = `+ ₹${feeAmount} Installation`;
        installDiv.className = "install-display text-xs font-bold text-red-400 mb-8 bg-black/20 border border-transparent inline-block py-1 px-2 rounded transition-all duration-300";
      }
    }
  });
};


// --- POPUP FORM (form -> WhatsApp workflow, includes Speed & Area) ---
window.openLeadForm = function (planName) {
  const durationEl = document.getElementById('global-duration');
  const zoneSelect = document.getElementById('zone-selector');

  const duration = durationEl ? durationEl.value : "1 Month";
  const selectedArea = zoneSelect ? zoneSelect.value : "All";

  const plans = (window.ISP_DATA && window.ISP_DATA.plans) || [];
  const plan = plans.find(p => p.name === planName);
  if (!plan) return;

  const price = (plan.rates && (plan.rates[duration] ?? plan.rates["1 Month"])) || 0;
  const speed = plan.speed || "—";

  // Keep all details for submit
  currentSelectedPlan = {
    name: plan.name,
    duration,
    price,
    speed,
    area: selectedArea
  };

  // Update modal UI
  const elName = document.getElementById('modal-plan-name');
  const elDur  = document.getElementById('modal-plan-duration');
  const elPrice= document.getElementById('modal-plan-price');
  const elSpeed= document.getElementById('modal-plan-speed'); // optional line in your HTML

  if (elName)  elName.innerText = plan.name;
  if (elDur)   elDur.innerText  = duration;
  if (elPrice) elPrice.innerText= "₹" + price;
  // If you added a <div id="modal-plan-speed"></div> in the modal:
  if (elSpeed) elSpeed.innerText = `Speed: ${speed}`;

  document.getElementById('lead-modal').classList.remove('hidden');
};

window.closeLeadForm = function () {
  document.getElementById('lead-modal').classList.add('hidden');
};

window.submitLeadForm = function (e) {
  e.preventDefault();

  const name    = (document.getElementById('lead-name')    || {}).value || '';
  const phone   = (document.getElementById('lead-phone')   || {}).value || '';
  const address = (document.getElementById('lead-address') || {}).value || '';
  const agree   = (document.getElementById('lead-agree')   || {}).checked;

  const config   = (window.ISP_DATA && window.ISP_DATA.config) || {};
  const waNumber = getCleanWaNumber(config);

  if (!agree) return alert("Please agree to the terms.");
  if (!currentSelectedPlan) return alert("Please choose a plan again.");
  if (!waNumber) return alert("WhatsApp number is not configured in Admin. Please add it and save.");

  // Build WhatsApp message with Speed + Area
  const areaLine = currentSelectedPlan.area && currentSelectedPlan.area !== 'All'
    ? `*Area:* ${currentSelectedPlan.area}\n`
    : '';

  const msg =
    `*🆕 NEW CONNECTION REQUEST*\n` +
    `--------------------------\n` +
    `*Plan:* ${currentSelectedPlan.name}\n` +
    `*Speed:* ${currentSelectedPlan.speed}\n` +
    `*Duration:* ${currentSelectedPlan.duration}\n` +
    `*Price:* ₹${currentSelectedPlan.price}\n` +
    areaLine +
    `--------------------------\n` +
    `*👤 Name:* ${name}\n` +
    `*📱 Phone:* ${phone}\n` +
    `*🏠 Address:* ${address}\n` +
    `--------------------------\n` +
    `_Sent via Website_`;

  openWhatsAppWithMessage(waNumber, msg);
  closeLeadForm();
};
