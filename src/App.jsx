import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Camera, Sparkles, ArrowLeft, X, Shield, MapPin, AlertTriangle, FileText, Loader2, Image, CheckCircle2, XCircle, Key } from "lucide-react";

const T = {
  bg:"#F5F2ED", border:"#DDD8CF", accent:"#B91C1C", text:"#1C1917", muted:"#78716C",
  ok:"#15803D", okBg:"#F0FDF4", warn:"#B45309", warnBg:"#FFFBEB",
  err:"#B91C1C", errBg:"#FEF2F2", blue:"#1D4ED8", blueBg:"#EFF6FF", purple:"#6D28D9",
};

const RISCHI = ["Elettrico","Incendio","Esplosione","Chimico","Biologico","Rumore","Vibrazioni","Videoterminali (VDT)","Movimentazione manuale carichi","Posture scorrette","Caduta dall'alto","Scivolamento / inciampo","Investimento da mezzi","Taglio / abrasione","Schiacciamento","Microclima","Illuminazione insufficiente","Polveri e aerosol","Stress lavoro-correlato","Lavori in quota","Interferenze (DUVRI)","Emergenza / evacuazione","Agenti cancerogeni","Amianto","Radiazioni","Spazi confinati","ATEX"];
const AMBIENTI = ["Ufficio amministrativo","Ufficio tecnico","Sala riunioni","Reception / ingresso","Corridoio","Reparto produttivo","Magazzino","Officina meccanica","Laboratorio","Mensa / refettorio","Cucina","Spogliatoi","Servizi igienici","Archivio","Server room","Locale tecnico","Cabina elettrica","Centrale termica","Locale compressori","Area carico/scarico","Cortile / area esterna","Parcheggio","Piano interrato","Terrazza / tetto","Camera degenza","Sala visita","Pronto soccorso","Sala operatoria","Aula scolastica","Palestra","Biblioteca","Negozio / showroom"];
const ELEMENTI = ["Scaffalatura metallica","Scaffalatura in legno","Soppalco","Pavimentazione interna","Pavimentazione esterna","Scala fissa","Scala portatile","Scala a pioli","Trabattello / ponteggio","Passerella","Parapetto","Quadro elettrico generale","Quadro elettrico secondario","Impianto di terra","Illuminazione ordinaria","Illuminazione emergenza","Impianto sprinkler","Rilevazione incendi","Estintore portatile","Estintore carrellato","Idrante UNI 45","Idrante UNI 70","Uscita di emergenza","Segnaletica sicurezza","Postazione VDT","Sedia ergonomica","Carrello elevatore","Transpallet manuale","Transpallet elettrico","Gru a ponte","Trapano a colonna","Mola angolare","Sega circolare","Tornio","Compressore","Caldaia","Impianto gas","Armadio prodotti chimici","DPI in dotazione","Cassetta pronto soccorso","Defibrillatore (DAE)","Porte REI","Cancello automatico"];
const MISURE = ["Formazione specifica (art. 37 D.Lgs. 81/08)","Informazione lavoratori (art. 36)","Addestramento uso DPI","Sorveglianza sanitaria","Manutenzione periodica","Procedura operativa specifica","Installazione segnaletica","Delimitazione area","Intervento strutturale / impiantistico","Fornitura DPI adeguati","Aggiornamento DVR","Verifica impianti (DPR 462/01)","Prova di evacuazione","Aggiornamento piano emergenza","Bonifica sostanze pericolose","Sostituzione attrezzatura","Protezione collettiva","Misurazioni strumentali","Nomina preposto / RSPP","Redazione DUVRI"];
const GRAVITA = ["Bassa","Media","Alta","Critica"];
const PROB = ["Improbabile","Possibile","Probabile","Quasi certa"];
const TIPI = ["Periodico","Straordinario","Primo sopralluogo","Follow-up NC","Audit interno","Pre-appalto (DUVRI)"];

const uid  = () => Math.random().toString(36).slice(2,9);
const oggi = () => new Date().toISOString().split("T")[0];
const DB   = "ichno_v7";
const AK   = "ichno_ak";
const dbLoad = () => { try { return JSON.parse(localStorage.getItem(DB)||"null"); } catch { return null; } };
const dbSave = (d) => { try { localStorage.setItem(DB,JSON.stringify(d)); } catch {} };
const akGet  = () => localStorage.getItem(AK)||"";
const akSet  = (k) => localStorage.setItem(AK,k);

const mkSopr = () => ({ id:uid(), azienda:"", sede:"", indirizzo:"", nLav:"", data:oggi(), tecnico:"", tipo:"Periodico", note:"", ambienti:[] });
const mkAmb  = () => ({ id:uid(), nome:"", nomeL:"", ubicazione:"", descr:"", foto:[], elementi:[] });
const mkEl   = () => ({ id:uid(), nome:"", nomeL:"", descr:"", conforme:true, rischi:[] });
const mkR    = () => ({ id:uid(), tipo:"", tipoL:"", descr:"", gravita:"Media", prob:"Possibile", nc:[] });
const mkNC   = () => ({ id:uid(), descr:"", misura:"", misuraL:"", resp:"", scad:"", gravita:"Media", prob:"Possibile", stato:"Aperta" });

const nM = (v,l) => v==="__L__" ? l : v;

