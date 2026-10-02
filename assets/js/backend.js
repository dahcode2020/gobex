// GOBEX - Backend Integration (Firebase + Supabase + localStorage fallback)
// Supports real-time backend for boutique, commandes, contenu

class GOBEXBackend {
  constructor(){
    this.mode = 'localStorage'; // localStorage | firebase | supabase
    this.firebaseConfig = null;
    this.supabaseConfig = null;
    this.isOnline = navigator.onLine;
    this.init();
  }

  init(){
    // Check for backend config in localStorage or global
    const savedMode = localStorage.getItem('gobex_backend_mode');
    if(savedMode) this.mode = savedMode;

    // Try to load Firebase config
    const fbConfig = localStorage.getItem('gobex_firebase_config');
    if(fbConfig){
      try{
        this.firebaseConfig = JSON.parse(fbConfig);
        this.mode = 'firebase';
      }catch(e){}
    }

    // Try Supabase config
    const sbConfig = localStorage.getItem('gobex_supabase_config');
    if(sbConfig){
      try{
        this.supabaseConfig = JSON.parse(sbConfig);
        this.mode = 'supabase';
      }catch(e){}
    }

    console.log(`%c GOBEX Backend Mode: ${this.mode} `, 'background:#0A2F5E;color:#FFB81C;padding:6px 12px;border-radius:6px;');

    // Online/offline detection
    window.addEventListener('online', ()=>{ this.isOnline=true; this.sync(); });
    window.addEventListener('offline', ()=>{ this.isOnline=false; });

    // Auto sync every 30s if online
    setInterval(()=>{ if(this.isOnline) this.sync(); }, 30000);
  }

  // ===== PRODUCTS =====
  async getProducts(){
    if(this.mode==='firebase' && window.firebase){
      return await this.getFirebaseProducts();
    } else if(this.mode==='supabase' && window.supabase){
      return await this.getSupabaseProducts();
    } else {
      return this.getLocalProducts();
    }
  }

  getLocalProducts(){
    const stored = localStorage.getItem('gobex_products');
    if(stored){
      try{ return JSON.parse(stored); }catch(e){ return null; }
    }
    return null;
  }

  async saveProducts(products){
    // Always save to localStorage as cache
    localStorage.setItem('gobex_products', JSON.stringify(products));
    
    // Also save to backend if configured
    if(this.mode==='firebase'){
      await this.saveFirebaseProducts(products);
    } else if(this.mode==='supabase'){
      await this.saveSupabaseProducts(products);
    }

    // Dispatch event for other tabs/pages
    window.dispatchEvent(new CustomEvent('gobex_products_updated', {detail:products}));
    
    // For boutique page real-time
    localStorage.setItem('gobex_products_last_update', new Date().toISOString());
  }

