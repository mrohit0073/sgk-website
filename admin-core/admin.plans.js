
// admin-core/admin.plans.js
(function(){
  window.Admin = window.Admin || {};
  const { data } = Admin.state;
  const { ensurePlanSchema } = Admin.util;

  function render(){
    const container = document.getElementById('plans-editor-container');
    if (!container) return;
    container.innerHTML = '';

    const cities = data.config.areaName
      ? data.config.areaName.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    (data.plans || []).forEach((p, idx) => {
      p = ensurePlanSchema(p); data.plans[idx] = p;
      container.innerHTML += `
    <div class="glass p-5 rounded-2xl border border-white/10 space-y-4">
      <div class="flex justify-between items-start">
        <input type="text" value="${p.name}"
               oninput="data.plans[${idx}].name=this.value"
               class="font-bold text-lg text-cyan-400 bg-transparent border-b border-white/5 w-4/5 pb-1" />
        <button onclick="deletePlan(${idx})" class="text-red-500 p-2"><i class="fas fa-trash-alt"></i></button>
      </div>
      <div class="flex gap-4">
        <div class="flex-1">
          <label class="text-[9px] text-gray-500 uppercase">Speed</label>
          <input type="text" value="${p.speed}" oninput="data.plans[${idx}].speed=this.value" class="text-sm py-1" />
        </div>
        <div class="w-1/3 flex items-center justify-center pt-4">
          <label class="text-[10px] flex items-center gap-2 cursor-pointer">
            <input type="checkbox" ${p.highlight ? 'checked' : ''} onchange="data.plans[${idx}].highlight=this.checked" />
            <i class="fas fa-star text-yellow-500"></i>
          </label>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-black/20 p-2 rounded-lg text-center"><span class="text-[9px] block text-gray-500">1 MONTH</span>₹ <input type="number" value="${p.rates['1 Month']}" oninput="data.plans[${idx}].rates['1 Month']=Number(this.value)||0" class="w-20 bg-transparent font-bold" /></div>
        <div class="bg-black/20 p-2 rounded-lg text-center"><span class="text-[9px] block text-gray-500">3 MONTHS</span>₹ <input type="number" value="${p.rates['3 Months']}" oninput="data.plans[${idx}].rates['3 Months']=Number(this.value)||0" class="w-20 bg-transparent font-bold" /></div>
        <div class="bg-black/20 p-2 rounded-lg text-center"><span class="text-[9px] block text-gray-500">6 MONTHS</span>₹ <input type="number" value="${p.rates['6 Months']}" oninput="data.plans[${idx}].rates['6 Months']=Number(this.value)||0" class="w-20 bg-transparent font-bold" /></div>
        <div class="bg-black/20 p-2 rounded-lg text-center"><span class="text-[9px] block text-gray-500">1 YEAR</span>₹ <input type="number" value="${p.rates['1 Year']}" oninput="data.plans[${idx}].rates['1 Year']=Number(this.value)||0" class="w-20 bg-transparent font-bold" /></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-black/20 p-2 rounded-lg text-center"><span class="text-[9px] block text-gray-500">INSTALL (1 MONTH)</span>₹ <input type="number" value="${p.installation['1 Month']}" oninput="data.plans[${idx}].installation['1 Month']=Number(this.value)||0" class="w-20 bg-transparent font-bold" /></div>
        <div class="bg-black/20 p-2 rounded-lg text-center"><span class="text-[9px] block text-gray-500">INSTALL (LONG TERM)</span>₹ <input type="number" value="${p.installation['LongTerm']}" oninput="data.plans[${idx}].installation['LongTerm']=Number(this.value)||0" class="w-24 bg-transparent font-bold" /></div>
      </div>
      <div>
        <label class="text-[9px] text-gray-500 uppercase block mb-1">Assigned City / Global</label>
        <div class="flex flex-wrap gap-2 p-2 bg-black/30 rounded-lg min-h-[40px]">
          <label class="text-[10px] flex items-center gap-1 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
            <input type="checkbox" ${p.linkedZones.includes('All') ? 'checked' : ''} onchange="togglePlanZone(${idx}, 'All')" /> Global
          </label>
          ${cities.map(c => `
            <label class="text-[10px] flex items-center gap-1 bg-white/5 px-2 py-1 rounded border border-white/10">
              <input type="checkbox" ${p.linkedZones.includes(c) ? 'checked' : ''} onchange="togglePlanZone(${idx}, '${c.replace("'", "\\'")}')" /> ${c}
            </label>`).join('')}
        </div>
      </div>
    </div>`;
    });
  }

  function togglePlanZone(idx, val){
    let z = Array.isArray(data.plans[idx].linkedZones) ? [...data.plans[idx].linkedZones] : [];
    const has = z.includes(val);
    if (has){ z = z.filter(x => x !== val); }
    else {
      if (val === 'All') z=['All'];
      else { z = z.filter(x => x !== 'All'); z.push(val); }
    }
    data.plans[idx].linkedZones = z;
    render();
  }

  function addNewPlan(){
    data.plans.unshift( ensurePlanSchema({
      id: Date.now(),
      name: 'NEW PLAN',
      speed: '50 Mbps',
      highlight: false,
      linkedZones: ['All'],
      rates: { '1 Month': 500, '3 Months': 1400, '6 Months': 2700, '1 Year': 5400 },
      installation: { '1 Month': 1000, 'LongTerm': 500 },
      features: ['Unlimited Data']
    }));
    render();
  }

  function deletePlan(idx){ if (confirm('Delete this plan?')){ data.plans.splice(idx,1); render(); } }

  Admin.plans = { render, togglePlanZone, addNewPlan, deletePlan };

  // Inline handlers
  window.togglePlanZone = togglePlanZone;
  window.addNewPlan     = addNewPlan;
  window.deletePlan     = deletePlan;

  console.log('[Admin] plans loaded');
})();
