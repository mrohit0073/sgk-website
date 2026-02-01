(function(){
  function initTilt(){
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const rotateX = ((e.clientY - rect.top - rect.height/2) / (rect.height/2)) * -5;
        const rotateY = ((e.clientX - rect.left - rect.width/2) / (rect.width/2)) * 5;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
      });
    });
  }

  function populateZoneDropdown(config, zones){
    const select = document.getElementById('zone-selector');
    if (!select) return;
    select.innerHTML = '<option value="All">All Locations</option>';
    if (config.areaName){
      const cities = config.areaName.split(',').map(s => s.trim()).filter(Boolean);
      cities.forEach(city => { const opt = document.createElement('option'); opt.value = city; opt.innerText = city; select.appendChild(opt); });
      const def = (window.ISP_TEMPLATE && window.ISP_TEMPLATE.defaultSelectedCity) || '';
      if (def && cities.includes(def)){
        select.value = def;
        renderPlans(window.ISP_DATA.plans, zones, def);
        setTimeout(()=>{
          if (typeof map !== 'undefined'){
            const firstZone = zones.find(z => z.city === def);
            if (firstZone && firstZone.points && firstZone.points.length>0){ map.flyTo(firstZone.points[0], 15); }
          }
        }, 1000);
      }
    }
  }

  function renderPlans(plans, zones, filterSelection){
    const container = document.getElementById('plans-container');
    if (!container) return;
    const filteredPlans = plans.filter(plan => {
      const linked = plan.linkedZones || ['All'];
      if (linked.includes('All')) return true;
      if (filterSelection === 'All') return true;
      if (linked.includes(filterSelection)) return true;
      const zonesInCity = zones.filter(z => z.city === filterSelection).map(z => z.name);
      return linked.some(link => zonesInCity.includes(link));
    });

    container.innerHTML = '';
    if (filteredPlans.length === 0){
      container.innerHTML = `<div class="col-span-1 md:col-span-4 text-center text-gray-500 py-10 glass-panel rounded-xl"><p class="text-lg">No specific plans found for this selection.</p><p class="text-sm">Try selecting \"All Locations\".</p></div>`;
      return;
    }

    const durationEl = document.getElementById('global-duration');
    const currentDuration = durationEl ? durationEl.value : '1 Month';

    filteredPlans.forEach(plan => {
      const isPop = !!plan.highlight;
      const wrapperClass = isPop ? 'tilt-card relative group w-[85%] mx-auto md:w-full' : 'tilt-card relative group w-[85%] mx-auto md:w-full mt-4 md:mt-4';
      const borderClass = isPop ? 'border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] bg-[#1e1b4b]/80' : 'border border-white/10 hover:border-cyan-500/30 bg-white/5';
      const badge = isPop ? '<div class="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-[10px] font-bold tracking-widest shadow-lg z-50 whitespace-nowrap">BEST SELLER</div>' : '';
      const defaultRate = (plan.rates && (plan.rates[currentDuration] || plan.rates['1 Month'])) || 0;
      const fees = plan.installation || { '1 Month': 1000, 'LongTerm': 500 };
      const currentInstallFee = (currentDuration === '1 Month') ? fees['1 Month'] : fees['LongTerm'];
      const installHtml = currentInstallFee === 0 ? 'FREE INSTALLATION' : `+ ₹${currentInstallFee} Installation`;
      const installClass = currentInstallFee === 0 ? 'text-green-400 bg-green-500/20 border-green-500/30' : 'text-red-400 bg-black/20 border-transparent';
      const featuresHtml = (plan.features || []).map(f => `<li class="flex items-center gap-3 text-gray-300 text-sm"><span class="bg-cyan-500/20 text-cyan-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px]"><i class="fas fa-check"></i></span> ${f}</li>`).join('');

      container.innerHTML += `
        <div class="${wrapperClass}">
          ${badge}
          <div class="${borderClass} backdrop-blur-md rounded-2xl p-6 h-full flex flex-col items-center text-center transition-all duration-300 tilt-content">
            <div class="flex justify-center items-start mb-2 w-full">
              <h3 class="text-3xl md:text-xl font-bold text-white tracking-wide plan-name-header">${plan.name}</h3>
              ${isPop ? '<i class="fas fa-crown text-yellow-400 animate-pulse ml-2 mt-1"></i>' : ''}
            </div>
            <div class="text-cyan-400 font-bold text-xl md:text-lg mb-6 flex items-center gap-2"><i class="fas fa-tachometer-alt"></i> ${plan.speed}</div>
            <div class="mb-2"><span class="text-5xl md:text-4xl font-black text-white">₹<span class="price-display transition-opacity duration-200">${defaultRate}</span></span><span class="period-display text-gray-500 text-sm font-medium transition-opacity duration-200">/mo</span></div>
            <div class="install-display text-xs font-bold mb-8 inline-block py-1 px-2 rounded border ${installClass}">${installHtml}</div>
            <ul class="space-y-3 mb-8 flex-1 w-full text-left inline-block max-w-[240px]">${featuresHtml}</ul>
            <button onclick="openLeadForm('${plan.name}')" class="plan-btn w-full block text-center py-3 rounded-xl font-bold text-lg md:text-sm transition-all duration-300 ${isPop ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-cyan-500 hover:text-black'}">CHOOSE PLAN</button>
          </div>
        </div>`;
    });

    setTimeout(()=>{ initTilt(); updateAllPrices(); }, 100);
  }

  function filterPlansByZone(){
    const selectedValue = document.getElementById('zone-selector').value;
    const zones = (window.ISP_DATA && window.ISP_DATA.zones) || [];
    const plans = (window.ISP_DATA && window.ISP_DATA.plans) || [];
    renderPlans(plans, zones, selectedValue);
    if (typeof map !== 'undefined' && selectedValue !== 'All'){
      const firstZoneInCity = zones.find(z => z.city === selectedValue);
      if (firstZoneInCity && firstZoneInCity.points && firstZoneInCity.points.length>0){ map.flyTo(firstZoneInCity.points[0], 15); }
    }
  }

  function updateAllPrices(){
    const dropdown = document.getElementById('global-duration');
    if (!dropdown) return;
    const duration = dropdown.value;
    let periodText = '/mo';
    if (duration === '3 Months') periodText = '/3mo';
    else if (duration === '6 Months') periodText = '/6mo';
    else if (duration === '1 Year') periodText = '/yr';

    const cards = document.querySelectorAll('#plans-container > div');
    const plans = (window.ISP_DATA && window.ISP_DATA.plans) || [];
    cards.forEach(card => {
      const nameElement = card.querySelector('.plan-name-header'); if (!nameElement) return;
      const planName = nameElement.innerText;
      const plan = plans.find(p => p.name === planName); if (!plan) return;
      const priceSpan = card.querySelector('.price-display');
      const periodSpan = card.querySelector('.period-display');
      const installDiv = card.querySelector('.install-display');
      if (priceSpan){ priceSpan.style.opacity = 0; setTimeout(()=>{ priceSpan.innerText = plan.rates[duration] || 0; priceSpan.style.opacity = 1; }, 200); }
      if (periodSpan) periodSpan.innerText = periodText;
      if (installDiv){ const fees = plan.installation || { '1 Month': 1000, 'LongTerm': 500 }; const feeAmount = (duration === '1 Month') ? fees['1 Month'] : fees['LongTerm']; if (feeAmount === 0){ installDiv.innerHTML = 'FREE INSTALLATION'; installDiv.className = 'install-display text-xs font-bold text-green-400 mb-8 bg-green-500/20 border border-green-500/30 inline-block py-1 px-2 rounded transition-all duration-300'; } else { installDiv.innerHTML = `+ ₹${feeAmount} Installation`; installDiv.className = 'install-display text-xs font-bold text-red-400 mb-8 bg-black/20 border border-transparent inline-block py-1 px-2 rounded transition-all duration-300'; } }
    });
  }

  window.populateZoneDropdown = populateZoneDropdown;
  window.renderPlans = renderPlans;
  window.filterPlansByZone = filterPlansByZone;
  window.updateAllPrices = updateAllPrices;
  // Expose initTilt if needed by other modules (though currently local usage is fine)
  window.initTilt = initTilt; 
})();
