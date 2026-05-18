import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Camera, Sparkles, ArrowLeft, X, Shield, MapPin, AlertTriangle, FileText, Loader2, Image, CheckCircle2, XCircle, Key } from "lucide-react";

const T = {
  bg:"#F5F2ED", surface:"#FFFFFF", border:"#DDD8CF",
  accent:"#B91C1C", text:"#1C1917", muted:"#78716C",
  ok:"#15803D", okBg:"#F0FDF4", warn:"#B45309", warnBg:"#FFFBEB",
  err:"#B91C1C", errBg:"#FEF2F2", blue:"#1D4ED8", blueBg:"#EFF6FF",
  purple:"#6D28D9", purpleBg:"#F5F3FF",
};

const RISCHI_DEFAULT = ["Elettrico","Incendio","Esplosione","Chimico","Biologico","Rumore","Vibrazioni mano-braccio","Vibrazioni corpo intero","Videoterminali (VDT)","Movimentazione manuale carichi","Posture scorrette / ergonomico","Caduta dall'alto","Caduta in piano (inciampo/scivolamento)","Investimento da mezzi","Taglio / abrasione","Schiacciamento / cesoiamento","Proiezione materiali","Microclima","Illuminazione insufficiente","Radiazioni ottiche artificiali","Campi elettromagnetici","Polveri e aerosol","Atmosfere esplosive (ATEX)","Spazi confinati","Agenti cancerogeni / mutageni","Amianto","Stress lavoro-correlato","Violenza / aggressione","Lavori in quota","Interferenze (DUVRI)","Emergenza / evacuazione","Rischio stradale","Radiazioni ionizzanti"];
const AMBIENTI_DEFAULT = ["Ufficio amministrativo","Ufficio tecnico","Sala riunioni","Reception / ingresso","Corridoio / disimpegno","Reparto produttivo","Magazzino","Officina meccanica","Laboratorio analisi","Laboratorio informatico","Mensa / refettorio","Cucina","Spogliatoi maschili","Spogliatoi femminili","Servizi igienici","Archivio","Server room / CED","Locale tecnico","Cabina elettrica","Centrale termica","Locale compressori","Area carico / scarico merci","Cortile / area esterna","Parcheggio","Piano interrato","Terrazza / tetto","Cantiere temporaneo","Camera degenza","Sala visita","Pronto soccorso","Sala operatoria","Reparto farmacia","Aula scolastica","Palestra","Biblioteca","Negozio / showroom"];
const ELEMENTI_DEFAULT = ["Scaffalatura metallica","Scaffalatura in legno","Soppalco metallico","Pavimentazione interna","Pavimentazione esterna","Scala fissa interna","Scala fissa esterna","Scala portatile","Scala a pioli","Trabattello / ponteggio","Passerella / ballatoio","Parapetto di protezione","Quadro elettrico generale","Quadro elettrico secondario","Impianto di terra","Impianto illuminazione ordinaria","Illuminazione di emergenza","Impianto antincendio sprinkler","Impianto rilevazione incendi","Estintore portatile","Estintore carrellato","Idrante UNI 45","Idrante UNI 70","Uscita di emergenza","Segnaletica di sicurezza","Postazione VDT","Sedia ergonomica","Carrello elevatore elettrico","Carrello elevatore a gas","Transpallet manuale","Transpallet elettrico","Gru a ponte","Trapano a colonna","Mola angolare","Sega circolare","Tornio","Fresatrice","Pressa","Compressore aria","Autoclave","Caldaia","Impianto gas metano","Armadio prodotti chimici","Deposito infiammabili","DPI in dotazione","Cassetta pronto soccorso","Defibrillatore (DAE)","Barella","Porte REI","Cancello automatico"];
const MISURE_DEFAULT = ["Formazione specifica (art. 37 D.Lgs. 81/08)","Informazione lavoratori (art. 36)","Addestramento uso DPI","Sorveglianza sanitaria obbligatoria","Manutenzione periodica programmata","Redazione / aggiornamento procedura operativa","Installazione / ripristino segnaletica","Recinzione / delimitazione area","Limitazione e controllo accesso","Intervento strutturale / impiantistico","Fornitura DPI adeguati e verificati","Aggiornamento DVR","Verifica periodica impianti (DPR 462/01)","Collaudo attrezzatura (All. VII D.Lgs. 81/08)","Prova di evacuazione semestrale","Aggiornamento piano di emergenza","Bonifica sostanze pericolose","Riduzione esposizione alla fonte","Sostituzione attrezzatura non conforme","Installazione protezione collettiva","Nomina preposto / RSPP / RLS","Redazione DUVRI","Valutazione rischio specifico","Misurazioni strumentali"];
const GRAVITA = ["Bassa","Media","Alta","Critica"];
const PROB = ["Improbabile","Possibile","Probabile","Quasi certa"];
const TIPI_SOPR = ["Periodico","Straordinario","Primo sopralluogo","Follow-up NC","Audit interno","Pre-appalto (DUVRI)"];

const uid    = () => Math.random().toString(36).slice(2,9);
const oggi   = () => new Date().toISOString().split("T")[0];
const KEY_DB = "ichno_v6";
const KEY_AI = "ichno_apikey";
const loadAll   = () => { try { return JSON.parse(localStorage.getItem(KEY_DB)||"null"); } catch { return null; } };
const saveAll   = (d) => { try { localStorage.setItem(KEY_DB, JSON.stringify(d)); } catch {} };
const getApiKey = () => localStorage.getItem(KEY_AI)||"";
const setApiKey = (k) => localStorage.setItem(KEY_AI, k);

