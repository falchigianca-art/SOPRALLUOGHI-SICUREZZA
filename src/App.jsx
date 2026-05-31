import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Camera, Sparkles, ArrowLeft, X, Shield, MapPin, AlertTriangle, FileText, Loader2, Image, Key, Copy, FolderOpen, Save, Upload, Download, RefreshCw, CheckCircle, Clock, AlertCircle } from "lucide-react";

// ── TEMA ─────────────────────────────────────────────────────
const T = {
  bg:"#F5F2ED", border:"#DDD8CF", accent:"#B91C1C", text:"#1C1917", muted:"#78716C",
  ok:"#15803D", okBg:"#F0FDF4", warn:"#B45309", warnBg:"#FFFBEB",
  err:"#B91C1C", errBg:"#FEF2F2", blue:"#1D4ED8", blueBg:"#EFF6FF", purple:"#6D28D9",
};

// ── DATI ─────────────────────────────────────────────────────
const GRAVITA  = ["Bassa","Media","Alta","Critica"];
const PROB     = ["Improbabile","Possibile","Probabile","Quasi certa"];
const TIPI     = ["Periodico","Straordinario","Primo sopralluogo","Follow-up NC","Audit interno","Pre-appalto (DUVRI)"];
const AMBIENTI = ["Ufficio amministrativo","Ufficio tecnico","Sala riunioni","Reception / ingresso","Corridoio","Reparto produttivo","Magazzino","Officina meccanica","Laboratorio","Mensa / refettorio","Cucina","Spogliatoi","Servizi igienici","Archivio","Server room","Locale tecnico","Cabina elettrica","Centrale termica","Locale compressori","Area carico/scarico","Cortile / area esterna","Parcheggio","Piano interrato","Terrazza / tetto","Camera degenza","Sala visita","Pronto soccorso","Sala operatoria","Aula scolastica","Palestra","Biblioteca","Negozio / showroom"];
const ELEMENTI = ["Scaffalatura metallica","Scaffalatura in legno","Soppalco","Pavimentazione interna","Pavimentazione esterna","Scala fissa","Scala portatile","Scala a pioli","Trabattello / ponteggio","Passerella","Parapetto","Quadro elettrico generale","Quadro elettrico secondario","Impianto di terra","Illuminazione ordinaria","Illuminazione emergenza","Impianto sprinkler","Rilevazione incendi","Estintore portatile","Estintore carrellato","Idrante UNI 45","Idrante UNI 70","Uscita di emergenza","Segnaletica sicurezza","Postazione VDT","Sedia ergonomica","Carrello elevatore","Transpallet manuale","Transpallet elettrico","Gru a ponte","Trapano","Mola angolare","Sega circolare","Tornio","Compressore","Caldaia","Impianto gas","Armadio prodotti chimici","DPI in dotazione","Cassetta pronto soccorso","Defibrillatore (DAE)","Porte REI","Cancello automatico"];
const RISCHI   = ["Elettrico","Incendio","Esplosione","Chimico","Biologico","Rumore","Vibrazioni","Videoterminali (VDT)","Movimentazione manuale carichi","Posture scorrette","Caduta dall'alto","Scivolamento / inciampo","Investimento da mezzi","Taglio / abrasione","Schiacciamento","Microclima","Illuminazione insufficiente","Polveri e aerosol","Stress lavoro-correlato","Lavori in quota","Interferenze (DUVRI)","Emergenza / evacuazione","Agenti cancerogeni","Amianto","Radiazioni","Spazi confinati","ATEX"];

// ── UTILS ─────────────────────────────────────────────────────
const uid    = () => Math.random().toString(36).slice(2,9);
const oggi   = () => new Date().toISOString().split("T")[0];
const nM     = (v,l) => v==="__L__" ? l : v;
const DB_KEY = "ichno_sopr_list";
const AK     = "ichno_ak";
const akGet  = () => localStorage.getItem(AK)||"";
const akSet  = (k) => localStorage.setItem(AK,k);
const dbLoad = () => { try { return JSON.parse(localStorage.getItem(DB_KEY)||"[]"); } catch { return []; } };
const dbSave = (list) => { try { localStorage.setItem(DB_KEY,JSON.stringify(list)); } catch(e) { alert("Spazio insufficiente nel browser. Elimina sopralluoghi vecchi."); } };

const mkSopr = (base={}) => ({
  id:uid(), nome:"Nuovo sopralluogo", azienda:"", sede:"", indirizzo:"",
  nLav:"", data:oggi(), tecnico:"", tipo:"Periodico", note:"",
  ambienti:[], concl:"", vecchioVerbale:"", creato:new Date().toISOString(),
  ...base
});
const mkAmb  = () => ({ id:uid(), nome:"", nomeL:"", ubicazione:"", descr:"", foto:[], elementi:[] });
const mkEl   = () => ({ id:uid(), nome:"", nomeL:"", descr:"", conforme:true, criticita:[] });
const mkCrit = () => ({ id:uid(), titolo:"", descr:"", misure:"", gravita:"Media", prob:"Possibile", stato:"Aperta", reiterata:false, note:"" });

// ── AI ────────────────────────────────────────────────────────
const callAI = async (prompt, maxTokens=700) => {
  const k = akGet();
  if(!k) throw new Error("NO_KEY");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":k,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:maxTokens,messages:[{role:"user",content:prompt}]})
  });
  if(!r.ok){const t=await r.text();throw new Error("Err "+r.status+": "+t.slice(0,80));}
  const d=await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.content?.find(b=>b.type==="text")?.text||"";
};

