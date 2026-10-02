/**
 * GOBEX Bibliothèque Chat — Guide rapide IA (offline, 100% RuleBase)
 * Consulte à chaque question : bibliotheque.json + moteurs-calcul-2026.json + docs/bibliotheque/*.md
 * RAG simple mots-clés + article→moteur→calcul, citation traçable.
 */
(function(){
  const BIB_PATHS = [
    '../docs/bibliotheque/bibliotheque.json',
    'docs/bibliotheque/bibliotheque.json',
    '../workflow/bibliotheque.json',
    'workflow/bibliotheque.json',
    './bibliotheque.json'
  ];
  const RULE_PATHS = [
    '../docs/moteurs-calcul-2026.json',
    'docs/moteurs-calcul-2026.json',
    '../workflow/moteurs-calcul-2026.json'
  ];

  let bibData=null, ruleData=null, bibLoaded=false;
  let chatOpen=false;

  async function tryFetch(paths){
    for(const p of paths){
      try{
        const r=await fetch(p, {cache:'no-store'});
        if(r.ok) return {data: await r.json(), path:p};
      }catch(e){}
    }
    return null;
  }
  async function loadBibliotheque(){
    if(bibLoaded) return;
    try{
      const b=await tryFetch(BIB_PATHS);
      if(b){ bibData=b.data; console.log('[GOBEX Chat] bibliotheque chargée',b.path, bibData.documents?.length); }
      const r=await tryFetch(RULE_PATHS);
      if(r){ ruleData=r.data; console.log('[GOBEX Chat] ruleBase',r.path, ruleData.version); }
      // fallback : si pas de bibliothèque, construit depuis ruleBase
      if(!bibData && ruleData){
        bibData={version:ruleData.version, documents:[
          {id:'ref_moteurs', titre:'Référentiel 38 moteurs RuleBase', path:'docs/moteurs-calcul-2026.json', articles:'Art.46-459', moteurs: ruleData.moteurs_P1?.concat(ruleData.moteurs_P2||[]).map(m=>m.id)||[] }
        ], sites_veille:[]};
      }
      bibLoaded=true;
    }catch(e){ console.error('loadBibliotheque',e); }
  }

  function normalize(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  function tokenize(q){ return normalize(q).split(/[^a-z0-9]+/).filter(t=>t.length>2); }

  function scoreDoc(doc, tokens, queryNorm){
    let score=0;
    const fields = [
      normalize(doc.titre),
      normalize(doc.articles),
      normalize((doc.moteurs||[]).join(' ')),
      normalize(doc.categorie||''),
      normalize(doc.type||''),
      normalize(doc.id||'')
    ].join(' ');
    tokens.forEach(t=>{
      if(fields.includes(t)) score+=3;
      if(normalize(doc.titre).includes(t)) score+=5;
      if((doc.moteurs||[]).some(m=> normalize(m).includes(t))) score+=4;
      if(normalize(doc.articles||'').includes(t)) score+=2;
    });
    // bonus article exact e.g. "art.178"
    if(/art\.\s*\d+/i.test(queryNorm)){
      const m=queryNorm.match(/art\.\s*(\d+)/i);
      if(m && normalize(doc.articles).includes('art.'+m[1])) score+=10;
    }
    // moteur exact
    const moteursAll = (bibData?.documents||[]).flatMap(d=>d.moteurs||[]);
    // also check ruleData
    return score;
  }

  function findMoteur(queryNorm){
    if(!ruleData) return null;
    const all=[...(ruleData.moteurs_P1||[]), ...(ruleData.moteurs_P2||[])];
    const tokens=tokenize(queryNorm);
    let best=null, bestScore=0;
    all.forEach(m=>{
      const hay = normalize(m.libelle+' '+m.id+' '+m.article+' '+(m.article||'') );
      let s=0;
      tokens.forEach(t=>{ if(hay.includes(t)) s+=2; });
      if(normalize(m.id)===normalize(queryNorm.replace(/\s+/g,''))) s+=10;
      if(queryNorm.includes(normalize(m.id))) s+=5;
      if(s>bestScore){ bestScore=s; best=m; }
    });
    return bestScore>0? best : null;
  }

  async function searchBibliotheque(query){
    await loadBibliotheque();
    const qNorm=normalize(query);
    const tokens=tokenize(query);
    if(!bibData) return {docs:[], moteur:null};
    const scored = (bibData.documents||[]).map(d=> ({doc:d, score: scoreDoc(d,tokens,qNorm)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
    const moteur = findMoteur(qNorm);
    return {docs: scored.map(s=>s.doc), moteur, tokens};
  }

  function formatMoteurCard(m){
    if(!m) return '';
    const taux = m.taux ? JSON.stringify(m.taux) : (m.formule? m.formule.slice(0,120):'');
    return `<div style="margin-top:8px;padding:8px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;font-size:11px;">
      <strong style="color:#0A2F5E;"><i class="bi bi-cpu me-1" style="color:#7c3aed;"></i>${m.libelle} <span class="badge bg-light text-dark border" style="font-size:9px;">${m.id.toUpperCase()}</span></strong><br>
      <span class="badge" style="background:#0A2F5E;color:#FFB81C;font-size:9px;">${m.article||''}</span> <span style="color:#64748b;">${(m.livre||'')}</span><br>
      <small style="color:#334155;">${(m.formule||'').slice(0,180)}${m.formule&&m.formule.length>180?'…':''}</small><br>
      <small style="color:#7c3aed;">Taux/Seuil RuleBase : ${taux? `<code style="font-size:10px;">${taux}</code>` : 'voir JSON'}</small>
      <div class="mt-1"><button class="btn btn-sm py-0 px-2" style="font-size:10px;background:#7c3aed;color:#fff;" onclick="try{ moteursSel.has('${m.id}')? toggleMoteur('${m.id}',false) : toggleMoteur('${m.id}',true); toast('Moteur','${m.id.toUpperCase()} '+(moteursSel.has('${m.id}')?'retiré':'ajouté'),'success'); }catch(e){}">Appliquer ${m.id.toUpperCase()}</button></div>
    </div>`;
  }

  async function answerQuery(query){
    const {docs, moteur} = await searchBibliotheque(query);
    let html = `<div style="font-size:11px;line-height:1.6;color:#334155;">`;
    if(!query.trim()) html+= `<em>Posez une question : « Comment calculer la TPS ? », « Art.178 TPS libératoire », « FEC 18 champs », « patente »…</em>`;
    else {
      html+= `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
        <span class="badge bg-light text-dark border" style="font-size:9px;">Bibliothèque ${bibData?.version||''}</span>
        <span class="badge" style="background:#0A2F5E;color:#FFB81C;font-size:9px;">${docs.length} doc(s) • ${moteur? '1 moteur':''}</span>
      </div>`;
      if(moteur){
        html+= `<div style="margin-bottom:6px;"><strong style="color:#4c1d95;">→ Moteur détecté :</strong> ${moteur.id.toUpperCase()} — ${moteur.libelle.slice(0,80)}</div>`;
        html+= formatMoteurCard(moteur);
      }
      if(docs.length){
        html+= `<div style="margin-top:8px;"><strong style="font-size:11px;color:#0A2F5E;"><i class="bi bi-journals me-1"></i> Documents maîtres :</strong></div>`;
        docs.forEach(d=>{
          const ve = d.veille? `<span class="badge bg-warning text-dark" style="font-size:8px;">veille</span>`: `<span class="badge bg-light text-dark border" style="font-size:8px;">${d.categorie||''}</span>`;
          html+= `<div style="padding:6px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;margin-top:6px;">
            <strong style="font-size:11px;color:#0A2F5E;">${d.titre}</strong> ${ve}<br>
            <small style="color:#7c3aed;"><i class="bi bi-bookmark me-1"></i>${d.articles||''}</small> • <small style="color:#64748b;">${d.path||''}</small><br>
            <small style="font-size:10px;color:#475569;">Moteurs : ${(d.moteurs||[]).map(m=>`<span class="badge bg-light text-dark border" style="font-size:8px;">${m}</span>`).join(' ')}</small><br>
            <small><a href="${d.url_source||'#'}" target="_blank" style="color:#7c3aed;font-size:10px;">Source : ${d.url_source||'local'}</a> ${d.path? `• <a href="../${d.path}" target="_blank" style="font-size:10px;">Ouvrir doc</a>`:''}</small>
          </div>`;
        });
      }
      if(!docs.length && !moteur){
        html+= `<div class="alert alert-warning small p-2" style="font-size:11px;"><i class="bi bi-search me-1"></i>Aucun document trouvé pour « ${query} » — essayez : <code>Art.46</code>, <code>TPS</code>, <code>FEC</code>, <code>patente</code>, <code>ITS</code>, <code>OHADA</code>.</div>`;
        // fallback : list 3 docs les plus proches par moteur name
        if(bibData && bibData.documents){
          html+= `<div class="small text-muted" style="font-size:10px;">Suggestions : ${bibData.documents.slice(0,3).map(d=>d.titre.slice(0,40)).join(' • ')}</div>`;
        }
      }
      if(moteur && moteur.article){
        html+= `<div class="mt-2 small text-muted" style="font-size:10px;"><i class="bi bi-info-circle me-1"></i>Citation traçable : <strong>${moteur.article}</strong> — ${moteur.libelle} — consulté dans <code>${moteur.path||'moteurs-calcul-2026.json'}</code></div>`;
      }
    }
    html+= `</div>`;
    return html;
  }

  function injectWidget(){
    if(document.getElementById('gobexChatWidget')) return;
    const style=document.createElement('style');
    style.textContent=`
      #gobexChatBtn{position:fixed;bottom:18px;right:18px;z-index:1050;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0A2F5E 0%,#7c3aed 100%);color:#FFB81C;border:2px solid #FFB81C;box-shadow:0 8px 24px rgba(10,47,94,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s;font-size:22px;}
      #gobexChatBtn:hover{transform:scale(1.06);box-shadow:0 12px 32px rgba(124,58,237,.4);}
      #gobexChatWidget{position:fixed;bottom:84px;right:18px;z-index:1050;width:380px;max-width:92vw;height:480px;background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;}
      #gobexChatWidget.open{display:flex;}
      #gobexChatHeader{background:linear-gradient(135deg,#0A2F5E 0%,#1e3a5f 100%);color:#FFB81C;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;}
      #gobexChatHeader strong{font-family:Exo;font-weight:800;font-size:13px;}
      #gobexChatBody{flex:1;overflow-y:auto;padding:12px;background:#f8fafc;}
      #gobexChatInputBar{padding:8px;border-top:1px solid #e2e8f0;background:#fff;display:flex;gap:6px;}
      #gobexChatInput{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;font-size:11px;}
      .gobexChatMsg{margin-bottom:10px;padding:8px 10px;border-radius:12px;max-width:90%;font-size:11px;line-height:1.5;}
      .gobexChatMsg.user{margin-left:auto;background:#0A2F5E;color:#FFB81C;border-bottom-right-radius:4px;}
      .gobexChatMsg.bot{margin-right:auto;background:#fff;border:1px solid #e2e8f0;border-bottom-left-radius:4px;}
      .gobexChatQuick{font-size:10px;padding:4px 8px;border-radius:50px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;}
      .gobexChatQuick:hover{background:#f5f3ff;border-color:#7c3aed;color:#7c3aed;}
      @media(max-width:480px){#gobexChatWidget{right:8px;left:8px;width:auto;}}
    `;
    document.head.appendChild(style);

    const btn=document.createElement('button');
    btn.id='gobexChatBtn';
    btn.title='Assistant GOBEX — Guide rapide fiscalité & compta (bibliothèque)';
    btn.innerHTML='<i class="bi bi-robot"></i>';
    btn.onclick=()=> toggleChat();
    document.body.appendChild(btn);

    const widget=document.createElement('div');
    widget.id='gobexChatWidget';
    widget.innerHTML=`
      <div id="gobexChatHeader">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:28px;height:28px;border-radius:50%;background:#FFB81C;color:#0A2F5E;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">G</span>
          <div>
            <strong><i class="bi bi-stars me-1"></i>Assistant GOBEX</strong><br><small style="font-size:10px;opacity:.9;">Fiscalité & Compta — Bibliothèque CGI+OHADA</small>
          </div>
        </div>
        <div style="display:flex;gap:4px;">
          <a href="../docs/bibliotheque/bibliotheque.json" target="_blank" class="btn btn-sm" style="font-size:10px;background:rgba(255,184,28,.15);color:#FFB81C;border:1px solid #FFB81C;padding:2px 6px;" title="Ouvrir bibliothèque.json"><i class="bi bi-journal-text"></i></a>
          <a href="../admin/bibliotheque-admin.html" target="_blank" class="btn btn-sm" style="font-size:10px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);padding:2px 6px;" title="Admin bibliothèque"><i class="bi bi-gear"></i></a>
          <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border:none;padding:4px 8px;" onclick="toggleChat()"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>
      <div id="gobexChatBody">
        <div class="gobexChatMsg bot">
          <strong>Bonjour ! Je maîtrise votre bibliothèque.</strong><br>
          <small>CGI 2026 (L1-L3) + OHADA + LF 2023-25 + 38 moteurs RuleBase. Posez : « Art.178 », « calcul TPS », « FEC 18 champs », « patente »… Je cite l'article et le moteur.</small>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
            <button class="gobexChatQuick" onclick="quickAsk('Comment calculer la TPS 5% ?')">TPS 5%</button>
            <button class="gobexChatQuick" onclick="quickAsk('Art.178 TPS libératoire')">Art.178</button>
            <button class="gobexChatQuick" onclick="quickAsk('FEC OHADA 18 champs')">FEC</button>
            <button class="gobexChatQuick" onclick="quickAsk('Patente Art.196')">Patente</button>
          </div>
          <div style="margin-top:6px;font-size:10px;color:#64748b;"><i class="bi bi-book me-1"></i>Librairie : <code>docs/bibliotheque/bibliotheque.json</code> • <span id="gobexChatLibCount">chargement…</span></div>
        </div>
      </div>
      <div style="padding:0 12px 6px 12px;display:flex;gap:6px;flex-wrap:wrap;">
        <span style="font-size:10px;color:#64748b;">Veille hybride :</span>
        <span class="badge bg-light text-dark border" style="font-size:9px;">impots.bj</span><span class="badge bg-light text-dark border" style="font-size:9px;">ohada.org</span><span class="badge bg-light text-dark border" style="font-size:9px;">bceao.int</span>
        <span class="badge" style="background:#7c3aed;color:#fff;font-size:9px;">mensuelle</span>
      </div>
      <div id="gobexChatInputBar">
        <input id="gobexChatInput" placeholder="Ex: Art.46 taux IS, calcul ITS, OHADA..." onkeydown="if(event.key==='Enter') sendGobexChat()">
        <button class="btn btn-sm" style="background:#7c3aed;color:#fff;border-radius:10px;padding:6px 12px;" onclick="sendGobexChat()"><i class="bi bi-send"></i></button>
      </div>
    `;
    document.body.appendChild(widget);

    // expose globals for inline onclick
    window.toggleChat = toggleChat;
    window.sendGobexChat = sendGobexChat;
    window.quickAsk = (q)=>{ document.getElementById('gobexChatInput').value=q; sendGobexChat(); };

    loadBibliotheque().then(()=>{
      const el=document.getElementById('gobexChatLibCount');
      if(el && bibData) el.textContent = (bibData.documents?.length||0)+' docs • '+(bibData.sites_veille?.length||0)+' sites veille';
    });
  }

  function toggleChat(){
    const w=document.getElementById('gobexChatWidget');
    const b=document.getElementById('gobexChatBtn');
    if(!w) return;
    chatOpen=!w.classList.contains('open');
    w.classList.toggle('open', chatOpen);
    if(b) b.innerHTML = chatOpen? '<i class="bi bi-x-lg"></i>' : '<i class="bi bi-robot"></i>';
    if(chatOpen) setTimeout(()=> document.getElementById('gobexChatInput')?.focus(), 200);
  }

  async function sendGobexChat(){
    const inp=document.getElementById('gobexChatInput');
    const body=document.getElementById('gobexChatBody');
    if(!inp || !body) return;
    const q=inp.value.trim();
    if(!q) return;
    inp.value='';
    const userDiv=document.createElement('div');
    userDiv.className='gobexChatMsg user';
    userDiv.textContent=q;
    body.appendChild(userDiv);
    body.scrollTop=body.scrollHeight;
    // bot typing
    const botDiv=document.createElement('div');
    botDiv.className='gobexChatMsg bot';
    botDiv.innerHTML='<small style="color:#64748b;"><i class="bi bi-hourglass-split me-1"></i>Consultation bibliothèque…</small>';
    body.appendChild(botDiv);
    body.scrollTop=body.scrollHeight;
    try{
      const html=await answerQuery(q);
      botDiv.innerHTML=html;
    }catch(e){
      botDiv.innerHTML=`<span style="color:#dc3545;">Erreur : ${e.message}</span>`;
    }
    body.scrollTop=body.scrollHeight;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // inject after a short delay to not block
    setTimeout(injectWidget, 500);
  });
  // also expose for manual
  window.GobexBibliothequeChat={loadBibliotheque, searchBibliotheque, answerQuery};
})();
