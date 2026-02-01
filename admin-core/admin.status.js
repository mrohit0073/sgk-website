
// admin-core/admin.status.js
(function(){
  window.Admin = window.Admin || {};
  const { data } = Admin.state;

  function getZoneEtaParts(zone){
    if (!zone || !zone.eta) return { time:'', day:'Today' };
    const parts = zone.eta.trim().split(' ');
    const time = parts[0] || '';
    const day  = parts[1] || 'Today';
    return { time, day };
  }
  function formatEta(zone){
    const { time, day } = getZoneEtaParts(zone);
    if (!time) return '';
    return `${time} ${day}`;
  }

  function render(){
    const container = document.getElementById('zone-list-status');
    if (!container) return;
    container.innerHTML = '';

    (data.zones || []).forEach((zone, idx) => {
      const isDown = (zone.status === 'down');
      const { time: etaTime, day: etaDay } = getZoneEtaParts(zone);
      const etaLabel = formatEta(zone);

      const borderClass   = isDown ? 'border-red-500/60' : 'border-green-500/40';
      const selectBgClass = isDown ? 'bg-red-900' : 'bg-green-900';

      container.innerHTML += `
        <div class="zone-card ${borderClass}">
          <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-sm text-white/80">
              ${zone.name}
              <span class="text-[10px] text-white/50">(${zone.city || 'N/A'})</span>
            </span>
            <select onchange="updateZoneStatus(${idx}, this.value)" class="text-xs w-28 ${selectBgClass}">
              <option value="online" ${!isDown ? 'selected' : ''}>Online</option>
              <option value="down" ${isDown ? 'selected' : ''}>Outage</option>
            </select>
          </div>

          ${isDown ? `
          <input type="text" placeholder="Reason (e.g. Fiber Cut)"
                 value="${zone.issue || ''}" oninput="data.zones[${idx}].issue=this.value"
                 class="text-xs bg-black/40 mb-2 w-full">
          <div class="flex gap-2 items-center">
            <input type="time" id="time-${idx}" onchange="updateZoneEta(${idx})" class="text-xs" value="${etaTime}">
            <select id="day-${idx}" onchange="updateZoneEta(${idx})" class="text-xs">
              <option value="Today" ${etaDay === 'Today' ? 'selected' : ''}>Today</option>
              <option value="Tomorrow" ${etaDay === 'Tomorrow' ? 'selected' : ''}>Tomorrow</option>
            </select>
          </div>
          <div class="eta-line">${etaLabel ? `ETA: <span class="font-semibold">${etaLabel}</span>` : 'ETA: Not set'}</div>
          ` : ''}
        </div>
      `;
    });
  }

  function updateStatus(idx, status){
    if (!data.zones || !data.zones[idx]) return;
    data.zones[idx].status = status;
    data.zones[idx].color  = (status === 'down') ? '#ef4444' : '#06b6d4';
    render();
    if (typeof window.renderMapZones === 'function') window.renderMapZones();
  }

  function updateEta(idx){
    if (!data.zones || !data.zones[idx]) return;
    const timeEl = document.getElementById(`time-${idx}`);
    const dayEl  = document.getElementById(`day-${idx}`);
    if (!timeEl || !dayEl) return;

    const selectedTime = (timeEl.value || '').trim();
    const selectedDay  = (dayEl.value || 'Today').trim();
    const prev = getZoneEtaParts(data.zones[idx]);
    const timeToSave = selectedTime || prev.time;
    data.zones[idx].eta = timeToSave ? `${timeToSave} ${selectedDay}` : '';
    render();
  }

  Admin.status = { render, updateStatus, updateEta, getZoneEtaParts, formatEta };
  window.updateZoneStatus = updateStatus;
  window.updateZoneEta    = updateEta;

  console.log('[Admin] status loaded');
})();