// ── UI BASE ───────────────────────────────────────────────────
const Btn = ({children,onClick,v="p",sz="m",icon,disabled,full,style:sx={}}) => {
  const S={p:{background:T.accent,color:"#fff",border:"none"},s:{background:"#fff",color:T.text,border:`1px solid ${T.border}`},g:{background:"transparent",color:T.muted,border:"none"},d:{background:T.errBg,color:T.err,border:`1px solid #FECACA`},a:{background:T.purple,color:"#fff",border:"none"},ok:{background:T.okBg,color:T.ok,border:`1px solid #BBF7D0`}}[v]||{};
  const P={xs:"4px 8px",s:"6px 11px",m:"8px 15px",l:"11px 20px"}[sz]||"8px 15px";
  const F={xs:11,s:12,m:13,l:15}[sz]||13;
  return <button onClick={onClick} disabled={disabled} style={{...S,padding:P,fontSize:F,fontWeight:700,borderRadius:8,display:"inline-flex",alignItems:"center",gap:5,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,width:full?"100%":"auto",justifyContent:full?"center":"flex-start",fontFamily:"inherit",boxSizing:"border-box",...sx}}>{icon&&<span style={{display:"flex"}}>{icon}</span>}{children}</button>;
};

const Inp = ({value,onChange,placeholder,type="text",rows,disabled}) => {
  const s={width:"100%",padding:"9px 12px",fontSize:14,borderRadius:8,border:`1px solid ${T.border}`,outline:"none",fontFamily:"inherit",color:T.text,background:disabled?"#F5F2ED":"#fff",boxSizing:"border-box"};
  if(rows) return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled} style={{...s,resize:"vertical",minHeight:rows*24}}/>;
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
    {value==="__L__"&&<input value={valueL} onChange={e=>onL(e.target.value)} placeholder={`Inserisci ${label||"valore"}...`} autoFocus style={{width:"100%",padding:"9px 12px",fontSize:14,borderRadius:8,border:`2px solid ${T.accent}`,outline:"none",fontFamily:"inherit",color:T.text,background:"#fff",boxSizing:"border-box",marginTop:6}}/>}
  </div>
);

const Fld  = ({label,children,hint}) => <div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>{children}{hint&&<p style={{fontSize:11,color:T.muted,margin:"4px 0 0"}}>{hint}</p>}</div>;
const Card = ({children,style={}}) => <div style={{background:"#fff",borderRadius:12,border:`1px solid ${T.border}`,marginBottom:12,...style}}>{children}</div>;
const Bdg  = ({children,color="gray"}) => {const m={gray:{bg:"#F5F2ED",c:T.muted},red:{bg:T.errBg,c:T.err},green:{bg:T.okBg,c:T.ok},yellow:{bg:T.warnBg,c:T.warn},blue:{bg:T.blueBg,c:T.blue},purple:{bg:"#F5F3FF",c:T.purple}};const s=m[color]||m.gray;return <span style={{background:s.bg,color:s.c,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap",display:"inline-block"}}>{children}</span>;};

// ── AI BUTTON SMART ───────────────────────────────────────────
const AIField = ({value,onChange,placeholder,rows=3,promptEmpty,promptFull,label,onNoKey}) => {
  const [loading,setL]=useState(false);
  const [err,setErr]=useState("");
  const genera=async(e)=>{
    e.stopPropagation();setL(true);setErr("");
    try{
      const prompt = value.trim() ? promptFull(value) : promptEmpty;
      onChange(await callAI(prompt));
    }catch(ex){if(ex.message==="NO_KEY"&&onNoKey)onNoKey();else setErr(ex.message.slice(0,60));}
    finally{setL(false);}
  };
  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",gap:6}}>
        <Inp value={value} onChange={onChange} placeholder={placeholder} rows={rows}/>
        <button onClick={genera} disabled={loading} style={{padding:"9px 10px",borderRadius:8,border:"none",background:T.purple,color:"#fff",cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:4,flexShrink:0,opacity:loading?0.6:1}}>
          {loading?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:<Sparkles size={14}/>}
          <span style={{fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{value.trim()?"Migliora":"Genera"}</span>
        </button>
      </div>
      {err&&<p style={{fontSize:10,color:T.err,margin:"3px 0 0"}}>{err}</p>}
    </div>
  );
};

// ── MODALE IA ─────────────────────────────────────────────────
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
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>{akSet(k.trim());onClose();}} full icon={<Key size={13}/>}>Salva e attiva</Btn>
          <Btn v="s" onClick={onClose}>Annulla</Btn>
        </div>
      </div>
    </div>
  );
};

// ── FOTO ─────────────────────────────────────────────────────
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

// ── CRITICITÀ CARD ────────────────────────────────────────────
const CritCard = ({aId,eId,c,updC,delC,setIA,titoloCrit}) => {
  const [open,setOpen]=useState(true);
  return (
    <div style={{border:`1px solid ${c.reiterata?"#F59E0B":"#FECACA"}`,borderRadius:8,padding:10,marginBottom:8,background:c.reiterata?T.warnBg:T.errBg}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:open?10:0,flexWrap:"wrap"}}>
        <AlertTriangle size={12} style={{color:c.reiterata?T.warn:T.err,flexShrink:0}}/>
        <span style={{flex:1,fontSize:12,fontWeight:700,color:c.reiterata?T.warn:T.err,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {c.titolo||"Criticità"}
        </span>
        {c.reiterata&&<Bdg color="yellow">⟳ Reiterata</Bdg>}
        <Bdg color={c.gravita==="Alta"||c.gravita==="Critica"?"red":c.gravita==="Media"?"yellow":"green"}>{c.gravita}</Bdg>
        <button onClick={()=>updC(aId,eId,c.id,"stato",c.stato==="Aperta"?"Chiusa":"Aperta")}
          style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,border:"none",cursor:"pointer",background:c.stato==="Chiusa"?T.okBg:T.errBg,color:c.stato==="Chiusa"?T.ok:T.err}}>
          {c.stato}
        </button>
        <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={12}/>:<ChevronDown size={12}/>}</button>
        <button onClick={()=>delC(aId,eId,c.id)} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={11} style={{color:T.muted}}/></button>
      </div>

      {open&&(
        <div>
          <Fld label="Titolo criticità">
            <Inp value={c.titolo} onChange={v=>updC(aId,eId,c.id,"titolo",v)} placeholder="Es. Mancanza segnaletica di sicurezza"/>
          </Fld>

          <Fld label="Descrizione tecnica">
            <AIField
              value={c.descr} onChange={v=>updC(aId,eId,c.id,"descr",v)}
              placeholder="Descrizione tecnica della criticità rilevata..."
              rows={3}
              promptEmpty={`Sei un RSPP esperto. Scrivi una descrizione tecnica professionale per questa criticità rilevata in un sopralluogo: "${c.titolo||titoloCrit||"criticità"}". La descrizione deve essere chiara, sintetica e tecnica. Non citare articoli di legge nel testo. Non usare formule ripetitive come "Durante il sopralluogo è stato riscontrato". Varia il testo in base al contenuto. Max 3 frasi. Solo il testo della descrizione.`}
              promptFull={v=>`Sei un RSPP esperto. Migliora questa descrizione tecnica rendendola più professionale e tecnica. Non citare articoli di legge. Non usare frasi come "Durante il sopralluogo". Testo originale: "${v}". Rispondi solo con la descrizione migliorata.`}
              onNoKey={()=>setIA(true)}/>
          </Fld>

          <Fld label="Misure correttive">
            <AIField
              value={c.misure} onChange={v=>updC(aId,eId,c.id,"misure",v)}
              placeholder="Misure correttive da adottare..."
              rows={3}
              promptEmpty={`Sei un RSPP esperto. Sulla base di questa criticità: "${c.descr||c.titolo||"criticità"}", indica le misure correttive tecniche, organizzative e procedurali da adottare. Sii concreto e pratico. Non citare articoli di legge nel testo. Max 4 misure concise. Solo il testo delle misure.`}
              promptFull={v=>`Sei un RSPP esperto. Migliora queste misure correttive rendendole più tecniche e professionali. Non citare articoli di legge. Misure originali: "${v}". Rispondi solo con le misure migliorate.`}
              onNoKey={()=>setIA(true)}/>
          </Fld>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <Fld label="Gravità"><Sel value={c.gravita} onChange={v=>updC(aId,eId,c.id,"gravita",v)} options={GRAVITA}/></Fld>
            <Fld label="Probabilità"><Sel value={c.prob||"Possibile"} onChange={v=>updC(aId,eId,c.id,"prob",v)} options={PROB}/></Fld>
          </div>

          <Fld label="Note aggiuntive">
            <Inp value={c.note||""} onChange={v=>updC(aId,eId,c.id,"note",v)} placeholder="Note, annotazioni..." rows={2}/>
          </Fld>
        </div>
      )}
    </div>
  );
};