  // ===== FIREBASE METHODS =====
  async initFirebase(config){
    this.firebaseConfig = config;
    localStorage.setItem('gobex_firebase_config', JSON.stringify(config));
    localStorage.setItem('gobex_backend_mode', 'firebase');
    this.mode='firebase';
    
    // Load Firebase SDK dynamically
    if(!window.firebase){
      await this.loadScript('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
      await this.loadScript('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js');
      firebase.initializeApp(config);
    }
    console.log('Firebase initialized');
    return true;
  }

  async getFirebaseProducts(){
    if(!window.firebase) return this.getLocalProducts();
    try{
      const db = firebase.firestore();
      const snapshot = await db.collection('gobex_products').get();
      const products = [];
      snapshot.forEach(doc=>products.push({id:doc.id, ...doc.data()}));
      if(products.length>0){
        localStorage.setItem('gobex_products', JSON.stringify(products));
        return products;
      }
    }catch(e){
      console.warn('Firebase get failed, fallback to localStorage', e);
    }
    return this.getLocalProducts();
  }

  async saveFirebaseProducts(products){
    if(!window.firebase) return;
    try{
      const db = firebase.firestore();
      const batch = db.batch();
      products.forEach((p, i)=>{
        const ref = db.collection('gobex_products').doc(p.id||`prod_${i}`);
        batch.set(ref, p, {merge:true});
      });
      await batch.commit();
      console.log('Firebase save success');
    }catch(e){
      console.warn('Firebase save failed', e);
    }
  }

  // ===== SUPABASE METHODS =====
  async initSupabase(url, anonKey){
    this.supabaseConfig = {url, anonKey};
    localStorage.setItem('gobex_supabase_config', JSON.stringify({url, anonKey}));
    localStorage.setItem('gobex_backend_mode', 'supabase');
    this.mode='supabase';

    if(!window.supabase){
      await this.loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
    }
    
    window.supabaseClient = supabase.createClient(url, anonKey);
    console.log('Supabase initialized');
    return true;
  }

  async getSupabaseProducts(){
    if(!window.supabaseClient) return this.getLocalProducts();
    try{
      const {data, error} = await window.supabaseClient.from('gobex_products').select('*').eq('active', true);
      if(error) throw error;
      if(data && data.length>0){
        localStorage.setItem('gobex_products', JSON.stringify(data));
        return data;
      }
    }catch(e){
      console.warn('Supabase get failed', e);
    }
    return this.getLocalProducts();
  }

  async saveSupabaseProducts(products){
    if(!window.supabaseClient) return;
    try{
      const {error} = await window.supabaseClient.from('gobex_products').upsert(products);
      if(error) throw error;
      console.log('Supabase save success');
    }catch(e){
      console.warn('Supabase save failed', e);
    }
  }

  // ===== COMMANDES / ORDERS =====
  async saveOrder(order){
    const orders = JSON.parse(localStorage.getItem('gobex_orders')||'[]');
    orders.unshift({...order, id:Date.now(), date:new Date().toISOString()});
    localStorage.setItem('gobex_orders', JSON.stringify(orders));

    if(this.mode==='firebase' && window.firebase){
      try{
        const db = firebase.firestore();
        await db.collection('gobex_orders').add(order);
      }catch(e){}
    }
    if(this.mode==='supabase' && window.supabaseClient){
      try{
        await window.supabaseClient.from('gobex_orders').insert([order]);
      }catch(e){}
    }
  }

  // ===== SETTINGS =====
  async getSettings(){
    const local = localStorage.getItem('gobex_settings');
    if(local) return JSON.parse(local);
    return {
      cabinetName: 'GOBEX (Godwin Business Expertise)',
      address: 'Carrefour 02 Manguiers, Rue de Tankpê - Abomey-Calavi',
      phone: '+229 97 739 046',
      whatsapp: '22997739046',
      email: 'contact@gobex.bj',
      ifu: '1201502844807',
      rccm: 'RB/ABC/15A3265'
    };
  }

  async saveSettings(settings){
    localStorage.setItem('gobex_settings', JSON.stringify(settings));
    // Also save to backend
    if(this.mode==='firebase'){
      try{
        const db = firebase.firestore();
        await db.collection('gobex_settings').doc('main').set(settings);
      }catch(e){}
    }
  }

  // ===== UTILS =====
  loadScript(src){
    return new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src=src;
      s.onload=resolve;
      s.onerror=reject;
      document.head.appendChild(s);
    });
  }

  async sync(){
    // Sync local changes to backend
    console.log('Syncing... Mode:', this.mode);
  }

  exportAll(){
    const data = {
      products: JSON.parse(localStorage.getItem('gobex_products')||'[]'),
      orders: JSON.parse(localStorage.getItem('gobex_orders')||'[]'),
      settings: JSON.parse(localStorage.getItem('gobex_settings')||'{}'),
      backendMode: this.mode,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`gobex-full-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }

  // Demo data for testing backend
  getDemoConfig(){
    return {
      firebase: {
        apiKey: "VOTRE_API_KEY",
        authDomain: "gobex-bj.firebaseapp.com",
        projectId: "gobex-bj",
        storageBucket: "gobex-bj.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abcdef"
      },
      supabase: {
        url: "https://votre-projet.supabase.co",
        anonKey: "votre-anon-key"
      }
    };
  }
}

// Initialize global backend
window.GOBEX = new GOBEXBackend();

// Helper for boutique page
window.GOBEX.getProductsForBoutique = async function(){
  const stored = window.GOBEX.getLocalProducts();
  if(stored) return stored;
  // Default products if none
  return [
    {name:"PERFECTO Facturation & Stock PRO", category:"logiciel", price:75000, oldPrice:120000, badge:"BEST SELLER", desc:"Factures avec IFU, AIB, gestion stock, alertes rupture, clients, dettes. Idéal boutiques, quincailleries.", image:"assets/img/product-facturation.jpg", whatsapp:"Je veux acheter PERFECTO Facturation PRO 75k", meta1:"Windows", meta2:"1200+ utilisateurs • 4.9/5", active:true},
    {name:"PERFECTO Paie & CNSS Bénin", category:"logiciel", price:90000, oldPrice:150000, badge:"NOUVEAU", desc:"Bulletins de paie conformes Code travail Bénin, CNSS, ITS, déclarations automatiques.", image:"assets/img/product-paie.jpg", whatsapp:"PERFECTO Paie CNSS 90k", meta1:"Conforme CNSS", meta2:"4.8/5", active:true},
    {name:"PERFECTO Compta SYSCOHADA", category:"logiciel", price:120000, oldPrice:0, badge:"", desc:"Tenue comptable simplifiée, bilan, grand livre, balance. Pour TPE/PME sans comptable.", image:"assets/img/service-compta.jpg", whatsapp:"PERFECTO Compta 120k", meta1:"SYSCOHADA", meta2:"4.7/5", active:true},
    {name:"Pack Business Plan Bancable (BOA/Ecobank)", category:"document", price:25000, oldPrice:50000, badge:"PACK", desc:"Modèle Word + Excel financier 3 ans + guide. Déjà accepté par BOA, Ecobank, BGFI.", image:"assets/img/product-businessplan.jpg", whatsapp:"Pack Business Plan 25k", meta1:"Word + Excel", meta2:"350+ vendus", active:true},
    {name:"Pack Création Entreprise Bénin (10 docs)", category:"document", price:15000, oldPrice:0, badge:"", desc:"Statuts SARL, SAS, PV, contrat de travail Bénin, registre, modèle facture avec IFU.", image:"assets/img/product-statuts.jpg", whatsapp:"Pack Création 15k", meta1:"10 modèles", meta2:"Conforme APIEx", active:true},
    {name:"Guide Complet Fiscalité Bénin 2024-2025", category:"formation", price:10000, oldPrice:20000, badge:"FORMATION", desc:"120 pages : TVA, AIB, IS, IRPP, astuces optimisation, cas pratiques DGI. PDF + mises à jour.", image:"assets/img/product-ebook.jpg", whatsapp:"Guide Fiscalité 10k", meta1:"120 pages PDF", meta2:"5/5", active:true},
    {name:"Formation Excel Avancé + Paie CNSS", category:"formation", price:35000, oldPrice:0, badge:"", desc:"8h de vidéos, fichiers Excel, attestation. Apprenez à faire votre paie et tableaux de bord.", image:"assets/img/product-formation.jpg", whatsapp:"Formation Excel 35k", meta1:"8h vidéo", meta2:"Attestation", active:true},
    {name:"PERFECTO Pack Entreprise (3 logiciels)", category:"logiciel", price:200000, oldPrice:285000, badge:"BUNDLE", desc:"Facturation + Paie + Compta. Licence 3 postes + formation + support 1 an.", image:"assets/img/hero-west-africa.jpg", whatsapp:"PERFECTO Pack 200k", meta1:"Économisez 85k", meta2:"Support inclus", active:true},
    {name:"Modèle Étude de Marché Bénin", category:"document", price:20000, oldPrice:0, badge:"", desc:"Template Word 30 pages avec exemple marché Cotonou/Calavi, analyse concurrence, pricing.", image:"assets/img/service-business.jpg", whatsapp:"Etude Marché 20k", meta1:"30 pages", meta2:"Exemple Cotonou", active:true},
  ];
};

console.log('%c GOBEX Backend Ready 🚀 ', 'background:#0A2F5E;color:#FFB81C;padding:8px 16px;border-radius:8px;font-weight:700;');
console.log('Modes disponibles: localStorage (actuel), firebase, supabase');
console.log('Pour activer Firebase: GOBEX.initFirebase(config)');
console.log('Pour activer Supabase: GOBEX.initSupabase(url, key)');
