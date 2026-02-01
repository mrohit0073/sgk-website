(function(){
  let currentSelectedPlan = null;

  // --- WhatsApp Actions ---
  window.chatNow = function(preset){
    const config = (window.ISP_DATA && window.ISP_DATA.config) || {};
    const waNumber = Utils.getCleanWaNumber(config);
    const msg = preset || 'Hello, I have a question about your internet plans.';
    Utils.openWhatsAppWithMessage(waNumber, msg);
  };

  window.waPlan = function(planName){
    const durationDropdown = document.getElementById('global-duration');
    const duration = durationDropdown ? durationDropdown.value : '1 Month';
    const data = window.ISP_DATA || {};
    const plan = (data.plans || []).find(p => p.name === planName);
    
    if (!plan) return;

    const price = plan.rates ? (plan.rates[duration] || plan.rates['1 Month'] || 0) : 0;
    const speed = plan.speed || '—';
    const msg = `*🟢 New Plan Enquiry*\n*Plan:* ${planName}\n*Speed:* ${speed}\n*Duration:* ${duration}\n*Price:* ₹${price}\n\nI want to know more about this plan.`;
    
    Utils.openWhatsAppWithMessage(Utils.getCleanWaNumber(data.config), msg);
  };

  // --- Modal Logic ---
  window.openLeadForm = function(planName){
    const durationEl = document.getElementById('global-duration');
    const zoneSelect = document.getElementById('zone-selector');
    const duration = durationEl ? durationEl.value : '1 Month';
    const selectedArea = zoneSelect ? zoneSelect.value : 'All';
    const plan = (window.ISP_DATA && window.ISP_DATA.plans || []).find(p => p.name === planName); 
    
    if (!plan) return;

    const price = (plan.rates && (plan.rates[duration] ?? plan.rates['1 Month'])) || 0;
    const speed = plan.speed || '—';
    
    currentSelectedPlan = { name: plan.name, duration, price, speed, area: selectedArea };
    
    // Set text safely using Utils
    Utils.setTxt('modal-plan-name', plan.name);
    Utils.setTxt('modal-plan-duration', duration);
    Utils.setTxt('modal-plan-price', '₹' + price);
    
    const modal = document.getElementById('lead-modal');
    if(modal) modal.classList.remove('hidden');
  };

  window.closeLeadForm = function(){ 
    const modal = document.getElementById('lead-modal');
    if(modal) modal.classList.add('hidden'); 
  };

  window.submitLeadForm = function(e){
    e.preventDefault();
    const name = (document.getElementById('lead-name')||{}).value || '';
    const phone = (document.getElementById('lead-phone')||{}).value || '';
    const address = (document.getElementById('lead-address')||{}).value || '';
    const agree = (document.getElementById('lead-agree')||{}).checked;
    
    if (!agree) return alert('Please agree to the terms.');
    if (!currentSelectedPlan) return alert('Please choose a plan again.');

    const config = (window.ISP_DATA && window.ISP_DATA.config) || {};
    const waNumber = Utils.getCleanWaNumber(config);
    if (!waNumber) return alert('WhatsApp number is not configured in Admin. Please add it and save.');
    
    const areaLine = currentSelectedPlan.area && currentSelectedPlan.area !== 'All' ? `*Area:* ${currentSelectedPlan.area}\n` : '';
    const msg = `*🆕 NEW CONNECTION REQUEST*\n--------------------------\n*Plan:* ${currentSelectedPlan.name}\n*Speed:* ${currentSelectedPlan.speed}\n*Duration:* ${currentSelectedPlan.duration}\n*Price:* ₹${currentSelectedPlan.price}\n${areaLine}--------------------------\n*👤 Name:* ${name}\n*📱 Phone:* ${phone}\n*🏠 Address:* ${address}\n--------------------------\n_Sent via Website_`;
    
    Utils.openWhatsAppWithMessage(waNumber, msg);
    window.closeLeadForm();
  };

  // --- Payment Section Events ---
  document.addEventListener('DOMContentLoaded', function(){
    // Copy UPI
    const copyBtn = document.getElementById('copy-upi-btn');
    const upiText = document.getElementById('upi-display');
    const toast = document.getElementById('copy-toast');
    
    if (copyBtn && upiText){
      copyBtn.addEventListener('click', () => { 
        navigator.clipboard.writeText(upiText.innerText || ''); 
        if (toast){ 
          toast.style.opacity = '1'; 
          setTimeout(()=> toast.style.opacity = '0', 1400); 
        } 
      });
    }
  });
})();