// ── ELEMENTO CARD ─────────────────────────────────────────────
const ElCard = ({aId,el,updEl,updC,addC,delC,delEl,setIA}) => {
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState("crit");
  const ncAp=el.criticita.filter(c=>c.stato==="Aperta").length;
  return (
    <div style={{border:`1px solid ${T.border}`,borderRadius:8,padding:10,marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:open?8:0}}>
        <button onClick={()=>updEl(aId,el.id,"conforme",!el.conforme)} style={{border:"none",background:"transparent",cursor:"pointer",flexShrink:0}}>
          {el.conforme?<CheckCircle size={15} style={{color:T.ok}}/>:<AlertCircle size={15} style={{color:T.err}}/>}
        </button>
        <button onClick={()=>setOpen(!open)} style={{flex:1,textAlign:"left",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600}}>
          {nM(el.nome,el.nomeL)||"Elemento"}{ncAp>0&&<>{" "}<Bdg color="red">{ncAp} NC</Bdg></>}
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
            <AIField value={el.descr} onChange={v=>updEl(aId,el.id,"descr",v)} placeholder="Note sull'elemento..." rows={2}
              promptEmpty={`RSPP: osservazione tecnica sintetica per l'elemento "${nM(el.nome,el.nomeL)||"elemento"}" in un sopralluogo. Max 2 frasi. Solo testo.`}
              promptFull={v=>`RSPP: migliora questa osservazione tecnica: "${v}". Max 2 frasi. Solo testo.`}
              onNoKey={()=>setIA(true)}/>
          </Fld>
          <div style={{display:"flex",gap:4,marginBottom:8,padding:3,background:T.bg,borderRadius:8}}>
            {[["crit",`Criticità (${el.criticita.length})`],["foto","Foto"]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:6,borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:tab===k?"#fff":"transparent",color:tab===k?T.accent:T.muted}}>{l}</button>
            ))}
          </div>
          {tab==="crit"&&(
            <>
              {el.criticita.map(c=><CritCard key={c.id} aId={aId} eId={el.id} c={c} updC={updC} delC={delC} setIA={setIA} titoloCrit={nM(el.nome,el.nomeL)}/>)}
              <Btn v="d" sz="s" icon={<Plus size={12}/>} onClick={()=>addC(aId,el.id,mkCrit())} full>Aggiungi criticità</Btn>
            </>
          )}
          {tab==="foto"&&<p style={{fontSize:12,color:T.muted,textAlign:"center",padding:"8px 0"}}>Le foto si aggiungono nell'ambiente (tab Foto)</p>}
        </div>
      )}
    </div>
  );
};