// ── UI BASE ───────────────────────────────────────────────────
const Btn = ({children,onClick,v="p",sz="m",icon,disabled,full}) => {
  const S={p:{background:T.accent,color:"#fff",border:"none"},s:{background:"#fff",color:T.text,border:`1px solid ${T.border}`},g:{background:"transparent",color:T.muted,border:"none"},d:{background:T.errBg,color:T.err,border:`1px solid #FECACA`},a:{background:T.purple,color:"#fff",border:"none"}}[v]||{};
  const P={xs:"4px 8px",s:"6px 11px",m:"8px 15px",l:"11px 20px"}[sz]||"8px 15px";
  const F={xs:11,s:12,m:13,l:15}[sz]||13;
  return <button onClick={onClick} disabled={disabled} style={{...S,padding:P,fontSize:F,fontWeight:700,borderRadius:8,display:"inline-flex",alignItems:"center",gap:5,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,width:full?"100%":"auto",justifyContent:full?"center":"flex-start",fontFamily:"inherit",boxSizing:"border-box"}}>{icon&&<span style={{display:"flex"}}>{icon}</span>}{children}</button>;
};

const Inp = ({value,onChange,placeholder,type="text",rows,disabled}) => {
  const s={width:"100%",padding:"9px 12px",fontSize:14,borderRadius:8,border:`1px solid ${T.border}`,outline:"none",fontFamily:"inherit",color:T.text,background:disabled?"#F5F2ED":"#fff",boxSizing:"border-box"};
  if(rows) return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled} style={{...s,resize:"none"}}/>;
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={s}/>;
};

