// GOBEX - Novena inspired interactions
document.addEventListener('DOMContentLoaded', function(){
  // Navbar scroll
  const header = document.querySelector('.header-nav');
  window.addEventListener('scroll', ()=>{
    if(window.scrollY > 80){
      header.style.boxShadow = '0 10px 40px rgba(15,42,68,0.12)';
    } else {
      header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.04)';
    }
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', function(e){
      const href = this.getAttribute('href');
      if(href.length>1){
        const target = document.querySelector(href);
        if(target){
          e.preventDefault();
          const top = target.getBoundingClientRect().top + window.scrollY - 90;
          window.scrollTo({top, behavior:'smooth'});
          // close mobile nav
          const nav = document.querySelector('.navbar-collapse');
          if(nav.classList.contains('show')){
            bootstrap.Collapse.getInstance(nav).hide();
          }
        }
      }
    });
  });

  // Appointment form demo
  const form = document.querySelector('.appointment-form');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Envoi en cours...';
      btn.disabled = true;
      setTimeout(()=>{
        btn.innerHTML = '<i class="bi bi-check-circle me-2"></i> Demande envoyée !';
        btn.classList.remove('btn-main');
        btn.classList.add('btn-success');
        form.reset();
        setTimeout(()=>{
          btn.innerHTML = original;
          btn.disabled = false;
          btn.classList.add('btn-main');
          btn.classList.remove('btn-success');
          // Show toast
          showToast('Merci ! Nous vous recontacterons sous 24h au +229 97 739 046');
        }, 2500);
      }, 1400);
    });
  }

  function showToast(msg){
    let toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0F2A44;color:#fff;padding:16px 22px;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.2);z-index:9999;font-family:Exo,sans-serif;font-weight:600;font-size:14px;max-width:360px;transform:translateY(100px);opacity:0;transition:.4s';
    toast.innerHTML = '<i class="bi bi-check-circle-fill me-2" style="color:#F2A900"></i>'+msg;
    document.body.appendChild(toast);
    requestAnimationFrame(()=>{toast.style.transform='translateY(0)';toast.style.opacity='1'});
    setTimeout(()=>{toast.style.transform='translateY(100px)';toast.style.opacity='0';setTimeout(()=>toast.remove(),400)},4000);
  }

  // Reveal on scroll
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.style.opacity='1';
        entry.target.style.transform='translateY(0)';
      }
    });
  },{threshold:0.15});

  document.querySelectorAll('.feature-item, .service-item, .testimonial-item').forEach(el=>{
    el.style.opacity='0';
    el.style.transform='translateY(24px)';
    el.style.transition='all .7s cubic-bezier(.2,.8,.2,1)';
    observer.observe(el);
  });

  // ===== SAFETY FALLBACK FOR IFRAME PREVIEWS (Bolt IA, Lovable, etc.) =====
  // In preview iframes, IntersectionObserver sometimes never fires -> blank page
  // This guarantees visibility after max 2.5s without breaking normal animations
  function safetyRevealMain(){
    document.querySelectorAll('.feature-item, .service-item, .testimonial-item').forEach(el=>{
      const cs = window.getComputedStyle(el);
      if(cs.opacity === '0' || el.style.opacity === '0'){
        el.style.opacity='1';
        el.style.transform='translateY(0)';
      }
    });
    // Also AOS fallback
    document.querySelectorAll('[data-aos]').forEach(el=>{
      if(!el.classList.contains('aos-animate')){
        const cs = window.getComputedStyle(el);
        if(cs.opacity === '0'){
          el.classList.add('aos-animate','safety-revealed');
          el.style.opacity='1';
          el.style.transform='translateY(0) translateX(0) scale(1)';
        }
      }
    });
  }
  // Normal safety after 2.5s
  setTimeout(safetyRevealMain, 2500);
  // Faster if inside iframe (Bolt preview) or prefers-reduced-motion
  try{
    if(window.self !== window.top){
      setTimeout(safetyRevealMain, 800);
    }
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      setTimeout(safetyRevealMain, 400);
    }
  }catch(e){}
  // Extra safety on window load
  window.addEventListener('load', ()=> setTimeout(safetyRevealMain, 1000));

  // Active nav on scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link[href^="#"]');
  window.addEventListener('scroll', ()=>{
    let current = '';
    sections.forEach(sec=>{
      const top = sec.offsetTop - 120;
      if(window.scrollY >= top) current = sec.getAttribute('id');
    });
    navLinks.forEach(link=>{
      link.classList.remove('active');
      if(link.getAttribute('href') === '#'+current) link.classList.add('active');
    });
  });
});