// ── AMBIENTE CARD ─────────────────────────────────────────────
const AmbCard = ({a,ai,updAmb,updEl,updC,addEl,delEl,addC,delC,addFoto,delFoto,commFoto,delAmb,setIA}) => {
  const [tab,setTab]=useState("el");
  const ncTot=a.elementi.reduce((s,e)=>s+e.criticita.filter(c=>c.stato==="Aperta").length,0);
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
          <AIField value={a.descr} onChange={v=>updAmb(a.id,"descr",v)} placeholder="Condizioni generali rilevate..." rows={2}
            promptEmpty={`RSPP: descrivi brevemente l'ambiente "${nM(a.nome,a.nomeL)||"ambiente"}" in un sopralluogo. Max 2 frasi. Solo testo.`}
            promptFull={v=>`RSPP: migliora questa descrizione di ambiente: "${v}". Max 2 frasi. Solo testo.`}
            onNoKey={()=>setIA(true)}/>
        </Fld>
        <div style={{display:"flex",gap:4,marginBottom:10,padding:3,background:T.bg,borderRadius:8,marginTop:10}}>
          {[["el",`Elementi (${a.elementi.length})`],["foto",`Foto (${(a.foto||[]).length})`]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:6,borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:tab===k?"#fff":"transparent",color:tab===k?T.accent:T.muted}}>{l}</button>
          ))}
        </div>
        {tab==="foto"&&<FotoUploader foto={a.foto||[]} onAdd={f=>addFoto(a.id,f)} onDel={fId=>delFoto(a.id,fId)} onComm={(fId,c)=>commFoto(a.id,fId,c)}/>}
        {tab==="el"&&(
          <>
            {a.elementi.map(el=><ElCard key={el.id} aId={a.id} el={el} updEl={updEl} updC={updC} addC={addC} delC={delC} delEl={delEl} setIA={setIA}/>)}
            <Btn v="s" sz="s" icon={<Plus size={12}/>} onClick={()=>addEl(a.id)} full>Aggiungi elemento</Btn>
          </>
        )}
      </div>
    </Card>
  );
};