const Sel = ({value,onChange,options,placeholder}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",padding:"9px 12px",fontSize:14,borderRadius:8,border:`1px solid ${value?T.accent:T.border}`,outline:"none",fontFamily:"inherit",color:value?T.text:"#999",background:"#fff",boxSizing:"border-box"}}>
    {placeholder&&<option value="">{placeholder}</option>}
    {options.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
);

const SelL = ({value,valueL,onVal,onL,options,placeholder,label}) => (
  <div>
    <select value={value} onChange={e=>{onVal(e.target.value);if(e.target.value!=="__L__")onL("");}}
      style={{width:"100%",padding:"9px 12px",fontSize:14,borderRadius:8,border:`1px solid ${value?T.accent:T.border}`,outline:"none",fontFamily:"inherit",color:value?T.text:"#999",background:"#fff",boxSizing:"border-box"}}>
      <option value="">{placeholder||"Seleziona..."}</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
      <option value="__L__">✏️ Scrivi manualmente...</option>
    </select>
    {value==="__L__"&&(
      <input value={valueL} onChange={e=>onL(e.target.value)} placeholder={`Inserisci ${label||"valore"}...`} autoFocus
        style={{width:"100%",padding:"9px 12px",fontSize:14,borderRadius:8,border:`2px solid ${T.accent}`,outline:"none",fontFamily:"inherit",color:T.text,background:"#fff",boxSizing:"border-box",marginTop:6}}/>
    )}
  </div>
);

const Fld  = ({label,children}) => <div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>{children}</div>;
const Card = ({children,style={}}) => <div style={{background:"#fff",borderRadius:12,border:`1px solid ${T.border}`,marginBottom:12,...style}}>{children}</div>;
const Bdg  = ({children,color="gray"}) => {const m={gray:{bg:"#F5F2ED",c:T.muted},red:{bg:T.errBg,c:T.err},green:{bg:T.okBg,c:T.ok},yellow:{bg:T.warnBg,c:T.warn}};const s=m[color]||m.gray;return <span style={{background:s.bg,color:s.c,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap"}}>{children}</span>;};

// ── AI ────────────────────────────────────────────────────────
const callAI = async (prompt) => {
  const k = akGet();
  if(!k) throw new Error("NO_KEY");
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":k,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:600,messages:[{role:"user",content:prompt}]})
  });
  if(!r.ok){const t=await r.text();throw new Error("Err "+r.status+": "+t.slice(0,80));}
  const d=await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.content?.find(b=>b.type==="text")?.text||"";
};

const AIBtn = ({prompt,onResult,label="IA",onNoKey}) => {
  const [loading,setL]=useState(false);
  const [err,setErr]=useState("");
  const run=async(e)=>{e.stopPropagation();setL(true);setErr("");try{onResult(await callAI(prompt));}catch(ex){if(ex.message==="NO_KEY"&&onNoKey)onNoKey();else setErr(ex.message.slice(0,50));}finally{setL(false);}};
  return <div><Btn v="a" sz="xs" onClick={run} disabled={loading} icon={loading?<Loader2 size={11} style={{animation:"spin 1s linear infinite"}}/>:<Sparkles size={11}/>}>{label}</Btn>{err&&<div style={{fontSize:10,color:T.err,marginTop:2}}>{err}</div>}</div>;
};

const ModalIA = ({onClose}) => {
  const [k,setK]=useState(akGet());
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:24,maxWidth:380,width:"100%"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <Key size={18} style={{color:T.purple}}/><h3 style={{margin:0,fontFamily:"Georgia,serif"}}>Chiave API Anthropic</h3>
          <button onClick={onClose} style={{marginLeft:"auto",border:"none",background:"transparent",cursor:"pointer"}}><X size={18}/></button>
        </div>
        <div style={{background:"#F5F3FF",borderRadius:8,padding:12,marginBottom:14,fontSize:12,color:T.purple,lineHeight:1.6}}>
          1. Vai su <strong>console.anthropic.com</strong><br/>
          2. Settings → API Keys → Create Key<br/>
          3. Copia la chiave (inizia con <code>sk-ant-</code>)
        </div>
        <Fld label="Chiave API"><Inp value={k} onChange={setK} placeholder="sk-ant-..." type="password"/></Fld>
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <Btn onClick={()=>{akSet(k.trim());onClose();}} full icon={<Key size={13}/>}>Salva e attiva</Btn>
          <Btn v="s" onClick={onClose}>Annulla</Btn>
        </div>
      </div>
    </div>
  );
};

const FotoUploader = ({foto,onAdd,onDel,onComm}) => {
  const idC=useState(()=>"c"+uid())[0];
  const idG=useState(()=>"g"+uid())[0];
  const onFile=async(e)=>{
    for(const f of Array.from(e.target.files||[])){
      if(!f.type.startsWith("image/")) continue;
      await new Promise(res=>{const r=new FileReader();r.onload=ev=>{onAdd({id:uid(),data:ev.target.result,nome:f.name,comm:""});res();};r.readAsDataURL(f);});
    }
    e.target.value="";
  };
  const lb={display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,padding:"12px 8px",borderRadius:10,border:`2px dashed ${T.border}`,cursor:"pointer",flex:1};
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <label htmlFor={idC} style={lb}><Camera size={20} style={{color:T.accent}}/><span style={{fontSize:11,fontWeight:700,color:T.accent}}>Fotocamera</span><input id={idC} type="file" accept="image/*" capture="environment" onChange={onFile} style={{display:"none"}}/></label>
        <label htmlFor={idG} style={lb}><Image size={20} style={{color:T.blue}}/><span style={{fontSize:11,fontWeight:700,color:T.blue}}>Galleria</span><input id={idG} type="file" accept="image/*" multiple onChange={onFile} style={{display:"none"}}/></label>
      </div>
      {foto.length===0&&<p style={{fontSize:12,color:T.muted,textAlign:"center"}}>Nessuna foto</p>}
      {foto.map(f=>(
        <div key={f.id} style={{display:"flex",gap:8,padding:8,borderRadius:8,border:`1px solid ${T.border}`,marginBottom:6,alignItems:"flex-start"}}>
          <img src={f.data} alt="" style={{width:60,height:60,objectFit:"cover",borderRadius:6,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:10,color:T.muted,margin:"0 0 4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.nome}</p>
            <input value={f.comm} onChange={e=>onComm(f.id,e.target.value)} placeholder="Descrizione..." style={{width:"100%",padding:"4px 8px",fontSize:12,borderRadius:6,border:`1px solid ${T.border}`,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          <button onClick={()=>onDel(f.id)} style={{border:"none",background:"transparent",cursor:"pointer"}}><X size={13} style={{color:T.err}}/></button>
        </div>
      ))}
    </div>
  );
};

const generaHTML = (s,concl) => {
  const tutteNC=s.ambienti.flatMap(a=>a.elementi.flatMap(e=>e.rischi.flatMap(r=>r.nc.map(n=>({...n,amb:nM(a.nome,a.nomeL),el:nM(e.nome,e.nomeL),risk:nM(r.tipo,r.tipoL)})))));
  const ncAp=tutteNC.filter(n=>n.stato==="Aperta");
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Verbale ${s.azienda} ${s.data}</title>
<style>body{font-family:Georgia,serif;max-width:850px;margin:0 auto;padding:40px 30px;color:#1C1917;line-height:1.7;font-size:14px}h1{color:#B91C1C;border-bottom:2px solid #B91C1C;padding-bottom:10px}h2{color:#1C1917;border-left:3px solid #B91C1C;padding-left:10px;margin-top:28px}.meta{background:#F5F2ED;border-radius:8px;padding:16px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.mr{display:flex;gap:8px}.ml{font-size:11px;color:#78716C;min-width:110px}.mv{font-size:13px;font-weight:600}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}th{background:#1C1917;color:#fff;padding:7px 10px;text-align:left;font-size:11px}td{padding:7px 10px;border-bottom:1px solid #DDD8CF;vertical-align:top}tr:nth-child(even) td{background:#F5F2ED}.firma{display:flex;justify-content:space-between;margin-top:60px;gap:40px}.fb{flex:1;border-top:1px solid #1C1917;padding-top:12px;font-size:12px}.disc{margin-top:40px;padding:14px;background:#FFFBEB;border-radius:8px;font-size:11px;color:#78716C;border:1px solid #FDE68A}.foto-grid{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.foto-grid img{width:150px;height:110px;object-fit:cover;border-radius:6px}@media print{body{padding:20px}}</style></head><body>
<p style="font-size:11px;color:#78716C;text-transform:uppercase;letter-spacing:1px">Ichnossicurezza S.r.l.</p>
<h1>Verbale di Sopralluogo<br><small style="font-size:14px;font-weight:normal;color:#44403C">${s.azienda||"N/D"} — ${s.data}</small></h1>
<div class="meta"><div class="mr"><span class="ml">Azienda</span><span class="mv">${s.azienda||"—"}</span></div><div class="mr"><span class="ml">Sede</span><span class="mv">${s.sede||"—"}</span></div><div class="mr"><span class="ml">Indirizzo</span><span class="mv">${s.indirizzo||"—"}</span></div><div class="mr"><span class="ml">N° lavoratori</span><span class="mv">${s.nLav||"—"}</span></div><div class="mr"><span class="ml">Data</span><span class="mv">${s.data}</span></div><div class="mr"><span class="ml">Tipo</span><span class="mv">${s.tipo}</span></div><div class="mr"><span class="ml">Tecnico RSPP</span><span class="mv">${s.tecnico||"—"}</span></div></div>
<h2>1. Ambienti visitati</h2>${s.ambienti.map((a,i)=>{const nA=nM(a.nome,a.nomeL);return`<div style="margin-bottom:20px;border:1px solid #DDD8CF;border-radius:8px;overflow:hidden"><div style="background:#F5F2ED;padding:10px 14px;font-weight:700">${i+1}. ${nA||"Ambiente"} ${a.ubicazione?"— "+a.ubicazione:""}</div><div style="padding:12px 14px">${a.descr?`<p>${a.descr}</p>`:""}${a.elementi.length?`<table><tr><th>Elemento</th><th>Stato</th><th>Rischi</th><th>Osservazioni</th></tr>${a.elementi.map(e=>`<tr><td>${nM(e.nome,e.nomeL)||"—"}</td><td style="color:${e.conforme?"#15803D":"#B91C1C"};font-weight:700">${e.conforme?"✓ Conforme":"✗ NC"}</td><td>${e.rischi.map(r=>`<span style="background:#FFFBEB;color:#B45309;font-size:10px;padding:1px 6px;border-radius:10px">${nM(r.tipo,r.tipoL)}</span>`).join(" ")||"—"}</td><td>${e.descr||"—"}</td></tr>`).join("")}</table>`:""}${(a.foto||[]).length?`<div class="foto-grid">${a.foto.map(f=>`<div><img src="${f.data}"/><p style="font-size:10px;color:#78716C;margin:3px 0">${f.comm||f.nome}</p></div>`).join("")}</div>`:""}</div></div>`;}).join("")}
<h2>2. Non conformità aperte (${ncAp.length})</h2>${ncAp.length===0?"<p>Nessuna non conformità.</p>":`<table><tr><th>#</th><th>Ambiente</th><th>Elemento</th><th>Descrizione</th><th>Gravità</th><th>Misura</th><th>Responsabile</th><th>Scadenza</th></tr>${ncAp.map((n,i)=>`<tr><td>${i+1}</td><td>${n.amb}</td><td>${n.el}</td><td>${n.descr}</td><td>${n.gravita}</td><td>${nM(n.misura,n.misuraL)||"—"}</td><td>${n.resp||"—"}</td><td>${n.scad||"—"}</td></tr>`).join("")}</table>`}
${s.note?`<h2>3. Note generali</h2><p>${s.note}</p>`:""}
<h2>Conclusioni</h2><p>${concl||`Sopralluogo del ${s.data} presso ${s.azienda||"l'azienda"}. Ambienti visitati: ${s.ambienti.length}. NC aperte: ${ncAp.length}.`}</p>
<div class="firma"><div class="fb">Il Tecnico RSPP<br><strong>${s.tecnico||"___"}</strong><br><br>Firma: _____________________</div><div class="fb">Il Datore di Lavoro<br><br><br>Firma: _____________________</div></div>
<div class="disc"><strong>Nota.</strong> Verbale ai sensi D.Lgs. 81/2008. Ichnossicurezza S.r.l. — Tel. 079-4136984 — info@ichnossicurezza.it</div>
</body></html>`;
};

// ── SOTTOCOMPONENTI con updater espliciti ─────────────────────
const NCCard = ({aId,eId,rId,n,updNC,delNC,setIA}) => (
  <div style={{border:`1px solid #FECACA`,borderRadius:6,padding:8,marginBottom:4,background:T.errBg}}>
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
      <AlertTriangle size={11} style={{color:T.err,flexShrink:0}}/>
      <span style={{flex:1,fontSize:11,fontWeight:700,color:T.err,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.descr||"Non conformità"}</span>
      <button onClick={()=>updNC(aId,eId,rId,n.id,"stato",n.stato==="Aperta"?"Chiusa":"Aperta")} style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,border:"none",cursor:"pointer",background:n.stato==="Chiusa"?T.okBg:T.errBg,color:n.stato==="Chiusa"?T.ok:T.err,flexShrink:0}}>{n.stato}</button>
      <button onClick={()=>delNC(aId,eId,rId,n.id)} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={10} style={{color:T.muted}}/></button>
    </div>
    <Fld label="Descrizione">
      <div style={{display:"flex",gap:5,marginBottom:5}}>
        <Inp value={n.descr} onChange={v=>updNC(aId,eId,rId,n.id,"descr",v)} placeholder="Descrivi la NC..." rows={2}/>
        <AIBtn prompt={`RSPP: migliora NC in 1-2 frasi formali D.Lgs.81/08: "${n.descr||"NC"}". Solo testo.`} onResult={v=>updNC(aId,eId,rId,n.id,"descr",v)} onNoKey={()=>setIA(true)}/>
      </div>
    </Fld>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
      <Fld label="Gravità"><Sel value={n.gravita} onChange={v=>updNC(aId,eId,rId,n.id,"gravita",v)} options={GRAVITA}/></Fld>
      <Fld label="Probabilità"><Sel value={n.prob||"Possibile"} onChange={v=>updNC(aId,eId,rId,n.id,"prob",v)} options={PROB}/></Fld>
    </div>
    <Fld label="Misura correttiva">
      <SelL value={n.misura} valueL={n.misuraL||""} onVal={v=>updNC(aId,eId,rId,n.id,"misura",v)} onL={v=>updNC(aId,eId,rId,n.id,"misuraL",v)} options={MISURE} placeholder="Seleziona..." label="misura"/>
    </Fld>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
      <Fld label="Responsabile"><Inp value={n.resp} onChange={v=>updNC(aId,eId,rId,n.id,"resp",v)} placeholder="Nome/ruolo"/></Fld>
      <Fld label="Scadenza"><Inp type="date" value={n.scad} onChange={v=>updNC(aId,eId,rId,n.id,"scad",v)}/></Fld>
    </div>
  </div>
);

const RCard = ({aId,eId,r,updR,updNC,addNC,delNC,delR,setIA}) => {
  const [open,setOpen]=useState(false);
  const ncAp=r.nc.filter(n=>n.stato==="Aperta").length;
  return (
    <div style={{border:`1px solid ${T.border}`,borderRadius:6,padding:8,marginBottom:6,background:"#FAFAF9"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:open?8:0}}>
        <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:{Bassa:T.ok,Media:T.warn,Alta:T.err,Critica:T.err}[r.gravita]||T.muted}}/>
        <button onClick={()=>setOpen(!open)} style={{flex:1,textAlign:"left",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600}}>
          {nM(r.tipo,r.tipoL)||"Rischio"}{ncAp>0&&<>{" "}<Bdg color="red">{ncAp} NC</Bdg></>}
        </button>
        <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={11}/>:<ChevronDown size={11}/>}</button>
        <button onClick={()=>delR(aId,eId,r.id)} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={11} style={{color:T.muted}}/></button>
      </div>
      {open&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
            <Fld label="Tipo rischio">
              <SelL value={r.tipo} valueL={r.tipoL||""} onVal={v=>updR(aId,eId,r.id,"tipo",v)} onL={v=>updR(aId,eId,r.id,"tipoL",v)} options={RISCHI} placeholder="Seleziona..." label="rischio"/>
            </Fld>
            <Fld label="Gravità"><Sel value={r.gravita} onChange={v=>updR(aId,eId,r.id,"gravita",v)} options={GRAVITA}/></Fld>
          </div>
          <Fld label="Descrizione">
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              <Inp value={r.descr} onChange={v=>updR(aId,eId,r.id,"descr",v)} placeholder="Descrivi il rischio..." rows={2}/>
              <AIBtn prompt={`RSPP: descrivi rischio "${nM(r.tipo,r.tipoL)||"rischio"}" in 2 frasi D.Lgs.81/08. Solo testo.`} onResult={v=>updR(aId,eId,r.id,"descr",v)} onNoKey={()=>setIA(true)}/>
            </div>
          </Fld>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:10,fontWeight:700,color:T.muted}}>NON CONFORMITÀ ({r.nc.length})</span>
            <div style={{display:"flex",gap:4}}>
              <AIBtn prompt={`RSPP: 2 NC tipiche per rischio "${nM(r.tipo,r.tipoL)}", una per riga, solo descrizione breve.`} onResult={txt=>{txt.split("\n").filter(Boolean).slice(0,2).forEach(d=>addNC(aId,eId,r.id,{...mkNC(),descr:d.replace(/^[-•\d.]+\s*/,"")}));}} onNoKey={()=>setIA(true)} label="Suggerisci"/>
              <Btn v="d" sz="xs" icon={<Plus size={10}/>} onClick={()=>addNC(aId,eId,r.id,mkNC())}>NC</Btn>
            </div>
          </div>
          {r.nc.map(n=><NCCard key={n.id} aId={aId} eId={eId} rId={r.id} n={n} updNC={updNC} delNC={delNC} setIA={setIA}/>)}
        </div>
      )}
    </div>
  );
};