const mkSopr = () => ({ id:uid(), azienda:"", sede:"", indirizzo:"", nLav:"", data:oggi(), tecnico:"", tipo:"Periodico", note:"", stato:"In corso", ambienti:[] });
const mkAmb  = () => ({ id:uid(), nome:"", nomeCustom:"", ubicazione:"", descr:"", foto:[], elementi:[] });
const mkEl   = () => ({ id:uid(), nome:"", nomeCustom:"", descr:"", conforme:true, rischi:[] });
const mkRisk = () => ({ id:uid(), tipo:"", tipoCustom:"", descr:"", gravita:"Media", prob:"Possibile", nc:[] });
const mkNC   = () => ({ id:uid(), descr:"", misura:"", misuraCustom:"", resp:"", scad:"", gravita:"Media", stato:"Aperta" });

const nomeM = (nome, custom) => (nome==="__custom__" ? custom : nome) || "";

// ── UI ─────────────────────────────────────────────────────
const Btn = ({ children, onClick, v="primary", sz="md", icon, disabled, full }) => {
  const s = { primary:{background:T.accent,color:"#fff",border:"none"}, secondary:{background:"#fff",color:T.text,border:`1px solid ${T.border}`}, ghost:{background:"transparent",color:T.muted,border:"none"}, danger:{background:T.errBg,color:T.err,border:`1px solid #FECACA`}, ai:{background:T.purple,color:"#fff",border:"none"} }[v]||{};
  const p = { xs:"5px 9px",sm:"7px 12px",md:"8px 16px",lg:"11px 20px" }[sz]||"8px 16px";
  const f = { xs:11,sm:12,md:13,lg:15 }[sz]||13;
  return <button onClick={onClick} disabled={disabled} style={{...s,padding:p,fontSize:f,fontWeight:700,borderRadius:8,display:"inline-flex",alignItems:"center",gap:6,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,width:full?"100%":"auto",justifyContent:full?"center":"flex-start",fontFamily:"inherit",boxSizing:"border-box"}}>{icon&&<span style={{display:"flex",flexShrink:0}}>{icon}</span>}{children}</button>;
};

const Inp = ({ value, onChange, placeholder, type="text", rows, disabled }) => {
  const b = { width:"100%",padding:"8px 12px",fontSize:13,borderRadius:8,border:`1px solid ${T.border}`,outline:"none",fontFamily:"inherit",color:T.text,background:disabled?"#F5F2ED":"#fff",boxSizing:"border-box" };
  if(rows) return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled} style={{...b,resize:"none"}}/>;
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={b}/>;
};

const SelLibero = ({ value, valueCustom, onChange, onChangeCustom, options, placeholder, label }) => (
  <div>
    <select value={value} onChange={e=>{ onChange(e.target.value); if(e.target.value!=="__custom__") onChangeCustom(""); }}
      style={{width:"100%",padding:"8px 12px",fontSize:13,borderRadius:8,border:`1px solid ${T.border}`,outline:"none",fontFamily:"inherit",color:value?T.text:T.muted,background:"#fff",boxSizing:"border-box"}}>
      {placeholder&&<option value="">{placeholder}</option>}
      {options.map(o=><option key={o} value={o}>{o}</option>)}
      <option value="__custom__">✏️ Scrivi manualmente...</option>
    </select>
    {value==="__custom__" && (
      <input value={valueCustom} onChange={e=>onChangeCustom(e.target.value)}
        placeholder={`Inserisci ${label||"valore"}...`} autoFocus
        style={{width:"100%",padding:"8px 12px",fontSize:13,borderRadius:8,border:`1px solid ${T.accent}`,outline:"none",fontFamily:"inherit",color:T.text,background:"#fff",boxSizing:"border-box",marginTop:6}}/>
    )}
  </div>
);

const Fld   = ({ label, children }) => <div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>{children}</div>;
const Card  = ({ children, style={} }) => <div style={{background:"#fff",borderRadius:12,border:`1px solid ${T.border}`,marginBottom:12,...style}}>{children}</div>;
const Badge = ({ children, color="gray" }) => { const m={gray:{bg:"#F5F2ED",c:T.muted},red:{bg:T.errBg,c:T.err},green:{bg:T.okBg,c:T.ok},yellow:{bg:T.warnBg,c:T.warn}}; const s=m[color]||m.gray; return <span style={{background:s.bg,color:s.c,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{children}</span>; };

// ── AI ──────────────────────────────────────────────────────
const callAI = async (prompt) => {
  const k = getApiKey();
  if (!k) throw new Error("NO_KEY");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":k,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:prompt}]})
  });
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.content?.find(b=>b.type==="text")?.text||"";
};

const AIBtn = ({ prompt, onResult, label="IA", onNoKey }) => {
  const [loading,setLoading] = useState(false);
  const run = async () => { setLoading(true); try { onResult(await callAI(prompt)); } catch(e){ if(e.message==="NO_KEY"&&onNoKey) onNoKey(); } finally { setLoading(false); } };
  return <Btn v="ai" sz="xs" onClick={run} disabled={loading} icon={loading?<Loader2 size={11} style={{animation:"spin 1s linear infinite"}}/>:<Sparkles size={11}/>}>{label}</Btn>;
};

