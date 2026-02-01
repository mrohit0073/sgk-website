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

    // Send Payment Details
    const sendBtn = document.getElementById('send-payment-details');
    if (sendBtn){
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const conf = window.ISP_DATA?.config || {};
        const waNumber = Utils.getCleanWaNumber(conf);
        
        if (!waNumber){ alert('WhatsApp number not configured in admin panel.'); return; }
        
        const message = '🧾 *UPI Payment Done* \n\nPlease find my transaction details below:\n• *Customer Name:* \n• *Registered Mobile:* \n• *Amount Paid:* \n• *Transaction ID:* \n• *Screenshot:* (Attach after sending)\n\nKindly verify and activate my broadband connection. 🙏';
        
        Utils.openWhatsAppWithMessage(waNumber, message);
      });
    }
  });
})();
