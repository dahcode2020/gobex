/**
 * GOBEX — Remplissage auto des fiches DGI officielles Excel + XML
 * DGICNSS (ITS/CNSS) / TVA annexe / AIB annexe
 * Sources: mensuelData[YYYY-MM], dataSources.fec/balance/paie/mecef, getClients/getDossiers
 * Templates: docs/modeles-dgi/dgi-*.xlsx (structure identique aux fichiers DGI à macros, sans macros)
 * Librairie: SheetJS (xlsx.full.min.js) — chargée via CDN dans declarations-mensuelles.html
 * Offline, traçable, vérifiable (cases jaunes = remplissables, vert clair = calculé)
 */
(function(){
  // Helpers
  function toast(t,m,type='info'){ if(typeof window.toast==='function') return window.toast(t,m,type); console.log(t,m); }
  function formatF(n){ return (n||0).toLocaleString('fr-FR'); }
  function getIFU(){
    try{
      const sel = document.getElementById('selDossierMensuel')?.value;
      const d = (typeof getDossiers==='function'? getDossiers():[]).find(x=>x.id===sel);
      const c = (typeof getClients==='function'? getClients():[]).find(x=>x.name===d?.clientName);
      // try client IFU else dossier IFU else placeholder
      return (c?.ifu || d?.ifu || c?.ifu13 || '0000000000000').toString().replace(/\D/g,'').padEnd(13,'0').slice(0,13);
    }catch(e){ return '0000000000000'; }
  }
  function getMoisParts(){
    const m = (typeof moisActif!=='undefined'? moisActif : document.getElementById('moisInput')?.value) || '2026-01';
    const [annee, mois] = m.split('-');
    return {moisActif: m, annee: parseInt(annee)||2026, mois: parseInt(mois)||1, moisStr: String(parseInt(mois)).padStart(2,'0') };
  }
  function getSelectedDossierInfo(){
    try{
      const sel = document.getElementById('selDossierMensuel')?.value;
      const d = (typeof getDossiers==='function'? getDossiers():[]).find(x=>x.id===sel);
      const c = (typeof getClients==='function'? getClients():[]).find(x=>x.name===d?.clientName);
      return {dossier: d, client: c, ifu: getIFU()};
    }catch(e){ return {dossier:null, client:null, ifu:getIFU()}; }
  }

  // Load template as ArrayBuffer
  async function loadTemplate(path){
    const urls = [path, '../'+path, '../../'+path, '/'+path];
    for(const u of urls){
      try{
        const r = await fetch(u);
        if(r.ok) return await r.arrayBuffer();
      }catch(e){}
    }
    throw new Error('Modèle introuvable: '+path);
  }

  // Fill helpers: set cell value in SheetJS worksheet (address like B7)
  function setCell(ws, addr, value){
    if(!ws[addr]) ws[addr] = {t:'s', v:value};
    else ws[addr].v = value;
    // keep style if exists
  }

  // Generate preview tables for verification (editable)
  let dgiPreviewData = { dgicnss: [], tva: [], aib: [] }; // arrays of rows for current mois

  function buildDgiPreviewDGICNSS(){
    const {moisActif} = getMoisParts();
    const md = (typeof mensuelData!=='undefined'? mensuelData[moisActif] : null) || {};
    const paieList = md.salaires_list || [];
    const effectif = md.effectif || paieList.length || 0;
    const masse = md.masse || 0;
    // Build rows: try to use detailed paie if available, else aggregate
    let rows = [];
    if(paieList.length>0){
      // paieList is array of bruts (number) - we lack names, we generate placeholder
      paieList.forEach((brut, idx)=>{
        const total = brut; // simplified (1)
        const its = Math.round((()=>{
          let s=brut, it=0, prev=0; const tranches=[[60000,0],[150000,0.10],[250000,0.15],[500000,0.19],[Infinity,0.30]];
          for(const [max,taux] of tranches){ if(s<=prev) break; const taxable=Math.min(s,max)-prev; if(taxable>0) it+=taxable*taux; prev=max; if(s<=max) break; }
          return it;
        })());
        rows.push({
          nEmployeur: 'EMP001',
          nSecu: '',
          nIFU: '',
          nom: 'SALARIE',
          prenoms: `S${idx+1}`,
          typeContrat: 'CDI',
          tauxRisque: '2%',
          dateEmbauche: '',
          dateDebauchage: '',
          jours: 26,
          joursAssim: 0,
          remuneration: brut,
          rappel: 0,
          periodeRappel: '',
          idr: 0,
          licenciement: 0,
          autresPrimes: 0,
          avantagesNature: 0,
          total: total,
          its: its,
          prestFam: Math.round(total*0.09),
          risquesPro: Math.round(total*0.02),
          vieillessePat: Math.round(total*0.064),
          vieillesseOuv: Math.round(total*0.036),
          totalCNSS: Math.round(total*0.09)+Math.round(total*0.02)+Math.round(total*0.064)+Math.round(total*0.036),
          assuranceMaladie: 0
        });
      });
    } else if(masse>0 && effectif>0){
      const avg = Math.round(masse/effectif);
      for(let i=0;i<effectif;i++){
        const brut = avg;
        const its = Math.round(brut*0.15); // fallback 15% si pas de détail
        rows.push({
          nEmployeur: 'EMP001', nSecu:'', nIFU:'', nom:'SALARIE', prenoms:`S${i+1}`, typeContrat:'CDI', tauxRisque:'2%', dateEmbauche:'', dateDebauchage:'', jours:26, joursAssim:0, remuneration: brut, rappel:0, periodeRappel:'', idr:0, licenciement:0, autresPrimes:0, avantagesNature:0, total: brut, its: its, prestFam: Math.round(brut*0.09), risquesPro: Math.round(brut*0.02), vieillessePat: Math.round(brut*0.064), vieillesseOuv: Math.round(brut*0.036), totalCNSS: Math.round(brut*0.09+brut*0.02+brut*0.064+brut*0.036), assuranceMaladie:0
        });
      }
    } else {
      // empty row for user to fill
      rows.push({ nEmployeur:'', nSecu:'', nIFU:'', nom:'', prenoms:'', typeContrat:'CDI', tauxRisque:'2%', dateEmbauche:'', dateDebauchage:'', jours:26, joursAssim:0, remuneration:0, rappel:0, periodeRappel:'', idr:0, licenciement:0, autresPrimes:0, avantagesNature:0, total:0, its:0, prestFam:0, risquesPro:0, vieillessePat:0, vieillesseOuv:0, totalCNSS:0, assuranceMaladie:0 });
    }
    dgiPreviewData.dgicnss = rows;
    return rows;
  }

  function buildDgiPreviewTVA(){
    const {moisActif} = getMoisParts();
    const md = (typeof mensuelData!=='undefined'? mensuelData[moisActif] : null) || {};
    // Try to get detailed TVA rows from dataSources if available, else generate from aggregated
    let rows = [];
    // Look for stored detailed rows in mensuelData[mois].tvaDetails if we enhanced parsing else fallback
    if(md.tvaDetails && md.tvaDetails.length){
      rows = md.tvaDetails.map(d=>({ ifuFournisseur: d.ifu||'3200800673315', nom: d.nom||'LA ROCHE', refFacture: d.ref||'952045547', dateFacture: d.date||moisActif+'-15', natureDeduction: d.nature||'Déductions sur bien ne constituant pas des immobilisations et sur services', natureBien: d.bien||'', prixHT: d.ht||0, tvaFacturee: Math.round((d.ht||0)*0.18), tvaDeductible: Math.round((d.ht||0)*0.18), prorata: 1, tvaDeduite: Math.round((d.ht||0)*0.18) }));
    } else {
      const tvaDed = md.tva_deductible || 0;
      const tvaColl = md.tva_collectee || 0;
      const achats = md.achats || 0;
      // If we have aggregated, create 1-3 dummy rows
      if(tvaDed>0){
        const n = Math.min(3, Math.max(1, Math.ceil(tvaDed/50000)));
        const avgHT = Math.round(achats/n) || Math.round(tvaDed/0.18/n);
        for(let i=0;i<n;i++){
          const ht = avgHT;
          rows.push({ ifuFournisseur:'3200800673315', nom:'LA ROCHE', refFacture:`95204554${i}`, dateFacture: moisActif+'-'+String(10+i*5).padStart(2,'0'), natureDeduction:'Déductions sur bien ne constituant pas des immobilisations et sur services', natureBien:'', prixHT: ht, tvaFacturee: Math.round(ht*0.18), tvaDeductible: Math.round(ht*0.18), prorata:1, tvaDeduite: Math.round(ht*0.18) });
        }
      } else {
        rows.push({ ifuFournisseur:'', nom:'', refFacture:'', dateFacture: moisActif+'-15', natureDeduction:'Déductions sur bien ne constituant pas des immobilisations et sur services', natureBien:'', prixHT:0, tvaFacturee:0, tvaDeductible:0, prorata:1, tvaDeduite:0 });
      }
    }
    dgiPreviewData.tva = rows;
    return rows;
  }

  function buildDgiPreviewAIB(){
    const {moisActif} = getMoisParts();
    const md = (typeof mensuelData!=='undefined'? mensuelData[moisActif] : null) || {};
    let rows=[];
    if(md.aibDetails && md.aibDetails.length){
      rows = md.aibDetails.map(d=>({ ifuFournisseur: d.ifu||'', nom: d.nom||'', refFacture: d.ref||'', dateFacture: d.date||moisActif+'-10', natureRetenue: d.nature||'Achat avec IFU', montantHT: d.ht||0, tauxAIB: d.taux||0.01, montantAIB: Math.round((d.ht||0)*(d.taux||0.01)), periode: '' }));
    } else {
      const achats = md.achats || 0;
      if(achats>0){
        const taux = 0.01;
        rows.push({ ifuFournisseur:'3200800673315', nom:'LA ROCHE', refFacture:'952045547', dateFacture: moisActif+'-10', natureRetenue:'Achat avec IFU - 1%', montantHT: achats, tauxAIB: taux, montantAIB: Math.round(achats*taux), periode: '' });
      } else {
        rows.push({ ifuFournisseur:'', nom:'', refFacture:'', dateFacture: moisActif+'-10', natureRetenue:'Achat avec IFU - 1%', montantHT:0, tauxAIB:0.01, montantAIB:0, periode: '' });
      }
    }
    dgiPreviewData.aib = rows;
    return rows;
  }

  // Render preview tables (editable) — inline + push plein largeur
  function renderDgiPreview(type){
    const {moisActif} = getMoisParts();
    let rows, container, html='';
    if(type==='dgicnss'){
      rows = buildDgiPreviewDGICNSS();
      container = document.getElementById('dgiPreviewDgicnss');
      if(container){
        html = `<div class="table-responsive" style="max-height:360px;overflow:auto;border:1px solid #0A2F5E;border-radius:10px">
        <table class="table table-sm mb-0" style="font-size:10px"><thead style="position:sticky;top:0;z-index:2;background:#0A2F5E;color:#FFB81C"><tr>
          <th>#</th><th>N° Employeur</th><th>N° Sécu</th><th>IFU</th><th>Nom</th><th>Prénoms</th><th>Type</th><th>Taux</th><th>Jours</th><th>Rémun (1)</th><th>Total (7)</th><th>ITS</th><th>CNSS (12)</th>
        </tr></thead><tbody>`;
        rows.forEach((r,i)=>{
          html+=`<tr>
            <td>${i+1}</td>
            <td><input value="${r.nEmployeur}" onchange="dgiUpdateCell('dgicnss',${i},'nEmployeur',this.value)" style="width:80px;font-size:10px"></td>
            <td><input value="${r.nSecu}" onchange="dgiUpdateCell('dgicnss',${i},'nSecu',this.value)" style="width:80px;font-size:10px"></td>
            <td><input value="${r.nIFU}" onchange="dgiUpdateCell('dgicnss',${i},'nIFU',this.value)" style="width:90px;font-size:10px"></td>
            <td><input value="${r.nom}" onchange="dgiUpdateCell('dgicnss',${i},'nom',this.value)" style="width:80px;font-size:10px"></td>
            <td><input value="${r.prenoms}" onchange="dgiUpdateCell('dgicnss',${i},'prenoms',this.value)" style="width:60px;font-size:10px"></td>
            <td><input value="${r.typeContrat}" onchange="dgiUpdateCell('dgicnss',${i},'typeContrat',this.value)" style="width:50px;font-size:10px"></td>
            <td><input value="${r.tauxRisque}" onchange="dgiUpdateCell('dgicnss',${i},'tauxRisque',this.value)" style="width:50px;font-size:10px"></td>
            <td><input type="number" value="${r.jours}" onchange="dgiUpdateCell('dgicnss',${i},'jours',this.value)" style="width:50px;font-size:10px"></td>
            <td><input type="number" value="${r.remuneration}" onchange="dgiUpdateCell('dgicnss',${i},'remuneration',this.value)" style="width:90px;font-size:10px;background:#FFFACD"></td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.total)}</td>
            <td><input type="number" value="${r.its}" onchange="dgiUpdateCell('dgicnss',${i},'its',this.value)" style="width:70px;font-size:10px;background:#FFFACD"></td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.totalCNSS)}</td>
          </tr>`;
        });
        html+=`</tbody></table></div><small class="text-muted" style="font-size:10px">Cases jaunes = remplissables • Vert = calculé • <a href="#" onclick="try{new bootstrap.Offcanvas(document.getElementById('offcanvasDgiPush')).show(); switchPushTab('dgicnss')}catch(e){} return false;" style="color:#0A2F5E;font-weight:700">Ouvrir en push → 26 col</a></small>`;
        container.innerHTML = html;
        const cntEl=document.getElementById('dgiDgicnssCount'); if(cntEl) cntEl.textContent = `${rows.length} salarié(s) • Masse ${formatF(rows.reduce((s,r)=>s+r.remuneration,0))} F • ITS ${formatF(rows.reduce((s,r)=>s+r.its,0))} F`;
      }
      // Push — 26 colonnes plein largeur
      const pushC = document.getElementById('dgiPreviewDgicnssPush');
      if(pushC){
        let hp = `<div class="table-responsive" style="max-height:70vh;overflow:auto;border:2px solid #0A2F5E;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.08)">
        <table class="table table-sm table-push mb-0"><thead><tr>
          <th style="min-width:40px">#</th>
          <th style="min-width:110px">N° Employeur<br><small>A</small></th>
          <th style="min-width:110px">N° Sécu<br><small>B</small></th>
          <th style="min-width:120px">IFU<br><small>C</small></th>
          <th style="min-width:120px">Nom<br><small>D</small></th>
          <th style="min-width:100px">Prénoms<br><small>E</small></th>
          <th style="min-width:80px">Type<br><small>F</small></th>
          <th style="min-width:80px">Taux<br><small>G</small></th>
          <th style="min-width:110px">Date embauche<br><small>H</small></th>
          <th style="min-width:110px">Date débauch.<br><small>I</small></th>
          <th style="min-width:70px">Jours<br><small>J</small></th>
          <th style="min-width:70px">J. assim<br><small>K</small></th>
          <th style="min-width:120px;background:#FFB81C;color:#0A2F5E">Rémun (1)<br><small>L</small></th>
          <th style="min-width:100px">Rappel (2)<br><small>M</small></th>
          <th style="min-width:90px">Période rappel<br><small>N</small></th>
          <th style="min-width:100px">IDR (3)<br><small>O</small></th>
          <th style="min-width:100px">Licenciement (4)<br><small>P</small></th>
          <th style="min-width:100px">Autres primes<br><small>Q</small></th>
          <th style="min-width:100px">Avantages nat.<br><small>R</small></th>
          <th style="min-width:120px;background:#F0FDF4;color:#0A2F5E">Total (7)<br><small>S</small></th>
          <th style="min-width:110px;background:#FFB81C;color:#0A2F5E">ITS<br><small>T</small></th>
          <th style="min-width:100px">Prest fam 9%<br><small>U</small></th>
          <th style="min-width:100px">Risques 2%<br><small>V</small></th>
          <th style="min-width:110px">Vieill. pat 6.4%<br><small>W</small></th>
          <th style="min-width:110px">Vieill. ouv 3.6%<br><small>X</small></th>
          <th style="min-width:120px;background:#F0FDF4;color:#0A2F5E">Total CNSS (12)<br><small>Y</small></th>
          <th style="min-width:100px">Ass. maladie<br><small>Z</small></th>
        </tr></thead><tbody>`;
        rows.forEach((r,i)=>{
          hp+=`<tr>
            <td class="col-sticky" style="background:#f8fafc;font-weight:700">${i+1}</td>
            <td><input value="${r.nEmployeur}" onchange="dgiUpdateCell('dgicnss',${i},'nEmployeur',this.value)" style="width:110px"></td>
            <td><input value="${r.nSecu}" onchange="dgiUpdateCell('dgicnss',${i},'nSecu',this.value)" style="width:110px"></td>
            <td><input value="${r.nIFU}" onchange="dgiUpdateCell('dgicnss',${i},'nIFU',this.value)" style="width:120px"></td>
            <td><input value="${r.nom}" onchange="dgiUpdateCell('dgicnss',${i},'nom',this.value)" style="width:120px"></td>
            <td><input value="${r.prenoms}" onchange="dgiUpdateCell('dgicnss',${i},'prenoms',this.value)" style="width:100px"></td>
            <td><input value="${r.typeContrat}" onchange="dgiUpdateCell('dgicnss',${i},'typeContrat',this.value)" style="width:80px"></td>
            <td><input value="${r.tauxRisque}" onchange="dgiUpdateCell('dgicnss',${i},'tauxRisque',this.value)" style="width:80px"></td>
            <td><input type="date" value="${r.dateEmbauche}" onchange="dgiUpdateCell('dgicnss',${i},'dateEmbauche',this.value)" style="width:110px"></td>
            <td><input type="date" value="${r.dateDebauchage}" onchange="dgiUpdateCell('dgicnss',${i},'dateDebauchage',this.value)" style="width:110px"></td>
            <td><input type="number" value="${r.jours}" onchange="dgiUpdateCell('dgicnss',${i},'jours',this.value)" style="width:70px"></td>
            <td><input type="number" value="${r.joursAssim}" onchange="dgiUpdateCell('dgicnss',${i},'joursAssim',this.value)" style="width:70px"></td>
            <td><input type="number" value="${r.remuneration}" onchange="dgiUpdateCell('dgicnss',${i},'remuneration',this.value)" style="width:120px;background:#FFFACD"></td>
            <td><input type="number" value="${r.rappel}" onchange="dgiUpdateCell('dgicnss',${i},'rappel',this.value)" style="width:100px;background:#FFFACD"></td>
            <td><input value="${r.periodeRappel}" onchange="dgiUpdateCell('dgicnss',${i},'periodeRappel',this.value)" style="width:90px"></td>
            <td><input type="number" value="${r.idr}" onchange="dgiUpdateCell('dgicnss',${i},'idr',this.value)" style="width:100px;background:#FFFACD"></td>
            <td><input type="number" value="${r.licenciement}" onchange="dgiUpdateCell('dgicnss',${i},'licenciement',this.value)" style="width:100px;background:#FFFACD"></td>
            <td><input type="number" value="${r.autresPrimes}" onchange="dgiUpdateCell('dgicnss',${i},'autresPrimes',this.value)" style="width:100px;background:#FFFACD"></td>
            <td><input type="number" value="${r.avantagesNature}" onchange="dgiUpdateCell('dgicnss',${i},'avantagesNature',this.value)" style="width:100px;background:#FFFACD"></td>
            <td style="background:#F0FDF4;text-align:right;font-weight:700">${formatF(r.total)}</td>
            <td><input type="number" value="${r.its}" onchange="dgiUpdateCell('dgicnss',${i},'its',this.value)" style="width:110px;background:#FFFACD"></td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.prestFam)}</td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.risquesPro)}</td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.vieillessePat)}</td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.vieillesseOuv)}</td>
            <td style="background:#0A2F5E;color:#FFB81C;text-align:right;font-weight:700">${formatF(r.totalCNSS)}</td>
            <td><input type="number" value="${r.assuranceMaladie}" onchange="dgiUpdateCell('dgicnss',${i},'assuranceMaladie',this.value)" style="width:100px"></td>
          </tr>`;
        });
        hp+=`</tbody></table></div><small class="text-muted mt-2 d-block" style="font-size:10px">26 colonnes A-Z complètes • <span style="background:#FFFACD;padding:1px 6px;border-radius:4px">jaune = modifiable</span> <span style="background:#F0FDF4;padding:1px 6px;border-radius:4px">vert = calculé</span> • Formules Excel identiques au fichier DGI. Sticky 1ère col, scroll horizontal.</small>`;
        pushC.innerHTML = hp;
        const pc=document.getElementById('pushDgicnssCount'); if(pc) pc.textContent = `${rows.length} salarié(s) • Masse ${formatF(rows.reduce((s,r)=>s+r.remuneration,0))} F`;
      }
    } else if(type==='tva'){
      rows = buildDgiPreviewTVA();
      container = document.getElementById('dgiPreviewTva');
      if(container){
        html = `<div class="table-responsive" style="max-height:360px;overflow:auto;border:1px solid #0A2F5E;border-radius:10px">
        <table class="table table-sm mb-0" style="font-size:10px"><thead style="position:sticky;top:0;z-index:2;background:#0A2F5E;color:#FFB81C"><tr>
          <th>#</th><th>IFU fournisseur</th><th>Nom</th><th>Réf facture</th><th>Date</th><th>Prix HT</th><th>TVA déductible</th><th>Prorata</th><th>TVA déduite</th>
        </tr></thead><tbody>`;
        rows.forEach((r,i)=>{
          html+=`<tr>
            <td>${i+1}</td>
            <td><input value="${r.ifuFournisseur}" onchange="dgiUpdateCell('tva',${i},'ifuFournisseur',this.value)" style="width:110px;font-size:10px;background:#FFFACD"></td>
            <td><input value="${r.nom}" onchange="dgiUpdateCell('tva',${i},'nom',this.value)" style="width:100px;font-size:10px"></td>
            <td><input value="${r.refFacture}" onchange="dgiUpdateCell('tva',${i},'refFacture',this.value)" style="width:90px;font-size:10px"></td>
            <td><input type="date" value="${r.dateFacture}" onchange="dgiUpdateCell('tva',${i},'dateFacture',this.value)" style="width:120px;font-size:10px"></td>
            <td><input type="number" value="${r.prixHT}" onchange="dgiUpdateCell('tva',${i},'prixHT',this.value)" style="width:90px;font-size:10px;background:#FFFACD"></td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.tvaDeductible)}</td>
            <td><input type="number" step="0.01" min="0" max="1" value="${r.prorata}" onchange="dgiUpdateCell('tva',${i},'prorata',this.value)" style="width:60px;font-size:10px"></td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.tvaDeduite)}</td>
          </tr>`;
        });
        html+=`</tbody></table></div><small class="text-muted" style="font-size:10px">Prorata 0-1 (Art.248-249) • TVA déduite = TVA déductible × prorata • <a href="#" onclick="try{new bootstrap.Offcanvas(document.getElementById('offcanvasDgiPush')).show(); switchPushTab('tva')}catch(e){} return false;" style="color:#7c3aed;font-weight:700">Push 11 col →</a></small>`;
        container.innerHTML = html;
        const ct=document.getElementById('dgiTvaCount'); if(ct) ct.textContent = `${rows.length} facture(s) • HT ${formatF(rows.reduce((s,r)=>s+r.prixHT,0))} F • TVA déduite ${formatF(rows.reduce((s,r)=>s+r.tvaDeduite,0))} F`;
      }
      const pushC2 = document.getElementById('dgiPreviewTvaPush');
      if(pushC2){
        let hp2 = `<div class="table-responsive" style="max-height:70vh;overflow:auto;border:2px solid #0A2F5E;border-radius:12px">
        <table class="table table-sm table-push mb-0"><thead><tr>
          <th>#</th><th style="min-width:140px">IFU fournisseur<br><small>A</small></th><th style="min-width:160px">Nom<br><small>B</small></th><th style="min-width:130px">Réf facture<br><small>C</small></th><th style="min-width:130px">Date<br><small>D</small></th><th style="min-width:220px">Nature déduction<br><small>E</small></th><th style="min-width:120px">Nature bien<br><small>F</small></th><th style="min-width:140px;background:#FFB81C;color:#0A2F5E">Prix HT<br><small>G</small></th><th style="min-width:130px">TVA facturée<br><small>H</small></th><th style="min-width:130px;background:#F0FDF4;color:#0A2F5E">TVA déductible<br><small>I</small></th><th style="min-width:100px">Prorata 0-1<br><small>J</small></th><th style="min-width:140px;background:#0A2F5E;color:#FFB81C">TVA déduite<br><small>K</small></th>
        </tr></thead><tbody>`;
        rows.forEach((r,i)=>{
          hp2+=`<tr>
            <td>${i+1}</td>
            <td><input value="${r.ifuFournisseur}" onchange="dgiUpdateCell('tva',${i},'ifuFournisseur',this.value)" style="width:140px;background:#FFFACD"></td>
            <td><input value="${r.nom}" onchange="dgiUpdateCell('tva',${i},'nom',this.value)" style="width:160px"></td>
            <td><input value="${r.refFacture}" onchange="dgiUpdateCell('tva',${i},'refFacture',this.value)" style="width:130px"></td>
            <td><input type="date" value="${r.dateFacture}" onchange="dgiUpdateCell('tva',${i},'dateFacture',this.value)" style="width:130px"></td>
            <td><input value="${r.natureDeduction}" onchange="dgiUpdateCell('tva',${i},'natureDeduction',this.value)" style="width:220px"></td>
            <td><input value="${r.natureBien}" onchange="dgiUpdateCell('tva',${i},'natureBien',this.value)" style="width:120px"></td>
            <td><input type="number" value="${r.prixHT}" onchange="dgiUpdateCell('tva',${i},'prixHT',this.value)" style="width:140px;background:#FFFACD"></td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.tvaFacturee)}</td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.tvaDeductible)}</td>
            <td><input type="number" step="0.01" min="0" max="1" value="${r.prorata}" onchange="dgiUpdateCell('tva',${i},'prorata',this.value)" style="width:100px"></td>
            <td style="background:#0A2F5E;color:#FFB81C;text-align:right;font-weight:700">${formatF(r.tvaDeduite)}</td>
          </tr>`;
        });
        hp2+=`</tbody></table></div><small class="text-muted mt-2 d-block" style="font-size:10px">11 colonnes A-K complètes • Prix HT jaune, TVA déduite = TVA déductible × prorata (Art.248-249).</small>`;
        pushC2.innerHTML = hp2;
        const pc2=document.getElementById('pushTvaCount'); if(pc2) pc2.textContent = `${rows.length} facture(s) • HT ${formatF(rows.reduce((s,r)=>s+r.prixHT,0))} F`;
      }
    } else if(type==='aib'){
      rows = buildDgiPreviewAIB();
      container = document.getElementById('dgiPreviewAib');
      if(container){
        html = `<div class="table-responsive" style="max-height:360px;overflow:auto;border:1px solid #0A2F5E;border-radius:10px">
        <table class="table table-sm mb-0" style="font-size:10px"><thead style="position:sticky;top:0;z-index:2;background:#0A2F5E;color:#FFB81C"><tr>
          <th>#</th><th>IFU fournisseur</th><th>Nom</th><th>Réf facture</th><th>Date</th><th>Nature retenue</th><th>Montant HT</th><th>Taux</th><th>Montant AIB</th>
        </tr></thead><tbody>`;
        rows.forEach((r,i)=>{
          html+=`<tr>
            <td>${i+1}</td>
            <td><input value="${r.ifuFournisseur}" onchange="dgiUpdateCell('aib',${i},'ifuFournisseur',this.value)" style="width:110px;font-size:10px"></td>
            <td><input value="${r.nom}" onchange="dgiUpdateCell('aib',${i},'nom',this.value)" style="width:100px;font-size:10px"></td>
            <td><input value="${r.refFacture}" onchange="dgiUpdateCell('aib',${i},'refFacture',this.value)" style="width:90px;font-size:10px"></td>
            <td><input type="date" value="${r.dateFacture}" onchange="dgiUpdateCell('aib',${i},'dateFacture',this.value)" style="width:120px;font-size:10px"></td>
            <td><input value="${r.natureRetenue}" onchange="dgiUpdateCell('aib',${i},'natureRetenue',this.value)" style="width:120px;font-size:10px"></td>
            <td><input type="number" value="${r.montantHT}" onchange="dgiUpdateCell('aib',${i},'montantHT',this.value)" style="width:90px;font-size:10px;background:#FFFACD"></td>
            <td><input type="number" step="0.01" value="${r.tauxAIB}" onchange="dgiUpdateCell('aib',${i},'tauxAIB',this.value)" style="width:60px;font-size:10px"></td>
            <td style="background:#F0FDF4;text-align:right">${formatF(r.montantAIB)}</td>
          </tr>`;
        });
        html+=`</tbody></table></div>`;
        container.innerHTML = html;
        const ca=document.getElementById('dgiAibCount'); if(ca) ca.textContent = `${rows.length} ligne(s) • HT ${formatF(rows.reduce((s,r)=>s+r.montantHT,0))} F • AIB ${formatF(rows.reduce((s,r)=>s+r.montantAIB,0))} F`;
      }
      const pushC3 = document.getElementById('dgiPreviewAibPush');
      if(pushC3){
        let hp3 = `<div class="table-responsive" style="max-height:70vh;overflow:auto;border:2px solid #0A2F5E;border-radius:12px">
        <table class="table table-sm table-push mb-0"><thead><tr>
          <th>#</th><th style="min-width:140px">IFU fournisseur<br><small>A</small></th><th style="min-width:160px">Nom<br><small>B</small></th><th style="min-width:130px">Réf facture<br><small>C</small></th><th style="min-width:130px">Date<br><small>D</small></th><th style="min-width:200px">Nature retenue<br><small>E</small></th><th style="min-width:140px;background:#FFB81C;color:#0A2F5E">Montant HT<br><small>F</small></th><th style="min-width:100px">Taux<br><small>G</small></th><th style="min-width:140px;background:#0A2F5E;color:#FFB81C">Montant AIB<br><small>H</small></th><th style="min-width:120px">Période<br><small>I</small></th>
        </tr></thead><tbody>`;
        rows.forEach((r,i)=>{
          hp3+=`<tr>
            <td>${i+1}</td>
            <td><input value="${r.ifuFournisseur}" onchange="dgiUpdateCell('aib',${i},'ifuFournisseur',this.value)" style="width:140px"></td>
            <td><input value="${r.nom}" onchange="dgiUpdateCell('aib',${i},'nom',this.value)" style="width:160px"></td>
            <td><input value="${r.refFacture}" onchange="dgiUpdateCell('aib',${i},'refFacture',this.value)" style="width:130px"></td>
            <td><input type="date" value="${r.dateFacture}" onchange="dgiUpdateCell('aib',${i},'dateFacture',this.value)" style="width:130px"></td>
            <td><input value="${r.natureRetenue}" onchange="dgiUpdateCell('aib',${i},'natureRetenue',this.value)" style="width:200px"></td>
            <td><input type="number" value="${r.montantHT}" onchange="dgiUpdateCell('aib',${i},'montantHT',this.value)" style="width:140px;background:#FFFACD"></td>
            <td><input type="number" step="0.01" value="${r.tauxAIB}" onchange="dgiUpdateCell('aib',${i},'tauxAIB',this.value)" style="width:100px"></td>
            <td style="background:#0A2F5E;color:#FFB81C;text-align:right;font-weight:700">${formatF(r.montantAIB)}</td>
            <td><input value="${r.periode}" onchange="dgiUpdateCell('aib',${i},'periode',this.value)" style="width:120px"></td>
          </tr>`;
        });
        hp3+=`</tbody></table></div><small class="text-muted mt-2 d-block" style="font-size:10px">9 colonnes A-I • Montant AIB = HT × Taux (1%/3%/5% Art.130).</small>`;
        pushC3.innerHTML = hp3;
        const pc3=document.getElementById('pushAibCount'); if(pc3) pc3.textContent = `${rows.length} ligne(s) • HT ${formatF(rows.reduce((s,r)=>s+r.montantHT,0))} F`;
      }
    }
  }

  // Global update handler
  window.dgiUpdateCell = function(type, idx, field, value){
    const rows = dgiPreviewData[type];
    if(!rows || !rows[idx]) return;
    const row = rows[idx];
    // keep number fields as numbers
    if(['remuneration','jours','its','prixHT','tvaDeductible','prorata','tvaDeduite','montantHT','tauxAIB','montantAIB'].includes(field)){
      row[field] = field==='prorata' || field==='tauxAIB' ? parseFloat(value)||0 : parseInt(value)||0;
      // recalc dependants
      if(type==='dgicnss'){
        row.total = (row.remuneration||0) + (row.rappel||0) + (row.idr||0) + (row.licenciement||0) + (row.avantagesNature||0);
        row.prestFam = Math.round(row.total*0.09);
        row.risquesPro = Math.round(row.total*0.02);
        row.vieillessePat = Math.round(row.total*0.064);
        row.vieillesseOuv = Math.round(row.total*0.036);
        row.totalCNSS = row.prestFam+row.risquesPro+row.vieillessePat+row.vieillesseOuv;
      } else if(type==='tva'){
        row.tvaFacturee = Math.round(row.prixHT*0.18);
        row.tvaDeductible = row.tvaFacturee;
        row.tvaDeduite = Math.round(row.tvaDeductible * (row.prorata||1));
      } else if(type==='aib'){
        row.montantAIB = Math.round(row.montantHT * (row.tauxAIB||0));
      }
    } else {
      row[field] = value;
    }
    // re-render to show updated calculated cells
    renderDgiPreview(type);
  };

  window.dgiAddRow = function(type){
    if(type==='dgicnss') dgiPreviewData.dgicnss.push({ nEmployeur:'', nSecu:'', nIFU:'', nom:'', prenoms:'', typeContrat:'CDI', tauxRisque:'2%', dateEmbauche:'', dateDebauchage:'', jours:26, joursAssim:0, remuneration:0, rappel:0, periodeRappel:'', idr:0, licenciement:0, autresPrimes:0, avantagesNature:0, total:0, its:0, prestFam:0, risquesPro:0, vieillessePat:0, vieillesseOuv:0, totalCNSS:0, assuranceMaladie:0 });
    else if(type==='tva') dgiPreviewData.tva.push({ ifuFournisseur:'', nom:'', refFacture:'', dateFacture: getMoisParts().moisActif+'-15', natureDeduction:'Déductions sur bien ne constituant pas des immobilisations et sur services', natureBien:'', prixHT:0, tvaFacturee:0, tvaDeductible:0, prorata:1, tvaDeduite:0 });
    else if(type==='aib') dgiPreviewData.aib.push({ ifuFournisseur:'', nom:'', refFacture:'', dateFacture: getMoisParts().moisActif+'-10', natureRetenue:'Achat avec IFU - 1%', montantHT:0, tauxAIB:0.01, montantAIB:0, periode:'' });
    renderDgiPreview(type);
  };

  // Fill Excel using SheetJS
  async function fillExcel(type){
    if(typeof XLSX==='undefined'){ toast('Excel','Librairie SheetJS non chargée — vérifiez CDN','danger'); return; }
    const {moisActif, annee, moisStr} = getMoisParts();
    const {ifu} = getSelectedDossierInfo();
    let templatePath, outputName;
    if(type==='dgicnss'){ templatePath='docs/modeles-dgi/dgi-cnss-2026.xlsx'; outputName=`DGICNSS-${annee}-${moisStr}-${ifu}.xlsx`; }
    else if(type==='tva'){ templatePath='docs/modeles-dgi/dgi-tva-annexe-2026.xlsx'; outputName=`TVA-ANNEXE-${annee}-${moisStr}-${ifu}.xlsx`; }
    else if(type==='aib'){ templatePath='docs/modeles-dgi/dgi-aib-annexe-2026.xlsx'; outputName=`AIB-ANNEXE-${annee}-${moisStr}-${ifu}.xlsx`; }
    else return;

    try{
      const buf = await loadTemplate(templatePath);
      const wb = XLSX.read(buf, {type:'array', cellStyles:true});
      const ws = wb.Sheets['SAISIE'];
      if(!ws) throw new Error('Feuille SAISIE introuvable');

      // Fill header: B7=IFU, B8=Annee, B9=Mois
      // Find by address: B7, B8, B9 are at row 7-9 col 2
      // Use sheet's !ref to locate, but we assume fixed positions as in template generation
      function setCellAddr(addr, val){ const cell = ws[addr]; if(cell) cell.v = val; else ws[addr] = {t:'s', v:val}; }

      setCellAddr('B7', ifu);
      setCellAddr('B8', String(annee));
      setCellAddr('B9', String(moisStr));

      const rows = dgiPreviewData[type] || [];
      // Fill rows starting at row 13
      const startRow = 13;
      if(type==='dgicnss'){
        rows.forEach((r, i)=>{
          const row = startRow + i;
          const set = (col, val)=>{ const addr = col+row; if(!ws[addr]) ws[addr]={t:'s',v:val}; else ws[addr].v = val; };
          set('A', r.nEmployeur);
          set('B', r.nSecu);
          set('C', r.nIFU);
          set('D', r.nom);
          set('E', r.prenoms);
          set('F', r.typeContrat);
          set('G', r.tauxRisque);
          set('H', r.dateEmbauche);
          set('I', r.dateDebauchage);
          set('J', r.jours);
          set('K', r.joursAssim);
          set('L', r.remuneration);
          set('M', r.rappel);
          set('N', r.periodeRappel);
          set('O', r.idr);
          set('P', r.licenciement);
          set('Q', r.autresPrimes);
          set('R', r.avantagesNature);
          // S and U-Y are calculés via formules déjà dans le modèle, mais on écrase avec valeurs calculées pour vérification
          set('S', r.total);
          set('T', r.its);
          set('U', r.prestFam);
          set('V', r.risquesPro);
          set('W', r.vieillessePat);
          set('X', r.vieillesseOuv);
          set('Y', r.totalCNSS);
          set('Z', r.assuranceMaladie);
        });
      } else if(type==='tva'){
        rows.forEach((r,i)=>{
          const row = startRow+i;
          const set = (col,val)=>{ const addr=col+row; if(!ws[addr]) ws[addr]={t:'s',v:val}; else ws[addr].v=val; };
          set('A', r.ifuFournisseur);
          set('B', r.nom);
          set('C', r.refFacture);
          set('D', r.dateFacture);
          set('E', r.natureDeduction);
          set('F', r.natureBien);
          set('G', r.prixHT);
          set('H', r.tvaFacturee);
          set('I', r.tvaDeductible);
          set('J', r.prorata);
          set('K', r.tvaDeduite);
        });
      } else if(type==='aib'){
        rows.forEach((r,i)=>{
          const row = startRow+i;
          const set = (col,val)=>{ const addr=col+row; if(!ws[addr]) ws[addr]={t:'s',v:val}; else ws[addr].v=val; };
          set('A', r.ifuFournisseur);
          set('B', r.nom);
          set('C', r.refFacture);
          set('D', r.dateFacture);
          set('E', r.natureRetenue);
          set('F', r.montantHT);
          set('G', r.tauxAIB);
          set('H', r.montantAIB);
          set('I', r.periode);
        });
      }

      // Update sheet range if needed
      const range = XLSX.utils.decode_range(ws['!ref']);
      const neededRows = startRow + rows.length -1;
      if(neededRows > range.e.r) range.e.r = neededRows -1;
      ws['!ref'] = XLSX.utils.encode_range(range);

      const out = XLSX.write(wb, {type:'array', bookType:'xlsx'});
      const blob = new Blob([out], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = outputName; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
      toast('Excel généré', outputName+' — cases remplies, vérifiez puis utilisez Génération du XML ou import direct', 'success');
    }catch(e){
      console.error(e);
      toast('Erreur Excel', e.message, 'danger');
    }
  }

  // Generate XML EDI (mimic macro's output) — simplified but valid for import
  function generateXML(type){
    const {moisActif, annee, moisStr} = getMoisParts();
    const {ifu} = getSelectedDossierInfo();
    const rows = dgiPreviewData[type] || [];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<AnnexeDetaillee>\n  <Entete>\n    <CodeImpot>${type==='dgicnss'?'DGICNSS': type==='tva'?'TVA':'AIB'}</CodeImpot>\n    <IFU>${ifu}</IFU>\n    <Annee>${annee}</Annee>\n    <Mois>${moisStr}</Mois>\n    <Version>1.0</Version>\n    <Source>GOBEX-MOTEUR-${(typeof ruleMensuel!=='undefined' && ruleMensuel?.version)||'2026.30.0'}</Source>\n  </Entete>\n  <Lignes>\n`;
    if(type==='dgicnss'){
      rows.forEach((r,i)=>{
        if(!r.remuneration && !r.nom) return;
        xml+=`    <Ligne num="${i+1}">\n`;
        xml+=`      <NEmployeur>${escapeXml(r.nEmployeur)}</NEmployeur>\n`;
        xml+=`      <NSecu>${escapeXml(r.nSecu)}</NSecu>\n`;
        xml+=`      <IFU>${escapeXml(r.nIFU)}</IFU>\n`;
        xml+=`      <Nom>${escapeXml(r.nom)}</Nom>\n`;
        xml+=`      <Prenoms>${escapeXml(r.prenoms)}</Prenoms>\n`;
        xml+=`      <TypeContrat>${escapeXml(r.typeContrat)}</TypeContrat>\n`;
        xml+=`      <TauxRisque>${escapeXml(r.tauxRisque)}</TauxRisque>\n`;
        xml+=`      <Remuneration>${r.remuneration||0}</Remuneration>\n`;
        xml+=`      <Total>${r.total||0}</Total>\n`;
        xml+=`      <ITS>${r.its||0}</ITS>\n`;
        xml+=`      <CotisationsCNSS>${r.totalCNSS||0}</CotisationsCNSS>\n`;
        xml+=`    </Ligne>\n`;
      });
    } else if(type==='tva'){
      rows.forEach((r,i)=>{
        if(!r.prixHT && !r.ifuFournisseur) return;
        xml+=`    <Ligne num="${i+1}">\n`;
        xml+=`      <IFUFournisseur>${escapeXml(r.ifuFournisseur)}</IFUFournisseur>\n`;
        xml+=`      <Nom>${escapeXml(r.nom)}</Nom>\n`;
        xml+=`      <RefFacture>${escapeXml(r.refFacture)}</RefFacture>\n`;
        xml+=`      <DateFacture>${escapeXml(r.dateFacture)}</DateFacture>\n`;
        xml+=`      <PrixHT>${r.prixHT||0}</PrixHT>\n`;
        xml+=`      <TVADeductible>${r.tvaDeductible||0}</TVADeductible>\n`;
        xml+=`      <Prorata>${r.prorata||1}</Prorata>\n`;
        xml+=`      <TVADeduite>${r.tvaDeduite||0}</TVADeduite>\n`;
        xml+=`    </Ligne>\n`;
      });
    } else if(type==='aib'){
      rows.forEach((r,i)=>{
        if(!r.montantHT && !r.ifuFournisseur) return;
        xml+=`    <Ligne num="${i+1}">\n`;
        xml+=`      <IFUFournisseur>${escapeXml(r.ifuFournisseur)}</IFUFournisseur>\n`;
        xml+=`      <Nom>${escapeXml(r.nom)}</Nom>\n`;
        xml+=`      <RefFacture>${escapeXml(r.refFacture)}</RefFacture>\n`;
        xml+=`      <Date>${escapeXml(r.dateFacture)}</Date>\n`;
        xml+=`      <MontantHT>${r.montantHT||0}</MontantHT>\n`;
        xml+=`      <Taux>${r.tauxAIB||0}</Taux>\n`;
        xml+=`      <MontantAIB>${r.montantAIB||0}</MontantAIB>\n`;
        xml+=`    </Ligne>\n`;
      });
    }
    xml+=`  </Lignes>\n</AnnexeDetaillee>\n`;
    return xml;
  }

  function escapeXml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }

  function downloadXML(type){
    const {moisActif, annee, moisStr} = getMoisParts();
    const {ifu} = getSelectedDossierInfo();
    const xml = generateXML(type);
    const blob = new Blob([xml], {type:'application/xml'});
    const code = type==='dgicnss'?'DGICNSS': type==='tva'?'TVA':'AIB';
    const name = `${code}-ANNEXE-${annee}-${moisStr}-${ifu}.xml`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('XML généré', name+' — à importer dans Transmission des annexes détaillées par EDI', 'success');
    // Also show preview
    const pre = document.getElementById('dgiXmlPreview-'+type);
    if(pre){ pre.textContent = xml.slice(0,3000)+(xml.length>3000?'\n... (tronqué)':''); pre.parentElement.classList.remove('d-none'); }
  }

  // Verification checkbox logic
  window.dgiToggleVerified = function(type, checked){
    const btnExcel = document.getElementById('btnDgiExcel-'+type);
    const btnXml = document.getElementById('btnDgiXml-'+type);
    if(btnExcel) btnExcel.disabled = !checked;
    if(btnXml) btnXml.disabled = !checked;
    if(checked) toast('Vérifié', type.toUpperCase()+' marqué vérifié le '+new Date().toLocaleString('fr-FR'), 'success');
  };

  // Public API for HTML buttons
  window.dgiPreRemplir = function(type){
    renderDgiPreview(type);
    const card = document.getElementById('dgiCard-'+type);
    if(card) card.classList.remove('d-none');
    // Scroll to preview
    const preview = document.getElementById('dgiPreview'+type.charAt(0).toUpperCase()+type.slice(1));
    if(preview && typeof preview.scrollIntoView==='function') try{ preview.scrollIntoView({behavior:'smooth', block:'start'});}catch(e){}
    toast('Pré-rempli', type.toUpperCase()+' pré-rempli depuis FEC/paie/moteurs — vérifiez les cases jaunes', 'success');
  };
  window.dgiPreRemplirAll = function(){
    // Si données mensuelles vides, proposer exemple ou charger FEC
    try{
      const isEmpty = typeof mensuelData!=='undefined' ? Object.values(mensuelData).every(m=> !m || ( (m.ca||0)===0 && (m.masse||0)===0 && (m.achats||0)===0 && (m.tva_collectee||0)===0 && (m.tva_deductible||0)===0 )) : true;
      if(isEmpty){
        toast('Données mensuelles vides','Aucune donnée pour '+ (typeof moisActif!=='undefined'?moisActif:'2026-01') +' — génération automatique d’un exemple (12 mois) pour démonstration. Chargez votre FEC ou saisissez la table 12 mois pour vos vraies données.','warning');
        if(typeof remplirExempleMensuel==='function') remplirExempleMensuel();
        else if(typeof chargerFECMensuelExemple==='function') chargerFECMensuelExemple();
      }
    }catch(e){ console.error('check empty',e); }
    // Basculer sur la vue DGI pour que l'utilisateur voie le résultat
    try{ if(typeof switchVue==='function') switchVue('dgi'); }catch(e){}
    let ok=0, err='';
    try{ window.dgiPreRemplir('dgicnss'); ok++; }catch(e){ err+= 'DGICNSS:'+e.message+' '; console.error(e); }
    try{ window.dgiPreRemplir('tva'); ok++; }catch(e){ err+= 'TVA:'+e.message+' '; console.error(e); }
    try{ window.dgiPreRemplir('aib'); ok++; }catch(e){ err+= 'AIB:'+e.message+' '; console.error(e); }
    try{ if(typeof renderDgiPushAll==='function') renderDgiPushAll(); }catch(e){}
    try{ if(typeof switchPushTab==='function') switchPushTab('dgicnss'); }catch(e){}
    // Forcer l'affichage des cartes même si déjà visible
    try{
      ['dgicnss','tva','aib'].forEach(t=>{
        const c=document.getElementById('dgiCard-'+t);
        if(c) c.classList.remove('d-none');
        const pc=document.getElementById('dgiCard-'+t+'-push');
        if(pc) pc.classList.remove('d-none');
      });
    }catch(e){}
    if(ok===3) toast('Pré-rempli','Les 3 fiches DGI pré-remplies — vérifiez les cases jaunes (26/11/9 col) puis cochez Je certifie → Excel/XML','success');
    else if(ok>0) toast('Pré-rempli partiel', ok+'/3 fiches remplies. Erreurs: '+err,'warning');
    else toast('Erreur pré-remplissage', err || 'Vérifiez les données mensuelles (FEC/paie) et le mois sélectionné','danger');
    // Scroll vers les fiches
    try{ const v=document.getElementById('vueDGI'); if(v && typeof v.scrollIntoView==='function') v.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){}
    return ok;
  };

  window.dgiGenererExcel = function(type){
    const chk = document.getElementById('chkDgiVerify-'+type);
    if(!chk || !chk.checked){ toast('Vérification requise','Cochez "Je certifie avoir vérifié" avant de générer l\'Excel','warning'); return; }
    fillExcel(type);
  };
  window.dgiGenererXML = function(type){
    const chk = document.getElementById('chkDgiVerify-'+type);
    if(!chk || !chk.checked){ toast('Vérification requise','Cochez "Je certifie avoir vérifié" avant de générer le XML','warning'); return; }
    downloadXML(type);
  };
  window.dgiGenererTout = function(type){
    // For DGICNSS, generate both Excel and XML in sequence
    window.dgiGenererExcel(type);
    setTimeout(()=>window.dgiGenererXML(type), 800);
  };

  // Expose for external
  window.DGI = { fillExcel, generateXML, downloadXML, renderDgiPreview, buildDgiPreviewDGICNSS, buildDgiPreviewTVA, buildDgiPreviewAIB };

})();
