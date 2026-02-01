// admin-core/admin.map.js
(function(){
  window.Admin = window.Admin || {};
  const { data } = Admin.state;

  let map, drawLayer, labelLayer, selectionLayer;
  let tempPoints = [], isDrawing = false, editingIndex = null, editMode = null;
  let mapInteractionEnabled = true, mapKeyHandler = null, activePolygon = null;

  // selection state
  let selectedIndex = null;

  // preserves saved shape while editing (deep copy of the zone’s existing coordinates)
  let originalPoints = null;

  // ✅ Suppress one next map click (to avoid adding a vertex when clicking on-map actions)
  let suppressNextMapClick = false;

  function init(){
    if (!document.getElementById('admin-map')) return;
    if (map) map.remove();

    const start = (data.zones.length > 0 && data.zones[0].points?.[0]) ? data.zones[0].points[0] : [19.2183, 73.0878];

    // Make scrollWheelZoom TRUE to allow wheel zoom
    map = L.map('admin-map', {
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,     // <- enable wheel zoom
      doubleClickZoom: true,     // allow double-click zoom as well
      boxZoom: true              // allow shift + drag box zoom
    }).setView(start, 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    drawLayer      = L.layerGroup().addTo(map);
    labelLayer     = L.layerGroup().addTo(map);
    selectionLayer = L.layerGroup().addTo(map);

    renderMapZones();     // polygons + list
    renderZoneLabels();   // labels sized by zoom

    // Add points while drawing
    map.on('click', e => {
      // ✅ ignore the click that came from the on-map action button
      if (suppressNextMapClick) { suppressNextMapClick = false; return; }
      if (isDrawing){ tempPoints.push([e.latlng.lat, e.latlng.lng]); renderEditor(); }
    });

    // Clear selection when clicking empty map (not drawing mode)
    map.on('click', () => {
      if (!isDrawing) clearSelection();
    });

    // Update label sizes when zoom changes
    map.on('zoomend', () => {
      renderZoneLabels();
    });

    // IMPORTANT: Do NOT toggle off here; keep interactions enabled by default.
    setMapInteraction(true);
  }

  function setMapInteraction(enabled){
    mapInteractionEnabled = !!enabled;
    const btn = document.getElementById('map-lock-btn');

    if (mapInteractionEnabled){
      // Enable all the interactions
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      if (btn){
        btn.innerHTML = '<i class="fas fa-unlock"></i>';
        btn.classList.add('bg-cyan-500');
      }
    } else {
      // Disable all the interactions
      map.dragging.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      if (btn){
        btn.innerHTML = '<i class="fas fa-lock"></i>';
        btn.classList.remove('bg-cyan-500');
      }
    }
  }

  function toggleMapScroll(){
    // Toggle all interactions, not just drag/touch
    setMapInteraction(!mapInteractionEnabled);
  }

  // ---------------------------
  // Helpers for zone name labels
  // ---------------------------
  function getPolygonCenter(points){
    // Compute polygon centroid (lon=x, lat=y). Fallback to average if needed.
    if (!Array.isArray(points) || points.length < 3) {
      return points?.[0] || [0,0];
    }
    let area = 0, cx = 0, cy = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const p1 = points[j], p2 = points[i];
      const x1 = p1[1], y1 = p1[0]; // lon, lat
      const x2 = p2[1], y2 = p2[0];
      const f = (x1 * y2 - x2 * y1);
      area += f;
      cx += (x1 + x2) * f;
      cy += (y1 + y2) * f;
    }
    area *= 0.5;
    if (Math.abs(area) < 1e-10) {
      // Degenerate; return average
      let lat = 0, lng = 0;
      points.forEach(p => { lat += p[0]; lng += p[1]; });
      return [lat / points.length, lng / points.length];
    }
    cx = cx / (6 * area);
    cy = cy / (6 * area);
    return [cy, cx]; // lat, lng
  }

  // Compute dynamic label style based on zoom to reduce overlap
  function computeLabelStyle(){
    const z = map ? map.getZoom() : 14;
    // font size: clamp between 9px and 22px
    const size = Math.max(9, Math.min(22, 6 + (z - 10) * 1.6));
    // fade a bit when zoomed out far
    const opacity = z < 11 ? 0.65 : 1;
    // padding scales with size
    const padX = Math.round(Math.max(4, Math.min(10, size * 0.5)));
    const padY = Math.round(Math.max(2, Math.min(6, size * 0.33)));
    return { size, opacity, padX, padY };
  }

  function buildLabelHTML(name){
    const { size, opacity, padX, padY } = computeLabelStyle();
    // Absolutely center the label at marker latlng
    return `
      <div style="
        position: absolute;
        left: 50%; top: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.45);
        color: #fff;
        padding: ${padY}px ${padX}px;
        border-radius: 6px;
        font-size: ${size}px;
        font-weight: 700;
        letter-spacing: .2px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        white-space: nowrap;
        text-align: center;
        pointer-events: none;
        border: 1px solid rgba(255,255,255,0.15);
        backdrop-filter: blur(2px);
        opacity: ${opacity};
      ">${name}</div>
    `;
  }

  function addZoneNameLabel(name, points){
    if (!name || !Array.isArray(points) || points.length < 3) return;
    const center = getPolygonCenter(points);
    const icon = L.divIcon({
      className: 'zone-name-label',
      html: buildLabelHTML(name),
      iconSize: [0,0] // wrapper size 0; child centers itself with translate(-50%,-50%)
    });
    L.marker(center, {
      icon,
      interactive: false,
      bubblingMouseEvents: false,
      keyboard: false
    }).addTo(labelLayer);
  }

  function renderZoneLabels(){
    if (!labelLayer) return;
    labelLayer.clearLayers();

    // When editing, keep other zones' labels; skip the one being actively edited
    (data.zones || []).forEach((z, i) => {
      if (isDrawing && i === editingIndex) return;
      if (z?.points?.length >= 3) addZoneNameLabel(z.name, z.points);
    });
  }
  // ---------------------------

  // ---------------------------
  // Selection (map <-> list sync)
  // ---------------------------
  function selectZone(idx, opts = { panTo: false }){
    if (!data.zones || !data.zones[idx]) return;
    selectedIndex = idx;

    // clear previous selection overlay
    selectionLayer.clearLayers();

    const z = data.zones[idx];
    if (Array.isArray(z.points) && z.points.length >= 3){
      // highlight overlay
      L.polygon(z.points, {
        color: '#facc15',       // yellow-400
        weight: 5,
        opacity: 1,
        fill: false,
        dashArray: '6,4',
        interactive: false
      }).addTo(selectionLayer);

      // action buttons near polygon center
      const center = getPolygonCenter(z.points);
      const actionsHtml = `
        <div style="
          position:absolute; left:50%; top:50%; transform: translate(-50%, -110%);
          display:flex; gap:6px; align-items:center;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px; padding: 4px 6px;
          box-shadow: 0 6px 16px rgba(0,0,0,0.35);
          backdrop-filter: blur(2px);
          pointer-events: auto;
        ">
          <button title="Edit Details" onclick="mapActionEditDetails(${idx}, event)"
            class="text-cyan-400" style="color:#22d3ee; padding:6px 8px;">
            <i class="fas fa-pen"></i>
          </button>
          <button title="Edit Shape" onclick="mapActionEditShape(${idx}, event)"
            class="text-yellow-500" style="color:#eab308; padding:6px 8px;">
            <i class="fas fa-draw-polygon"></i>
          </button>
          <button title="Delete" onclick="mapActionDelete(${idx}, event)"
            class="text-red-500" style="color:#ef4444; padding:6px 8px;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      const icon = L.divIcon({
        className: 'zone-actions',
        html: actionsHtml,
        iconSize: [0,0]
      });
      const actionsMarker = L.marker(center, {
        icon,
        // we already stop propagation in handlers, but keep this too
        bubblingMouseEvents: false
      });
      actionsMarker.addTo(selectionLayer);
    }

    // highlight the corresponding item in the zone list
    highlightZoneItem(idx, true);

    if (opts.panTo && z.points?.[0]) map.flyTo(z.points[0], Math.max(map.getZoom(), 15));
  }

  function clearSelection(){
    selectedIndex = null;
    selectionLayer.clearLayers();
    clearZoneItemHighlight();
  }

  function highlightZoneItem(idx, scrollIntoView = false){
    const list = document.getElementById('map-zone-list');
    if (!list) return;

    // clear previous highlight
    list.querySelectorAll('.selected-zone-item').forEach(el => {
      el.classList.remove('selected-zone-item','ring-2','ring-yellow-400','border-yellow-400','bg-yellow-500/10');
      // restore default border if your card uses it
      el.classList.add('border-white/10');
    });

    // apply highlight
    const item = document.getElementById(`zone-item-${idx}`);
    if (item){
      item.classList.add('selected-zone-item','ring-2','ring-yellow-400','border-yellow-400','bg-yellow-500/10');
      item.classList.remove('border-white/10');
      if (scrollIntoView){
        try { item.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
      }
    }
  }

  function clearZoneItemHighlight(){
    const list = document.getElementById('map-zone-list');
    if (!list) return;
    list.querySelectorAll('.selected-zone-item').forEach(el => {
      el.classList.remove('selected-zone-item','ring-2','ring-yellow-400','border-yellow-400','bg-yellow-500/10');
      el.classList.add('border-white/10');
    });
  }
  // ---------------------------

  // Stop bubbling helper (not used by on-map actions anymore; we use explicit wrappers there)
  function stopLeafletClick(e){
    try {
      if (e?.originalEvent){
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
      }
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
    } catch (_) {}
  }

  function renderMapZones(){
    if (!drawLayer) return;
    if (isDrawing) return;
    drawLayer.clearLayers();
    if (labelLayer) labelLayer.clearLayers();
    selectionLayer.clearLayers();

    const list = document.getElementById('map-zone-list');
    if (list) list.innerHTML = '';

    (data.zones || []).forEach((z,i) => {
      const c = z.status === 'down' ? '#ef4444' : '#06b6d4';
      if (z.points?.length >= 3) {
        const poly = L.polygon(z.points, { color:c, weight:2, fillOpacity:0.3 });
        poly.addTo(drawLayer);

        // click to select zone and prevent bubbling to map
        poly.on('click', (e) => {
          stopLeafletClick(e);
          if (!isDrawing) selectZone(i, { panTo:false });
        });
      }

      if (list){
        list.insertAdjacentHTML('beforeend', `
        <div id="zone-item-${i}" class="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10"
             onclick="selectZoneFromList(${i})">
          <div class="truncate">
            <div class="text-[10px] font-bold uppercase truncate w-32">${z.name}</div>
            <div class="text-[10px] text-white/60 truncate">${z.city || ''}</div>
          </div>
          <div class="flex gap-2">
            <button title="Edit Details" onclick="openZoneDetails(${i}); event.stopPropagation();" class="text-cyan-400 p-2"><i class="fas fa-pen"></i></button>
            <button title="Edit Shape"    onclick="editZone(${i});         event.stopPropagation();" class="text-yellow-500 p-2"><i class="fas fa-draw-polygon"></i></button>
            <button title="Delete"        onclick="deleteZone(${i});       event.stopPropagation();" class="text-red-500 p-2"><i class="fas fa-trash"></i></button>
          </div>
        </div>`);
      }
    });

    // Draw labels after polygons
    renderZoneLabels();

    // Re-apply selection highlight if any
    if (selectedIndex !== null) {
      selectZone(selectedIndex, { panTo:false });
    }
  }

  function attachMapKeyHandler(){
    detachMapKeyHandler();
    mapKeyHandler = (e) => {
      if (!isDrawing) return;
      if (e.key === 'Escape') { cancelDrawing(); }
      else if (e.key === 'Backspace'){
        e.preventDefault();
        tempPoints.pop();
        if (activePolygon) activePolygon.setLatLngs(tempPoints);
        renderEditor();
      }
    };
    document.addEventListener('keydown', mapKeyHandler);
  }
  function detachMapKeyHandler(){ if (mapKeyHandler) document.removeEventListener('keydown', mapKeyHandler); mapKeyHandler = null; }

  function startNewZone(){
    isDrawing=true; editingIndex=null; editMode='create'; tempPoints=[];
    originalPoints = null; // fresh create
    document.getElementById('add-zone-btn').classList.add('hidden');
    document.getElementById('finish-poly-btn').classList.remove('hidden');
    document.getElementById('cancel-draw-btn').classList.remove('hidden');
    // Ensure interactions ON while drawing (drag markers rely on map drag toggling internally)
    if (!mapInteractionEnabled) setMapInteraction(true);
    attachMapKeyHandler();
    renderEditor();
  }

  function editZone(idx){
    // ✅ prevent the triggering click from being interpreted as a map click
    suppressNextMapClick = true;

    isDrawing=true; editingIndex=idx; editMode='edit-shape';

    // Deep copy of original coordinates so we never mutate saved data while editing
    originalPoints = (data.zones[idx].points || []).map(p => [p[0], p[1]]);
    // Working copy for live edits
    tempPoints = originalPoints.map(p => [p[0], p[1]]);

    if (tempPoints[0]) map.flyTo(tempPoints[0], 16);
    document.getElementById('add-zone-btn').classList.add('hidden');
    document.getElementById('finish-poly-btn').classList.remove('hidden');
    document.getElementById('cancel-draw-btn').classList.remove('hidden');
    if (!mapInteractionEnabled) setMapInteraction(true);
    attachMapKeyHandler();
    renderEditor();
  }

  function openZoneDetails(idx){
    // Also suppress the next map click just in case
    suppressNextMapClick = true;

    isDrawing=false; editingIndex=idx; editMode='edit-details';
    tempPoints=[...(data.zones[idx].points || [])];
    originalPoints = null; // not editing shape
    populateZoneModal(data.zones[idx].name, data.zones[idx].city);
    document.getElementById('zone-modal-title').innerText='Edit Zone Details';
    document.getElementById('zone-modal').classList.remove('hidden');
  }

  function renderEditor(){
    drawLayer.clearLayers();
    if (labelLayer) labelLayer.clearLayers();
    selectionLayer.clearLayers();

    // draw other zones (not the one we're editing)
    (data.zones || []).forEach((z,i) => {
      if (i===editingIndex) return;
      if (Array.isArray(z.points) && z.points.length>=3){
        const poly = L.polygon(z.points, { color:'#ffffff', weight:1, fillOpacity:0.05, dashArray:'5,5' });
        poly.addTo(drawLayer);
        // allow selecting other zones (stop bubbling)
        poly.on('click', (e) => {
          stopLeafletClick(e);
          if (!isDrawing) selectZone(i, { panTo:false });
        });
      }
    });

    // Keep labels for other zones while editing one
    renderZoneLabels();

    // --- Show previous saved shape of the zone being edited (GHOST) ---
    if (editingIndex !== null && Array.isArray(originalPoints) && originalPoints.length >= 3){
      L.polygon(originalPoints, {
        color: '#ffffff',      // ghost outline
        weight: 2,
        opacity: 0.9,
        fill: false,
        dashArray: '6,3',
        interactive: false
      }).addTo(drawLayer);
    }

    // --- Draw the current editable polygon (LIVE) ---
    activePolygon=null;
    if (tempPoints.length>0){
      activePolygon = L.polygon(tempPoints, { color:'#eab308', weight:4, className:'editing-pulse' }).addTo(drawLayer);
      activePolygon.bringToFront();
    }

    // draggable vertex markers for the editable polygon
    tempPoints.forEach((p,i)=>{
      L.marker(p, { draggable:true, icon: L.divIcon({ className:'touch-marker', iconSize:[24,24] }) })
        .addTo(drawLayer)
        .on('dragstart', () => { map.dragging.disable(); })
        .on('drag', e => {
          // update only the working copy
          tempPoints[i] = [e.latlng.lat, e.latlng.lng];
          if (activePolygon) activePolygon.setLatLngs(tempPoints);
        })
        .on('dragend',   () => { map.dragging.enable(); renderEditor(); })
        .on('contextmenu', () => { tempPoints.splice(i,1); if (activePolygon) activePolygon.setLatLngs(tempPoints); renderEditor(); });
    });
  }

  function cancelDrawing(){
    isDrawing=false; editingIndex=null; editMode=null;
    originalPoints = null; // discard ghost reference
    document.getElementById('add-zone-btn').classList.remove('hidden');
    document.getElementById('finish-poly-btn').classList.add('hidden');
    document.getElementById('cancel-draw-btn').classList.add('hidden');
    detachMapKeyHandler();
    renderMapZones();
  }

  function finishPolygon(){
    if (tempPoints.length < 3) return alert('Select at least 3 points on map');
    let current = (editingIndex !== null && data.zones[editingIndex]) ? data.zones[editingIndex] : { name:'', city:'' };
    populateZoneModal(current.name, current.city);
    document.getElementById('zone-modal-title').innerText = (editMode==='create') ? 'New Zone Details' : 'Update Zone Details';
    document.getElementById('zone-modal').classList.remove('hidden');
  }

  function populateZoneModal(defaultName = '', defaultCity = '') {
    const modal  = document.getElementById('zone-modal');
    const select = document.getElementById('new-zone-city');
    const nameEl = document.getElementById('new-zone-name');

    if (!modal || !select || !nameEl) {
      console.error('[Zone Modal] Required elements missing (#zone-modal, #new-zone-city, #new-zone-name). Check admin-panel.html modal markup.');
      return;
    }

    const areaEl = document.getElementById('conf-area');
    const cities = (areaEl?.value || '').split(',').map(c => c.trim()).filter(Boolean);

    // Build city options
    select.innerHTML = cities.map(c => `<option value="${c}">${c}</option>`).join('');
    if (defaultCity && !cities.includes(defaultCity)) {
      select.insertAdjacentHTML('beforeend', `<option value="${defaultCity}">${defaultCity}</option>`);
    }
    if (defaultCity) select.value = defaultCity;

    // Name
    nameEl.value = defaultName || '';
  }

  function confirmZoneDetails(){
    const name = document.getElementById('new-zone-name').value.trim();
    const city = document.getElementById('new-zone-city').value;
    if (!name) return alert('Enter zone name');

    if (editMode==='create'){
      // store deep copy of new polygon
      const newPts = tempPoints.map(p => [p[0], p[1]]);
      data.zones.push({ name, city, status:'online', color:'#06b6d4', points: newPts, issue:'', eta:'' });
      document.getElementById('zone-modal').classList.add('hidden');
      cancelDrawing();
      if (Admin.plans) Admin.plans.render();
      if (Admin.status) Admin.status.render();
    } else if (editMode==='edit-shape'){
      // update properties
      data.zones[editingIndex].name = name;
      data.zones[editingIndex].city = city;
      // replace saved coordinates with deep copy of working edits
      data.zones[editingIndex].points = tempPoints.map(p => [p[0], p[1]]);
      document.getElementById('zone-modal').classList.add('hidden');

      // end drawing; clear ghost; re-render
      cancelDrawing();
      if (Admin.plans) Admin.plans.render();
      if (Admin.status) Admin.status.render();
    } else if (editMode==='edit-details'){
      data.zones[editingIndex].name = name;
      data.zones[editingIndex].city = city;
      document.getElementById('zone-modal').classList.add('hidden');
      renderMapZones();
      if (Admin.status) Admin.status.render();
    } else {
      document.getElementById('zone-modal').classList.add('hidden');
    }
  }

  function closeZoneModal(){
    const modal = document.getElementById('zone-modal');
    if (modal) modal.classList.add('hidden');
  }
  window.closeZoneModal = closeZoneModal;

  function deleteZone(idx){
    if (!data.zones || !data.zones[idx]) return;
    if (!confirm('Delete this zone?')) return;

    data.zones.splice(idx, 1);
    renderMapZones();
    // reflect elsewhere
    if (Admin.status) Admin.status.render();
    if (Admin.plans)  Admin.plans.render();
    clearSelection();
  }
  window.deleteZone = deleteZone;

  // Allow selecting from the list (and pan)
  function selectZoneFromList(idx){
    if (isDrawing) return;
    selectZone(idx, { panTo: true });
  }
  window.selectZoneFromList = selectZoneFromList;

  // ✅ Wrappers for on-map action buttons to stop bubbling and suppress next map click
  function mapActionEditShape(idx, ev){
    try { ev?.stopPropagation(); ev?.preventDefault(); } catch(_) {}
    suppressNextMapClick = true;
    editZone(idx);
  }
  function mapActionEditDetails(idx, ev){
    try { ev?.stopPropagation(); ev?.preventDefault(); } catch(_) {}
    suppressNextMapClick = true;
    openZoneDetails(idx);
  }
  function mapActionDelete(idx, ev){
    try { ev?.stopPropagation(); ev?.preventDefault(); } catch(_) {}
    suppressNextMapClick = true;
    deleteZone(idx);
  }
  window.mapActionEditShape   = mapActionEditShape;
  window.mapActionEditDetails = mapActionEditDetails;
  window.mapActionDelete      = mapActionDelete;

  // Export
  Admin.map = { init, renderMapZones, toggleMapScroll, startNewZone, editZone, openZoneDetails, cancelDrawing, finishPolygon, populateZoneModal, confirmZoneDetails };

  // Inline handlers
  window.toggleMapScroll    = toggleMapScroll;
  window.startNewZone       = startNewZone;
  window.editZone           = editZone;
  window.openZoneDetails    = openZoneDetails;
  window.cancelDrawing      = cancelDrawing;
  window.finishPolygon      = finishPolygon;
  window.renderMapZones     = renderMapZones;
  window.confirmZoneDetails = confirmZoneDetails;

  console.log('[Admin] map loaded');
})();