// ── MODALE IA ───────────────────────────────────────────────
const ModalIA = ({ onClose }) => {
  const [k, setK] = useState(getApiKey());
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:24,maxWidth:400,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <Key size={18} style={{color:T.purple}}/><h3 style={{margin:0,color:T.text,fontFamily:"Georgia,serif"}}>Configura IA</h3>
          <button onClick={onClose} style={{marginLeft:"auto",border:"none",background:"transparent",cursor:"pointer"}}><X size={18}/></button>
        </div>
        <div style={{background:T.purpleBg,borderRadius:8,padding:12,marginBottom:14,fontSize:12,color:T.purple,lineHeight:1.6}}>
          <strong>Come ottenere la chiave:</strong><br/>
          1. Vai su <strong>console.anthropic.com</strong><br/>
          2. Login → Settings → API Keys → Create Key<br/>
          3. Copia la chiave (inizia con <code>sk-ant-</code>)
        </div>
        <Fld label="Chiave API Anthropic">
          <Inp value={k} onChange={setK} placeholder="sk-ant-api03-..." type="password"/>
        </Fld>
        {k && <p style={{fontSize:11,color:T.ok,margin:"0 0 12px"}}>✓ Chiave inserita — salvata solo nel tuo browser</p>}
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>{ setApiKey(k.trim()); onClose(); }} full icon={<Key size={13}/>}>Salva e attiva IA</Btn>
          <Btn v="secondary" onClick={onClose}>Annulla</Btn>
        </div>
      </div>
    </div>
  );
};

// ── FOTO ────────────────────────────────────────────────────
const Foto = ({ foto, onChange }) => {
  const leggi = (file) => new Promise(res => {
    if(!file?.type.startsWith("image/")) return res(null);
    const r = new FileReader(); r.onload=ev=>res({id:uid(),data:ev.target.result,nome:file.name,comm:""}); r.onerror=()=>res(null); r.readAsDataURL(file);
  });
  const onFile = async (e) => { const f=(await Promise.all(Array.from(e.target.files||[]).map(leggi))).filter(Boolean); if(f.length) onChange([...foto,...f]); e.target.value=""; };
  const idCam = useState(()=>"c"+uid())[0];
  const idGal = useState(()=>"g"+uid())[0];
  const lb = { display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"14px 8px",borderRadius:10,border:`2px dashed ${T.border}`,cursor:"pointer",flex:1 };
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <label htmlFor={idCam} style={lb}><Camera size={20} style={{color:T.accent}}/><span style={{fontSize:11,fontWeight:700,color:T.accent}}>Fotocamera</span><input id={idCam} type="file" accept="image/*" capture="environment" onChange={onFile} style={{display:"none"}}/></label>
        <label htmlFor={idGal} style={lb}><Image size={20} style={{color:T.blue}}/><span style={{fontSize:11,fontWeight:700,color:T.blue}}>Galleria</span><input id={idGal} type="file" accept="image/*" multiple onChange={onFile} style={{display:"none"}}/></label>
      </div>
      {foto.length===0&&<p style={{fontSize:11,color:T.muted,textAlign:"center",margin:"0 0 6px"}}>Nessuna foto</p>}
      {foto.map(f=>(
        <div key={f.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:8,borderRadius:8,border:`1px solid ${T.border}`,marginBottom:6}}>
          <img src={f.data} alt="" style={{width:64,height:64,objectFit:"cover",borderRadius:6,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:10,color:T.muted,margin:"0 0 4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.nome}</p>
            <input value={f.comm} onChange={e=>onChange(foto.map(x=>x.id===f.id?{...x,comm:e.target.value}:x))} placeholder="Descrizione..." style={{width:"100%",padding:"4px 8px",fontSize:12,borderRadius:6,border:`1px solid ${T.border}`,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          <button onClick={()=>onChange(foto.filter(x=>x.id!==f.id))} style={{border:"none",background:"transparent",cursor:"pointer"}}><X size={13} style={{color:T.err}}/></button>
        </div>
      ))}
    </div>
  );
};

// ── NC ──────────────────────────────────────────────────────
const NCItem = ({ nc, onChange, onDel, onNoKey }) => {
  const [open,setOpen] = useState(true);
  return (
    <div style={{border:`1px solid #FECACA`,borderRadius:8,padding:10,background:T.errBg,marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:open?10:0}}>
        <AlertTriangle size={12} style={{color:T.err,flexShrink:0}}/>
        <span style={{flex:1,fontSize:12,fontWeight:700,color:T.err,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nc.descr||"Non conformità"}</span>
        <button onClick={()=>onChange({...nc,stato:nc.stato==="Aperta"?"Chiusa":"Aperta"})} style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,border:"none",cursor:"pointer",background:nc.stato==="Chiusa"?T.okBg:T.errBg,color:nc.stato==="Chiusa"?T.ok:T.err}}>{nc.stato}</button>
        <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={12}/>:<ChevronDown size={12}/>}</button>
        <button onClick={onDel} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={11} style={{color:T.muted}}/></button>
      </div>
      {open && (
        <div>
          <Fld label="Descrizione"><div style={{display:"flex",gap:6}}><Inp value={nc.descr} onChange={v=>onChange({...nc,descr:v})} placeholder="Descrivi la NC..." rows={2}/><AIBtn prompt={`Sei un RSPP. Migliora questa descrizione NC in 1-2 frasi formali con riferimento al D.Lgs. 81/08: "${nc.descr||"NC rilevata"}". Solo testo.`} onResult={v=>onChange({...nc,descr:v})} onNoKey={onNoKey}/></div></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label="Gravità"><select value={nc.gravita} onChange={e=>onChange({...nc,gravita:e.target.value})} style={{width:"100%",padding:"8px 12px",fontSize:13,borderRadius:8,border:`1px solid ${T.border}`,fontFamily:"inherit"}}>{GRAVITA.map(g=><option key={g}>{g}</option>)}</select></Fld>
            <Fld label="Probabilità"><select value={nc.prob||"Possibile"} onChange={e=>onChange({...nc,prob:e.target.value})} style={{width:"100%",padding:"8px 12px",fontSize:13,borderRadius:8,border:`1px solid ${T.border}`,fontFamily:"inherit"}}>{PROB.map(p=><option key={p}>{p}</option>)}</select></Fld>
          </div>
          <Fld label="Misura correttiva"><SelLibero value={nc.misura} valueCustom={nc.misuraCustom||""} label="misura" onChange={v=>onChange({...nc,misura:v})} onChangeCustom={v=>onChange({...nc,misuraCustom:v})} options={MISURE_DEFAULT} placeholder="Seleziona misura..."/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label="Responsabile"><Inp value={nc.resp} onChange={v=>onChange({...nc,resp:v})} placeholder="Nome / ruolo"/></Fld>
            <Fld label="Scadenza"><Inp type="date" value={nc.scad} onChange={v=>onChange({...nc,scad:v})}/></Fld>
          </div>
        </div>
      )}
    </div>
  );
};

