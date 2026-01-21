
// =========================================================
//  SGK ENTERPRISES - CORE MAP & UI LOGIC
//  (Do not edit unless changing map functionality)
// =========================================================

// --- GLOBAL VARIABLES ---
let map, currentMarker;
let coveragePolygons = []; 
let zoneDataRef = []; // Stores zone data for click handlers

// 1. TILT EFFECT
function initTilt() {
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

// 2. NETWORK STATUS CHECKER (UPDATED: Click to Zoom & Show Popup)
function checkGlobalStatus(zones) {
    const statusBox = document.getElementById('global-status-container');
    if(!statusBox) return;

    let outageCount = 0;
    let firstDownIndex = -1;

    zones.forEach((z, idx) => { 
        if(z.status === 'down') {
            outageCount++; 
            if(firstDownIndex === -1) firstDownIndex = idx; // Capture first outage zone
        }
    });

    // Make container clickable
    statusBox.style.cursor = 'pointer';
    statusBox.onclick = function() {
        // 1. Scroll to Map Section
        const mapSection = document.getElementById('coverage');
        if(mapSection) mapSection.scrollIntoView({ behavior: 'smooth' });

        // 2. If Outage exists, Zoom to it & Open Popup
        if(outageCount > 0 && firstDownIndex !== -1 && map) {
            const zone = zones[firstDownIndex];
            
            // Calculate center of the zone
            const poly = L.polygon(zone.points);
            const center = poly.getBounds().getCenter();

            // Fly to location
            map.flyTo(center, 16, { duration: 1.5 });
            
            // Open the specific outage popup (simulate click)
            // We use setTimeout to let the scroll/zoom start first
            setTimeout(() => {
                showZoneInfo(null, firstDownIndex);
            }, 800);
        }
    };

    if (outageCount > 0) {
        statusBox.innerHTML = `<span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span><span class="text-xs font-bold text-red-400 tracking-widest uppercase">Alert: ${outageCount} Area(s) Down</span>`;
        statusBox.classList.add('border-red-500/30', 'bg-red-500/10');
    } else {
        statusBox.innerHTML = `<span class="relative flex h-3 w-3"><span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span><span class="text-xs font-bold text-green-400 tracking-widest uppercase">All Systems Operational</span>`;
        statusBox.classList.add('border-green-500/30', 'bg-green-500/10');
    }
}

// 3. MAP INITIALIZATION
function initMap(zones) {
    if(typeof L === 'undefined') return; 
    if(map) map.remove(); 

    // Store zones globally so the tooltip click handler can access them
    zoneDataRef = zones;

    const startPoint = zones.length > 0 ? zones[0].points[0] : [19.0760, 72.8777];
    map = L.map('map', { center: startPoint, zoom: 15, zoomControl: false });
    
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

    // DRAW ZONES
    zones.forEach((zone, index) => {
        coveragePolygons.push(zone.points); 
        
        let polyColor = zone.color;
        let className = '';
        // If "down", we use a pulsing/alert icon
        let statusIcon = zone.status === 'down' 
            ? '<i class="fas fa-exclamation-triangle text-red-500 animate-pulse"></i>' 
            : '<i class="fas fa-check-circle text-green-400"></i>';

        if(zone.status === 'down') {
            polyColor = '#ef4444'; 
            className = 'zone-down';
        }

        // Create the Polygon
        const polygon = L.polygon(zone.points, { 
            color: polyColor, 
            fillColor: polyColor, 
            fillOpacity: 0.15, 
            weight: 2, 
            className: className 
        }).addTo(map);

        // --- INTERACTIVE TOOLTIP (THE BADGE) ---
        const tooltipContent = `
            <div class="flex items-center gap-2 bg-black/80 backdrop-blur border border-white/20 px-3 py-1 rounded-full shadow-xl cursor-pointer hover:scale-105 transition-transform" onclick="showZoneInfo(event, ${index})">
                ${statusIcon}
                <span class="text-xs font-bold text-white uppercase tracking-wider">${zone.name}</span>
            </div>
        `;
        
        polygon.bindTooltip(tooltipContent, {
            permanent: true,
            direction: 'center',
            interactive: true, 
            className: 'bg-transparent border-none shadow-none'
        });

        // If user clicks the POLYGON AREA (not the badge), treat it as "I live here"
        polygon.on('click', function(e) {
            handleMapClick(e);
        });
    });

    // Map Click Event (Empty Space)
    map.on('click', handleMapClick);

    const locateBtn = document.getElementById('locateBtn');
    if(locateBtn) locateBtn.addEventListener('click', locateUser);
    
    setupSearch();
}

// --- SHOW ZONE INFO POPUP ---
window.showZoneInfo = function(e, index) {
    // Stop the click from passing through to the map polygon
    // We check if 'e' exists because we might call this function manually (from status box) without an event
    if(e && L.DomEvent) {
        L.DomEvent.stopPropagation(e);
    }

    const zone = zoneDataRef[index];
    if(!zone) return;

    // Calculate center of polygon for popup
    const poly = L.polygon(zone.points);
    const center = poly.getBounds().getCenter();

    let content = '';
    
    if(zone.status === 'down') {
        content = `
            <div class="text-center p-2 min-w-[200px]">
                <div class="text-red-500 text-3xl mb-2"><i class="fas fa-exclamation-triangle"></i></div>
                <h3 class="text-lg font-black text-red-500 uppercase leading-none mb-1">Outage Detected</h3>
                <div class="font-bold text-white mb-2">${zone.name}</div>
                <div class="bg-red-500/10 border border-red-500/20 p-2 rounded text-left text-xs space-y-1">
                    <div class="text-gray-400">Reason: <span class="text-red-500">${zone.issue || 'Maintenance'}</span></div>
                    <div class="text-gray-400">ETA: <span class="text-red-500 font-bold">${zone.eta || 'Calculating...'}</span></div>
                </div>
            </div>
        `;
    } else {
        content = `
            <div class="text-center p-2 min-w-[150px]">
                <div class="text-green-400 text-3xl mb-2"><i class="fas fa-check-circle"></i></div>
                <h3 class="text-lg font-black text-green-400 uppercase leading-none mb-1">System Online</h3>
                <div class="font-bold text-white text-sm">${zone.name}</div>
                <div class="text-xs text-gray-500 mt-1">All services operational</div>
            </div>
        `;
    }

    L.popup({ className: 'glass-popup' })
        .setLatLng(center)
        .setContent(content)
        .openOn(map);
}

// --- SHARED CLICK HANDLER (DROPS PIN) ---
function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    const locInput = document.getElementById('locationInput');
    if(locInput) locInput.value = "Locating...";
    updateStatusBox(false, "Locating...", true); 
    
    // Reverse Geocoding
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
            const name = data.display_name ? data.display_name.split(',').slice(0,3).join(',') : "Pinned Location";
            if(locInput) locInput.value = name;
            handleLocationSelect(lat, lng, name);
        })
        .catch(() => handleLocationSelect(lat, lng, "Selected Location"));
        
    const searchRes = document.getElementById('searchResults');
    if(searchRes) searchRes.classList.remove('active');
}

