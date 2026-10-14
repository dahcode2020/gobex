/**
 * GOBEX Bibliothèque Chat — Assistant conversationnel guide & assiste (offline, 100% RuleBase)
 * Comprendre la préoccupation → Réfléchir → Fouiller bibliothèque.json + moteurs-calcul-2026.json → Guider avec citation paragraphe
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
  let conversationHistory=[];
  let context={ lastIntent:null, lastMoteur:null, lastCA:null, pending:null, turn:0 };

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
      if(b){ bibData=b.data; console.log('[GOBEX Chat] bibliotheque',b.path, bibData.documents?.length); }
      const r=await tryFetch(RULE_PATHS);
      if(r){ ruleData=r.data; console.log('[GOBEX Chat] ruleBase',r.path, ruleData.version); }
      if(!bibData && ruleData){
        bibData={version:ruleData.version, documents:[
          {id:'ref_moteurs', titre:'Référentiel 38 moteurs RuleBase', path:'docs/moteurs-calcul-2026.json', articles:'Art.46 à Art.459', moteurs: (ruleData.moteurs_P1||[]).concat(ruleData.moteurs_P2||[]).map(m=>m.id) }
        ], sites_veille:[]};
      }
      bibLoaded=true;
    }catch(e){ console.error('loadBibliotheque',e); }
  }

  function normalize(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  function tokenize(q){ return normalize(q).split(/[^a-z0-9]+/).filter(t=>t.length>2); }

  // --- entity extraction ---
  function extractCA(query){
    const q = normalize(query);
    // patterns: 45M, 45 M, 50 millions, 12 000 000, 12.000.000, 500k
    let m;
    // 45M / 45 M / 50 millions
    m = query.match(/(\d[\d\s\.,]*)\s*(M\b|million|milliard|k\b|mille)/i);
    if(m){
      let numStr=m[1].replace(/[\s\.]/g,'').replace(',','.'); 
      let v=parseFloat(numStr);
      if(isNaN(v)) return null;
      const unit=m[2].toLowerCase();
      if(unit.startsWith('m') && !unit.startsWith('mil')){ // M
        // could be million, check if original had 'M' vs 'milliard'
        if(/milliard/i.test(query)) v*=1e9; else v*=1e6;
      } else if(unit.startsWith('k')||unit.includes('mille')) v*=1e3;
      else if(unit.includes('million')) v*=1e6;
      else if(unit.includes('milliard')) v*=1e9;
      return Math.round(v);
    }
    // plain number like 45000000 or 45 000 000
    m = query.match(/(\d[\d\s\.,]{4,})/);
    if(m){
      let raw=m[1].replace(/[\s]/g,'');
      // handle 45,5M already handled, here we handle plain
      // remove dots as thousand separator if comma is decimal? simple: remove spaces and dots, keep comma-> dot
      // try heuristic: if contains both . and , then . is thousand
      let cleaned = raw.replace(/\./g,'').replace(',','.');
      // if raw had spaces like 45 000 000 -> remove spaces already
      cleaned=cleaned.replace(/[^0-9\.]/g,'');
      let v=parseFloat(cleaned);
      if(!isNaN(v) && v>=1000) return Math.round(v);
    }
    return null;
  }
  function extractArticle(query){
    const m=query.match(/art\.?\s*(\d{1,3})\b/i);
    return m? parseInt(m[1]): null;
  }
  function formatMontant(n){
    if(n==null) return '—';
    return n.toLocaleString('fr-FR') + ' F';
  }
  function formatParagraphe(art){
    if(!art) return '';
    // Art.46 §1 -> Art.46, paragraphe 1
    return art.replace(/§\s*/g,'paragraphe ').replace(/\s+/g,' ').trim();
  }
  // Précision 2026-10-03 : helpers régime & forme juridique
  function detectFormeJuridique(query){
    const qn=normalize(query);
    if(/\b(sarl|sa\b|s\.a|sas|selarl|selas|gie|snc|scs|s\.a\.r\.l)/i.test(query)) return {soumisIS:true, label:'société morale (IS)'};
    if(/entreprise individuelle|\bei\b|personne physique|artisan|micro.?entreprise|auto.?entrepreneur|ei\b/i.test(qn)) return {soumisIS:false, label:'entreprise individuelle / personne physique (IBA)'};
    if(/sci|scm|societe civile/i.test(qn) && !/option is/i.test(qn)) return {soumisIS:false, label:'société civile (hors option IS) — IBA'};
    if(/option is|soumis.*is|opte.*is/i.test(qn)) return {soumisIS:true, label:'option IS'};
    return null;
  }
  function regimeLabelCA(ca){
    if(ca==null) return 'CA non précisé';
    if(ca<=50000000) return 'CA '+formatMontant(ca)+' ≤50M → TPS d\'office (non assujetti TVA)';
    return 'CA '+formatMontant(ca)+' >50M → hors TPS (IS/IBA + TVA)';
  }
  function hasEtatCompteMention(query){
    return /44[0-9]|443|445|447|441|442|etat|collectivit/i.test(query);
  }

  // --- intent detection ---
  const INTENT_KEYWORDS={
    salutation: ['bonjour','salut','coucou','hello','bonsoir','bjr','cc','hey'],
    tps: ['tps','taxe professionnelle synthetique','synthetique','liberatoire','art.178','art178','seuil 50','50m tps','ca 50m','cinquante million'],
    is: [' is ','impot societe','impot sur les societes','art.46','art46','minimum perception','mfp','art.47','resultat fiscal','societe soumise is','sarl is','sa is','associe','associes','personne morale'],
    iba: ['iba','benefice affaires','bic','art.63','art.64','entreprise individuelle','personne physique','non soumis is','bénéfice industriel','associe','associes'],
    tva: ['tva','valeur ajoutee','aib','prorata','mec ef','mecef','art.241','18%','collectee','art.223','seuil tva','non assujetti tva'],
    its: ['its','vps','salaire','traitement','paie','smig','cnss','barème','bareme','art.125','ortb','retenue salaire','447','etat retenue','collectivite'],
    tfu: ['tfu','fonciere unique','valeur locative'],
    tvm: ['tvm','vehicule moteur','carte grise cv'],
    patente: ['patente','licence boisson'],
    fec: ['fec','ohada','syscohada','audcif','balance','grand livre','ecriture comptable','18 champs','21 champs','ca constate','fichier comptable','capital dossier'],
    article: ['art.','article'],
    calcul: ['calcul','combien','payer','montant','cout','estimer','simulation','prix','du ','dû'],
    seuil: ['seuil','plafond','limite','depassement','dépassement','50m','50 m','ca constate','ca dossier'],
    procedure: ['comment','demarche','declarer','déclarer','echeance','échéance','quand','ou payer','ou déclarer','procedure','formalite'],
    thanks: ['merci','thanks','super','parfait']
  };

  function detectIntent(query){
    const qn=normalize(query);
    const tokens=tokenize(query);
    let scores={};
    for(const intent in INTENT_KEYWORDS){
      let sc=0;
      INTENT_KEYWORDS[intent].forEach(kw=>{
        const kn=normalize(kw);
        if(qn.includes(kn)) sc+= (kw.length>4? 3:2);
        // token partial
        tokens.forEach(t=>{ if(kn.includes(t) && t.length>3) sc+=0.5; });
      });
      scores[intent]=sc;
    }
    // boost moteur id direct
    if(ruleData){
      const all=[...(ruleData.moteurs_P1||[]), ...(ruleData.moteurs_P2||[])];
      all.forEach(m=>{
        if(qn.includes(normalize(m.id))) scores[m.id]? scores[m.id]+=5 : null;
        // map moteur id to intent
        const map={tps:'tps', is:'is', iba:'iba', tva:'tva', its:'its', vps:'its', tfu:'tfu', tvm:'tvm', patente:'patente', licence:'patente', irf:'is', ircm:'is', tpvi:'is', taxe_sejour:'procedure', taxe_com:'procedure'};
        if(map[m.id] && qn.includes(m.id)) scores[map[m.id]]=(scores[map[m.id]]||0)+4;
      });
    }
    // detect article explicit
    const artNum=extractArticle(query);
    if(artNum){
      scores['article']=(scores['article']||0)+6;
      if(artNum>=178 && artNum<=190) scores['tps']=(scores['tps']||0)+4;
      if(artNum>=46 && artNum<=53) scores['is']=(scores['is']||0)+4;
      if(artNum>=119 && artNum<=129) scores['its']=(scores['its']||0)+4;
      if(artNum>=223 && artNum<=263) scores['tva']=(scores['tva']||0)+4;
    }
    // isCalcul flag
    const isCalcul = /calcul|combien|montant|estimer|simulation|payer|cout|prix/.test(qn) || extractCA(query)!=null;
    // salutation has priority if starts with bonjour
    if(/^\s*(bonjour|salut|coucou|hello|bjr|hey)/i.test(query) && query.trim().split(/\s+/).length<=6) {
      return {primary:'salutation', scores, isCalcul, artNum};
    }
    // pick primary
    let best='general', bestScore=0;
    for(const k in scores){ if(scores[k]>bestScore){ bestScore=scores[k]; best=k; } }
    if(bestScore===0) best='general';
    // if calcul wins but a specific tax intent is close, prefer specific (guide mieux que générique)
    if(best==='calcul' && isCalcul){
      let secondBest=null, secondScore=0;
      for(const k in scores){ if(k!=='calcul' && scores[k]>secondScore){ secondScore=scores[k]; secondBest=k; } }
      if(secondBest && secondScore>=2.5) { best=secondBest; bestScore=secondScore; }
    }
    // Précision 2026-10-03 (1)(2)(3) : CA constaté fait foi, ≤50M TPS non TVA, >50M IS vs IBA selon forme
    const caTmp = extractCA(query);
    const formeInfo = detectFormeJuridique(query);
    // TVA : si CA ≤50M, forcer TPS et bloquer TVA (non assujetti)
    if(caTmp!=null && caTmp <= 50000000 && (best==='tva' || qn.includes('tva'))){
      // rester en TPS par défaut, sauf option Art.225 explicite
      if(!qn.includes('option') && !qn.includes('opte')){
        best='tps'; bestScore=Math.max(bestScore, 4);
        scores['tps']=(scores['tps']||0)+5;
      }
    }
    // CA seul sans mot-clé impôt : inférence TPS vs IS/IBA par seuil 50M
    if(caTmp!=null && (best==='general' || best==='calcul')){
      if(caTmp <= 50000000) { best='tps'; bestScore=Math.max(bestScore, 3); }
      else if(caTmp > 50000000) {
        if(formeInfo && formeInfo.soumisIS===false) { best='iba'; bestScore=Math.max(bestScore, 4); }
        else { best='is'; bestScore=Math.max(bestScore, 3); }
      }
    }
    // IBA vs IS selon forme juridique explicite
    if(formeInfo && caTmp!=null && caTmp>50000000){
      if(formeInfo.soumisIS===false) { scores['iba']=(scores['iba']||0)+4; if(best==='is') { best='iba'; bestScore=scores['iba']; } }
      if(formeInfo.soumisIS===true) { scores['is']=(scores['is']||0)+4; if(best==='iba') { best='is'; bestScore=scores['is']; } }
    }
    // Précision 4 : comptes État 44* → booster TVA/ITS/VPS/AIB
    if(hasEtatCompteMention(query)){
      ['tva','its','aib'].forEach(k=>{ scores[k]=(scores[k]||0)+1.5; });
    }
    // thanks handling
    if(scores['thanks']>2 && bestScore<=2) best='thanks';
    return {primary:best, scores, isCalcul, artNum, bestScore};
  }

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
    if(/art\.\s*\d+/i.test(queryNorm)){
      const m=queryNorm.match(/art\.\s*(\d+)/i);
      if(m && normalize(doc.articles).includes('art.'+m[1])) score+=10;
    }
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
      // article exact
      const artNum=queryNorm.match(/art\.\s*(\d+)/);
      if(artNum && m.article && m.article.includes(artNum[1])) s+=8;
      if(s>bestScore){ bestScore=s; best=m; }
    });
    return bestScore>1? best : null;
  }

  async function searchBibliotheque(query){
    await loadBibliotheque();
    const qNorm=normalize(query);
    const tokens=tokenize(query);
    if(!bibData) return {docs:[], moteur:null};
    const scored = (bibData.documents||[]).map(d=> ({doc:d, score: scoreDoc(d,tokens,qNorm)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
    const moteur = findMoteur(qNorm);
    return {docs: scored.map(s=>s.doc), moteur, tokens, rawScores:scored};
  }

  function getMoteurById(id){
    if(!ruleData) return null;
    const all=[...(ruleData.moteurs_P1||[]), ...(ruleData.moteurs_P2||[])];
    return all.find(m=>m.id===id)||null;
  }

  // --- conversational composition ---
  function intentLabel(primary){
    const map={
      salutation:'salutation',
      tps:'TPS (taxe professionnelle synthétique)',
      is:'IS (impôt sur les sociétés)',
      iba:'IBA',
      tva:'TVA & AIB',
      its:'ITS / VPS (salaires)',
      tfu:'TFU',
      tvm:'TVM',
      patente:'Patente / Licence',
      fec:'FEC & OHADA',
      article:'référence article',
      calcul:'calcul / estimation',
      seuil:'seuil & régime',
      procedure:'démarche & échéance',
      general:'votre question',
      thanks:'remerciement'
    };
    return map[primary]||primary;
  }

  function getSuggestions(primary){
    const map={
      tps: ['J\'ai 32M de CA, combien ?', 'Mon CA dépasse 50M, je bascule ?', 'Échéances TPS ?', 'TPS libère quoi exactement ?'],
      is: ['IS 30% vs 25% industriel ?', 'MFP Art.47 : 1% / 3% / 10% ?', 'Acomptes IS quand ?', 'Comment calculer résultat fiscal ?'],
      tva: ['Seuil TVA 50M ?', 'TVA 18% + prorata ?', 'Facture MECeF obligatoire ?', 'TVA déductible ?'],
      its: ['Barème ITS 0-30% ?', 'SMIG 52 000 F ?', 'VPS 4% / 2% ?', 'ORTB 1 000 / 3 000 F ?'],
      fec: ['Exemple FEC 18 champs ?', 'Mapping OHADA 70* ?', 'Alternative sans FEC ?', 'Balance vs FEC ?'],
      patente: ['Patente fixe + proportionnel ?', 'Licence boisson ?', 'Marché 0,5% ?'],
      general: ['Comment calculer la TPS ?', 'Art.178 libératoire ?', 'FEC OHADA 18 champs ?', 'Barème ITS ?']
    };
    return map[primary]||map.general;
  }

  function computeTPSExample(ca){
    if(ca==null) return null;
    const base = Math.round(ca*0.05);
    const tpsHorsORTB = Math.max(base, 10000);
    const total = tpsHorsORTB + 4000;
    return {base, tpsHorsORTB, total};
  }

  function buildReflectionHtml(query, intentInfo, entities, searchRes){
    const artTxt = entities.article? `Art.${entities.article}` : '—';
    const caTxt = entities.ca? formatMontant(entities.ca) : 'non précisé';
    const moteurTxt = searchRes.moteur? `${searchRes.moteur.id.toUpperCase()} — ${searchRes.moteur.libelle.slice(0,60)}` : 'aucun moteur détecté';
    const docsTxt = searchRes.docs.length? searchRes.docs.map(d=>d.titre.slice(0,35)).join(' ; ') : 'aucun doc exact';
    return `<details style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:6px 8px;margin-bottom:8px;"><summary style="cursor:pointer;font-size:10px;color:#475569;font-weight:600;"><i class="bi bi-search me-1"></i>Ma réflexion <span style="font-weight:400;color:#64748b;">— comment j'ai compris</span></summary>
      <div style="font-size:10px;color:#334155;line-height:1.6;margin-top:6px;">
        <div><strong>1. Votre besoin :</strong> ${intentLabel(intentInfo.primary)} ${intentInfo.isCalcul? '• intention <em>calcul</em> détectée':''} — <em>"${query.slice(0,90)}"</em></div>
        <div><strong>2. Indices :</strong> CA = ${caTxt} • Article = ${artTxt} • Mots-clés = ${(searchRes.tokens||[]).slice(0,6).join(', ')||'—'}</div>
        <div><strong>3. Fouille bibliothèque v${bibData?.version||'2026'} :</strong> ${searchRes.docs.length} doc(s) — ${docsTxt} • Moteur = ${moteurTxt}</div>
        <div><strong>4. Règle mobilisée :</strong> ${searchRes.moteur? formatParagraphe(searchRes.moteur.article||'') : (entities.article? `Art.${entities.article}` : 'RuleBase 2026')}</div>
      </div></details>`;
  }

  function formatMoteurCard(m, caForCalc){
    if(!m) return '';
    const taux = m.taux ? JSON.stringify(m.taux).slice(0,140) : (m.formule? m.formule.slice(0,120):'');
    let calculExample='';
    if(m.id==='tps' && caForCalc){
      const ex=computeTPSExample(caForCalc);
      if(ex) calculExample=`<div style="margin-top:6px;padding:6px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;"><strong style="color:#065f46;"><i class="bi bi-calculator me-1"></i>Simulation pour ${formatMontant(caForCalc)} :</strong><br><span style="font-size:11px;color:#064e3b;">${formatMontant(caForCalc)} × 5 % = ${formatMontant(ex.base)} → max(10 000) = ${formatMontant(ex.tpsHorsORTB)} + 4 000 ORTB = <strong>${formatMontant(ex.total)}</strong></span><br><small style="color:#047857;">Art.183, paragraphes 1 à 3 — due par commune/établissement</small></div>`;
    }
    const articlePretty = formatParagraphe(m.article||'');
    return `<div style="margin-top:8px;padding:10px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;font-size:11px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <strong style="color:#0A2F5E;"><i class="bi bi-cpu me-1" style="color:#7c3aed;"></i>${m.libelle} <span class="badge bg-light text-dark border" style="font-size:9px;">${m.id.toUpperCase()}</span></strong>
        <span class="badge" style="background:#0A2F5E;color:#FFB81C;font-size:9px;">${articlePretty||''}</span>
      </div>
      <div style="color:#64748b;font-size:10px;">${(m.livre||'')} • ${articlePretty}</div>
      <div style="margin-top:4px;color:#334155;"><small>${(m.formule||'').slice(0,220)}${m.formule&&m.formule.length>220?'…':''}</small></div>
      <small style="color:#7c3aed;">RuleBase : <code style="font-size:10px;">${taux||'voir JSON'}</code></small>
      ${calculExample}
      <div class="mt-2 d-flex gap-2">
        <button class="btn btn-sm py-1 px-2" style="font-size:10px;background:#7c3aed;color:#fff;border-radius:20px;" onclick="try{ toggleMoteur('${m.id}',true); toast('Moteur','${m.id.toUpperCase()} appliqué','success'); }catch(e){ quickAsk('Appliquer ${m.id.toUpperCase()}') }"><i class="bi bi-lightning me-1"></i>Appliquer ${m.id.toUpperCase()}</button>
        <button class="btn btn-sm py-1 px-2 btn-light border" style="font-size:10px;border-radius:20px;" onclick="quickAsk('Explique ${m.id.toUpperCase()} Art.${(m.article||'').match(/\\d+/)?.[0]||''} en détail')"><i class="bi bi-info-circle me-1"></i>Détail</button>
      </div>
    </div>`;
  }

  function composeConversationalAnswer(query, intentInfo, entities, searchRes){
    const primary=intentInfo.primary;
    const ca=entities.ca!=null? entities.ca : context.lastCA;
    const hasCA = ca!=null;
    const moteur=searchRes.moteur;
    const docs=searchRes.docs;
    const artNum=entities.article || intentInfo.artNum;
    let html = `<div style="font-size:11px;line-height:1.7;color:#334155;">`;
    // reflection
    html+= buildReflectionHtml(query, intentInfo, {...entities, ca}, searchRes);

    // --- empathetic intro per intent ---
    let intro='';
    if(primary==='salutation'){
      intro=`<div style="background:linear-gradient(135deg,#0A2F5E 0%,#1e3a5f 100%);color:#FFB81C;padding:10px;border-radius:10px;margin-bottom:8px;">
        <strong>Bonjour ! Je suis votre guide GOBEX. 👋</strong><br><span style="color:#fff;font-size:11px;">Je comprends vos préoccupations fiscales & comptables, je fouille <em>à chaque question</em> la bibliothèque CGI 2026 + OHADA + LF + 38 moteurs, et je vous réponds pas à pas — avec l'article exact et le calcul traçable.</span>
      </div>
      <div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <strong style="color:#0A2F5E;">Comment puis-je vous assister aujourd'hui ?</strong><br>
        <small>Exemples : <em>« Mon CA est de 45M, que dois-je payer ? »</em> • <em>« Explique l'Art.178 »</em> • <em>« Mon FEC est incomplet »</em></small>
      </div>`;
      html+=intro;
    } else if(primary==='thanks'){
      html+= `<div style="padding:8px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;"><strong style="color:#065f46;">Avec plaisir ! 🙏</strong><br><small>Je reste disponible pour toute autre question — calcul, FEC, OHADA ou article. N'hésitez pas.</small></div>`;
    } else {
      // generic empathetic header
      let empathy='';
      if(primary==='tps'){
        empathy = `Je comprends : vous vous demandez si vous relevez de la <strong>TPS</strong> et combien vous auriez réellement à payer. C'est une préoccupation très courante pour les petites activités.`;
      } else if(primary==='is'){
        empathy = `Je vois que vous vous interrogez sur l'<strong>IS</strong> — taux, minimum de perception et acomptes. Je vais vous guider clairement.`;
      } else if(primary==='tva'){
        empathy = `Vous souhaitez y voir clair sur la <strong>TVA</strong> (seuil, taux 18 %, déductible). Je fouille la bibliothèque L2 pour vous répondre précisément.`;
      } else if(primary==='its'){
        empathy = `Vous pensez aux <strong>salaires & ITS/VPS</strong> — barème, SMIG, ORTB. Je vous explique le cheminement paie.`;
      } else if(primary==='fec'){
        empathy = `Vous préparez votre <strong>compta OHADA / FEC</strong>. C'est le cœur de la fiabilité — je vous guide sur les 18 champs et les alternatives.`;
      } else if(primary==='article' && artNum){
        empathy = `Vous cherchez l'<strong>Art.${artNum}</strong> précisément. Je vais vous l'expliquer avec le moteur associé.`;
      } else if(primary==='patente'){
        empathy = `Vous vous interrogez sur <strong>patente / licence</strong> — droit fixe + proportionnel. Je vous détaille.`;
      } else if(intentInfo.isCalcul){
        empathy = `Je comprends que vous voulez <strong>estimer un montant</strong> à payer. Je vais fouiller la règle exacte et vous faire une simulation traçable.`;
      } else {
        empathy = `J'ai bien saisi votre question sur <strong>${intentLabel(primary)}</strong>. Je fouille la bibliothèque pour vous répondre pas à pas.`;
      }
      html+= `<div style="display:flex;gap:8px;align-items:flex-start;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:8px;margin-bottom:6px;">
        <span style="width:28px;height:28px;border-radius:50%;background:#0A2F5E;color:#FFB81C;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">G</span>
        <div style="flex:1;"><strong style="color:#0A2F5E;font-size:11px;">💬 Je comprends votre préoccupation</strong><br><span style="font-size:11px;color:#1e3a5f;">${empathy}</span></div>
      </div>`;
    }

    if(primary==='salutation' || primary==='thanks'){
      // add quick suggestions
      const sug=getSuggestions('general');
      html+= `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">${sug.map(s=>`<button class="gobexChatQuick" onclick="quickAsk('${s.replace(/'/g,"\\'")}')">${s}</button>`).join('')}</div>`;
      // docs minimal
      html+= `</div>`;
      return html;
    }

    // --- core answer per intent --- (précision associé)
    let core='';
    // Cas spécifique : question sur associés d'une société IS → IBA perso (exclusif)
    if(/associ/i.test(query)){
      const caAssoc=ca;
      const formeAssoc=detectFormeJuridique(query);
      const mIsAssoc=getMoteurById('is')||moteur;
      const mIbaAssoc=getMoteurById('iba');
      const isSociete = formeAssoc ? formeAssoc.soumisIS : (primary==='is' || (moteur && moteur.id==='is'));
      // Toujours expliquer le principe d'exclusivité + deux niveaux
      core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <strong style="color:#0A2F5E;"><i class="bi bi-people me-1"></i>Société à l'IS (personne morale) et associés à l'IBA/IRCM — deux niveaux d'imposition, jamais la même entreprise</strong><br>
        <span style="font-size:11px;">Une même entreprise <strong>ne peut être soumise à l'IS et à l'IBA</strong> : la <strong>société</strong> (personne morale, SARL/SA/SAS) relève de l'<strong>IS</strong> (Art.46-47, 30%/25% + MFP 1%/3%/10%) sur son résultat ; ses <strong>associés</strong> (personnes physiques) relèvent de l'<strong>IBA</strong> (Art.63-64, 30%/25% + MFP 1,5%/3%/10%) ou de l'<strong>IRCM</strong> (Art.68-86, 5%/10%/15% sur dividendes) <strong>à titre personnel</strong> sur les distributions/quotes-parts — pas la société.</span>
        <div style="margin-top:6px;padding:6px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;font-size:11px;">
          <strong>Quand ?</strong> CA société >50M constaté (FEC 70*) → IS dû par la société ; CA EI >50M → IBA dû par l'EI. TPS ≤50M → ni IS ni IBA pour la société (TPS libératoire Art.178).<br>
          ${caAssoc? `<strong>Votre CA ${formatMontant(caAssoc)} :</strong> ${caAssoc<=50000000? 'TPS d\'office — ni IS ni IBA (société)' : (isSociete? 'IS pour la société' : 'IBA pour l\'EI')} + IBA/IRCM perso pour les associés sur leurs revenus.` : ''}
          <br><small><strong>Comptes État prioritaires :</strong> 441 IS société, 443/445 TVA, 447 retenues AIB/ITS/VPS, 76* produits financiers — leur mouvement dans FEC/balance confirme le niveau (précision 4).</small><br>
          <small style="color:#4c1d95;">Traçabilité : IS Art.46-47, IBA Art.63-64, IRCM Art.68-86 — RuleBase 2026.</small>
        </div>
        ${formeAssoc? `<div style="margin-top:6px;padding:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:10px;"><strong>Forme détectée :</strong> ${formeAssoc.label} → ${formeAssoc.soumisIS? 'IS société' : 'IBA EI'} (exclusif).</div>` : `<div style="margin-top:6px;padding:6px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;font-size:10px;"><i class="bi bi-lightbulb me-1"></i>Précisez : <strong>SARL/SA → IS société</strong>, <strong>EI → IBA</strong> — la même entité jamais les deux. Ex : SARL 80M → IS société + IBA/IRCM associés.</div>`}
      </div>`;
      if(mIsAssoc) core+= formatMoteurCard(mIsAssoc, caAssoc);
      if(mIbaAssoc && (!mIsAssoc || mIbaAssoc.id!==mIsAssoc.id)) core+= formatMoteurCard(mIbaAssoc, caAssoc);
      // ajouter suggestion et bypass le reste
      html+= core;
      // docs + citation + suggestions
      if(mIsAssoc && mIsAssoc.article){
        html+= `<div class="mt-2 small text-muted" style="font-size:10px;border-top:1px dashed #e2e8f0;padding-top:6px;"><i class="bi bi-shield-check me-1" style="color:#16a34a;"></i>Citation traçable : <strong>${formatParagraphe(mIsAssoc.article)}</strong> + IBA/IRCM Art.63-68 — <code>RuleBase 2026</code> • v${ruleData?.version||bibData?.version||'2026'}</div>`;
      }
      const sugAssoc=getSuggestions('is');
      if(sugAssoc && sugAssoc.length){
        html+= `<div style="margin-top:8px;"><small style="color:#64748b;font-size:10px;">Poursuivre :</small><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">${sugAssoc.slice(0,4).map(s=>`<button class="gobexChatQuick" onclick="quickAsk('${s.replace(/'/g,"\\'")}')">${s}</button>`).join('')}</div></div>`;
      }
      context.lastIntent=primary;
      if(mIsAssoc) context.lastMoteur=mIsAssoc;
      if(caAssoc) context.lastCA=caAssoc;
      context.turn++;
      html+= `</div>`;
      return html;
    }
    if(primary==='tps' || (moteur && moteur.id==='tps')){
      const m = getMoteurById('tps') || moteur;
      if(!hasCA){
        core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
          <strong style="color:#0A2F5E;">🔎 Ce que dit la bibliothèque — Art.178 & Art.183 & Art.223</strong><br>
          <span style="font-size:11px;">La <strong>TPS est due d'office par défaut</strong> si votre CA annuel ≤ <strong>50 M F</strong> (seuil arrêté ministre — Art.178, paragraphe 1). Elle est <strong>libératoire</strong> de 4 impôts : IBA + Patente + Licence + VPS. <strong>Vous êtes alors non assujetti à la TVA</strong> (Art.223 seuil 50M) sauf option Art.225. <br>Au-delà de 50M, bascule à l'IS ou IBA de plein droit le mois suivant (Art.182) et TVA due 18%.</span><br>
          <div style="margin-top:6px;padding:6px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;font-size:11px;">
            <strong>Formule RuleBase (Art.183, paragraphes 1 à 3) :</strong><br>
            TPS = max(CA × <strong>5 %</strong>, 10 000 F) + <strong>4 000 F</strong> ORTB — due <em>par commune et par établissement</em> (Art.183, paragraphe 4)<br>
            <small>Échéances : 10/02 et 10/06 (acomptes sur N-1) + solde 30/04 (Art.185)</small>
          </div>
          <div style="margin-top:6px;padding:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:10px;"><strong>⚠️ CA à retenir (précision 2026) :</strong> c'est le <strong>CA constaté dans vos fichiers comptables</strong> (FEC 70*, balance, livre — <code>bibliotheque.json</code> mapping_ohada) qui fait foi, pas le CA ou le capital du dossier/tableau de bord. Si écart dossier vs FEC, le FEC prime et un reclassement Art.182 paragraphe 4 peut s'appliquer.</div>
          <div style="margin-top:6px;font-size:11px;color:#92400e;"><i class="bi bi-lightbulb me-1"></i><strong>Pour vous guider précisément</strong>, quel est votre chiffre d'affaires annuel HT <strong>constaté en compta</strong> ? <em>Ex : 32M, 45 000 000 F, 12M</em><br>Indiquez-le et je vous donne le montant exact + échéances + ce que la TPS vous évite.</div>
        </div>`;
        context.pending='tps_ca';
        context.lastIntent='tps';
      } else {
        const isTPS = ca <= 50000000;
        const ex=computeTPSExample(ca);
        const formeInfo2 = detectFormeJuridique(query) || (context.lastIntent==='iba'? {soumisIS:false, label:'IBA'} : null);
        const etatHint = hasEtatCompteMention(query)? `<div style="margin-top:6px;padding:6px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:10px;"><i class="bi bi-bank me-1" style="color:#92400e;"></i><strong>Comptes État/collectivités détectés (443/445/447/441) :</strong> je porte une attention particulière aux écritures avec l'État — retenues AIB/ITS/VPS et TVA collectée/déductible sont vérifiées en priorité (précision 2026-10-03, point 4).</div>` : '';
        if(isTPS){
          core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
            <strong style="color:#065f46;"><i class="bi bi-check-circle me-1"></i>Avec ${formatMontant(ca)} → vous êtes bien en TPS <span class="badge bg-success" style="font-size:9px;">d'office</span></strong><br>
            <span style="font-size:11px;">CA ≤ 50 M → <strong>régime TPS d'office par défaut</strong> (Art.178, paragraphe 1). Vous <strong>n'aurez pas</strong> à payer séparément : IBA, patente, licence et VPS — inclus. <strong>Et vous êtes non assujetti à la TVA</strong> (Art.223) — pas de TVA collectée/déductible à déclarer, sauf option Art.225.</span>
            <div style="margin-top:6px;padding:8px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;">
              <strong style="color:#065f46;">Votre estimation traçable (Art.183) — CA constaté FEC :</strong><br>
              <span style="font-size:11px;color:#064e3b;">${formatMontant(ca)} × 5 % = ${formatMontant(ex.base)} → plancher 10 000 F → ${formatMontant(ex.tpsHorsORTB)} + 4 000 F ORTB = <strong style="font-size:12px;">${formatMontant(ex.total)} / an</strong></span><br>
              <small style="color:#047857;">Par commune/établissement (Art.183, paragraphe 4) — 50 % État / 50 % collectivité (Art.190)</small><br>
              <small style="color:#334155;">Échéances : <strong>10/02</strong> (acompte), <strong>10/06</strong> (acompte), <strong>solde 30/04</strong> (Art.185, paragraphes 1-2) — forains : intégral avant 01/03 (Art.189)</small>
            </div>
            <div style="margin-top:6px;padding:6px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;font-size:10px;color:#475569;"><strong>CA retenu :</strong> CA constaté fichiers comptables (FEC/balance/livre) fait foi — pas le CA capital du dossier. Si votre dossier indiquait un CA différent, le <strong>FEC prime</strong> (reclassement Art.182 paragraphe 4 possible).</div>
            ${etatHint}
            <div style="margin-top:6px;font-size:10px;color:#64748b;"><i class="bi bi-info-circle me-1"></i>Citation : <strong>${formatParagraphe(m? m.article : 'Art.183, paragraphes 1-3')}</strong> — ${m? m.libelle : 'TPS'} • v${bibData?.version||'2026'} • Art.223 non-assujetti TVA</div>
          </div>`;
          core+= `<div style="margin-top:6px;padding:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:11px;"><strong style="color:#0A2F5E;">Prochaine étape utile :</strong> Voulez-vous que j'applique le moteur <strong>TPS</strong> (et masque IBA/patente/TVA) dans le calculateur ? Ou que je simule avec un autre CA constaté ?</div>`;
        } else {
          // >50M : IS vs IBA selon forme
          const soumisISLabel = formeInfo2 ? (formeInfo2.soumisIS? 'IS' : 'IBA') : 'IS/IBA';
          const isIBAcas = formeInfo2 && formeInfo2.soumisIS===false;
          const labelImp = isIBAcas? 'IBA' : (formeInfo2 && formeInfo2.soumisIS===true? 'IS' : 'IS (ou IBA si non soumis à IS)');
          const detailImp = isIBAcas? 'IBA à 30 % (25 % école) + MFP 1,5 % (3 % BTP / 10 % immo) min 250 000 F + 4 000 ORTB (Art.63-64)' : 'IS à 30 % (25 % industriel/école) + MFP 1 % (3 % BTP / 10 % immo) min 250 000 F (Art.46-47)';
          core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
            <strong style="color:#b91c1c;"><i class="bi bi-exclamation-triangle me-1"></i>Avec ${formatMontant(ca)} → vous dépassez le seuil TPS</strong><br>
            <span style="font-size:11px;">CA > 50 M → vous <strong>n'êtes plus en TPS</strong> mais à l'<strong>${labelImp} de plein droit</strong> dès le mois suivant le dépassement (Art.182, paragraphe 1). TPS déjà payée imputée 50/50 (Art.182, paragraphe 3). <strong>TVA devient due 18 %</strong> (Art.241) sauf exon.</span>
            <div style="margin-top:6px;padding:6px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:11px;">
              <strong>Ce qui change (${labelImp}) :</strong> ${detailImp} — et patente/licence/VPS redeviennent dus séparément.<br>
              ${formeInfo2? `<small style="color:#7f1d1d;">Forme détectée : <strong>${formeInfo2.label}</strong> → ${isIBAcas? 'IBA' : 'IS'} retenu (précision 2026-10-03 point 3, exclusif — même entreprise jamais IS+IBA ; société IS → associés IBA/IRCM perso).</small>` : `<small style="color:#92400e;"><i class="bi bi-question-circle me-1"></i>Précisez votre forme (SARL/SA → IS, EI/personne physique → IBA) — exclusif pour la même entreprise ; société IS et associés IBA perso.</small>`}
            </div>
            ${etatHint}
            <small style="color:#64748b;">Voulez-vous une simulation ${isIBAcas? 'IBA':'IS'} pour ce CA constaté ?</small>
          </div>`;
        }
        context.lastCA=ca;
        context.lastMoteur=m;
        context.pending=null;
      }
    } else if(primary==='is' || primary==='iba' || (moteur && (moteur.id==='is' || moteur.id==='iba'))){
      const m = moteur && (moteur.id==='is'||moteur.id==='iba')? moteur : (getMoteurById('is')|| getMoteurById('iba'));
      const formeInfo3 = detectFormeJuridique(query);
      let isIBA = primary==='iba' || (m && m.id==='iba');
      // Précision 3 : si forme détectée, forcer IS vs IBA
      if(formeInfo3){
        isIBA = !formeInfo3.soumisIS;
      } else if(ca!=null && ca>50000000 && primary==='is' && !formeInfo3){
        // garder IS par défaut, mais suggérer vérification
      }
      const label = isIBA? 'IBA' : 'IS';
      const articleTxt = isIBA? 'Art.63 (taux) + Art.64 (MFP)' : 'Art.46 (taux) + Art.47 (MFP)';
      const etatHint2 = hasEtatCompteMention(query)? `<div style="margin-top:6px;padding:6px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:10px;"><i class="bi bi-bank me-1" style="color:#92400e;"></i><strong>Comptes État 44* mouvementés :</strong> vérifiez 441 (IS dû), 447 (retenues), 443/445 (TVA) — ils confirment les impôts dus.</div>` : '';
      const formeNote = formeInfo3? `<div style="margin-top:6px;padding:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:10px;"><strong>Forme détectée :</strong> ${formeInfo3.label} → <strong>${label} retenu</strong> (précision 2026-10-03 point 3 : IBA si CA>50M et non soumis IS, exclusif).<br><small style="color:#475569;">Rappel : une même entreprise ne peut être IS et IBA — une société à l'IS (personne morale) et ses associés à l'IBA/IRCM à titre personnel (dividendes, quotes-parts Art.68-69).</small></div>` : `<div style="margin-top:6px;padding:6px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;font-size:10px;"><i class="bi bi-question-circle me-1"></i><strong>IS ou IBA ? Exclusif.</strong> Précisez : <strong>SARL/SA/SAS → IS</strong>, <strong>EI / personne physique / artisan → IBA</strong>. Sans précision, je détaille IS par défaut (exclusif : même entité jamais IS+IBA).<br><small>Une société à l'IS et ses associés à l'IBA/IRCM personnel.</small></div>`;
      core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <strong style="color:#0A2F5E;">${label} — ${formatParagraphe(articleTxt)}</strong><br>
        <span style="font-size:11px;">${isIBA? 'Bénéfice BIC/BNC (EI/physique)' : 'Résultat fiscal (société morale)'} × <strong>30 %</strong> (25 % industriel hors extractive / écoles privées — Art.46, paragraphe 1) — le plus élevé entre ce théorique et le <strong>minimum de perception</strong> (MFP). <em>Exclusif : même entreprise jamais IS et IBA.</em></span><br>
        <div style="margin-top:6px;padding:6px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;font-size:11px;">
          <strong>MFP (Art.47) :</strong> max(250 000 F, CA encaissable × <strong>${isIBA? '1,5 %' : '1 %'}</strong> général / 3 % BTP / 10 % immo) — station 0,60 F/L + 4 000 F ORTB au 10/03<br>
          ${m && m.formule? `<small style="color:#4c1d95;">Formule : ${m.formule.slice(0,160)}…</small>`:''}
        </div>
        ${formeNote}
        ${hasCA? `<div style="margin-top:6px;font-size:11px;color:#334155;">Avec CA constaté <strong>${formatMontant(ca)}</strong> : MFP indicatif = ${formatMontant(Math.max(250000, Math.round(ca*(isIBA?0.015:0.01))))} (+ 4 000 ORTB). Le résultat fiscal reste nécessaire — le FEC (18 champs OHADA) donne le plus juste. CA dossier ≠ CA FEC ? Le <strong>FEC prime</strong>.</div>` : `<div style="margin-top:6px;font-size:11px;color:#92400e;"><i class="bi bi-lightbulb me-1"></i>Indiquez votre <strong>CA constaté en compta</strong> et je vous donne l'IS/IBA exact (théorique vs MFP).</div>`}
        ${etatHint2}
      </div>`;
      context.lastMoteur=m;
    } else if(primary==='tva' || (moteur && moteur.id==='tva')){
      const m=getMoteurById('tva')||moteur;
      const isTPSca = hasCA && ca<=50000000;
      const etatHintTva = hasEtatCompteMention(query)? `<div style="margin-top:6px;padding:6px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:10px;"><i class="bi bi-bank me-1" style="color:#92400e;"></i><strong>Comptes État 443/445/447 détectés :</strong> TVA collectée 443*, déductible 445*, retenues 447* — ils confirment l'assujettissement (piste prioritaire précision 4).</div>` : '';
      if(isTPSca){
        core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
          <strong style="color:#065f46;">TVA — non assujetti (Art.223) car TPS d'office</strong><br>
          <span style="font-size:11px;">Avec CA constaté <strong>${formatMontant(ca)} ≤50M</strong> → vous êtes en <strong>TPS d'office</strong> et <strong>non assujetti à la TVA</strong> (Art.223). Pas de TVA à collecter ni à déduire, sauf <strong>option Art.225</strong> (lettre, réponse 8j, compta OHADA + expert/CCA, compte pro, enseigne Art.463).</span>
          <div style="margin-top:6px;padding:6px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;font-size:11px;">
            Si vous étiez assujetti (CA>50M) : TVA due = TVA collectée (CA ×18% Art.241) − TVA déductible × prorata (Art.248) — prorata ceil((taxable+export)/total×100) hors Art.249 paragraphe 2, régul. 30/04 N+1.
          </div>
          ${etatHintTva}
          <div style="margin-top:6px;font-size:10px;color:#64748b;"><em>CA retenu = CA constaté FEC/balance fait foi, pas CA dossier. Si vous passez >50M le mois suivant, TVA due dès le mois du dépassement (Art.182).</em></div>
        </div>`;
      } else {
        core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
          <strong style="color:#0A2F5E;">TVA — Art.241 18 % (export 0 %) + Art.223 seuil 50 M</strong><br>
          <span style="font-size:11px;">TVA due = TVA collectée (CA taxable × 18 %) − TVA déductible × prorata (Art.248, paragraphe 1). Seuil assujettissement 50 M constaté en compta (Art.223) — en dessous, <strong>non assujetti</strong> sauf option (Art.225) ; au-delà, redevable.</span>
          <div style="margin-top:6px;padding:6px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;font-size:11px;">
            <strong>Prorata mixte :</strong> ceil((CA taxable + export)/CA total ×100) — hors éléments Art.249, paragraphe 2 — régul. au 30/04 N+1<br>
            <strong>Exclusions Art.247 :</strong> véhicules tourisme, carburant BTP plaf 90 %, logement/réception… — retenue source 100 % / 40 % (Art.263)<br>
            <small>Comptes État à vérifier en priorité : <strong>443 TVA collectée, 445 TVA déductible/à décaisser, 447 retenues</strong> — leur présence dans le FEC signale l'exigibilité (précision 4).</small>
          </div>
          ${etatHintTva}
          <div style="margin-top:6px;font-size:11px;"><i class="bi bi-receipt me-1"></i>Besoin d'une simulation ? Dites : <em>« CA taxable 10M, TVA achats 800k »</em> — avec CA constaté FEC.</div>
        </div>`;
      }
      context.lastMoteur=m;
    } else if(primary==='its' || (moteur && (moteur.id==='its' || moteur.id==='vps'))){
      const m=getMoteurById('its')||moteur;
      core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <strong style="color:#0A2F5E;">ITS — Barème Art.125 + VPS 4 % (2 % enseignement)</strong><br>
        <span style="font-size:11px;">ITS par tranches mensuelles : 0-60k <strong>0 %</strong>, 60-150k <strong>10 %</strong>, 150-250k <strong>15 %</strong>, 250-500k <strong>19 %</strong>, >500k <strong>30 %</strong> (Art.125, paragraphe 1) + 1 000 F mars / 3 000 F juin si >60k.</span>
        <div style="margin-top:6px;padding:6px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:11px;">
          Exemple : 250 000 F → 0 + 9 000 + 15 000 = <strong>24 000 F</strong> ; 600 000 F → <strong>101 500 F</strong> (+ ORTB)<br>
          <strong>VPS</strong> = même base ITS × 4 % (2 % enseignement privé — Art.194) — 7 cas d'affranchissement Art.192 (TPS, 1er emploi 2 ans, sportif ≤208k, etc.)<br>
          SMIG 52 000 F — base avantages nature forfait (logement 15 %, véhicule 4R 30k/15k…)
        </div>
        ${hasCA && ca<1000000? `<div style="margin-top:6px;font-size:11px;">Pour un brut de ${formatMontant(ca)} : ITS ≈ <strong>${formatMontant((()=>{let s=ca, r=0; if(s>500000){r+=(s-500000)*0.3; s=500000;} if(s>250000){r+=(s-250000)*0.19; s=250000;} if(s>150000){r+=(s-150000)*0.15; s=150000;} if(s>60000){r+=(s-60000)*0.10;} return Math.round(r); })())}</strong> (+ ORTB si >60k)</div>` : `<small style="color:#64748b;">Indiquez un brut (ex: 180k) pour une simulation instantanée.</small>`}
      </div>`;
      context.lastMoteur=m;
    } else if(primary==='fec' || primary==='article' && artNum && artNum<50){
      // FEC / OHADA
      const hasArticleDetail = artNum && moteur;
      core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <strong style="color:#0A2F5E;">FEC OHADA & Compta — 18 champs + SYSCOHADA</strong><br>
        <span style="font-size:11px;">Le FEC (Art.9 OHADA) est la source primaire fiable (niveau A). Format : <code>CodeJournal|LibJournal|NumEcriture|DateEcriture|NumCompte|LibCompte|...|MontDebit|MontCredit|...|CodeDevise</code> — 18 champs (21 si trésorerie), séparateur Tab ou <code>|</code>, dates AAAAMMJJ, montants virgule décimale.</span>
        <div style="margin-top:6px;padding:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:11px;">
          <strong>Extraction auto bibliothèque :</strong> CA HT = Σ Crédit 70* (701-709) • Achats 60* • Résultat = Σ 7* − Σ 6*<br>
          Si pas de FEC complet : <em>balance</em> (Compte/Débit/Crédit/Solde) ou <em>livre recettes-dépenses</em> + relevés bancaires/MoMo — le moteur bascule en mode simplifié (fiabilité B/C) et reste traçable CGI 2026.
        </div>
        <small style="color:#64748b;"><i class="bi bi-file-text me-1"></i>Exemple fourni : <code>docs/exemples/fec-exemple-benin-2025.txt</code> • Guide <code>mapping_fec_ohada</code> dans RuleBase</small>
      </div>`;
      if(hasArticleDetail) core+= `<div style="margin-top:6px;font-size:10px;color:#4c1d95;">Vous visiez ${formatParagraphe('Art.'+artNum)} — voir moteur ${moteur.id.toUpperCase()} ci-dessous.</div>`;
    } else if(primary==='patente' || (moteur && (moteur.id==='patente' || moteur.id==='licence'))){
      const m=getMoteurById('patente')||moteur;
      core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <strong style="color:#0A2F5E;">Patente — Art.199 (fixe + proportionnel) + complémentaire 0,5 %</strong><br>
        <span style="font-size:11px;">Patente = Droit fixe (CA N-1 — 70k/60k si ≤1B +10k/B) + Droit proportionnel (VL × taux commune 12-25 % — Cotonou 17 %, min 1/3 fixe) + <strong>0,5 % HT marchés</strong> (Art.207).</span>
        <div style="margin-top:6px;font-size:10px;color:#92400e;"><i class="bi bi-lightbulb me-1"></i>Rappel : si CA ≤ 50 M, la TPS est libératoire → patente incluse (Art.178). Dites votre CA + commune pour une simulation.</div>
      </div>`;
      context.lastMoteur=m;
    } else if(artNum && moteur){
      // generic article lookup with moteur
      core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <strong style="color:#0A2F5E;">${formatParagraphe('Art.'+artNum)} — ${moteur.libelle}</strong><br>
        <span style="font-size:11px;">${moteur.article? formatParagraphe(moteur.article) : ''} — ${moteur.livre||''}</span><br>
        <small style="color:#334155;">${(moteur.base||moteur.formule||'').slice(0,220)}</small>
        <div style="margin-top:6px;font-size:10px;color:#64748b;">Cette réponse s'appuie sur le RuleBase 2026 traçable — posez une question de calcul et je vous simule.</div>
      </div>`;
    } else if(/associ/i.test(query) && (primary==='is' || primary==='iba' || hasCA || /société|societe|morale|personne/i.test(query))){
      // Précision 2026-10-03 complément : société IS vs associés IBA perso — exclusif pour même entité
      const mIs=getMoteurById('is')||getMoteurById('iba');
      core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <strong style="color:#0A2F5E;"><i class="bi bi-people me-1"></i>Société à l'IS (personne morale) et associés à l'IBA/IRCM — deux niveaux, jamais la même entité</strong><br>
        <span style="font-size:11px;">Une même entreprise <strong>ne peut être soumise à l'IS et à l'IBA</strong> (exclusif). La <strong>société</strong> (personne morale, SARL/SA/SAS) relève de l'<strong>IS</strong> (Art.46-47, 30%/25% + MFP 1%/3%/10%) sur son résultat fiscal ; ses <strong>associés</strong> (personnes physiques) relèvent de l'<strong>IBA</strong> (Art.63-64, 30%/25% + MFP 1,5%/3%/10%) ou de l'<strong>IRCM</strong> (Art.68-69, 5%/10%/15% dividendes) <strong>à titre personnel</strong> sur les distributions/quotes-parts, pas la société.</span>
        <div style="margin-top:6px;padding:6px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;font-size:11px;">
          <strong>Quand ?</strong> CA société >50M constaté (FEC 70*) → IS dû ; CA EI >50M → IBA dû. TPS ≤50M → ni IS ni IBA pour la société (TPS libératoire Art.178).<br>
          <strong>Comptes État à vérifier en priorité :</strong> 441 IS, 443/445 TVA, 447 retenues, 42* personnel — leur mouvement confirme le niveau d'imposition (précision 4).<br>
          <strong>Traçabilité :</strong> IS Art.46-47, IBA Art.63-64, IRCM Art.68-86 — RuleBase 2026 traçable.
        </div>
        <div style="margin-top:6px;font-size:10px;color:#475569;"><em>Exemples :</em> SARL 80M → IS 30% sur bénéfice société + associés IBA/IRCM sur dividendes ; EI 60M → IBA direct sur bénéfice.</div>
      </div>`;
      if(mIs) core+= formatMoteurCard(mIs, ca);
    } else if(/dossier/i.test(query) && /fec|balance|constate|fichier comptable/i.test(query)){
      // Précision 2026-10-03 point 2 : CA constaté vs CA dossier
      core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <strong style="color:#0A2F5E;"><i class="bi bi-file-text me-1"></i>CA à retenir : le CA constaté en compta fait foi (précision 2026-10-03)</strong><br>
        <span style="font-size:11px;">C'est le <strong>CA constaté dans vos fichiers comptables</strong> (FEC comptes 70*, balance, livre recettes-dépenses) qui fait foi, <strong>pas le CA ou le capital du dossier / tableau de bord</strong>. Le moteur calcule sur le FEC, pas sur le dossier.</span>
        <div style="margin-top:6px;padding:6px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;font-size:11px;">
          <strong>Concrètement :</strong> si dossier = 32M mais FEC = 45M → on retient <strong>45M</strong> (toujours TPS ≤50M ici, mais base 45M). Si FEC dépasse 50M alors que dossier était ≤50M → <strong>reclassement Art.182 paragraphe 4</strong> en IBA/IS + rappel droits.<br>
          Vérifiez : <code>Σ Crédit 70* FEC</code> vs CA dossier. Écart >5% ou >1M → alerte à régulariser.
        </div>
        ${hasCA? `<div style="margin-top:6px;font-size:11px;color:#334155;">Vous avez indiqué <strong>${formatMontant(ca)}</strong> (premier CA détecté). Si vous avez deux valeurs (dossier vs FEC), donnez le <strong>CA FEC</strong> et je recalcule le régime (TPS vs TVA) + montant.</div>` : `<div style="margin-top:6px;font-size:11px;color:#92400e;"><i class="bi bi-lightbulb me-1"></i>Donnez le <strong>CA FEC (70*)</strong> et je vous dis : TPS d'office ou IS/IBA + TVA, avec simulation traçable.</div>`}
        ${hasEtatCompteMention(query)? `<div style="margin-top:6px;padding:6px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:10px;"><i class="bi bi-bank me-1" style="color:#92400e;"></i><strong>Comptes État :</strong> les comptes 44*/443/445/447 confirment en priorité les impôts dus — leur présence dans le FEC est le signal le plus fiable.</div>` : ''}
      </div>`;
    } else if(hasEtatCompteMention(query) && !hasCA){
      core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <strong style="color:#0A2F5E;"><i class="bi bi-bank me-1"></i>Comptes mouvementés avec l'État/collectivités — piste prioritaire (précision 4)</strong><br>
        <span style="font-size:11px;">Vous mentionnez <strong>44*/443/445/447/441</strong> — c'est bien le <strong>signal prioritaire non exclusif</strong> pour détecter les impôts dus : leur mouvement dans le FEC/balance fait foi, même sans mot-clé.</span>
        <div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;">
          <div style="padding:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;"><strong>443 TVA collectée</strong> → TVA due (si CA>50M)<br><strong>445 TVA déductible/à décaisser</strong> → TVA déductible</div>
          <div style="padding:6px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;"><strong>447 ITS/VPS/AIB</strong> → ITS/VPS/AIB retenues<br><strong>441 IS</strong> → IS dû</div>
          <div style="padding:6px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;"><strong>442/448 autres impôts État</strong> → à ventiler</div>
          <div style="padding:6px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;"><strong>44* créditeur</strong> → impôt à payer à l'échéance</div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:#334155;"><i class="bi bi-search me-1"></i>Envoyez un extrait FEC/balance (comptes 44*) ou donnez votre CA constaté + forme (SARL/EI) et je vous dis le panier d'impôts exact (TPS vs IS/IBA + TVA + ITS/VPS…) avec citation paragraphe.</div>
      </div>`;
    } else {
      // fallback general conversational
      if(docs.length){
        core+= `<div style="padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
          <strong style="color:#0A2F5E;">Voilà ce que dit la bibliothèque pour votre question :</strong><br>
          <span style="font-size:11px;">J'ai interrogé <strong>${docs.length} document(s) maître(s)</strong> et le référentiel <strong>38 moteurs</strong>. Voici le plus pertinent :</span>
          <div style="margin-top:6px;padding:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;"><strong>${docs[0].titre}</strong><br><small style="color:#7c3aed;">${docs[0].articles||''}</small> • <small style="color:#64748b;">${docs[0].path||''}</small><br><small>Moteurs : ${(docs[0].moteurs||[]).slice(0,8).join(', ')}</small></div>
          <div style="margin-top:6px;font-size:11px;color:#334155;">Souhaitez-vous que je détaille un point précis ? Par exemple : <em>« explique le calcul »</em>, <em>« donne un exemple chiffré »</em>, ou <em>« cite l'article exact »</em>.</div>
        </div>`;
      } else {
        core+= `<div style="padding:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
          <strong style="color:#92400e;">Je n'ai pas trouvé de document exact pour « ${query.slice(0,60)} »</strong><br>
          <span style="font-size:11px;">Mais je peux vous guider : reformulez avec un mot-clé comme <code>Art.46</code>, <code>TPS</code>, <code>FEC</code>, <code>patente</code>, <code>ITS</code> ou <code>OHADA</code>, ou donnez votre CA / situation et je vous réponds pas à pas.</span>
          <div style="margin-top:6px;font-size:11px;">Exemples qui marchent bien : <em>« Mon CA 45M, TPS ? »</em> • <em>« Art.178 libératoire »</em> • <em>« FEC 18 champs mapping »</em></div>
        </div>`;
      }
      // try to keep moteur if any
    }

    html+= core;

    // moteur card (if not already shown in core TPS etc. avoid duplicate)
    const showMoteurCard = moteur && !(primary==='tps' && hasCA) && !(primary==='salutation');
    // for TPS with CA we already showed via formatMoteurCard calcul, but we included ex already — still show card for completeness if moteur exists and not duplicate
    if(showMoteurCard){
      // For tps without CA, we already will show card below? currently not, so show
      // To avoid double for is/tva etc where core already describes, we still show interactive card
      const caForCard = (primary==='tps' || (moteur&&moteur.id==='tps'))? ca : null;
      html+= formatMoteurCard(moteur, caForCard);
    } else if(moteur && primary==='tps' && hasCA){
      // we already displayed TPS ex, but still show concise card without duplicate calc? formatMoteurCard includes calc, so we should show it only once
      // we already included calc in core, so skip card to avoid double - but we already skipped, so we need to show minimal card without calc?
      // Instead we show card with calcul via formatMoteurCard which we skipped — replace core calc with card?
      // For consistency, if hasCA and tps, we already have core calc, we can still add card button without calc duplicate
      html+= formatMoteurCard(moteur, null);
    }

    // docs list (if docs and not already main)
    if(docs.length && primary!=='salutation'){
      // if we already displayed docs[0] in fallback, avoid duplicate
      const alreadyDisplayedFallback = (docs.length && !['tps','is','tva','its','fec','patente'].includes(primary) && !moteur);
      if(!alreadyDisplayedFallback){
        html+= `<div style="margin-top:8px;"><strong style="font-size:11px;color:#0A2F5E;"><i class="bi bi-journals me-1"></i>Sources maître consultées :</strong></div>`;
        docs.forEach(d=>{
          const veilleBadge = d.veille? `<span class="badge bg-warning text-dark" style="font-size:8px;">veille</span>`: `<span class="badge bg-light text-dark border" style="font-size:8px;">${d.categorie||''}</span>`;
          html+= `<div style="padding:6px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;margin-top:6px;">
            <strong style="font-size:11px;color:#0A2F5E;">${d.titre}</strong> ${veilleBadge}<br>
            <small style="color:#7c3aed;"><i class="bi bi-bookmark me-1"></i>${formatParagraphe(d.articles||'')}</small> • <small style="color:#64748b;">${d.path||''}</small><br>
            <small style="font-size:10px;color:#475569;">Moteurs : ${(d.moteurs||[]).map(m=>`<span class="badge bg-light text-dark border" style="font-size:8px;">${m}</span>`).join(' ')}</small><br>
            <small><a href="${d.url_source||'#'}" target="_blank" style="color:#7c3aed;font-size:10px;">Source : ${d.url_source||'local'}</a> ${d.path? `• <a href="../${d.path}" target="_blank" style="font-size:10px;">Ouvrir doc</a>`:''}</small>
          </div>`;
        });
      }
    }

    // citation traçable
    if(moteur && moteur.article){
      html+= `<div class="mt-2 small text-muted" style="font-size:10px;border-top:1px dashed #e2e8f0;padding-top:6px;"><i class="bi bi-shield-check me-1" style="color:#16a34a;"></i>Citation traçable : <strong>${formatParagraphe(moteur.article)}</strong> — ${moteur.libelle} — <code>${moteur.livre||'RuleBase 2026'}</code> • v${ruleData?.version||bibData?.version||'2026'}</div>`;
    } else if(artNum){
      html+= `<div class="mt-2 small text-muted" style="font-size:10px;border-top:1px dashed #e2e8f0;padding-top:6px;"><i class="bi bi-bookmark-check me-1"></i>Source : CGI Bénin 2026 — <strong>Art.${artNum}</strong> • Bibliothèque v${bibData?.version||'2026'}</div>`;
    }

    // suggestions
    const sug = getSuggestions(primary==='general' && moteur? moteur.id : primary);
    if(sug && sug.length){
      html+= `<div style="margin-top:8px;"><small style="color:#64748b;font-size:10px;">Poursuivre :</small><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">${sug.slice(0,4).map(s=>`<button class="gobexChatQuick" onclick="quickAsk('${s.replace(/'/g,"\\'")}')">${s}</button>`).join('')}</div></div>`;
    }

    // update context
    context.lastIntent=primary;
    if(moteur) context.lastMoteur=moteur;
    if(entities.ca) context.lastCA=entities.ca;
    context.turn++;

    html+= `</div>`;
    return html;
  }

  async function answerQuery(query){
    await loadBibliotheque();
    const trimmed=query.trim();
    if(!trimmed){
      return `<div style="font-size:11px;color:#64748b;"><em>Posez une question : « Mon CA 45M TPS ? », « Art.178 », « FEC 18 champs », « calcul ITS 250k »…</em></div>`;
    }
    // --- gestion conversationnelle multi-tours ---
    let effectiveQuery=trimmed;
    let entities={ca: extractCA(trimmed), article: extractArticle(trimmed)};
    let intentInfo=detectIntent(trimmed);
    // si on attendait un CA (TPS sans CA), toute réponse avec CA devient TPS
    if(context.pending==='tps_ca' && entities.ca){
      intentInfo.primary='tps';
      intentInfo.isCalcul=true;
      context.pending=null;
    }
    // suivi court "Et pour 60M ?" ou juste "60M" : on garde le dernier sujet fiscal
    const isShortFollowUp = trimmed.split(/\s+/).length <= 5 && entities.ca!=null;
    const hasFollowMarker = /et\s*pour|et\s*si|et\s*avec|pour\s*\d|avec\s*\d/i.test(trimmed);
    if(isShortFollowUp && context.lastIntent && (hasFollowMarker || intentInfo.bestScore < 4)){
      if(['tps','is','iba','tva','its','patente','fec','tvm','tfu'].includes(context.lastIntent)){
        const isExplicitNewTopic = intentInfo.bestScore>=4 && intentInfo.primary!==context.lastIntent && ['tps','is','iba','tva','its','patente','fec'].includes(intentInfo.primary);
        if(!isExplicitNewTopic){
          intentInfo.primary = context.lastIntent;
          intentInfo.isCalcul=true;
        }
      }
    }

    const searchRes = await searchBibliotheque(effectiveQuery);
    // if no moteur but lastMoteur and CA follow-up, inject lastMoteur
    if(!searchRes.moteur && entities.ca && context.lastMoteur){
      searchRes.moteur = context.lastMoteur;
    }
    const html = composeConversationalAnswer(effectiveQuery, intentInfo, entities, searchRes);
    // store history
    conversationHistory.push({role:'user', text:query});
    conversationHistory.push({role:'assistant', text:html});
    if(conversationHistory.length>20) conversationHistory.shift();
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
      #gobexChatInput:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.12);}
      .gobexChatMsg{margin-bottom:10px;padding:8px 10px;border-radius:12px;max-width:90%;font-size:11px;line-height:1.5;}
      .gobexChatMsg.user{margin-left:auto;background:#0A2F5E;color:#FFB81C;border-bottom-right-radius:4px;}
      .gobexChatMsg.bot{margin-right:auto;background:#fff;border:1px solid #e2e8f0;border-bottom-left-radius:4px;}
      .gobexChatQuick{font-size:10px;padding:4px 8px;border-radius:50px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;transition:.15s;}
      .gobexChatQuick:hover{background:#f5f3ff;border-color:#7c3aed;color:#7c3aed;}
      .gobexTyping{font-size:10px;color:#64748b;display:flex;align-items:center;gap:6px;}
      .gobexTypingDots span{width:4px;height:4px;background:#7c3aed;border-radius:50%;display:inline-block;animation:bounce 1.1s infinite;}
      .gobexTypingDots span:nth-child(2){animation-delay:.15s}
      .gobexTypingDots span:nth-child(3){animation-delay:.3s}
      @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
      @media(max-width:480px){#gobexChatWidget{right:8px;left:8px;width:auto;}}
    `;
    document.head.appendChild(style);

    const btn=document.createElement('button');
    btn.id='gobexChatBtn';
    btn.title='Assistant GOBEX — Guide & assiste (bibliothèque)';
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
            <strong><i class="bi bi-stars me-1"></i>Assistant GOBEX</strong><br><small style="font-size:10px;opacity:.9;">Guide & assiste — fiscalité & compta</small>
          </div>
        </div>
        <div style="display:flex;gap:4px;">
          <a href="../docs/bibliotheque/bibliotheque.json" target="_blank" class="btn btn-sm" style="font-size:10px;background:rgba(255,184,28,.15);color:#FFB81C;border:1px solid #FFB81C;padding:2px 6px;" title="Bibliothèque"><i class="bi bi-journal-text"></i></a>
          <a href="../admin/bibliotheque-admin.html" target="_blank" class="btn btn-sm" style="font-size:10px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);padding:2px 6px;" title="Admin"><i class="bi bi-gear"></i></a>
          <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border:none;padding:4px 8px;" onclick="toggleChat()"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>
      <div id="gobexChatBody">
        <div class="gobexChatMsg bot">
          <strong>Bonjour ! Je suis votre assistant GOBEX. 👋</strong><br>
          <small>Je <strong>comprends votre préoccupation</strong>, je <strong>réfléchis</strong> et je <strong>fouille à chaque question</strong> la bibliothèque CGI 2026 + OHADA + LF 2023-25 + 38 moteurs RuleBase — pour vous <strong>guider pas à pas</strong> avec l'article exact (paragraphe) et le calcul traçable.</small>
          <div style="margin-top:8px;padding:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:10px;">
            <strong style="color:#0A2F5E;">Parlez-moi comme à un conseiller :</strong><br>
            <em>« Mon CA est de 45M, que dois-je payer ? »</em> • <em>« Explique l'Art.178 »</em> • <em>« Mon FEC est incomplet, que faire ? »</em>
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
            <button class="gobexChatQuick" onclick="quickAsk('Mon CA est de 45M, que dois-je payer ?')">CA 45M → TPS ?</button>
            <button class="gobexChatQuick" onclick="quickAsk('Explique l\\'Art.178 TPS libératoire')">Art.178</button>
            <button class="gobexChatQuick" onclick="quickAsk('FEC OHADA 18 champs, comment faire ?')">FEC OHADA</button>
            <button class="gobexChatQuick" onclick="quickAsk('Barème ITS et VPS')">ITS / VPS</button>
          </div>
          <div style="margin-top:6px;font-size:10px;color:#64748b;"><i class="bi bi-book me-1"></i>Bibliothèque : <code>bibliotheque.json</code> • <span id="gobexChatLibCount">chargement…</span> • 100% offline</div>
        </div>
      </div>
      <div style="padding:0 12px 6px 12px;display:flex;gap:6px;flex-wrap:wrap;">
        <span style="font-size:10px;color:#64748b;">Veille :</span>
        <span class="badge bg-light text-dark border" style="font-size:9px;">impots.bj</span><span class="badge bg-light text-dark border" style="font-size:9px;">ohada.org</span><span class="badge bg-light text-dark border" style="font-size:9px;">bceao.int</span>
        <span class="badge" style="background:#7c3aed;color:#fff;font-size:9px;">mensuelle</span>
      </div>
      <div id="gobexChatInputBar">
        <input id="gobexChatInput" placeholder="Ex: Mon CA 45M, Art.46 IS, FEC incomplet..." onkeydown="if(event.key==='Enter') sendGobexChat()">
        <button class="btn btn-sm" style="background:#7c3aed;color:#fff;border-radius:10px;padding:6px 12px;" onclick="sendGobexChat()"><i class="bi bi-send"></i></button>
      </div>
    `;
    document.body.appendChild(widget);

    window.toggleChat = toggleChat;
    window.sendGobexChat = sendGobexChat;
    window.quickAsk = (q)=>{ document.getElementById('gobexChatInput').value=q; sendGobexChat(); };

    loadBibliotheque().then(()=>{
      const el=document.getElementById('gobexChatLibCount');
      if(el && bibData) el.textContent = (bibData.documents?.length||0)+' docs • '+(bibData.sites_veille?.length||0)+' sites • '+(ruleData? '38 moteurs':'');
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
    const botDiv=document.createElement('div');
    botDiv.className='gobexChatMsg bot';
    botDiv.innerHTML='<div class="gobexTyping"><span>Je réfléchis & fouille la bibliothèque...</span><span class="gobexTypingDots"><span></span><span></span><span></span></span></div>';
    body.appendChild(botDiv);
    body.scrollTop=body.scrollHeight;
    try{
      // petit délai pour effet conversationnel (perception réflexion)
      await new Promise(r=> setTimeout(r, 380));
      const html=await answerQuery(q);
      botDiv.innerHTML=html;
    }catch(e){
      botDiv.innerHTML=`<span style="color:#dc3545;">Oups, je n'ai pas pu consulter la bibliothèque : ${e.message}</span>`;
    }
    body.scrollTop=body.scrollHeight;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(injectWidget, 500);
  });
  window.GobexBibliothequeChat={loadBibliotheque, searchBibliotheque, answerQuery, detectIntent, extractCA, formatMontant};
})();