const ElCard = ({aId,el,updEl,updR,updNC,addR,delR,addNC,delNC,delEl,setIA}) => {
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState("rischi");
  const ncTot=el.rischi.reduce((s,r)=>s+r.nc.filter(n=>n.stato==="Aperta").length,0);
  return (
    <div style={{border:`1px solid ${T.border}`,borderRadius:8,padding:10,marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:open?8:0}}>
        <button onClick={()=>updEl(aId,el.id,"conforme",!el.conforme)} style={{border:"none",background:"transparent",cursor:"pointer",flexShrink:0}}>
          {el.conforme?<CheckCircle2 size={15} style={{color:T.ok}}/>:<XCircle size={15} style={{color:T.err}}/>}
        </button>
        <button onClick={()=>setOpen(!open)} style={{flex:1,textAlign:"left",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600}}>
          {nM(el.nome,el.nomeL)||"Elemento"}{ncTot>0&&<>{" "}<Bdg color="red">{ncTot} NC</Bdg></>}
        </button>
        <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</button>
        <button onClick={()=>delEl(aId,el.id)} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={12} style={{color:T.muted}}/></button>
      </div>
      {open&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <Fld label="Elemento">
              <SelL value={el.nome} valueL={el.nomeL||""} onVal={v=>updEl(aId,el.id,"nome",v)} onL={v=>updEl(aId,el.id,"nomeL",v)} options={ELEMENTI} placeholder="Seleziona..." label="elemento"/>
            </Fld>
            <Fld label="Stato">
              <Sel value={el.conforme?"Conforme":"Non conforme"} onChange={v=>updEl(aId,el.id,"conforme",v==="Conforme")} options={["Conforme","Non conforme"]}/>
            </Fld>
          </div>
          <Fld label="Osservazioni">
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <Inp value={el.descr} onChange={v=>updEl(aId,el.id,"descr",v)} placeholder="Note sull'elemento..." rows={2}/>
              <AIBtn prompt={`RSPP: osservazione tecnica 1-2 frasi per "${nM(el.nome,el.nomeL)||"elemento"}". Solo testo.`} onResult={v=>updEl(aId,el.id,"descr",v)} onNoKey={()=>setIA(true)}/>
            </div>
          </Fld>
          <div style={{display:"flex",gap:4,marginBottom:8,padding:3,background:T.bg,borderRadius:8}}>
            {[["rischi",`Rischi (${el.rischi.length})`],["foto","Foto"]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:6,borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:tab===k?"#fff":"transparent",color:tab===k?T.accent:T.muted}}>{l}</button>
            ))}
          </div>
          {tab==="rischi"&&(
            <>
              <div style={{display:"flex",justifyContent:"flex-end",gap:5,marginBottom:6}}>
                <AIBtn prompt={`RSPP: 3 rischi principali per "${nM(el.nome,el.nomeL)||"elemento"}", uno per riga, solo nome.`} onResult={txt=>{txt.split("\n").filter(Boolean).slice(0,3).forEach(t=>addR(aId,el.id,{...mkR(),tipo:"__L__",tipoL:t.replace(/^[-•\d.]+\s*/,"")}));}} onNoKey={()=>setIA(true)} label="Suggerisci rischi"/>
                <Btn v="s" sz="xs" icon={<Plus size={11}/>} onClick={()=>addR(aId,el.id,mkR())}>Aggiungi</Btn>
              </div>
              {el.rischi.map(r=><RCard key={r.id} aId={aId} eId={el.id} r={r} updR={updR} updNC={updNC} addNC={addNC} delNC={delNC} delR={delR} setIA={setIA}/>)}
            </>
          )}
          {tab==="foto"&&<div style={{fontSize:12,color:T.muted,textAlign:"center",padding:"12px 0"}}>Le foto si aggiungono a livello di ambiente (tab Foto sopra)</div>}
        </div>
      )}
    </div>
  );
};

