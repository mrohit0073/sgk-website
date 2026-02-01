(function(){
  // --- Text & Input Utils ---
  function cleanDigits(s){ return (s || '').replace(/[^\d]/g, ''); }
  
  function escapeHtml(str){
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- WhatsApp & Phone Utils ---
  function getCleanWaNumber(conf){
    const raw = (conf && conf.whatsapp && conf.whatsapp.trim()) ? conf.whatsapp : (conf && conf.phone) || "";
    return cleanDigits(raw);
  }

  function openWhatsAppWithMessage(number, message){
    if (!number) { alert('WhatsApp number not configured yet.'); return; }
    const url = `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    window.open(url, '_blank');
  }

  function getTelHref(conf){
    const raw = (conf && conf.phone) ? String(conf.phone) : '';
    const digits = cleanDigits(raw);
    return digits ? `tel:${digits}` : '#';
  }

  // --- DOM Helpers ---
  function setTxt(id, txt){ const el = document.getElementById(id); if (el) el.innerText = txt; }
  function setHref(id, link){ const el = document.getElementById(id); if (el) el.href = link; }

  // --- Mobile Menu Logic (Moved from index.html) ---
  function initMobileMenu(){
    const toggleBtn = document.getElementById('nav-menu-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggleBtn || !menu) return;
    const isOpen = () => toggleBtn.getAttribute('aria-expanded') === 'true';
    function openMenu(){ menu.classList.remove('hidden'); toggleBtn.setAttribute('aria-expanded','true'); toggleBtn.innerHTML = '<i class="fas fa-times"></i>'; document.body.style.overflow = 'hidden'; }
    function closeMenu(){ menu.classList.add('hidden'); toggleBtn.setAttribute('aria-expanded','false'); toggleBtn.innerHTML = '<i class="fas fa-bars"></i>'; document.body.style.overflow = ''; }
    function toggleMenu(){ isOpen() ? closeMenu() : openMenu(); }
    
    // Remove old listeners to prevent duplicates if called multiple times
    const newBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
    newBtn.addEventListener('click', toggleMenu);

    menu.querySelectorAll('a[href]').forEach(a => a.addEventListener('click', () => closeMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) closeMenu(); });
    document.addEventListener('click', (e) => { const clickedInsideMenu = menu.contains(e.target) || newBtn.contains(e.target); if (!clickedInsideMenu && isOpen()) closeMenu(); });
    const mq = window.matchMedia('(min-width: 768px)');
    function onBreakpoint(e){ if (e.matches && isOpen()) closeMenu(); }
    mq.addEventListener ? mq.addEventListener('change', onBreakpoint) : mq.addListener(onBreakpoint);
  }

  // --- Canvas Favicon Generator (Shared) ---
  function generateIconDataURL({ size = 256, from = '#22d3ee', to = '#3b82f6', mode = 'lightning', initials = '' } = {}){
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background
    const radius = Math.max(12, Math.floor(size * 0.16));
    ctx.beginPath();
    ctx.moveTo(radius, 0); ctx.arcTo(size, 0, size, size, radius); ctx.arcTo(size, size, 0, size, radius); ctx.arcTo(0, size, 0, 0, radius); ctx.arcTo(0, 0, size, 0, radius); ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, size, size); grad.addColorStop(0, from); grad.addColorStop(1, to);
    ctx.fillStyle = grad; ctx.fill();
    
    // Vignette
    const g2 = ctx.createRadialGradient(size*0.3, size*0.2, size*0.05, size*0.5, size*0.5, size*0.7);
    g2.addColorStop(0, 'rgba(255,255,255,0.12)'); g2.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g2; ctx.fill();

    // Mode: Initials
    if (mode === 'initials') {
      const letters = (initials || '').trim().toUpperCase().slice(0, 3) || 'I';
      const base = letters.length === 1 ? 0.58 : letters.length === 2 ? 0.50 : 0.44;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.floor(size * base)}px system-ui, sans-serif`;
      ctx.lineWidth = Math.max(2, Math.floor(size * 0.035)); ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.strokeText(letters, size/2, size/2);
      ctx.shadowColor = 'rgba(255,255,255,0.20)'; ctx.shadowBlur = Math.max(8, size * 0.06);
      ctx.fillStyle = '#ffffff'; ctx.fillText(letters, size/2, size/2);
    } 
    // Mode: Lightning (Default)
    else {
      ctx.save(); ctx.translate(size * 0.16, size * 0.10); ctx.scale(size / 256, size / 256);
      ctx.shadowColor = 'rgba(255, 255, 255, 0.25)'; ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.moveTo(120, 16); ctx.lineTo(168, 16); ctx.lineTo(132, 96); ctx.lineTo(196, 96); ctx.lineTo(88, 240); ctx.lineTo(124, 144); ctx.lineTo(64, 144); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = '#facc15'; ctx.stroke();
      ctx.restore();
    }
    return canvas.toDataURL('image/png');
  }

  window.Utils = { 
    cleanDigits, escapeHtml, getCleanWaNumber, 
    openWhatsAppWithMessage, getTelHref, setTxt, setHref, 
    initMobileMenu, generateIconDataURL 
  };
})();