(function () {
  const $ = (sel) => document.querySelector(sel);

  const modal = $("#txn-modal");
  const overlay = $("#txn-overlay");
  const openBtn = $("#send-payment-details");
  const closeBtn = $("#txn-close-btn");
  const form = $("#txn-form");

  const nameInput = $("#txn-name");
  const phoneInput = $("#txn-phone");
  const amountInput = $("#txn-amount");
  const utrInput = $("#txn-utr");
  const upiInput = $("#txn-upi-id");
  const appSelect = $("#txn-app");
  const dtInput = $("#txn-datetime");
  const planInput = $("#txn-plan");
  const billingInput = $("#txn-billing");

  const upiDisplay = $("#upi-display");
  const billingDisplay = $("#global-duration");
  const uiBillingChip = $("#txn-billing-display");
  const uiUpiChip = $("#txn-upi-display");

  function openModal() {
    // Autofill from page
    try {
      const upi = (upiDisplay?.textContent || "").trim();
      upiInput.value = upi || "";
      uiUpiChip.textContent = upi || "—";
    } catch {}

    try {
      const billing = (billingDisplay?.value || "1 Month").trim();
      billingInput.value = billing;
      uiBillingChip.textContent = billing;
    } catch {
      billingInput.value = "1 Month";
      uiBillingChip.textContent = "1 Month";
    }

    // Prefill date-time to now (local)
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localISO =
      now.getFullYear() + "-" +
      pad(now.getMonth() + 1) + "-" +
      pad(now.getDate()) + "T" +
      pad(now.getHours()) + ":" +
      pad(now.getMinutes());
    dtInput.value = localISO;

    // Restore name/phone from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("txnUser") || "{}");
      if (saved.name) nameInput.value = saved.name;
      if (saved.phone) phoneInput.value = saved.phone;
    } catch {}

    // Chips summary
    $("#txn-upi-display").textContent = upiInput.value || "—";

    // Show modal
    modal.classList.add("show");
    document.body.classList.add("modal-open");
    // Focus first field
    setTimeout(() => nameInput?.focus(), 50);
  }

  function closeModal() {
    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
  }

  function sanitizePhone(num) {
    const digits = (num || "").replace(/\D/g, "");
    if (digits.length === 10) return "91" + digits; // India default
    if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.slice(1);
    return digits;
  }

  function getWhatsappNumber() {
    // Priority 1: explicit config
    try {
      if (window.ISP_CONFIG) {
        const cfg = window.ISP_CONFIG;
        const cand = cfg.whatsapp || cfg.whatsappNumber || cfg.supportWhatsapp || cfg.supportNumber || cfg.phone;
        if (cand) {
          const s = sanitizePhone(cand);
          if (s) return s;
        }
      }
    } catch {}

    // Priority 2: footer phone
    try {
      const footerPhone = document.getElementById("footer-phone");
      if (footerPhone) {
        // from href "tel:+91XXXX" or text content
        const fromHref = footerPhone.getAttribute("href") || "";
        const fromText = footerPhone.textContent || "";
        const s = sanitizePhone(fromHref + " " + fromText);
        if (s) return s;
      }
    } catch {}

    // Priority 3: nav phone
    try {
      const navPhone = document.getElementById("nav-phone-desktop");
      if (navPhone) {
        const s = sanitizePhone(navPhone.textContent || "");
        if (s) return s;
      }
    } catch {}

    return ""; // not found
  }

  function makeMessage(data) {
    const lines = [
      "*Transaction Details*",
      "",
      `• Plan: ${data.plan || "Not specified"}`,
      `• Billing: ${data.billing || "Not specified"}`,
      `• Name: ${data.name}`,
      `• Mobile: +${sanitizePhone(data.phone)}`,
      `• UPI ID: ${data.upiId || "—"}`,
      `• Amount: ₹${data.amount}`,
      `• UTR/Ref: ${data.utr}`,
      `• App: ${data.app}`,
      `• Date/Time: ${data.datetime}`,
    ];
    if (data.notes) lines.push(`• Notes: ${data.notes}`);
    lines.push("", "— Sent from ISP Website");
    return lines.join("\n");
  }

  function openWhatsApp(phoneE164, text) {
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${phoneE164}?text=${encoded}`;
    // Try opening new tab; fallback to same tab if blocked
    const win = window.open(url, "_blank", "noopener");
    if (!win) window.location.href = url;
  }

  function validate() {
    if (!nameInput.value.trim()) return "Please enter your full name.";
    if (!/^\d{10}$/.test(phoneInput.value.trim())) return "Enter a valid 10-digit mobile number.";
    if (!amountInput.value || Number(amountInput.value) <= 0) return "Enter a valid amount.";
    if (!utrInput.value.trim() || !/[A-Za-z0-9\-]{6,}/.test(utrInput.value.trim())) return "Enter a valid UTR / reference.";
    if (!dtInput.value) return "Please select the transaction date and time.";
    return "";
  }

  // EVENTS
  openBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    openModal();
  });

  overlay?.addEventListener("click", closeModal);
  closeBtn?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("show")) closeModal();
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    // Save minimal identity for reuse
    try {
      localStorage.setItem("txnUser", JSON.stringify({
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim()
      }));
    } catch {}

    const waNumber = getWhatsappNumber();
    if (!waNumber) {
      alert("WhatsApp number is not configured. Please set it in ISP_CONFIG or footer phone.");
      return;
    }

    // Prepare data
    const data = {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      upiId: upiInput.value.trim(),
      amount: Number(amountInput.value).toFixed(2),
      utr: utrInput.value.trim(),
      app: appSelect.value,
      datetime: dtInput.value.replace("T", " "),
      plan: planInput.value.trim(),
      billing: billingInput.value.trim(),
      notes: ($("#txn-notes")?.value || "").trim()
    };

    const message = makeMessage(data);
    openWhatsApp(waNumber, message);
    closeModal();
  });
})();