const AmbCard = ({a,ai,updAmb,updEl,updR,updNC,addEl,delEl,addR,delR,addNC,delNC,addFoto,delFoto,commFoto,delAmb,setIA}) => {
  const [tab,setTab]=useState("el");
  const ncTot=a.elementi.reduce((s,e)=>s+e.rischi.reduce((s2,r)=>s2+r.nc.filter(n=>n.stato==="Aperta").length,0),0);
  return (
    <Card>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <MapPin size={14} style={{color:T.accent,flexShrink:0}}/>
          <span style={{flex:1,fontSize:13,fontWeight:700}}>
            {nM(a.nome,a.nomeL)||`Ambiente ${ai+1}`}{" "}
            <Bdg color="gray">{a.elementi.length} el.</Bdg>{" "}
            <Bdg color="gray">{(a.foto||[]).length} foto</Bdg>
            {ncTot>0&&<>{" "}<Bdg color="red">{ncTot} NC</Bdg></>}
          </span>
          <button onClick={()=>delAmb(a.id)} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={14} style={{color:T.muted}}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <Fld label="Nome ambiente">
            <SelL value={a.nome} valueL={a.nomeL||""} onVal={v=>updAmb(a.id,"nome",v)} onL={v=>updAmb(a.id,"nomeL",v)} options={AMBIENTI} placeholder="Seleziona..." label="ambiente"/>
          </Fld>
          <Fld label="Ubicazione"><Inp value={a.ubicazione} onChange={v=>updAmb(a.id,"ubicazione",v)} placeholder="Piano, ala..."/></Fld>
        </div>
        <Fld label="Descrizione">
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <Inp value={a.descr} onChange={v=>updAmb(a.id,"descr",v)} placeholder="Condizioni generali..." rows={2}/>
            <AIBtn prompt={`RSPP: descrivi ambiente "${nM(a.nome,a.nomeL)||"ambiente"}" in 2 frasi. Solo testo.`} onResult={v=>updAmb(a.id,"descr",v)} onNoKey={()=>setIA(true)}/>
          </div>
        </Fld>
        <div style={{display:"flex",gap:4,marginBottom:10,padding:3,background:T.bg,borderRadius:8}}>
          {[["el",`Elementi (${a.elementi.length})`],["foto",`Foto (${(a.foto||[]).length})`]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:6,borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:tab===k?"#fff":"transparent",color:tab===k?T.accent:T.muted}}>{l}</button>
          ))}
        </div>
        {tab==="foto"&&<FotoUploader foto={a.foto||[]} onAdd={f=>addFoto(a.id,f)} onDel={fId=>delFoto(a.id,fId)} onComm={(fId,c)=>commFoto(a.id,fId,c)}/>}
        {tab==="el"&&(
          <>
            {a.elementi.map(el=><ElCard key={el.id} aId={a.id} el={el} updEl={updEl} updR={updR} updNC={updNC} addR={addR} delR={delR} addNC={addNC} delNC={delNC} delEl={delEl} setIA={setIA}/>)}
            <Btn v="s" sz="s" icon={<Plus size={12}/>} onClick={()=>addEl(a.id)} full>Aggiungi elemento</Btn>
          </>
        )}
      </div>
    </Card>
  );
};