// 4. GEOLOCATION
function locateUser() {
    const icon = document.querySelector('#locateBtn i');
    if (!navigator.geolocation) return alert("Geolocation not supported");
    
    icon.classList.replace('fa-location-crosshairs', 'fa-spinner'); 
    icon.classList.add('fa-spin');

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            icon.classList.replace('fa-spinner', 'fa-location-crosshairs'); 
            icon.classList.remove('fa-spin');
            
            document.getElementById('locationInput').value = "My Current Location";
            handleLocationSelect(pos.coords.latitude, pos.coords.longitude, "Your Location");
        },
        () => { 
            icon.classList.replace('fa-spinner', 'fa-location-crosshairs'); 
            icon.classList.remove('fa-spin'); 
            alert("Unable to get location."); 
        }
    );
}

// 5. SEARCH LOGIC
function setupSearch() {
    const input = document.getElementById('locationInput');
    const resultsBox = document.getElementById('searchResults');
    const icon = document.getElementById('searchIcon');
    if(!input || !resultsBox) return;

    let debounce;
    input.addEventListener('input', (e) => {
        clearTimeout(debounce);
        if(e.target.value.length < 3) return resultsBox.classList.remove('active');
        
        if(icon) icon.className = "fas fa-circle-notch fa-spin absolute left-4 top-5 text-cyan-400 z-20";

        debounce = setTimeout(async () => {
            try {
                const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(e.target.value)}&limit=5`);
                const data = await res.json();
                displaySuggestions(data.features);
            } catch(e) {} finally {
                if(icon) icon.className = "fas fa-search absolute left-4 top-5 text-gray-500 z-20";
            }
        }, 200);
    });

    document.addEventListener('click', (e) => { 
        if (!input.contains(e.target) && !resultsBox.contains(e.target)) resultsBox.classList.remove('active'); 
    });
}

function displaySuggestions(features) {
    const box = document.getElementById('searchResults');
    const input = document.getElementById('locationInput');
    box.innerHTML = '';
    
    if(!features || !features.length) return box.classList.remove('active');
    
    box.classList.add('active');
    features.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `<i class="fas fa-map-marker-alt"></i> <span>${item.properties.name || item.properties.street || "Unknown"}</span>`;
        div.onclick = () => {
            input.value = div.innerText;
            box.classList.remove('active');
            handleLocationSelect(item.geometry.coordinates[1], item.geometry.coordinates[0], div.innerText);
        };
        box.appendChild(div);
    });
}

// 6. LOCATION HANDLER
function handleLocationSelect(lat, lng, name) {
    if(map) {
        map.flyTo([lat, lng], 17, { duration: 1.5 });
        if(currentMarker) map.removeLayer(currentMarker);
        
        let isCovered = false;
        coveragePolygons.forEach(poly => { 
            if(isPointInPolygon([lat, lng], poly)) isCovered = true; 
        });

        const color = isCovered ? 'marker-cyan' : 'marker-red';
        const icon = L.divIcon({ 
            className: 'custom-pin', 
            html: `<div class="marker-container"><div class="marker-pulse ${color} ${isCovered?'marker-glow-cyan':'marker-glow-red'}"></div><div class="marker-dot ${color}"></div></div>`, 
            iconSize: [20, 20] 
        });
        
        currentMarker = L.marker([lat, lng], {icon}).addTo(map);
        updateStatusBox(isCovered, name);
    }
}

function updateStatusBox(isCovered, name, loading=false) {
    const box = document.getElementById('statusBox');
    box.classList.remove('hidden');
    
    if(loading) return box.innerHTML = `<div class="bg-gray-800/50 border-gray-700/50 p-5 rounded-2xl flex items-center gap-4 animate-pulse"><div class="bg-gray-700 text-white w-12 h-12 rounded-full flex justify-center items-center"><i class="fas fa-satellite-dish fa-spin"></i></div><div><h4 class="font-bold text-white text-lg">Checking...</h4><p class="text-sm text-gray-400">Verifying coverage.</p></div></div>`;
    
    if(isCovered) {
        box.innerHTML = `<div class="bg-green-500/10 border-green-500/30 p-5 rounded-2xl flex items-center gap-4 animate-fade-in backdrop-blur-md"><div class="bg-green-500 text-black w-12 h-12 rounded-full flex justify-center items-center shadow-lg shadow-green-500/20"><i class="fas fa-check text-xl"></i></div><div class="flex-1"><h4 class="font-bold text-white text-lg">Great News!</h4><p class="text-sm text-green-200">Fiber available at <br><span class="font-semibold text-white">${name}</span></p></div></div><a href="#plans" class="mt-3 block w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-center py-3 rounded-xl hover:shadow-lg transition transform hover:-translate-y-1">View Plans & Book</a>`;
    } else {
        box.innerHTML = `<div class="bg-red-500/10 border-red-500/30 p-5 rounded-2xl flex items-center gap-4 animate-fade-in backdrop-blur-md"><div class="bg-red-500 text-white w-12 h-12 rounded-full flex justify-center items-center shadow-lg shadow-red-500/20"><i class="fas fa-times text-xl"></i></div><div class="flex-1"><h4 class="font-bold text-white text-lg">Not Covered Yet</h4><p class="text-sm text-red-200">Not live at <br><span class="font-semibold text-white">${name}</span></p></div></div><button onclick="document.getElementById('locationInput').focus()" class="mt-3 block w-full bg-white/5 border border-white/10 text-gray-300 font-bold text-center py-3 rounded-xl hover:bg-white/10 transition">Search Another Location</button>`;
    }
}

// 7. MATH UTILITY
function isPointInPolygon(point, vs) {
    var x = point[0], y = point[1], inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1], xj = vs[j][0], yj = vs[j][1];
        var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}