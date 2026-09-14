// GOBEX - Advanced Animations (Novena inspired + Modern)
// Using IntersectionObserver, Counters, Parallax, Stagger, Typing

document.addEventListener('DOMContentLoaded', function(){

  // ===== 1. HERO TYPING ANIMATION =====
  const heroTitle = document.querySelector('.banner h1');
  if(heroTitle){
    const originalHTML = heroTitle.innerHTML;
    const text = heroTitle.textContent;
    // Add cursor effect
    heroTitle.style.position = 'relative';
    // Animate words stagger
    const words = originalHTML.split(' ');
    heroTitle.innerHTML = words.map((w,i)=>`<span class="hero-word" style="display:inline-block;opacity:0;transform:translateY(30px);transition:all 0.6s cubic-bezier(0.2,0.8,0.2,1) ${i*0.08}s;">${w}&nbsp;</span>`).join('');
    setTimeout(()=>{
      document.querySelectorAll('.hero-word').forEach(el=>{
        el.style.opacity='1';
        el.style.transform='translateY(0)';
      });
    }, 300);
  }

  // ===== 2. COUNTER ANIMATION =====
  function animateCounter(el, target, duration=2000){
    let start = 0;
    const increment = target / (duration/16);
    const isPercent = el.textContent.includes('%');
    const isPlus = el.textContent.includes('+');
    const suffix = isPercent ? '%' : isPlus ? '+' : '';
    const numericTarget = parseInt(target);
    
    function update(){
      start += increment;
      if(start < numericTarget){
        el.textContent = Math.floor(start) + suffix;
        requestAnimationFrame(update);
      } else {
        el.textContent = numericTarget + suffix;
      }
    }
    update();
  }

  const counterObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const el = entry.target;
        const text = el.textContent;
        const num = parseInt(text.replace(/\D/g,''));
        if(num && !el.classList.contains('counted')){
          el.classList.add('counted');
          animateCounter(el, num);
        }
      }
    });
  }, {threshold:0.5});

  document.querySelectorAll('.stat strong, .stat-box h3, .banner-stats .stat strong').forEach(el=>{
    counterObserver.observe(el);
  });

  // ===== 3. PARALLAX EFFECT FOR BANNER =====
  const banner = document.querySelector('.banner');
  const bannerImg = document.querySelector('.banner-img-box');
  const bannerBg = document.querySelector('.banner-bg');
  
  window.addEventListener('scroll', ()=>{
    const scrolled = window.scrollY;
    if(banner && scrolled < banner.offsetHeight){
      if(bannerImg){
        bannerImg.style.transform = `rotate(1deg) translateY(${scrolled * 0.15}px)`;
      }
      if(bannerBg){
        bannerBg.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
    }
  });

  // ===== 4. STAGGER ANIMATION FOR CARDS =====
  function staggerAnimate(selector, delay=100){
    const observer = new IntersectionObserver((entries)=>{
      entries.forEach((entry, index)=>{
        if(entry.isIntersecting){
          const els = document.querySelectorAll(selector);
          els.forEach((el, i)=>{
            setTimeout(()=>{
              el.style.opacity='1';
              el.style.transform='translateY(0) scale(1)';
            }, i*delay);
          });
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:0.1});
    
    const first = document.querySelector(selector);
    if(first) observer.observe(first);
    
    document.querySelectorAll(selector).forEach(el=>{
      el.style.opacity='0';
      el.style.transform='translateY(40px) scale(0.95)';
      el.style.transition='all 0.7s cubic-bezier(0.2,0.8,0.2,1)';
    });
  }

  staggerAnimate('.feature-item', 150);
  staggerAnimate('.service-item', 120);
  staggerAnimate('.testimonial-item', 100);
  staggerAnimate('.product-card', 80);

  // ===== 5. ABOUT IMAGES PARALLAX & FLOAT =====
  const aboutImgs = document.querySelectorAll('.about-img > div');
  aboutImgs.forEach((img, i)=>{
    img.style.transition='transform 0.6s cubic-bezier(0.2,0.8,0.2,1)';
    // Float animation
    const floatDelay = i*0.5;
    img.animate([
      {transform: 'translateY(0px)'},
      {transform: 'translateY(-10px)'},
      {transform: 'translateY(0px)'}
    ], {
      duration: 4000 + i*500,
      delay: floatDelay*1000,
      iterations: Infinity,
      easing: 'ease-in-out'
    });
  });

  // ===== 6. SERVICE ICON BOUNCE ON HOVER =====
  document.querySelectorAll('.service-item, .feature-item').forEach(card=>{
    const icon = card.querySelector('.service-icon, .feature-icon');
    if(icon){
      card.addEventListener('mouseenter', ()=>{
        icon.animate([
          {transform:'scale(1) rotate(0deg)'},
          {transform:'scale(1.15) rotate(5deg)'},
          {transform:'scale(1) rotate(0deg)'}
        ], {duration:400, easing:'ease-out'});
      });
    }
  });

  // ===== 7. BUTTON RIPPLE EFFECT =====
  document.querySelectorAll('.btn-main, .btn-success').forEach(btn=>{
    btn.style.position='relative';
    btn.style.overflow='hidden';
    btn.addEventListener('click', function(e){
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size/2;
      const y = e.clientY - rect.top - size/2;
      ripple.style.cssText = `
        position:absolute;
        width:${size}px;height:${size}px;
        left:${x}px;top:${y}px;
        background:rgba(255,255,255,0.4);
        border-radius:50%;
        transform:scale(0);
        animation:ripple 0.6s linear;
        pointer-events:none;
      `;
      this.appendChild(ripple);
      setTimeout(()=>ripple.remove(), 600);
    });
  });

  // Add ripple keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple{to{transform:scale(2);opacity:0}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    .hero-word{will-change:transform,opacity}
    .product-card{will-change:transform,opacity}
    .service-item{will-change:transform,opacity}
    .feature-item{will-change:transform,opacity}
  `;
  document.head.appendChild(style);

  // ===== 8. TESTIMONIAL AUTO SCROLL INDICATOR =====
  const testimonialWrap = document.querySelector('.testimonial-wrap');
  if(testimonialWrap){
    let scrollInterval;
    const startAutoScroll = ()=>{
      // Subtle auto highlight
      const items = testimonialWrap.querySelectorAll('.testimonial-item');
      let current = 0;
      scrollInterval = setInterval(()=>{
        items.forEach((item, i)=>{
          if(i===current){
            item.style.transform='translateY(-8px) scale(1.02)';
            item.style.boxShadow='0 20px 60px rgba(10,47,94,0.15)';
          } else {
            item.style.transform='translateY(0) scale(1)';
            item.style.boxShadow='';
          }
        });
        current = (current+1)%items.length;
      }, 3000);
    };
    const observer = new IntersectionObserver((entries)=>{
      if(entries[0].isIntersecting){ startAutoScroll(); } else { clearInterval(scrollInterval); }
    }, {threshold:0.3});
    observer.observe(testimonialWrap);
  }

  // ===== 9. PARTNERS LOGO INFINITE SCROLL =====
  const partnersLogos = document.querySelector('.partners-logos');
  if(partnersLogos){
    partnersLogos.style.transition='transform 0.3s';
    let isHovering = false;
    partnersLogos.addEventListener('mouseenter', ()=>isHovering=true);
    partnersLogos.addEventListener('mouseleave', ()=>isHovering=false);
    
    // Subtle pulse for each logo
    partnersLogos.querySelectorAll('.col').forEach((col, i)=>{
      col.style.animation=`pulse ${3+i*0.5}s ease-in-out infinite`;
      col.style.animationDelay=`${i*0.2}s`;
    });
  }

  // ===== 10. BOUTIQUE PRODUCT HOVER 3D =====
  document.querySelectorAll('.product-card').forEach(card=>{
    card.addEventListener('mousemove', (e)=>{
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width/2;
      const centerY = rect.height/2;
      const rotateX = (y - centerY)/10;
      const rotateY = (centerX - x)/10;
      card.style.transform=`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', ()=>{
      card.style.transform='perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
  });

  // ===== 11. FORM INPUT FOCUS ANIMATION =====
  document.querySelectorAll('.form-control, .form-select').forEach(input=>{
    input.addEventListener('focus', function(){
      this.parentElement.style.transform='scale(1.02)';
      this.parentElement.style.transition='transform 0.2s';
    });
    input.addEventListener('blur', function(){
      this.parentElement.style.transform='scale(1)';
    });
  });

  // ===== 12. SCROLL PROGRESS BAR =====
  const progressBar = document.createElement('div');
  progressBar.style.cssText=`
    position:fixed;top:0;left:0;width:0%;height:3px;
    background:linear-gradient(90deg,#0A2F5E,#FFB81C);
    z-index:9999;transition:width 0.1s;
  `;
  document.body.appendChild(progressBar);
  window.addEventListener('scroll', ()=>{
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll/height)*100;
    progressBar.style.width=scrolled+'%';
  });

  // ===== 13. REVEAL ON SCROLL WITH DIRECTION =====
  const revealObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('revealed');
        entry.target.style.opacity='1';
        const direction = entry.target.dataset.reveal || 'up';
        const transforms = {
          up: 'translateY(0)',
          down: 'translateY(0)',
          left: 'translateX(0)',
          right: 'translateX(0)',
          zoom: 'scale(1)'
        };
        entry.target.style.transform=transforms[direction]||'translateY(0)';
      }
    });
  }, {threshold:0.15});

  document.querySelectorAll('[data-reveal]').forEach(el=>{
    const dir = el.dataset.reveal;
    const initial = {
      up: 'translateY(40px)',
      down: 'translateY(-40px)',
      left: 'translateX(-40px)',
      right: 'translateX(40px)',
      zoom: 'scale(0.9)'
    };
    el.style.opacity='0';
    el.style.transform=initial[dir]||'translateY(40px)';
    el.style.transition='all 0.8s cubic-bezier(0.2,0.8,0.2,1)';
    revealObserver.observe(el);
  });

  // ===== 14. WHATSAPP FLOAT PULSE =====
  const whatsappFloat = document.querySelector('.whatsapp-float');
  if(whatsappFloat){
    whatsappFloat.animate([
      {boxShadow:'0 10px 30px rgba(37,211,102,0.4), 0 0 0 0 rgba(37,211,102,0.4)'},
      {boxShadow:'0 10px 30px rgba(37,211,102,0.4), 0 0 0 12px rgba(37,211,102,0)'}
    ], {duration:2000, iterations:Infinity});
  }

  console.log('%c GOBEX Animations Loaded ✨ ', 'background:#0A2F5E;color:#FFB81C;padding:8px 16px;border-radius:8px;font-weight:700;');
});