// ── RISCHIO ─────────────────────────────────────────────────
const RiskItem = ({ r, onChange, onDel, onNoKey }) => {
  const [open,setOpen] = useState(false);
  const ncAp = r.nc.filter(n=>n.stato==="Aperta").length;
  const nomeR = nomeM(r.tipo, r.tipoCustom);
  return (
    <div style={{border:`1px solid ${T.border}`,borderRadius:8,padding:10,marginBottom:8,background:"#fff"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:{Bassa:T.ok,Media:T.warn,Alta:T.err,Critica:T.err}[r.gravita]||T.muted}}/>
        <button onClick={()=>setOpen(!open)} style={{flex:1,textAlign:"left",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:T.text}}>{nomeR||"Rischio"}{ncAp>0&&<> <Badge color="red">{ncAp} NC</Badge></>}</button>
        <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={12}/>:<ChevronDown size={12}/>}</button>
        <button onClick={onDel} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={11} style={{color:T.muted}}/></button>
      </div>
      {open && (
        <div style={{marginTop:10,paddingLeft:14,borderLeft:`2px solid ${T.border}`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label="Tipo rischio"><SelLibero value={r.tipo} valueCustom={r.tipoCustom||""} label="rischio" onChange={v=>onChange({...r,tipo:v})} onChangeCustom={v=>onChange({...r,tipoCustom:v})} options={RISCHI_DEFAULT} placeholder="Seleziona..."/></Fld>
            <Fld label="Gravità"><select value={r.gravita} onChange={e=>onChange({...r,gravita:e.target.value})} style={{width:"100%",padding:"8px 12px",fontSize:13,borderRadius:8,border:`1px solid ${T.border}`,fontFamily:"inherit"}}>{GRAVITA.map(g=><option key={g}>{g}</option>)}</select></Fld>
          </div>
          <Fld label="Descrizione"><div style={{display:"flex",gap:6}}><Inp value={r.descr} onChange={v=>onChange({...r,descr:v})} placeholder="Descrivi il rischio..." rows={2}/><AIBtn prompt={`Sei un RSPP. Descrivi il rischio "${nomeR||"rischio"}" in 2 frasi tecniche, D.Lgs. 81/08. Solo testo.`} onResult={v=>onChange({...r,descr:v})} onNoKey={onNoKey}/></div></Fld>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:11,fontWeight:700,color:T.muted}}>NON CONFORMITÀ ({r.nc.length})</span>
            <div style={{display:"flex",gap:6}}>
              <AIBtn prompt={`Sei un RSPP. Per il rischio "${nomeR}", elenca 2 non conformità tipiche, una per riga, solo descrizione breve.`} onResult={txt=>{ const righe=txt.split("\n").filter(Boolean).slice(0,2); onChange({...r,nc:[...r.nc,...righe.map(d=>({...mkNC(),descr:d.replace(/^[-•\d.]+\s*/,"")}))]});}} onNoKey={onNoKey} label="Suggerisci NC"/>
              <Btn v="danger" sz="xs" icon={<Plus size={11}/>} onClick={()=>onChange({...r,nc:[...r.nc,mkNC()]})}>Aggiungi</Btn>
            </div>
          </div>
          {r.nc.map(n=><NCItem key={n.id} nc={n} onNoKey={onNoKey} onChange={x=>onChange({...r,nc:r.nc.map(y=>y.id===n.id?x:y)})} onDel={()=>onChange({...r,nc:r.nc.filter(y=>y.id!==n.id)})}/>)}
        </div>
      )}
    </div>
  );
};