// ── GENERATORE HTML VERBALE ───────────────────────────────────
const generaHTML = (s) => {
  const tutteCrit=s.ambienti.flatMap(a=>a.elementi.flatMap(e=>e.criticita.map(c=>({...c,amb:nM(a.nome,a.nomeL),el:nM(e.nome,e.nomeL)}))));
  const critAp=tutteCrit.filter(c=>c.stato==="Aperta");
  const critReit=critAp.filter(c=>c.reiterata);
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Verbale ${s.azienda} ${s.data}</title>
<style>
*{box-sizing:border-box}
body{font-family:Georgia,serif;max-width:850px;margin:0 auto;padding:40px 30px;color:#1C1917;line-height:1.75;font-size:14px}
.logo{font-size:11px;color:#78716C;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px}
h1{color:#B91C1C;border-bottom:2px solid #B91C1C;padding-bottom:10px;margin-bottom:24px;font-size:22px}
h2{color:#1C1917;border-left:3px solid #B91C1C;padding-left:12px;margin-top:32px;font-size:16px}
h3{font-size:14px;color:#44403C;margin:16px 0 8px}
.meta{background:#F5F2ED;border-radius:8px;padding:16px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mr{display:flex;gap:8px}
.ml{font-size:11px;color:#78716C;min-width:120px;flex-shrink:0}
.mv{font-size:13px;font-weight:600}
.amb-box{margin-bottom:24px;border:1px solid #DDD8CF;border-radius:8px;overflow:hidden}
.amb-head{background:#F5F2ED;padding:10px 14px;font-weight:700;font-size:14px}
.amb-body{padding:14px}
.crit-box{margin-bottom:16px;border:1px solid #DDD8CF;border-radius:8px;padding:14px;page-break-inside:avoid}
.crit-box.reit{border-color:#F59E0B;background:#FFFBEB}
.crit-title{font-weight:700;font-size:14px;margin-bottom:8px;color:#1C1917}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;margin-right:4px}
.badge-red{background:#FEF2F2;color:#B91C1C}
.badge-yellow{background:#FFFBEB;color:#B45309}
.badge-green{background:#F0FDF4;color:#15803D}
.badge-orange{background:#FFF7ED;color:#C2410C}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}
th{background:#1C1917;color:#fff;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
td{padding:7px 10px;border-bottom:1px solid #DDD8CF;vertical-align:top}
tr:nth-child(even) td{background:#F5F2ED}
.foto-grid{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0}
.foto-grid img{width:160px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #DDD8CF}
.foto-caption{font-size:10px;color:#78716C;margin:3px 0 0;text-align:center}
.firma{display:flex;justify-content:space-between;margin-top:60px;gap:40px}
.fb{flex:1;border-top:1px solid #1C1917;padding-top:12px;font-size:12px}
.disc{margin-top:40px;padding:14px;background:#FFFBEB;border-radius:8px;font-size:11px;color:#78716C;border:1px solid #FDE68A}
@media print{body{padding:20px}.amb-box{page-break-inside:avoid}}
</style></head><body>
<p class="logo">Ichnossicurezza S.r.l. — Verbale di Sopralluogo</p>
<h1>Verbale di Sopralluogo<br><small style="font-size:15px;font-weight:normal;color:#44403C">${s.azienda||"N/D"} — ${s.data}</small></h1>
<div class="meta">
  <div class="mr"><span class="ml">Azienda / Ente</span><span class="mv">${s.azienda||"—"}</span></div>
  <div class="mr"><span class="ml">Sede</span><span class="mv">${s.sede||"—"}</span></div>
  <div class="mr"><span class="ml">Indirizzo</span><span class="mv">${s.indirizzo||"—"}</span></div>
  <div class="mr"><span class="ml">N° lavoratori</span><span class="mv">${s.nLav||"—"}</span></div>
  <div class="mr"><span class="ml">Data sopralluogo</span><span class="mv">${s.data}</span></div>
  <div class="mr"><span class="ml">Tipo</span><span class="mv">${s.tipo}</span></div>
  <div class="mr"><span class="ml">Tecnico RSPP</span><span class="mv">${s.tecnico||"—"}</span></div>
</div>

<h2>1. Ambienti visitati e criticità rilevate</h2>
${s.ambienti.map((a,i)=>{
  const nA=nM(a.nome,a.nomeL);
  const critAmb=a.elementi.flatMap(e=>e.criticita.filter(c=>c.stato==="Aperta").map(c=>({...c,el:nM(e.nome,e.nomeL)})));
  return `<div class="amb-box">
  <div class="amb-head">${i+1}. ${nA||"Ambiente"} ${a.ubicazione?"— "+a.ubicazione:""}</div>
  <div class="amb-body">
    ${a.descr?`<p>${a.descr}</p>`:""}
    ${a.elementi.filter(e=>e.nome||e.nomeL).length?`
    <h3>Elementi verificati</h3>
    <table><tr><th>Elemento</th><th>Stato</th><th>Osservazioni</th></tr>
    ${a.elementi.map(e=>`<tr><td><strong>${nM(e.nome,e.nomeL)||"—"}</strong></td><td style="color:${e.conforme?"#15803D":"#B91C1C"};font-weight:700">${e.conforme?"✓ Conforme":"✗ Non conforme"}</td><td>${e.descr||"—"}</td></tr>`).join("")}
    </table>`:""}
    ${critAmb.length?`
    <h3>Criticità rilevate (${critAmb.length})</h3>
    ${critAmb.map((c,ci)=>`
    <div class="crit-box${c.reiterata?" reit":""}">
      <div class="crit-title">
        ${ci+1}. ${c.titolo||"Criticità"}
        <span class="badge ${c.gravita==="Alta"||c.gravita==="Critica"?"badge-red":c.gravita==="Media"?"badge-yellow":"badge-green"}">${c.gravita}</span>
        ${c.reiterata?`<span class="badge badge-orange">⟳ Reiterata</span>`:""}
      </div>
      ${c.descr?`<p><strong>Descrizione:</strong> ${c.descr}</p>`:""}
      ${c.misure?`<p><strong>Misure correttive:</strong> ${c.misure}</p>`:""}
      ${c.note?`<p><em>Note: ${c.note}</em></p>`:""}
    </div>`).join("")}`:""}
    ${(a.foto||[]).length?`
    <h3>Documentazione fotografica</h3>
    <div class="foto-grid">
    ${a.foto.map(f=>`<div><img src="${f.data}" alt="${f.nome}"/><p class="foto-caption">${f.comm||f.nome}</p></div>`).join("")}
    </div>`:""}
  </div>
</div>`;}).join("")}

<h2>2. Riepilogo criticità aperte (${critAp.length})</h2>
${critAp.length===0?`<p>Nessuna criticità rilevata durante il sopralluogo.</p>`:`
<table>
  <tr><th>#</th><th>Ambiente</th><th>Elemento</th><th>Criticità</th><th>Gravità</th><th>Stato</th></tr>
  ${critAp.map((c,i)=>`<tr><td>${i+1}</td><td>${c.amb}</td><td>${c.el}</td><td>${c.titolo||c.descr?.slice(0,60)||"—"}</td><td>${c.gravita}</td><td>${c.reiterata?"⟳ Reiterata":"Nuova"}</td></tr>`).join("")}
</table>`}

${critReit.length?`
<h2>3. Criticità reiterate (${critReit.length})</h2>
<p>Le seguenti criticità erano già presenti nel precedente verbale di sopralluogo e non risultano ancora risolte:</p>
<table>
  <tr><th>#</th><th>Ambiente</th><th>Criticità</th><th>Gravità</th></tr>
  ${critReit.map((c,i)=>`<tr><td>${i+1}</td><td>${c.amb}</td><td>${c.titolo||"—"}</td><td>${c.gravita}</td></tr>`).join("")}
</table>`:""}

${s.note?`<h2>Note generali</h2><p>${s.note}</p>`:""}

<h2>Conclusioni</h2>
<p>${s.concl||`Il sopralluogo del ${s.data} presso ${s.azienda||"l'azienda"} ha consentito di verificare ${s.ambienti.length} ambienti, rilevando ${critAp.length} criticità aperte${critReit.length?`, di cui ${critReit.length} reiterate rispetto al precedente verbale`:""}. Si richiede l'adozione delle misure correttive indicate.`}</p>

<div class="firma">
  <div class="fb">Il Tecnico RSPP<br><strong>${s.tecnico||"_______________"}</strong><br><br>Firma: _________________________</div>
  <div class="fb">Il Datore di Lavoro — per presa visione<br><br><br>Firma: _________________________</div>
</div>
<div class="disc"><strong>Nota.</strong> Il presente verbale ha valore di sopralluogo periodico in materia di salute e sicurezza sul lavoro. Non sostituisce la Valutazione dei Rischi (DVR). Ichnossicurezza S.r.l. — Tel. 079-4136984 — info@ichnossicurezza.it</div>
</body></html>`;
};

// ── APP ROOT ──────────────────────────────────────────────────
export default function App() {
  const [lista,  setLista] = useState([]);
  const [sopr,   setSopr]  = useState(null);
  const [vista,  setV]     = useState("home");
  const [showIA, setIA]    = useState(false);
  const [saved,  setSaved] = useState(false);
  const [analisi,setAnalisi]= useState("");
  const [analLoad,setAL]   = useState(false);
  const haKey = Boolean(akGet());
  const refVerbale = useRef();

  useEffect(()=>{ setLista(dbLoad()); },[]);

  const salvaLista = useCallback((nuova)=>{ setLista(nuova); dbSave(nuova); },[]);

  // Auto-save sopralluogo corrente
  useEffect(()=>{
    if(!sopr) return;
    const nuova = lista.map(s=>s.id===sopr.id?sopr:s);
    salvaLista(nuova);
    setSaved(true);
    const t=setTimeout(()=>setSaved(false),1500);
    return()=>clearTimeout(t);
  },[sopr]);

  // Updater
  const updAmb  = useCallback((aId,k,v)=>setSopr(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,[k]:v})})),[]);
  const updEl   = useCallback((aId,eId,k,v)=>setSopr(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,[k]:v})})})),[]);
  const updC    = useCallback((aId,eId,cId,k,v)=>setSopr(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,criticita:e.criticita.map(c=>c.id!==cId?c:{...c,[k]:v})})})})),[]);
  const delAmb  = useCallback((aId)=>setSopr(s=>({...s,ambienti:s.ambienti.filter(a=>a.id!==aId)})),[]);
  const addEl   = useCallback((aId)=>setSopr(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:[...a.elementi,mkEl()]})})),[]);
  const delEl   = useCallback((aId,eId)=>setSopr(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.filter(e=>e.id!==eId)})})),[]);
  const addC    = useCallback((aId,eId,c)=>setSopr(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,criticita:[...e.criticita,c]})})})),[]);
  const delC    = useCallback((aId,eId,cId)=>setSopr(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,elementi:a.elementi.map(e=>e.id!==eId?e:{...e,criticita:e.criticita.filter(c=>c.id!==cId)})})})),[]);
  const addFoto = useCallback((aId,f)=>setSopr(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,foto:[...(a.foto||[]),f]})})),[]);
  const delFoto = useCallback((aId,fId)=>setSopr(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,foto:(a.foto||[]).filter(f=>f.id!==fId)})})),[]);
  const commFoto= useCallback((aId,fId,comm)=>setSopr(s=>({...s,ambienti:s.ambienti.map(a=>a.id!==aId?a:{...a,foto:(a.foto||[]).map(f=>f.id!==fId?f:{...f,comm})})})),[]);

  const ncTot = sopr?.ambienti.reduce((s,a)=>s+a.elementi.reduce((s2,e)=>s2+e.criticita.filter(c=>c.stato==="Aperta").length,0),0)||0;

  // Crea nuovo sopralluogo
  const nuovoSopr = () => {
    const s = mkSopr();
    salvaLista([s,...lista]);
    setSopr(s);
    setV("editor");
  };

  // Duplica
  const duplica = (s) => {
    const copia = {...JSON.parse(JSON.stringify(s)), id:uid(), nome:s.nome+" (copia)", creato:new Date().toISOString()};
    salvaLista([copia,...lista]);
  };

  // Elimina
  const elimina = (id) => {
    if(!window.confirm("Eliminare questo sopralluogo?")) return;
    salvaLista(lista.filter(s=>s.id!==id));
    if(sopr?.id===id){ setSopr(null); setV("home"); }
  };

  // Carica vecchio verbale e confronta criticità
  const caricaVecchioVerbale = async(e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    setAL(true);
    try{
      const testo = await new Promise((res,rej)=>{
        const r=new FileReader();
        r.onload=ev=>res(ev.target.result);
        r.onerror=()=>rej(new Error("Errore lettura"));
        r.readAsText(file);
      });
      setSopr(s=>({...s,vecchioVerbale:testo.slice(0,3000)}));
      // Analizza e marca criticità reiterate
      const critAttuale = sopr?.ambienti.flatMap(a=>a.elementi.flatMap(e=>e.criticita.map(c=>c.titolo||c.descr))).filter(Boolean).join("\n");
      if(critAttuale && akGet()){
        const prompt = "Sei un RSPP. Confronta queste criticita del NUOVO sopralluogo con il VECCHIO verbale. Per ogni criticita indica se e REITERATA o NUOVA. Rispondi SOLO con JSON array: [{titolo:string,reiterata:bool}]. Vecchio verbale: " + testo.slice(0,1500) + " --- Nuove criticita: " + critAttuale;
        const risposta = await callAI(prompt, 800);
        try{
          const arr = JSON.parse(risposta.replace(/```json|```/g,"").trim());
          const conta = arr.filter(function(x){ return x.reiterata; }).length;
          setSopr(function(prev){
            const newAmb = prev.ambienti.map(function(a){
              const newEl = a.elementi.map(function(e){
                const newCrit = e.criticita.map(function(c){
                  const titC = (c.titolo||"").toLowerCase();
                  const found = arr.find(function(x){ return x.titolo && titC.includes(x.titolo.toLowerCase().slice(0,15)); });
                  if(found){ return Object.assign({}, c, {reiterata: found.reiterata}); }
                  return c;
                });
                return Object.assign({}, e, {criticita: newCrit});
              });
              return Object.assign({}, a, {elementi: newEl});
            });
            return Object.assign({}, prev, {ambienti: newAmb});
          });
          setAnalisi("Analisi completata: " + conta + " criticita reiterate.");
        }catch(e2){ setAnalisi("Verbale caricato. Analisi non disponibile."); }
      } else {
        setAnalisi("Verbale caricato. Aggiungi criticita e ricarica per il confronto.");
      }
    }catch(ex){ setAnalisi("Errore: "+ex.message); }
    finally{ setAL(false); e.target.value=""; }
  };

  // Esporta verbale
  const scaricaHTML = () => {
    const html=generaHTML(sopr);
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`Verbale_${(sopr.azienda||"sopralluogo").replace(/\s+/g,"_")}_${sopr.data}.html`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  };

  const stampa = () => {
    const html=generaHTML(sopr);
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const w=window.open(url,"_blank");
    if(w) setTimeout(()=>w.print(),1000);
  };

  // Genera conclusioni AI
  const generaConcl = async() => {
    if(!akGet()){setIA(true);return;}
    try{
      const c=await callAI(`Sei un RSPP. Scrivi le conclusioni per un verbale di sopralluogo presso "${sopr.azienda||"azienda"}" del ${sopr.data}. Ambienti visitati: ${sopr.ambienti.map(a=>nM(a.nome,a.nomeL)).filter(Boolean).join(", ")||"nessuno"}. Criticità aperte: ${ncTot}. Scrivi 2-3 frasi professionali e concrete. Non citare articoli di legge. Solo il testo.`);
      setSopr(s=>({...s,concl:c}));
    }catch(ex){if(ex.message==="NO_KEY")setIA(true);}
  };

  const pg={background:T.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"};
  const wr={maxWidth:620,margin:"0 auto",padding:"16px 14px 90px"};

  // ── HOME ────────────────────────────────────────────────────
  if(vista==="home") return (
    <div style={pg}><div style={{...wr,paddingTop:30}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <div style={{width:44,height:44,borderRadius:12,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Shield size={24} color="#fff"/></div>
        <div>
          <h2 style={{margin:0,fontFamily:"Georgia,serif",fontSize:18}}>Ichnossicurezza</h2>
          <p style={{margin:0,fontSize:12,color:T.muted}}>Gestione Sopralluoghi — D.Lgs. 81/2008</p>
        </div>
        <button onClick={()=>setIA(true)} style={{marginLeft:"auto",padding:"6px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:700,color:haKey?T.ok:T.warn,display:"flex",alignItems:"center",gap:4}}>
          <Key size={12}/>{haKey?"IA ✓":"IA"}
        </button>
      </div>

      <Btn onClick={nuovoSopr} full sz="l" icon={<Plus size={16}/>} style={{marginBottom:16}}>Nuovo sopralluogo</Btn>

      {lista.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px",borderRadius:12,border:`2px dashed ${T.border}`}}>
          <FolderOpen size={28} style={{color:T.muted,marginBottom:8}}/>
          <p style={{color:T.muted,fontSize:13,margin:0}}>Nessun sopralluogo salvato</p>
        </div>
      )}

      {lista.map(s=>{
        const nc=s.ambienti.reduce((tot,a)=>tot+a.elementi.reduce((t2,e)=>t2+e.criticita.filter(c=>c.stato==="Aperta").length,0),0);
        const reit=s.ambienti.reduce((tot,a)=>tot+a.elementi.reduce((t2,e)=>t2+e.criticita.filter(c=>c.reiterata&&c.stato==="Aperta").length,0),0);
        return (
          <Card key={s.id} style={{padding:14}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.azienda||s.nome}</div>
                <div style={{fontSize:12,color:T.muted,marginBottom:6}}>{s.data} · {s.tipo} · {s.tecnico||"—"}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  <Bdg color="gray">{s.ambienti.length} amb.</Bdg>
                  {nc>0&&<Bdg color="red">{nc} NC</Bdg>}
                  {reit>0&&<Bdg color="yellow">{reit} reit.</Bdg>}
                </div>
              </div>
              <div style={{display:"flex",gap:5,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <Btn v="p" sz="s" onClick={()=>{setSopr(s);setV("editor");}} icon={<FolderOpen size={12}/>}>Apri</Btn>
                <Btn v="s" sz="xs" onClick={()=>duplica(s)} icon={<Copy size={11}/>}>Duplica</Btn>
                <Btn v="d" sz="xs" onClick={()=>elimina(s.id)} icon={<Trash2 size={11}/>}>Elimina</Btn>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
    {showIA&&<ModalIA onClose={()=>setIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── VERBALE ─────────────────────────────────────────────────
  if(vista==="verbale") return (
    <div style={pg}><div style={wr}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <button onClick={()=>setV("editor")} style={{padding:8,borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer"}}><ArrowLeft size={16}/></button>
        <h3 style={{margin:0,fontFamily:"Georgia,serif"}}>Verbale di sopralluogo</h3>
      </div>

      <Card style={{padding:16,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:700,color:T.muted}}>CONCLUSIONI</span>
          <Btn v="a" sz="xs" onClick={generaConcl} icon={<Sparkles size={11}/>}>Genera con IA</Btn>
        </div>
        <Inp value={sopr.concl||""} onChange={v=>setSopr(s=>({...s,concl:v}))} placeholder="Conclusioni del sopralluogo..." rows={5}/>
      </Card>

      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <Btn onClick={stampa} full sz="m" icon={<Download size={14}/>}>Stampa / PDF</Btn>
        <Btn onClick={scaricaHTML} v="s" full sz="m" icon={<FileText size={14}/>}>Scarica HTML (Word)</Btn>
      </div>
      <p style={{fontSize:11,color:T.muted,textAlign:"center",margin:"4px 0 0"}}>Il file HTML aperto in Word si salva come .docx</p>
    </div>
    {showIA&&<ModalIA onClose={()=>setIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── EDITOR ──────────────────────────────────────────────────
  const idVerbale = useState(()=>"vb"+uid())[0];
  return (
    <div style={pg}><div style={wr}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <button onClick={()=>{setV("home");}} style={{padding:8,borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer"}}><ArrowLeft size={16}/></button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:"Georgia,serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sopr.azienda||sopr.nome}</div>
          <div style={{fontSize:11,color:T.muted,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            {sopr.data}{ncTot>0&&<Bdg color="red">{ncTot} NC</Bdg>}{saved&&<span style={{color:T.ok,fontWeight:700}}>✓</span>}
          </div>
        </div>
        <button onClick={()=>setIA(true)} style={{padding:"5px 9px",borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:700,color:haKey?T.ok:T.warn,display:"flex",alignItems:"center",gap:3}}><Key size={11}/>{haKey?"IA":"IA⚠"}</button>
        <Btn onClick={()=>setV("verbale")} sz="s" icon={<FileText size={13}/>}>Verbale</Btn>
      </div>

      {/* Dati generali */}
      <Card style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Dati sopralluogo</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Azienda"><Inp value={sopr.azienda} onChange={v=>setSopr(s=>({...s,azienda:v}))} placeholder="Ragione sociale"/></Fld>
          <Fld label="Sede"><Inp value={sopr.sede} onChange={v=>setSopr(s=>({...s,sede:v}))} placeholder="Sede"/></Fld>
        </div>
        <Fld label="Indirizzo"><Inp value={sopr.indirizzo} onChange={v=>setSopr(s=>({...s,indirizzo:v}))} placeholder="Via, città"/></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="N° lavoratori"><Inp type="number" value={sopr.nLav} onChange={v=>setSopr(s=>({...s,nLav:v}))}/></Fld>
          <Fld label="Data"><Inp type="date" value={sopr.data} onChange={v=>setSopr(s=>({...s,data:v}))}/></Fld>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Consulente RSPP"><Inp value={sopr.tecnico} onChange={v=>setSopr(s=>({...s,tecnico:v}))} placeholder="Nome cognome"/></Fld>
          <Fld label="Tipo"><Sel value={sopr.tipo} onChange={v=>setSopr(s=>({...s,tipo:v}))} options={TIPI}/></Fld>
        </div>
        <Fld label="Note generali"><Inp value={sopr.note} onChange={v=>setSopr(s=>({...s,note:v}))} placeholder="Condizioni generali, presenti al sopralluogo..." rows={2}/></Fld>
      </Card>

      {/* Carica vecchio verbale */}
      <Card style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.5px"}}>Confronto con vecchio verbale</div>
        <p style={{fontSize:12,color:T.muted,margin:"0 0 10px"}}>Carica il vecchio verbale (HTML/TXT) per identificare automaticamente le criticità reiterate.</p>
        <label htmlFor={idVerbale} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:8,border:`2px dashed ${T.border}`,cursor:"pointer",background:sopr.vecchioVerbale?"#F0FDF4":"#fff"}}>
          {analLoad?<Loader2 size={16} style={{color:T.purple,animation:"spin 1s linear infinite"}}/>:<Upload size={16} style={{color:sopr.vecchioVerbale?T.ok:T.muted}}/>}
          <span style={{fontSize:13,fontWeight:600,color:sopr.vecchioVerbale?T.ok:T.muted}}>{sopr.vecchioVerbale?"✓ Verbale caricato":"Carica vecchio verbale (.html, .txt)"}</span>
          <input id={idVerbale} type="file" accept=".html,.htm,.txt" onChange={caricaVecchioVerbale} style={{display:"none"}}/>
        </label>
        {analisi&&<p style={{fontSize:12,color:T.ok,margin:"8px 0 0",fontWeight:600}}>{analisi}</p>}
        {sopr.vecchioVerbale&&<button onClick={()=>setSopr(s=>({...s,vecchioVerbale:""}))} style={{fontSize:11,color:T.err,border:"none",background:"transparent",cursor:"pointer",marginTop:4}}>Rimuovi verbale caricato</button>}
      </Card>

      {/* Ambienti */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontSize:14,fontWeight:700}}>Ambienti ({sopr.ambienti.length})</span>
        <Btn onClick={()=>setSopr(s=>({...s,ambienti:[...s.ambienti,mkAmb()]}))} sz="s" icon={<Plus size={13}/>}>Aggiungi</Btn>
      </div>

      {sopr.ambienti.length===0&&(
        <div style={{textAlign:"center",padding:"28px 20px",borderRadius:12,border:`2px dashed ${T.border}`,marginBottom:12}}>
          <MapPin size={22} style={{color:T.muted,marginBottom:6}}/><p style={{color:T.muted,fontSize:13,margin:0}}>Aggiungi il primo ambiente visitato</p>
        </div>
      )}

      {sopr.ambienti.map((a,ai)=>(
        <AmbCard key={a.id} a={a} ai={ai}
          updAmb={updAmb} updEl={updEl} updC={updC}
          addEl={addEl} delEl={delEl} addC={addC} delC={delC}
          addFoto={addFoto} delFoto={delFoto} commFoto={commFoto}
          delAmb={delAmb} setIA={setIA}/>
      ))}

      {sopr.ambienti.length>0&&<Btn onClick={()=>setV("verbale")} full sz="l" icon={<FileText size={15}/>} style={{marginTop:4}}>Genera verbale</Btn>}
    </div>

    {/* Bottom bar */}
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(245,242,237,0.96)",borderTop:`1px solid ${T.border}`,padding:"9px 16px"}}>
      <div style={{maxWidth:620,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}><Shield size={12} style={{color:T.accent}}/><span style={{fontSize:11,fontWeight:700,color:T.accent}}>Ichnossicurezza</span></div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {ncTot>0&&<Bdg color="red">{ncTot} NC</Bdg>}
          <span style={{fontSize:11,color:T.muted}}>{sopr.ambienti.length} ambienti</span>
          {saved&&<span style={{fontSize:11,color:T.ok,fontWeight:700}}>✓ Salvato</span>}
        </div>
      </div>
    </div>
    {showIA&&<ModalIA onClose={()=>setIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
