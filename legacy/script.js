(function(){
  // ===== Configurações =====
  const PHONE_NUMBER = '5585984560521'; // Substitua pelo número do WhatsApp

  const OPEN_HOUR = 9;   // 09:00
  const CLOSE_HOUR = 18; // 18:00
  const SLOT_MINUTES = 30; // intervalos de 30 minutos
  const CLOSED_WEEKDAYS = [0]; // fechado aos domingos

  const SERVICE_DURATION = {
    'Manicure & Pedicure': 60,
    'Design de Sobrancelhas': 30,
    'Coloração': 120,
    'Corte & Escova': 60,
    'Banho de Lua': 90
  };

  // ===== Estado/Utilitários =====
  const modal = document.getElementById('bookingModal');
  const openBtn = document.getElementById('openBooking');
  const closeBtn = document.getElementById('closeBooking');
  const form = document.getElementById('bookingForm');
  const dateInput = document.getElementById('date');
  const timeSelect = document.getElementById('time');
  const serviceSelect = document.getElementById('service');
  const STORAGE_KEY = 'studio_charme_bookings';
  const otherServiceRow = document.getElementById('otherServiceRow');
  const otherServiceInput = document.getElementById('otherService');

  // Mostrar campo "Outro"
  serviceSelect?.addEventListener('change', () => {
    if(serviceSelect.value === "Outro") {
      otherServiceRow.style.display = "flex";
    } else {
      otherServiceRow.style.display = "none";
      if(otherServiceInput) otherServiceInput.value = "";
    }
    populateTimes();
  });

  function getBookings(){
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch(e){
      return [];
    }
  }
  function saveBooking(booking){
    const all = getBookings();
    all.push(booking);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
  function formatDateBR(d){
    const [y,m,day] = d.split('-');
    return day + '/' + m + '/' + y;
  }
  function pad(n){ return (n<10?'0':'') + n; }

  function generateSlots(duration){
    const slots = [];
    for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_MINUTES) {
        const start = pad(h) + ':' + pad(m);
        const endMinutes = h*60 + m + duration;
        const endH = Math.floor(endMinutes/60);
        const endM = endMinutes % 60;
        if (endH < CLOSE_HOUR || (endH === CLOSE_HOUR && endM === 0)) {
          slots.push(start);
        }
      }
    }
    return slots;
  }

  function isClosed(dateStr){
    const d = new Date(dateStr + 'T00:00:00');
    const wd = d.getDay();
    return CLOSED_WEEKDAYS.includes(wd);
  }

  function populateTimes(){
    if(!timeSelect) return;
    timeSelect.innerHTML = '';
    let service = serviceSelect.value;
    if(service === 'Outro'){
      service = otherServiceInput.value.trim() || 'Outro (não especificado)';
    }
    const date = dateInput.value;
    if(!service || !date){
      const opt = document.createElement('option');
      opt.value = ''; opt.disabled = true; opt.selected = true;
      opt.textContent = 'Selecione serviço e data';
      timeSelect.appendChild(opt);
      return;
    }
    if(isClosed(date)){
      const opt = document.createElement('option');
      opt.value=''; opt.disabled = true; opt.selected = true;
      opt.textContent = 'Fechado neste dia. Escolha outra data.';
      timeSelect.appendChild(opt);
      return;
    }

    const duration = SERVICE_DURATION[service] || 60;
    const slots = generateSlots(duration);
    const bookings = getBookings().filter(b => b.date === date);
    const bookedSet = new Set(bookings.map(b => b.time));
    const now = new Date();
    const todayStr = now.toISOString().slice(0,10);

    slots.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      if(date === todayStr){
        const [hh,mm] = t.split(':');
        const slotDate = new Date();
        slotDate.setHours(parseInt(hh,10), parseInt(mm,10), 0, 0);
        if(slotDate <= now){
          opt.disabled = true;
          opt.textContent = t + ' — indisponível';
        }
      }
      if(bookedSet.has(t)){
        opt.disabled = true;
        opt.textContent = t + ' — reservado';
      }
      if(!opt.textContent) opt.textContent = t;
      timeSelect.appendChild(opt);
    });

    if(!timeSelect.querySelector('option[selected]')){
      const firstEnabled = Array.from(timeSelect.options).find(o => !o.disabled);
      if(firstEnabled){
        firstEnabled.selected = true;
      } else {
        const opt = document.createElement('option');
        opt.value=''; opt.disabled = true; opt.selected = true;
        opt.textContent = 'Sem horários disponíveis';
        timeSelect.innerHTML = '';
        timeSelect.appendChild(opt);
      }
    }
  }

  // Abrir/fechar modal
  openBtn?.addEventListener('click', () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    populateTimes();
  });
  closeBtn?.addEventListener('click', () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  });
  modal?.addEventListener('click', (e) => {
    if(e.target === modal){
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
    }
  });

  // Atualizar horários quando mudar serviço/data
  serviceSelect?.addEventListener('change', populateTimes);
  dateInput?.addEventListener('change', populateTimes);

  // Forçar min para hoje
  if(dateInput){
    const today = new Date().toISOString().slice(0,10);
    if(dateInput.min < today) dateInput.min = today;
  }

  // Submit do formulário -> abre WhatsApp
  form?.addEventListener('submit', function(e){
    e.preventDefault();
    const name = document.getElementById('clientName').value.trim();
    let service = serviceSelect.value;
    if(service === 'Outro'){
      service = otherServiceInput.value.trim() || 'Outro (não especificado)';
    }
    const date = dateInput.value;
    const time = timeSelect.value;
    const notes = document.getElementById('notes').value.trim();

    if(!name || !service || !date || !time){
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    saveBooking({ name, service, date, time });

    const msg = [
      'Olá! Gostaria de confirmar um agendamento:',
      '*Nome:* ' + name,
      '*Serviço:* ' + service,
      '*Data:* ' + formatDateBR(date),
      '*Horário:* ' + time + 'h',
      notes ? '*Observações:* ' + notes : ''
    ].filter(Boolean).join('%0A');

    const url = 'https://wa.me/' + PHONE_NUMBER + '?text=' + msg;
    window.open(url, '_blank');

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    form.reset();
  });

  // ===== Botão Voltar ao Topo =====
  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTop?.classList.add('show');
    } else {
      backToTop?.classList.remove('show');
    }
  });
  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

})();