// ── APP ROOT ──────────────────────────────────────────────────
export default function App() {
  const [sopr,set]      = useState(null);
  const [vista,setV]    = useState("start");
  const [concl,setConcl]= useState("");
  const [aiLoad,setAiL] = useState(false);
  const [showIA,setIA]  = useState(false);
  const [saved,setSaved]= useState(false);
  const haKey = Boolean(akGet());

  useEffect(()=>{const d=dbLoad();if(d?.sopr){set(d.sopr);setConcl(d.concl||"");};},[]);
  useEffect(()=>{if(sopr){dbSave({sopr,concl});setSaved(true);const t=setTimeout(()=>setSaved(false),1500);return()=>clearTimeout(t);}},[sopr,concl]);

  // Updater con path espliciti — nessun propagation problem
  const updAmb  = useCallback((aId,k,v)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,[k]:v})})),[]);
  const updEl   = useCallback((aId,eId,k,v)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,[k]:v})})})),[]);
  const updR    = useCallback((aId,eId,rId,k,v)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,rischi:e.rischi.map(r=>r.id!==rId?r:{...r,[k]:v})})})})),[]);
  const updNC   = useCallback((aId,eId,rId,nId,k,v)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,rischi:e.rischi.map(r=>r.id!==rId?r:{...r,nc:r.nc.map(n=>n.id!==nId?n:{...n,[k]:v})})})})})),[]);
  const delAmb  = useCallback((aId)=>set(s=>({...s,ambienti:s.ambienti.filter(a=>a.id!==aId)})),[]);
  const addEl   = useCallback((aId)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:[...a.elementi,mkEl()]})})),[]);
  const delEl   = useCallback((aId,eId)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.filter(e=>e.id!==eId)})})),[]);
  const addR    = useCallback((aId,eId,r)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,rischi:[...e.rischi,r]})})})),[]);
  const delR    = useCallback((aId,eId,rId)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,rischi:e.rischi.filter(r=>r.id!==rId)})})})),[]);
  const addNC   = useCallback((aId,eId,rId,n)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,rischi:e.rischi.map(r=>r.id!==rId?r:{...r,nc:[...r.nc,n]})})})})),[]);
  const delNC   = useCallback((aId,eId,rId,nId)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,rischi:e.rischi.map(r=>r.id!==rId?r:{...r,nc:r.nc.filter(n=>n.id!==nId)})})})})),[]);
  const addFoto = useCallback((aId,f)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,foto:[...(a.foto||[]),f]})})),[]);
  const delFoto = useCallback((aId,fId)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,foto:(a.foto||[]).filter(f=>f.id!==fId)})})),[]);
  const commFoto= useCallback((aId,fId,comm)=>set(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,foto:(a.foto||[]).map(f=>f.id!==fId?f:{...f,comm})})})),[]);

  const ncTot=sopr?.ambienti.reduce((s,a)=>s+a.elementi.reduce((s2,e)=>s2+e.rischi.reduce((s3,r)=>s3+r.nc.filter(n=>n.stato==="Aperta").length,0),0),0)||0;

  const apriVerbale=async()=>{
    setV("verbale");
    if(!concl){setAiL(true);try{setConcl(await callAI(`RSPP: conclusioni verbale "${sopr.azienda||"azienda"}" del ${sopr.data}. Ambienti: ${sopr.ambienti.map(a=>nM(a.nome,a.nomeL)).filter(Boolean).join(", ")||"nessuno"}. NC aperte: ${ncTot}. 2-3 frasi formali. Solo testo.`));}catch(e){if(e.message==="NO_KEY")setIA(true);}finally{setAiL(false);}}
  };

  const scarica=()=>{
    const html=generaHTML(sopr,concl);
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`Verbale_${(sopr.azienda||"sopralluogo").replace(/\s+/g,"_")}_${sopr.data}.html`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  };

  const pg={background:T.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"};
  const wr={maxWidth:600,margin:"0 auto",padding:"16px 14px 90px"};

  if(vista==="start") return (
    <div style={pg}><div style={{...wr,paddingTop:50,textAlign:"center"}}>
      <div style={{width:60,height:60,borderRadius:14,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Shield size={28} color="#fff"/></div>
      <h2 style={{margin:"0 0 4px",fontFamily:"Georgia,serif"}}>Ichnossicurezza</h2>
      <p style={{color:T.muted,fontSize:13,marginBottom:8}}>Gestione Sopralluoghi — D.Lgs. 81/2008</p>
      <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:20,background:haKey?T.okBg:T.warnBg,marginBottom:28}}>
        <span style={{fontSize:11,fontWeight:700,color:haKey?T.ok:T.warn}}>{haKey?"✓ IA attiva":"⚠ IA non configurata"}</span>
        <button onClick={()=>setIA(true)} style={{fontSize:11,color:haKey?T.ok:T.warn,border:"none",background:"transparent",cursor:"pointer",textDecoration:"underline"}}>{haKey?"modifica":"configura"}</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:260,margin:"0 auto"}}>
        <Btn onClick={()=>{set(mkSopr());setConcl("");setV("editor");}} full sz="l" icon={<Plus size={16}/>}>Nuovo sopralluogo</Btn>
        {dbLoad()?.sopr&&<Btn onClick={()=>{const d=dbLoad();set(d.sopr);setConcl(d.concl||"");setV("editor");}} v="s" full sz="l">Continua salvato</Btn>}
        <Btn onClick={()=>setIA(true)} v="g" full sz="s" icon={<Key size={12}/>}>Impostazioni IA</Btn>
      </div>
    </div>
    {showIA&&<ModalIA onClose={()=>setIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(vista==="verbale") return (
    <div style={pg}><div style={wr}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <button onClick={()=>setV("editor")} style={{padding:8,borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer"}}><ArrowLeft size={16}/></button>
        <h3 style={{margin:0,fontFamily:"Georgia,serif"}}>Verbale</h3>
        <button onClick={()=>setIA(true)} style={{marginLeft:"auto",padding:"5px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:700,color:T.purple,display:"flex",alignItems:"center",gap:4}}><Key size={12}/>IA</button>
      </div>
      <Card style={{padding:16,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:700,color:T.muted}}>Conclusioni</span>
          <AIBtn prompt={`RSPP: conclusioni verbale "${sopr.azienda}" del ${sopr.data}. NC: ${ncTot}. 2-3 frasi. Solo testo.`} onResult={setConcl} onNoKey={()=>setIA(true)} label="Genera con IA"/>
        </div>
        {aiLoad?<div style={{textAlign:"center",padding:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:T.muted}}><Loader2 size={18} style={{animation:"spin 1s linear infinite"}}/>Generazione...</div>
        :<Inp value={concl} onChange={setConcl} placeholder="Conclusioni del sopralluogo..." rows={5}/>}
      </Card>
      <Btn onClick={scarica} full sz="l" icon={<FileText size={15}/>}>Scarica verbale HTML</Btn>
      <p style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:8}}>Apri in Word → Salva come .docx</p>
    </div>
    {showIA&&<ModalIA onClose={()=>setIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={pg}><div style={wr}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <button onClick={()=>setV("start")} style={{padding:8,borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer"}}><ArrowLeft size={16}/></button>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:"Georgia,serif"}}>{sopr.azienda||"Nuovo sopralluogo"}</div>
          <div style={{fontSize:11,color:T.muted,display:"flex",gap:8,alignItems:"center"}}>{sopr.data}{ncTot>0&&<Bdg color="red">{ncTot} NC</Bdg>}{saved&&<span style={{color:T.ok,fontWeight:700}}>✓ Salvato</span>}</div>
        </div>
        <button onClick={()=>setIA(true)} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:700,color:haKey?T.ok:T.warn,display:"flex",alignItems:"center",gap:4}}><Key size={12}/>{haKey?"IA ✓":"IA"}</button>
        <Btn onClick={apriVerbale} sz="s" icon={<FileText size={13}/>}>Verbale</Btn>
      </div>

      <Card style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Dati sopralluogo</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Azienda"><Inp value={sopr.azienda} onChange={v=>set(s=>({...s,azienda:v}))} placeholder="Ragione sociale"/></Fld>
          <Fld label="Sede"><Inp value={sopr.sede} onChange={v=>set(s=>({...s,sede:v}))} placeholder="Sede centrale"/></Fld>
        </div>
        <Fld label="Indirizzo"><Inp value={sopr.indirizzo} onChange={v=>set(s=>({...s,indirizzo:v}))} placeholder="Via, città"/></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="N° lavoratori"><Inp type="number" value={sopr.nLav} onChange={v=>set(s=>({...s,nLav:v}))}/></Fld>
          <Fld label="Data"><Inp type="date" value={sopr.data} onChange={v=>set(s=>({...s,data:v}))}/></Fld>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Consulente RSPP"><Inp value={sopr.tecnico} onChange={v=>set(s=>({...s,tecnico:v}))} placeholder="Nome cognome"/></Fld>
          <Fld label="Tipo"><Sel value={sopr.tipo} onChange={v=>set(s=>({...s,tipo:v}))} options={TIPI}/></Fld>
        </div>
        <Fld label="Note generali"><Inp value={sopr.note} onChange={v=>set(s=>({...s,note:v}))} placeholder="Condizioni generali..." rows={2}/></Fld>
      </Card>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontSize:14,fontWeight:700}}>Ambienti ({sopr.ambienti.length})</span>
        <Btn onClick={()=>set(s=>({...s,ambienti:[...s.ambienti,mkAmb()]}))} sz="s" icon={<Plus size={13}/>}>Aggiungi</Btn>
      </div>

      {sopr.ambienti.length===0&&(
        <div style={{textAlign:"center",padding:"28px 20px",borderRadius:12,border:`2px dashed ${T.border}`,marginBottom:12}}>
          <MapPin size={22} style={{color:T.muted,marginBottom:6}}/><p style={{color:T.muted,fontSize:13,margin:0}}>Aggiungi il primo ambiente visitato</p>
        </div>
      )}

      {sopr.ambienti.map((a,ai)=>(
        <AmbCard key={a.id} a={a} ai={ai}
          updAmb={updAmb} updEl={updEl} updR={updR} updNC={updNC}
          addEl={addEl} delEl={delEl} addR={addR} delR={delR}
          addNC={addNC} delNC={delNC}
          addFoto={addFoto} delFoto={delFoto} commFoto={commFoto}
          delAmb={delAmb} setIA={setIA}/>
      ))}

      {sopr.ambienti.length>0&&<Btn onClick={apriVerbale} full sz="l" icon={<FileText size={15}/>}>Genera verbale</Btn>}
    </div>

    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(245,242,237,0.96)",borderTop:`1px solid ${T.border}`,padding:"10px 16px"}}>
      <div style={{maxWidth:600,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}><Shield size={12} style={{color:T.accent}}/><span style={{fontSize:11,fontWeight:700,color:T.accent}}>Ichnossicurezza</span></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>{ncTot>0&&<Bdg color="red">{ncTot} NC</Bdg>}<span style={{fontSize:11,color:T.muted}}>{sopr.ambienti.length} ambienti</span></div>
      </div>
    </div>
    {showIA&&<ModalIA onClose={()=>setIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