// ── ELEMENTO ────────────────────────────────────────────────
const ElItem = ({ el, onChange, onDel, onNoKey }) => {
  const [open,setOpen] = useState(false);
  const [tab,setTab]   = useState("rischi");
  const ncTot = el.rischi.reduce((s,r)=>s+r.nc.filter(n=>n.stato==="Aperta").length,0);
  const nomeEl = nomeM(el.nome, el.nomeCustom);
  return (
    <div style={{border:`1px solid ${T.border}`,borderRadius:8,padding:10,marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>onChange({...el,conforme:!el.conforme})} style={{border:"none",background:"transparent",cursor:"pointer",flexShrink:0}}>{el.conforme?<CheckCircle2 size={16} style={{color:T.ok}}/>:<XCircle size={16} style={{color:T.err}}/>}</button>
        <button onClick={()=>setOpen(!open)} style={{flex:1,textAlign:"left",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:T.text}}>{nomeEl||"Elemento"}{ncTot>0&&<> <Badge color="red">{ncTot} NC</Badge></>}</button>
        <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
        <button onClick={onDel} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={13} style={{color:T.muted}}/></button>
      </div>
      {open && (
        <div style={{marginTop:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <Fld label="Elemento"><SelLibero value={el.nome} valueCustom={el.nomeCustom||""} label="elemento" onChange={v=>onChange({...el,nome:v})} onChangeCustom={v=>onChange({...el,nomeCustom:v})} options={ELEMENTI_DEFAULT} placeholder="Seleziona..."/></Fld>
            <Fld label="Stato"><select value={el.conforme?"Conforme":"Non conforme"} onChange={e=>onChange({...el,conforme:e.target.value==="Conforme"})} style={{width:"100%",padding:"8px 12px",fontSize:13,borderRadius:8,border:`1px solid ${T.border}`,fontFamily:"inherit"}}><option>Conforme</option><option>Non conforme</option></select></Fld>
          </div>
          <Fld label="Osservazioni"><div style={{display:"flex",gap:6,marginBottom:8}}><Inp value={el.descr} onChange={v=>onChange({...el,descr:v})} placeholder="Note sull'elemento..." rows={2}/><AIBtn prompt={`Sei un RSPP. Osservazione tecnica in 1-2 frasi per "${nomeEl||"elemento"}". Solo testo.`} onResult={v=>onChange({...el,descr:v})} onNoKey={onNoKey}/></div></Fld>
          <div style={{display:"flex",gap:4,marginBottom:10,padding:3,background:T.bg,borderRadius:8}}>
            {[["rischi",`Rischi (${el.rischi.length})`],["foto","Foto"]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:6,borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:tab===k?"#fff":"transparent",color:tab===k?T.accent:T.muted}}>{l}</button>
            ))}
          </div>
          {tab==="rischi" && (
            <>
              <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginBottom:8}}>
                <AIBtn prompt={`Sei un RSPP. Per l'elemento "${nomeEl||"elemento"}", elenca 3 rischi tipici, uno per riga, solo il nome.`} onResult={txt=>{ const r=txt.split("\n").filter(Boolean).slice(0,3); onChange({...el,rischi:[...el.rischi,...r.map(t=>({...mkRisk(),tipo:"__custom__",tipoCustom:t.replace(/^[-•\d.]+\s*/,"")}))]});}} onNoKey={onNoKey} label="Suggerisci rischi"/>
                <Btn v="secondary" sz="xs" icon={<Plus size={11}/>} onClick={()=>onChange({...el,rischi:[...el.rischi,mkRisk()]})}>Aggiungi</Btn>
              </div>
              {el.rischi.map(r=><RiskItem key={r.id} r={r} onNoKey={onNoKey} onChange={x=>onChange({...el,rischi:el.rischi.map(y=>y.id===r.id?x:y)})} onDel={()=>onChange({...el,rischi:el.rischi.filter(y=>y.id!==r.id)})}/>)}
            </>
          )}
          {tab==="foto" && <Foto foto={el.foto||[]} onChange={f=>onChange({...el,foto:f})}/>}
        </div>
      )}
    </div>
  );
};

// ── AMBIENTE ────────────────────────────────────────────────
const AmbItem = ({ amb, onChange, onDel, idx, onNoKey }) => {
  const [open,setOpen] = useState(true);
  const [tab,setTab]   = useState("el");
  const ncTot = amb.elementi.reduce((s,e)=>s+e.rischi.reduce((s2,r)=>s2+r.nc.filter(n=>n.stato==="Aperta").length,0),0);
  const nomeAmb = nomeM(amb.nome, amb.nomeCustom);
  return (
    <Card>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:open?12:0}}>
          <MapPin size={14} style={{color:T.accent,flexShrink:0}}/>
          <button onClick={()=>setOpen(!open)} style={{flex:1,textAlign:"left",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:700,color:T.text}}>
            {nomeAmb||`Ambiente ${idx}`} <Badge color="gray">{amb.elementi.length} el.</Badge> <Badge color="gray">{(amb.foto||[]).length} foto</Badge>{ncTot>0&&<> <Badge color="red">{ncTot} NC</Badge></>}
          </button>
          <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
          <button onClick={onDel} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={14} style={{color:T.muted}}/></button>
        </div>
        {open && (
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <Fld label="Nome ambiente"><SelLibero value={amb.nome} valueCustom={amb.nomeCustom||""} label="ambiente" onChange={v=>onChange({...amb,nome:v})} onChangeCustom={v=>onChange({...amb,nomeCustom:v})} options={AMBIENTI_DEFAULT} placeholder="Seleziona..."/></Fld>
              <Fld label="Ubicazione"><Inp value={amb.ubicazione} onChange={v=>onChange({...amb,ubicazione:v})} placeholder="Piano, ala..."/></Fld>
            </div>
            <Fld label="Descrizione"><div style={{display:"flex",gap:6,marginBottom:10}}><Inp value={amb.descr} onChange={v=>onChange({...amb,descr:v})} placeholder="Condizioni generali rilevate..." rows={2}/><AIBtn prompt={`Sei un RSPP. Descrivi l'ambiente "${nomeAmb||"ambiente"}" in 2 frasi per un verbale di sopralluogo. Solo testo.`} onResult={v=>onChange({...amb,descr:v})} onNoKey={onNoKey}/></div></Fld>
            <div style={{display:"flex",gap:4,marginBottom:10,padding:3,background:T.bg,borderRadius:8}}>
              {[["el",`Elementi (${amb.elementi.length})`],["foto",`Foto (${(amb.foto||[]).length})`]].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:6,borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:tab===k?"#fff":"transparent",color:tab===k?T.accent:T.muted}}>{l}</button>
              ))}
            </div>
            {tab==="el" && (
              <>{amb.elementi.map((el,i)=><ElItem key={el.id} el={el} idx={i+1} onNoKey={onNoKey} onChange={x=>onChange({...amb,elementi:amb.elementi.map(y=>y.id===el.id?x:y)})} onDel={()=>onChange({...amb,elementi:amb.elementi.filter(y=>y.id!==el.id)})}/>)}
              <Btn v="secondary" sz="sm" icon={<Plus size={12}/>} onClick={()=>onChange({...amb,elementi:[...amb.elementi,mkEl()]})} full>Aggiungi elemento</Btn></>
            )}
            {tab==="foto" && <Foto foto={amb.foto||[]} onChange={f=>onChange({...amb,foto:f})}/>}
          </>
        )}
      </div>
    </Card>
  );
};

// ── VERBALE ─────────────────────────────────────────────────
const generaHTML = (s, conclusioni) => {
  const tutteNC = s.ambienti.flatMap(a=>a.elementi.flatMap(e=>e.rischi.flatMap(r=>r.nc.map(n=>({...n,amb:nomeM(a.nome,a.nomeCustom),el:nomeM(e.nome,e.nomeCustom),risk:nomeM(r.tipo,r.tipoCustom)})))));
  const ncAp = tutteNC.filter(n=>n.stato==="Aperta");
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Verbale ${s.azienda} ${s.data}</title>
<style>body{font-family:Georgia,serif;max-width:850px;margin:0 auto;padding:40px 30px;color:#1C1917;line-height:1.7;font-size:14px}h1{color:#B91C1C;border-bottom:2px solid #B91C1C;padding-bottom:10px}h2{color:#1C1917;border-left:3px solid #B91C1C;padding-left:10px;margin-top:28px}.meta{background:#F5F2ED;border-radius:8px;padding:16px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.mr{display:flex;gap:8px}.ml{font-size:11px;color:#78716C;min-width:110px}.mv{font-size:13px;font-weight:600}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}th{background:#1C1917;color:#fff;padding:7px 10px;text-align:left;font-size:11px}td{padding:7px 10px;border-bottom:1px solid #DDD8CF;vertical-align:top}tr:nth-child(even) td{background:#F5F2ED}.firma{display:flex;justify-content:space-between;margin-top:60px;gap:40px}.fb{flex:1;border-top:1px solid #1C1917;padding-top:12px;font-size:12px}.disc{margin-top:40px;padding:14px;background:#FFFBEB;border-radius:8px;font-size:11px;color:#78716C;border:1px solid #FDE68A}.foto-grid{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.foto-grid img{width:150px;height:110px;object-fit:cover;border-radius:6px;border:1px solid #DDD8CF}@media print{body{padding:20px}}</style></head><body>
<p style="font-size:11px;color:#78716C;text-transform:uppercase;letter-spacing:1px">Ichnossicurezza S.r.l.</p>
<h1>Verbale di Sopralluogo<br><small style="font-size:14px;font-weight:normal;color:#44403C">${s.azienda||"N/D"} — ${s.data}</small></h1>
<div class="meta"><div class="mr"><span class="ml">Azienda</span><span class="mv">${s.azienda||"—"}</span></div><div class="mr"><span class="ml">Sede</span><span class="mv">${s.sede||"—"}</span></div><div class="mr"><span class="ml">Indirizzo</span><span class="mv">${s.indirizzo||"—"}</span></div><div class="mr"><span class="ml">N° lavoratori</span><span class="mv">${s.nLav||"—"}</span></div><div class="mr"><span class="ml">Data</span><span class="mv">${s.data}</span></div><div class="mr"><span class="ml">Tipo</span><span class="mv">${s.tipo}</span></div><div class="mr"><span class="ml">Tecnico RSPP</span><span class="mv">${s.tecnico||"—"}</span></div></div>
<h2>1. Ambienti visitati</h2>${s.ambienti.map((a,i)=>{const nA=nomeM(a.nome,a.nomeCustom);return `<div style="margin-bottom:20px;border:1px solid #DDD8CF;border-radius:8px;overflow:hidden"><div style="background:#F5F2ED;padding:10px 14px;font-weight:700">${i+1}. ${nA||"Ambiente"} ${a.ubicazione?"— "+a.ubicazione:""}</div><div style="padding:12px 14px">${a.descr?`<p>${a.descr}</p>`:""}${a.elementi.length?`<table><tr><th>Elemento</th><th>Stato</th><th>Rischi</th><th>Osservazioni</th></tr>${a.elementi.map(e=>`<tr><td>${nomeM(e.nome,e.nomeCustom)||"—"}</td><td style="color:${e.conforme?"#15803D":"#B91C1C"};font-weight:700">${e.conforme?"✓ Conforme":"✗ NC"}</td><td>${e.rischi.map(r=>`<span style="background:#FFFBEB;color:#B45309;font-size:10px;padding:1px 6px;border-radius:10px">${nomeM(r.tipo,r.tipoCustom)}</span>`).join("")||"—"}</td><td>${e.descr||"—"}</td></tr>`).join("")}</table>`:""}${(a.foto||[]).length?`<div class="foto-grid">${a.foto.map(f=>`<div><img src="${f.data}"/><p style="font-size:10px;color:#78716C;margin:3px 0">${f.comm||f.nome}</p></div>`).join("")}</div>`:""}</div></div>`;}).join("")}
<h2>2. Non conformità aperte (${ncAp.length})</h2>${ncAp.length===0?`<p>Nessuna non conformità.</p>`:`<table><tr><th>#</th><th>Ambiente</th><th>Elemento</th><th>Descrizione</th><th>Gravità</th><th>Misura</th><th>Responsabile</th><th>Scadenza</th></tr>${ncAp.map((n,i)=>`<tr><td>${i+1}</td><td>${n.amb}</td><td>${n.el}</td><td>${n.descr}</td><td>${n.gravita}</td><td>${nomeM(n.misura,n.misuraCustom)||"—"}</td><td>${n.resp||"—"}</td><td>${n.scad||"—"}</td></tr>`).join("")}</table>`}
${s.note?`<h2>3. Note generali</h2><p>${s.note}</p>`:""}
<h2>Conclusioni</h2><p>${conclusioni||`Dal sopralluogo del ${s.data} presso ${s.azienda||"l'azienda"} sono stati visitati ${s.ambienti.length} ambienti e rilevate ${ncAp.length} non conformità aperte.`}</p>
<div class="firma"><div class="fb">Il Tecnico RSPP<br><strong>${s.tecnico||"_______________"}</strong><br><br>Firma: _____________________</div><div class="fb">Il Datore di Lavoro<br><br><br>Firma: _____________________</div></div>
<div class="disc"><strong>Nota.</strong> Verbale ai sensi del D.Lgs. 81/2008. Ichnossicurezza S.r.l. — Tel. 079-4136984 — info@ichnossicurezza.it</div>
</body></html>`;
};

// ── APP ─────────────────────────────────────────────────────
export default function App() {
  const [sopr,  setSopr]  = useState(null);
  const [vista, setVista] = useState("start");
  const [concl, setConcl] = useState("");
  const [aiLoad,setAiLoad]= useState(false);
  const [saved, setSaved] = useState(false);
  const [showIA,setShowIA]= useState(false);
  const haKey = Boolean(getApiKey());

  useEffect(()=>{ const d=loadAll(); if(d?.sopr){setSopr(d.sopr);setConcl(d.concl||"");} },[]);
  useEffect(()=>{ if(sopr){saveAll({sopr,concl});setSaved(true);const t=setTimeout(()=>setSaved(false),1500);return()=>clearTimeout(t);} },[sopr,concl]);

  const nuovo    = () => { setSopr(mkSopr()); setConcl(""); setVista("editor"); };
  const continua = () => { const d=loadAll(); if(d?.sopr){setSopr(d.sopr);setConcl(d.concl||"");setVista("editor");} };
  const ncTot    = sopr?.ambienti.reduce((s,a)=>s+a.elementi.reduce((s2,e)=>s2+e.rischi.reduce((s3,r)=>s3+r.nc.filter(n=>n.stato==="Aperta").length,0),0),0)||0;

  const apriVerbale = async () => {
    setVista("verbale");
    if(!concl){ setAiLoad(true); try{ const t=await callAI(`Sei un RSPP. Conclusioni per verbale sopralluogo presso "${sopr.azienda||"azienda"}" del ${sopr.data}. Ambienti: ${sopr.ambienti.map(a=>nomeM(a.nome,a.nomeCustom)).join(", ")||"nessuno"}. NC aperte: ${ncTot}. 2-3 frasi formali. Solo testo.`); setConcl(t); }catch(e){ if(e.message==="NO_KEY") setShowIA(true); }finally{setAiLoad(false);} }
  };

  const scaricaVerbale = () => {
    const html=generaHTML(sopr,concl);
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`Verbale_${(sopr.azienda||"sopralluogo").replace(/\s+/g,"_")}_${sopr.data}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(url),5000);
  };

  const pg={ background:T.bg, minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif" };
  const wr={ maxWidth:600, margin:"0 auto", padding:"16px 14px 90px" };

  if(vista==="start") return (
    <div style={pg}><div style={{...wr,paddingTop:60,textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:16,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Shield size={32} color="#fff"/></div>
      <h2 style={{color:T.text,fontFamily:"Georgia,serif",margin:"0 0 4px"}}>Ichnossicurezza</h2>
      <p style={{color:T.muted,fontSize:13,marginBottom:8}}>Gestione Sopralluoghi — D.Lgs. 81/2008</p>
      <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:20,background:haKey?T.okBg:T.warnBg,marginBottom:32}}>
        <span style={{fontSize:11,fontWeight:700,color:haKey?T.ok:T.warn}}>{haKey?"✓ IA attiva":"⚠ IA non configurata"}</span>
        <button onClick={()=>setShowIA(true)} style={{fontSize:11,color:haKey?T.ok:T.warn,border:"none",background:"transparent",cursor:"pointer",textDecoration:"underline"}}>{haKey?"modifica":"configura"}</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:280,margin:"0 auto"}}>
        <Btn onClick={nuovo} full sz="lg" icon={<Plus size={16}/>}>Nuovo sopralluogo</Btn>
        {loadAll()?.sopr&&<Btn onClick={continua} v="secondary" full sz="lg">Continua sopralluogo salvato</Btn>}
        <Btn onClick={()=>setShowIA(true)} v="ghost" full sz="sm" icon={<Key size={13}/>}>Impostazioni IA</Btn>
      </div>
    </div>
    {showIA&&<ModalIA onClose={()=>setShowIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(vista==="verbale") return (
    <div style={pg}><div style={wr}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={()=>setVista("editor")} style={{padding:8,borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer"}}><ArrowLeft size={16}/></button>
        <h3 style={{margin:0,fontFamily:"Georgia,serif",color:T.text}}>Verbale di sopralluogo</h3>
        <button onClick={()=>setShowIA(true)} style={{marginLeft:"auto",padding:"5px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:T.purple}}><Key size={12}/>IA</button>
      </div>
      <Card style={{padding:16,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:700,color:T.muted}}>Conclusioni</span>
          <AIBtn prompt={`RSPP: conclusioni per sopralluogo "${sopr.azienda}" del ${sopr.data}. NC aperte: ${ncTot}. 2-3 frasi formali. Solo testo.`} onResult={setConcl} onNoKey={()=>setShowIA(true)} label="Genera con IA"/>
        </div>
        {aiLoad?<div style={{textAlign:"center",padding:20,color:T.muted,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Loader2 size={18} style={{animation:"spin 1s linear infinite"}}/>Generazione...</div>
        :<Inp value={concl} onChange={setConcl} placeholder="Scrivi o genera le conclusioni con IA..." rows={5}/>}
      </Card>
      <Btn onClick={scaricaVerbale} full sz="lg" icon={<FileText size={15}/>}>Scarica verbale HTML</Btn>
      <p style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:8}}>Apri in Word → Salva come .docx · oppure stampa come PDF</p>
    </div>
    {showIA&&<ModalIA onClose={()=>setShowIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={pg}><div style={wr}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <button onClick={()=>setVista("start")} style={{padding:8,borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer"}}><ArrowLeft size={16}/></button>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:"Georgia,serif"}}>{sopr.azienda||"Nuovo sopralluogo"}</div>
          <div style={{fontSize:11,color:T.muted,display:"flex",alignItems:"center",gap:8}}>{sopr.data}{ncTot>0&&<Badge color="red">{ncTot} NC</Badge>}{saved&&<span style={{color:T.ok,fontWeight:700}}>✓ Salvato</span>}</div>
        </div>
        <button onClick={()=>setShowIA(true)} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:haKey?T.ok:T.warn}}><Key size={13}/>{haKey?"IA ✓":"IA"}</button>
        <Btn onClick={apriVerbale} sz="sm" icon={<FileText size={13}/>}>Verbale</Btn>
      </div>

      <Card style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.5px"}}>Dati sopralluogo</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Azienda *"><Inp value={sopr.azienda} onChange={v=>setSopr(s=>({...s,azienda:v}))} placeholder="Ragione sociale"/></Fld>
          <Fld label="Sede"><Inp value={sopr.sede} onChange={v=>setSopr(s=>({...s,sede:v}))} placeholder="Sede centrale"/></Fld>
        </div>
        <Fld label="Indirizzo"><Inp value={sopr.indirizzo} onChange={v=>setSopr(s=>({...s,indirizzo:v}))} placeholder="Via, città"/></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="N° lavoratori"><Inp type="number" value={sopr.nLav} onChange={v=>setSopr(s=>({...s,nLav:v}))}/></Fld>
          <Fld label="Data"><Inp type="date" value={sopr.data} onChange={v=>setSopr(s=>({...s,data:v}))}/></Fld>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Consulente RSPP"><Inp value={sopr.tecnico} onChange={v=>setSopr(s=>({...s,tecnico:v}))} placeholder="Nome cognome"/></Fld>
          <Fld label="Tipo"><select value={sopr.tipo} onChange={e=>setSopr(s=>({...s,tipo:e.target.value}))} style={{width:"100%",padding:"8px 12px",fontSize:13,borderRadius:8,border:`1px solid ${T.border}`,fontFamily:"inherit"}}>{TIPI_SOPR.map(t=><option key={t}>{t}</option>)}</select></Fld>
        </div>
        <Fld label="Note generali"><Inp value={sopr.note} onChange={v=>setSopr(s=>({...s,note:v}))} placeholder="Condizioni generali, presenti..." rows={2}/></Fld>
      </Card>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontSize:14,fontWeight:700,color:T.text}}>Ambienti ({sopr.ambienti.length})</span>
        <Btn onClick={()=>setSopr(s=>({...s,ambienti:[...s.ambienti,mkAmb()]}))} sz="sm" icon={<Plus size={13}/>}>Aggiungi ambiente</Btn>
      </div>

      {sopr.ambienti.length===0&&(
        <div style={{textAlign:"center",padding:"30px 20px",borderRadius:12,border:`2px dashed ${T.border}`,marginBottom:12}}>
          <MapPin size={24} style={{color:T.muted,marginBottom:8}}/><p style={{color:T.muted,fontSize:13,margin:0}}>Aggiungi il primo ambiente visitato</p>
        </div>
      )}

      {sopr.ambienti.map((a,i)=>(
        <AmbItem key={a.id} amb={a} idx={i+1} onNoKey={()=>setShowIA(true)}
          onChange={x=>setSopr(s=>({...s,ambienti:s.ambienti.map(y=>y.id===a.id?x:y)}))}
          onDel={()=>setSopr(s=>({...s,ambienti:s.ambienti.filter(y=>y.id!==a.id)}))}/>
      ))}

      {sopr.ambienti.length>0&&<Btn onClick={apriVerbale} full sz="lg" icon={<FileText size={15}/>}>Genera verbale</Btn>}
    </div>

    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(245,242,237,0.96)",borderTop:`1px solid ${T.border}`,padding:"10px 16px",backdropFilter:"blur(8px)"}}>
      <div style={{maxWidth:600,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><Shield size={13} style={{color:T.accent}}/><span style={{fontSize:11,fontWeight:700,color:T.accent}}>Ichnossicurezza</span></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>{ncTot>0&&<Badge color="red">{ncTot} NC</Badge>}<span style={{fontSize:11,color:T.muted}}>{sopr.ambienti.length} ambienti</span></div>
      </div>
    </div>
    {showIA&&<ModalIA onClose={()=>setShowIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
