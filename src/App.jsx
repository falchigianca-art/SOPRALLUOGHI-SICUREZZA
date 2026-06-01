import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Sparkles, ArrowLeft, X, Shield, FileText, Loader2, Image, Camera, Key, Copy, FolderOpen, Upload, Download, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";

// ── TEMA ICHNOSSICUREZZA ─────────────────────────────────────
const T = {
  bg:      "#F7F4EF",
  surface: "#FFFFFF",
  border:  "#E2DDD6",
  accent:  "#C0392B",
  text:    "#1A1614",
  muted:   "#7A736B",
  // Livelli criticità
  elevata: { bg:"#FEF2F2", border:"#FECACA", text:"#991B1B", dot:"#DC2626" },
  media:   { bg:"#FFFBEB", border:"#FDE68A", text:"#92400E", dot:"#D97706" },
  lieve:   { bg:"#F0FDF4", border:"#BBF7D0", text:"#14532D", dot:"#16A34A" },
  ok:      "#15803D",
  okBg:    "#F0FDF4",
  warn:    "#B45309",
  warnBg:  "#FFFBEB",
  purple:  "#5B21B6",
};

const LIVELLI = ["ELEVATA","MEDIA","LIEVE"];
const TIPI    = ["Periodico","Straordinario","Primo sopralluogo","Follow-up","Audit","Pre-appalto (DUVRI)"];

const uid    = () => Math.random().toString(36).slice(2,9);

// Compressione foto: riduce a max 1200px e qualità 0.75 — buona qualità, 5-8x meno spazio
const compressFoto = (file) => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      res({ id:uid(), data:canvas.toDataURL("image/jpeg", 0.75), nome:file.name, comm:"" });
    };
    img.onerror = rej;
    img.src = ev.target.result;
  };
  reader.onerror = rej;
  reader.readAsDataURL(file);
});
const oggi   = () => new Date().toISOString().split("T")[0];
const dataIT = (d) => { if(!d) return ""; const [y,m,g]=d.split("-"); const mesi=["","gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"]; return `${parseInt(g)} ${mesi[parseInt(m)]} ${y}`; };
const DB_KEY = "ichno_sopr_v9";
const AK     = "ichno_ak";
const akGet  = () => localStorage.getItem(AK)||"";
const akSet  = (k) => localStorage.setItem(AK,k);
const dbLoad = () => { try { return JSON.parse(localStorage.getItem(DB_KEY)||"[]"); } catch { return []; } };
const dbSave = (l) => { try { localStorage.setItem(DB_KEY,JSON.stringify(l)); } catch { alert("Spazio insufficiente. Elimina sopralluoghi vecchi."); } };

const mkSopr   = () => ({ id:uid(), azienda:"", indirizzo:"", data:oggi(), tecnico:"", tipo:"Periodico", note:"", reparti:[], concl:"", vecchioVerbale:"", creato:new Date().toISOString() });
const mkReparto= () => ({ id:uid(), nome:"", foto:[], criticita:[] });
const mkCrit   = () => ({ id:uid(), titolo:"", descr:"", misure:[], livello:"ELEVATA", stato:"Aperta", reiterata:false, tipoReit:"reiterata", note:"", foto:[] });

const livC = (l) => T[l?.toLowerCase()] || T.lieve;

// ── AI ────────────────────────────────────────────────────────
const callAI = async (prompt, maxTok=700) => {
  const k = akGet();
  if(!k) throw new Error("NO_KEY");
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":k,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:maxTok,messages:[{role:"user",content:prompt}]})
  });
  if(!r.ok){const t=await r.text();throw new Error("Err "+r.status+": "+t.slice(0,80));}
  const d=await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.content?.find(b=>b.type==="text")?.text||"";
};

// ── UI BASE ───────────────────────────────────────────────────
const Btn = ({children,onClick,v="p",sz="m",icon,disabled,full,style:sx={}}) => {
  const S={
    p:  {background:T.accent,   color:"#fff",  border:"none"},
    s:  {background:"#fff",     color:T.text,  border:`1px solid ${T.border}`},
    g:  {background:"transparent",color:T.muted,border:"none"},
    d:  {background:"#FEF2F2",  color:"#991B1B",border:`1px solid #FECACA`},
    a:  {background:T.purple,   color:"#fff",  border:"none"},
  }[v]||{};
  const P={xs:"3px 8px",s:"6px 12px",m:"9px 16px",l:"12px 22px"}[sz]||"9px 16px";
  const F={xs:10,s:12,m:13,l:15}[sz]||13;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{...S,padding:P,fontSize:F,fontWeight:700,borderRadius:7,display:"inline-flex",
        alignItems:"center",gap:6,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,
        width:full?"100%":"auto",justifyContent:full?"center":"flex-start",
        fontFamily:"inherit",boxSizing:"border-box",...sx}}>
      {icon&&<span style={{display:"flex",flexShrink:0}}>{icon}</span>}
      {children}
    </button>
  );
};

const Inp = ({value,onChange,placeholder,type="text",rows,disabled}) => {
  const s={width:"100%",padding:"9px 12px",fontSize:14,borderRadius:7,
    border:`1px solid ${T.border}`,outline:"none",fontFamily:"inherit",
    color:T.text,background:disabled?"#F5F2ED":"#fff",boxSizing:"border-box"};
  if(rows) return <textarea value={value} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder} rows={rows} disabled={disabled}
    style={{...s,resize:"vertical"}}/>;
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder} disabled={disabled} style={s}/>;
};

const Fld = ({label,children}) => (
  <div style={{marginBottom:12}}>
    <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:5,
      textTransform:"uppercase",letterSpacing:"0.6px"}}>{label}</div>
    {children}
  </div>
);

const Card = ({children,style={}}) => (
  <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,
    marginBottom:12,...style}}>{children}</div>
);

const Pill = ({children,color="gray"}) => {
  const m={gray:{bg:"#F5F2ED",c:T.muted},red:{bg:"#FEF2F2",c:"#991B1B"},
    green:{bg:"#F0FDF4",c:"#14532D"},yellow:{bg:"#FFFBEB",c:"#92400E"},
    orange:{bg:"#FFF7ED",c:"#9A3412"}};
  const s=m[color]||m.gray;
  return <span style={{background:s.bg,color:s.c,fontSize:11,fontWeight:700,
    padding:"2px 9px",borderRadius:20,whiteSpace:"nowrap",display:"inline-block"}}>{children}</span>;
};

// ── AI FIELD (Genera / Migliora) ──────────────────────────────
const AIField = ({value,onChange,placeholder,rows=3,promptEmpty,promptFull,onNoKey}) => {
  const [load,setLoad]=useState(false);
  const [err,setErr]=useState("");
  const run=async(e)=>{
    e.stopPropagation();setLoad(true);setErr("");
    try{ onChange(await callAI(value.trim()?promptFull(value):promptEmpty)); }
    catch(ex){ if(ex.message==="NO_KEY"&&onNoKey)onNoKey(); else setErr(ex.message.slice(0,60)); }
    finally{ setLoad(false); }
  };
  return (
    <div>
      <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
        <Inp value={value} onChange={onChange} placeholder={placeholder} rows={rows}/>
        <button onClick={run} disabled={load}
          style={{padding:"9px 11px",borderRadius:7,border:"none",background:T.purple,
            color:"#fff",cursor:load?"not-allowed":"pointer",flexShrink:0,
            display:"flex",alignItems:"center",gap:4,opacity:load?0.6:1}}>
          {load?<Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>:<Sparkles size={13}/>}
          <span style={{fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{value.trim()?"Migliora":"Genera"}</span>
        </button>
      </div>
      {err&&<p style={{fontSize:10,color:"#991B1B",margin:"3px 0 0"}}>{err}</p>}
    </div>
  );
};

// ── MODALE IA ─────────────────────────────────────────────────
const ModalIA = ({onClose}) => {
  const [k,setK]=useState(akGet());
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:14,padding:24,maxWidth:380,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <Key size={18} style={{color:T.purple}}/>
          <h3 style={{margin:0,fontFamily:"Georgia,serif",fontSize:17}}>Chiave API Anthropic</h3>
          <button onClick={onClose} style={{marginLeft:"auto",border:"none",background:"transparent",cursor:"pointer"}}><X size={18}/></button>
        </div>
        <div style={{background:"#EDE9FE",borderRadius:8,padding:12,marginBottom:14,fontSize:12,color:T.purple,lineHeight:1.7}}>
          1. Vai su <strong>console.anthropic.com</strong><br/>
          2. Settings → API Keys → Create Key<br/>
          3. Copia la chiave (inizia con <code>sk-ant-</code>)
        </div>
        <Fld label="Chiave API Anthropic">
          <Inp value={k} onChange={setK} placeholder="sk-ant-..." type="password"/>
        </Fld>
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <Btn onClick={()=>{akSet(k.trim());onClose();}} full icon={<Key size={13}/>}>Salva e attiva IA</Btn>
          <Btn v="s" onClick={onClose}>Annulla</Btn>
        </div>
      </div>
    </div>
  );
};

// ── FOTO ─────────────────────────────────────────────────────
const FotoBox = ({foto,onAdd,onDel,onComm,compact=false}) => {
  const idC=useState(()=>"fc"+uid())[0];
  const idG=useState(()=>"fg"+uid())[0];
  const onFile=async(e)=>{
    for(const f of Array.from(e.target.files||[])){
      if(!f.type.startsWith("image/")) continue;
      try { const compressed = await compressFoto(f); onAdd(compressed); }
      catch { /* fallback senza compressione */
        await new Promise(res=>{const r=new FileReader();r.onload=ev=>{onAdd({id:uid(),data:ev.target.result,nome:f.name,comm:""});res();};r.readAsDataURL(f);});
      }
    }
    e.target.value="";
  };
  const lb={display:"flex",flexDirection:"column",alignItems:"center",gap:5,
    padding:compact?"8px 6px":"14px 10px",borderRadius:8,border:`2px dashed ${T.border}`,cursor:"pointer",flex:1};
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <label htmlFor={idC} style={lb}>
          <Camera size={20} style={{color:T.accent}}/>
          <span style={{fontSize:11,fontWeight:700,color:T.accent}}>Fotocamera</span>
          <input id={idC} type="file" accept="image/*" capture="environment" onChange={onFile} style={{display:"none"}}/>
        </label>
        <label htmlFor={idG} style={lb}>
          <Image size={20} style={{color:"#1D4ED8"}}/>
          <span style={{fontSize:11,fontWeight:700,color:"#1D4ED8"}}>Galleria</span>
          <input id={idG} type="file" accept="image/*" multiple onChange={onFile} style={{display:"none"}}/>
        </label>
      </div>
      {foto.length===0&&<p style={{fontSize:12,color:T.muted,textAlign:"center",margin:"0 0 6px"}}>Nessuna foto aggiunta</p>}
      {foto.map(f=>(
        <div key={f.id} style={{display:"flex",gap:8,padding:8,borderRadius:8,
          border:`1px solid ${T.border}`,marginBottom:6,alignItems:"flex-start"}}>
          <img src={f.data} alt="" style={{width:64,height:64,objectFit:"cover",borderRadius:6,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:10,color:T.muted,margin:"0 0 4px",overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.nome}</p>
            <input value={f.comm} onChange={e=>onComm(f.id,e.target.value)}
              placeholder="Didascalia foto..."
              style={{width:"100%",padding:"4px 8px",fontSize:12,borderRadius:6,
                border:`1px solid ${T.border}`,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          <button onClick={()=>onDel(f.id)} style={{border:"none",background:"transparent",cursor:"pointer"}}>
            <X size={13} style={{color:"#991B1B"}}/>
          </button>
        </div>
      ))}
    </div>
  );
};

// ── EDITOR MISURE (lista modificabile con X) ─────────────────
const MisureEditor = ({rId,c,repNome,updC,setIA}) => {
  const [load,setLoad]=useState(false);
  const [loadM,setLoadM]=useState(null);
  const [err,setErr]=useState("");
  const misure = Array.isArray(c.misure)?c.misure:(c.misure?String(c.misure).split("\n").filter(x=>x.trim()).map(x=>({id:uid(),testo:x.replace(/^\d+\.?\s*/,"")})):[]);

  const genera=async()=>{
    setLoad(true);setErr("");
    try{
      const ctx=c.descr||c.titolo||"criticita";
      const rep=repNome||"reparto";
      const prompt="Sei il redattore dei verbali di sopralluogo Ichnossicurezza S.r.l. Per questa criticita rilevata nel reparto \""+rep+"\": \""+ctx+"\", scrivi le azioni correttive concrete. REGOLE FERREE: 1) righe numerate 1. 2. 3.; 2) ogni riga inizia con verbo (Provvedere, Installare, Verificare, Sostituire, Apporre, Garantire, Disporre, Rimuovere, Effettuare, Valutare); 3) max 4 misure, frasi brevi e dirette; 4) NON citare leggi, decreti, norme UNI, articoli, valori numerici, temperature, scadenze; 5) usa SEMPRE il nome reale del reparto ("+rep+"), MAI placeholder come [area], [locale], [zona], [ambiente]; 6) scrivi 'aerazione' non 'aereazione'; 7) niente frasi artificiali tipo 'interventi urgenti e inderogabili' o 'compromettendo significativamente'. Rispondi con SOLO le righe numerate, senza titoli, senza simboli #, senza markdown.";
      const txt=await callAI(prompt);
      const arr=txt.split("\n").filter(x=>x.trim()).map(x=>({id:uid(),testo:x.replace(/^#+\s*/,"").replace(/^\d+\.?\s*/,"").replace(/\*\*/g,"").trim()})).filter(x=>x.testo);
      updC(rId,c.id,"misure",arr);
    }catch(ex){ if(ex.message==="NO_KEY")setIA(true); else setErr(ex.message.slice(0,60)); }
    finally{ setLoad(false); }
  };

  const updMisura=(mId,testo)=>updC(rId,c.id,"misure",misure.map(m=>m.id===mId?{...m,testo}:m));
  const delMisura=(mId)=>updC(rId,c.id,"misure",misure.filter(m=>m.id!==mId));
  const addMisura=()=>updC(rId,c.id,"misure",[...misure,{id:uid(),testo:""}]);
  const migliora=async(mId,testo)=>{
    if(!testo.trim())return;
    setLoadM(mId);setErr("");
    try{
      const rep=repNome||"reparto";
      const prompt="Sei il redattore dei verbali Ichnossicurezza S.r.l. Riscrivi questa misura correttiva in modo tecnico, semplice e diretto, senza renderla lunga. Reparto: \""+rep+"\". REGOLE: inizia con un verbo (Provvedere, Installare, Verificare, Sostituire, Apporre, Garantire, Disporre, Rimuovere, Effettuare, Valutare); UNA sola frase breve; NON citare leggi, decreti, norme UNI, valori numerici; usa il nome reale del reparto MAI placeholder; 'aerazione' non 'aereazione'. Misura: \""+testo+"\". Rispondi con SOLO la misura riscritta, senza numerazione, senza simboli #.";
      const txt=await callAI(prompt,200);
      const pulito=txt.replace(/^#+\s*/,"").replace(/^\d+\.?\s*/,"").replace(/\*\*/g,"").trim();
      updMisura(mId,pulito);
    }catch(ex){ if(ex.message==="NO_KEY")setIA(true); else setErr(ex.message.slice(0,60)); }
    finally{ setLoadM(null); }
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.6px"}}>Azioni correttive</span>
        <button onClick={genera} disabled={load}
          style={{padding:"5px 10px",borderRadius:7,border:"none",background:T.purple,color:"#fff",
            cursor:load?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:4,opacity:load?0.6:1}}>
          {load?<Loader2 size={12} style={{animation:"spin 1s linear infinite"}}/>:<Sparkles size={12}/>}
          <span style={{fontSize:11,fontWeight:700}}>{misure.length?"Rigenera":"Genera con IA"}</span>
        </button>
      </div>
      {err&&<p style={{fontSize:10,color:"#991B1B",margin:"0 0 6px"}}>{err}</p>}

      {misure.length===0&&<p style={{fontSize:12,color:T.muted,margin:"0 0 8px",fontStyle:"italic"}}>Nessuna misura. Genera con IA o aggiungi manualmente.</p>}

      {misure.map((m,i)=>(
        <div key={m.id} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:6}}>
          <span style={{fontSize:13,fontWeight:700,color:T.accent,paddingTop:9,flexShrink:0,minWidth:18}}>{i+1}.</span>
          <textarea value={m.testo} onChange={e=>updMisura(m.id,e.target.value)}
            placeholder="Descrivi la misura correttiva..." rows={2}
            style={{flex:1,padding:"8px 10px",fontSize:13,borderRadius:7,border:`1px solid ${T.border}`,
              outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
          <button onClick={()=>migliora(m.id,m.testo)} disabled={loadM===m.id||!m.testo.trim()} title="Migliora con IA"
            style={{padding:"7px",borderRadius:7,border:"none",background:T.purple,
              cursor:loadM===m.id||!m.testo.trim()?"not-allowed":"pointer",flexShrink:0,display:"flex",
              opacity:loadM===m.id||!m.testo.trim()?0.4:1}}>
            {loadM===m.id?<Loader2 size={14} style={{color:"#fff",animation:"spin 1s linear infinite"}}/>:<Sparkles size={14} style={{color:"#fff"}}/>}
          </button>
          <button onClick={()=>delMisura(m.id)} title="Elimina misura"
            style={{padding:"7px",borderRadius:7,border:`1px solid #FECACA`,background:"#FEF2F2",
              cursor:"pointer",flexShrink:0,display:"flex"}}>
            <X size={14} style={{color:"#991B1B"}}/>
          </button>
        </div>
      ))}

      <button onClick={addMisura}
        style={{width:"100%",marginTop:4,padding:"7px",borderRadius:7,border:`1px dashed ${T.border}`,
          background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,color:T.muted,
          display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
        <Plus size={13}/> Aggiungi misura manualmente
      </button>
    </div>
  );
};

// ── CRITICITÀ ─────────────────────────────────────────────────
const CritCard = ({rId,c,repNome,updC,delC,setIA}) => {
  const [open,setOpen]=useState(true);
  const lc=livC(c.livello);

  return (
    <div style={{border:`1px solid ${c.reiterata?"#F59E0B":lc.border}`,borderRadius:8,
      marginBottom:10,overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:c.reiterata?"#FFFBEB":lc.bg,padding:"9px 12px",
        display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>

        {/* Indicatore livello */}
        <span style={{width:10,height:10,borderRadius:"50%",background:lc.dot,flexShrink:0}}/>

        <span style={{flex:1,fontSize:13,fontWeight:700,color:lc.text,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:60}}>
          {c.titolo||"Nuova criticità"}
        </span>

        <button onClick={()=>{ if(!c.reiterata){updC(rId,c.id,"reiterata",true);updC(rId,c.id,"tipoReit","reiterata");} else if(c.tipoReit!=="parziale"){updC(rId,c.id,"tipoReit","parziale");} else {updC(rId,c.id,"reiterata",false);} }}
          title="Clicca per cambiare: Nuova / Reiterata / Parzialmente risolta"
          style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,border:"none",cursor:"pointer",flexShrink:0,
            background:c.reiterata?"#FFF7ED":"#F5F2ED",color:c.reiterata?"#9A3412":T.muted}}>
          {c.reiterata?(c.tipoReit==="parziale"?"⟳ Parziale":"⟳ Reiterata"):"Nuova"}
        </button>

        {/* Selettore livello a pill */}
        <div style={{display:"flex",gap:3,flexShrink:0}}>
          {LIVELLI.map(l=>{
            const lx=livC(l);
            const sel=c.livello===l;
            return (
              <button key={l} onClick={()=>updC(rId,c.id,"livello",l)}
                style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,
                  cursor:"pointer",border:`1px solid ${sel?lx.border:T.border}`,
                  background:sel?lx.bg:"#fff",color:sel?lx.text:T.muted}}>
                {l}
              </button>
            );
          })}
        </div>

        {/* Stato aperta/chiusa */}
        <button onClick={()=>updC(rId,c.id,"stato",c.stato==="Aperta"?"Chiusa":"Aperta")}
          style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
            border:"none",cursor:"pointer",flexShrink:0,
            background:c.stato==="Chiusa"?"#F0FDF4":"#FEF2F2",
            color:c.stato==="Chiusa"?"#14532D":"#991B1B"}}>
          {c.stato==="Chiusa"?"✓ Chiusa":"● Aperta"}
        </button>

        <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>
          {open?<ChevronUp size={13} style={{color:T.muted}}/>:<ChevronDown size={13} style={{color:T.muted}}/>}
        </button>
        <button onClick={()=>delC(rId,c.id)} style={{border:"none",background:"transparent",cursor:"pointer"}}>
          <Trash2 size={12} style={{color:T.muted}}/>
        </button>
      </div>

      {/* Body */}
      {open&&(
        <div style={{background:"#fff",padding:"12px 14px"}}>
          <Fld label="Titolo criticità">
            <AIField value={c.titolo} onChange={v=>updC(rId,c.id,"titolo",v)}
              placeholder="Es. cavi a terra vicino scrivanie" rows={1}
              promptEmpty={`Sei il redattore dei verbali Ichnossicurezza S.r.l. Genera un titolo per una criticità di sicurezza nel reparto "${repNome||"reparto"}". Il titolo deve essere SINTETICO, TECNICO, in MAIUSCOLO, breve (massimo 8 parole), serve solo a identificare la criticità. NON una frase discorsiva. Esempio: "GESTIONE NON ADEGUATA DEI CAVI ELETTRICI". Rispondi con SOLO il titolo in maiuscolo, niente altro, niente simboli #.`}
              promptFull={v=>`Sei il redattore dei verbali Ichnossicurezza S.r.l. Trasforma questo testo in un titolo SINTETICO, TECNICO, in MAIUSCOLO, breve (max 8 parole), che identifichi la criticità. NON una frase discorsiva. Esempio: input "cavi a terra vicino scrivanie" -> output "GESTIONE NON ADEGUATA DEI CAVI ELETTRICI PRESSO LE POSTAZIONI DI LAVORO". Testo: "${v}". Rispondi con SOLO il titolo in maiuscolo, niente altro, niente simboli #.`}
              onNoKey={()=>setIA(true)}/>
          </Fld>

          <Fld label="Descrizione tecnica">
            <AIField value={c.descr} onChange={v=>updC(rId,c.id,"descr",v)}
              placeholder="Descrizione tecnica della criticità rilevata..." rows={3}
              promptEmpty={`Sei il redattore dei verbali di sopralluogo Ichnossicurezza S.r.l. Scrivi la descrizione tecnica per la criticita "${c.titolo||"criticità"}" (livello ${c.livello}) rilevata nel reparto "${repNome||"reparto"}". REGOLE FERREE: 1) max 3 frasi brevi e dirette, terza persona; 2) inizia variando tra: "Durante il sopralluogo è stata riscontrata", "È stata rilevata la presenza di", "È stato osservato che", "Si rileva"; puoi aggiungere "Tale condizione può determinare..." o "Tale prassi configura..."; 3) descrivi cosa c'è fisicamente e perche e un rischio; 4) NON citare leggi, decreti, norme UNI, articoli, valori numerici, temperature, superfici, scadenze; 5) usa il nome reale del reparto (${repNome||"reparto"}), MAI placeholder [area][locale][zona][ambiente]; 6) scrivi 'aerazione' non 'aereazione'; 7) NO frasi artificiali tipo 'interventi urgenti e inderogabili', 'rischi acuti', 'compromettendo significativamente'. Rispondi con SOLO la descrizione, senza titoli, senza simboli #, senza markdown.`}
              promptFull={v=>`Sei il redattore dei verbali Ichnossicurezza S.r.l. Riscrivi questa descrizione (reparto: ${repNome||"reparto"}): frasi brevi e dirette, terza persona, NON citare leggi ne valori numerici, usa il nome reale del reparto MAI placeholder, 'aerazione' non 'aereazione', max 3 frasi. Testo: "${v}". Rispondi con SOLO la descrizione riscritta, senza titoli, senza simboli #, senza markdown.`}
              onNoKey={()=>setIA(true)}/>
          </Fld>

          <div style={{marginBottom:4}}>
            <MisureEditor rId={rId} c={c} repNome={repNome} updC={updC} setIA={setIA}/>
          </div>


          <Fld label={`Foto (${(c.foto||[]).length})`}>
            <FotoBox compact foto={c.foto||[]}
              onAdd={f=>updC(rId,c.id,"foto",[...(c.foto||[]),f])}
              onDel={fId=>updC(rId,c.id,"foto",(c.foto||[]).filter(x=>x.id!==fId))}
              onComm={(fId,comm)=>updC(rId,c.id,"foto",(c.foto||[]).map(x=>x.id!==fId?x:{...x,comm}))}/>
          </Fld>
        </div>
      )}
    </div>
  );
};

// ── REPARTO ───────────────────────────────────────────────────
const RepartoCard = ({r,ri,updR,updC,addC,delC,addFoto,delFoto,commFoto,delR,setIA,onScrollTop,onAddReparto}) => {
  const topRef = useState(()=>({ current:null }))[0];
  const [tab,setTab]=useState("crit");
  const cAp=r.criticita.filter(c=>c.stato==="Aperta");
  const nEL=cAp.filter(c=>c.livello==="ELEVATA").length;
  const nME=cAp.filter(c=>c.livello==="MEDIA").length;
  const nLI=cAp.filter(c=>c.livello==="LIEVE").length;
  const nReit=cAp.filter(c=>c.reiterata).length;

  return (
    <Card>
      <div id={"reparto-"+r.id} data-reparto="true" ref={el=>topRef.current=el} style={{position:"absolute",top:-60}}/>
      {/* Header reparto */}
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,
        display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>

        <div style={{width:6,height:28,borderRadius:3,background:T.accent,flexShrink:0}}/>

        <input value={r.nome} onChange={e=>updR(r.id,"nome",e.target.value)}
          placeholder={`Reparto ${ri+1} — inserisci nome...`}
          style={{flex:1,fontSize:15,fontWeight:700,border:"none",outline:"none",
            background:"transparent",color:T.text,fontFamily:"inherit",minWidth:100,padding:0}}/>

        <div style={{display:"flex",gap:4,flexWrap:"wrap",flexShrink:0}}>
          {nEL>0&&<Pill color="red">🔴 {nEL} Elevata{nEL>1?"":"e"}</Pill>}
          {nME>0&&<Pill color="yellow">🟠 {nME} Media{nME>1?"":"e"}</Pill>}
          {nLI>0&&<Pill color="green">🟢 {nLI} Lieve{nLI>1?"":"e"}</Pill>}
          {nReit>0&&<Pill color="orange">⟳ {nReit} reit.</Pill>}
          <Pill color="gray">{(r.foto||[]).length} foto</Pill>
        </div>

        <button onClick={()=>delR(r.id)} style={{border:"none",background:"transparent",cursor:"pointer",flexShrink:0}}>
          <Trash2 size={15} style={{color:T.muted}}/>
        </button>
      </div>

      <div style={{padding:"12px 14px"}}>
        {/* Tab */}
        <div style={{display:"flex",gap:3,padding:3,background:T.bg,borderRadius:8,marginBottom:14}}>
          {[["crit",`Criticità (${r.criticita.length})`],["foto",`Foto (${(r.foto||[]).length})`]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{flex:1,padding:"7px 8px",borderRadius:6,border:"none",cursor:"pointer",
                fontSize:12,fontWeight:700,
                background:tab===k?"#fff":"transparent",
                color:tab===k?T.accent:T.muted,
                boxShadow:tab===k?"0 1px 3px rgba(0,0,0,.08)":"none"}}>
              {l}
            </button>
          ))}
        </div>

        {tab==="crit"&&(
          <>
            {r.criticita.map(c=>(
              <CritCard key={c.id} rId={r.id} c={c} repNome={r.nome} updC={updC} delC={delC} setIA={setIA}/>
            ))}
            {/* Pulsanti azione in fondo al reparto */}
            <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
              <Btn v="d" sz="s" icon={<Plus size={13}/>}
                onClick={()=>addC(r.id,mkCrit())} style={{flex:1,justifyContent:"center"}}>
                Nuova criticità
              </Btn>
              <Btn v="s" sz="s" icon={<Plus size={13}/>}
                onClick={onAddReparto} style={{flex:1,justifyContent:"center"}}>
                Nuovo reparto
              </Btn>
            </div>
            <button
              onClick={onScrollTop}
              style={{width:"100%",marginTop:8,padding:"7px",borderRadius:7,
                border:`1px solid ${T.border}`,background:T.bg,cursor:"pointer",
                fontSize:12,fontWeight:600,color:T.muted,display:"flex",
                alignItems:"center",justifyContent:"center",gap:6}}>
              ↑ Torna all'inizio del reparto
            </button>
          </>
        )}

        {tab==="foto"&&(
          <FotoBox foto={r.foto||[]}
            onAdd={f=>addFoto(r.id,f)}
            onDel={fId=>delFoto(r.id,fId)}
            onComm={(fId,comm)=>commFoto(r.id,fId,comm)}/>
        )}
      </div>
    </Card>
  );
};

// ── GENERA HTML VERBALE ───────────────────────────────────────
const generaHTML = (s) => {
  const aperte=s.reparti.flatMap(r=>r.criticita.filter(c=>c.stato==="Aperta").map(c=>({...c,rep:r.nome})));
  const nEl=aperte.filter(c=>c.livello==="ELEVATA").length;
  const nMe=aperte.filter(c=>c.livello==="MEDIA").length;
  const nLi=aperte.filter(c=>c.livello==="LIEVE").length;
  const reit=aperte.filter(c=>c.reiterata);
  const dotLiv=(l)=>l==="ELEVATA"?"#DC2626":l==="MEDIA"?"#D97706":"#16A34A";
  const bgLiv=(l)=>l==="ELEVATA"?"#FEF2F2":l==="MEDIA"?"#FFFBEB":"#F0FDF4";
  const brdLiv=(l)=>l==="ELEVATA"?"#FECACA":l==="MEDIA"?"#FDE68A":"#BBF7D0";
  const txLiv=(l)=>l==="ELEVATA"?"#991B1B":l==="MEDIA"?"#92400E":"#14532D";
  const emLiv=(l)=>l==="ELEVATA"?"🔴":l==="MEDIA"?"🟠":"🟢";
  const dataExt=dataIT(s.data);

  // Pulizia testo da markdown
  const clean=(t)=>(t||"").replace(/^#+\s*/gm,"").replace(/\*\*/g,"").replace(/\*/g,"").trim();

  // Formatta misure come elenco (array di {id,testo} o stringa legacy)
  const formatMisure=(misure)=>{
    let righe=[];
    if(Array.isArray(misure)) righe=misure.map(m=>typeof m==="string"?m:m.testo).filter(x=>x&&x.trim());
    else if(misure) righe=clean(misure).split("\n").filter(r=>r.trim()).map(r=>r.replace(/^\d+\.?\s*/,""));
    if(!righe.length) return "";
    return `<p style="font-weight:700;margin:10px 0 6px">Si dispone pertanto quanto segue:</p>`+
      righe.map((r,i)=>`<p style="margin:3px 0"><strong>${i+1}.</strong> ${clean(r)}</p>`).join("");
  };

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Relazione di Sopralluogo — ${s.azienda||"N/D"} — ${dataExt}</title>
<style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;max-width:870px;margin:0 auto;padding:30px 28px;color:#1A1614;line-height:1.6;font-size:13px}
.intestazione{text-align:right;font-size:11px;color:#7A736B;margin-bottom:20px;border-bottom:1px solid #ddd;padding-bottom:10px}
.intestazione strong{font-size:13px;color:#C0392B;display:block;margin-bottom:4px}
.destinatario{margin-bottom:20px}
.oggetto{font-weight:700;margin-bottom:20px;font-size:13px}
h2{font-size:14px;font-weight:700;margin:20px 0 8px;color:#1A1614}
.premessa{margin-bottom:16px;font-size:13px}
.attesta{background:#F7F4EF;border:1px solid #E2DDD6;padding:12px 16px;margin-bottom:16px;font-size:12px;font-style:italic}
.legenda{display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap}
.legenda-item{display:flex;align-items:center;gap:6px;font-size:12px}
.leg-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0}
table.reparto{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}
table.reparto th{background:#C0392B;color:#fff;padding:8px 12px;text-align:left;font-weight:700;font-size:13px}
table.reparto td{padding:10px 12px;border:1px solid #ddd;vertical-align:top}
table.reparto td.foto-col{width:220px;min-width:180px}
table.reparto td.crit-col{width:auto}
.foto-grid-rep{display:flex;flex-wrap:wrap;gap:6px}
.foto-grid-rep img{width:95px;height:70px;object-fit:cover;border-radius:4px;border:1px solid #ddd}
.foto-cap{font-size:9px;color:#7A736B;text-align:center;margin:2px 0 0}
.lv-badge{font-weight:700;font-size:12px;margin-bottom:6px}
.reit-banner{background:#FFFBEB;border-left:3px solid #F59E0B;padding:5px 10px;margin:6px 0 8px;font-size:12px;font-style:italic;color:#92400E}
.crit-title{font-weight:700;font-size:13px;text-transform:uppercase;margin-bottom:6px}
table.riepilogo{width:100%;border-collapse:collapse;margin:14px 0;font-size:12px}
table.riepilogo th{background:#1A1614;color:#fff;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase}
table.riepilogo td{padding:7px 10px;border-bottom:1px solid #ddd;vertical-align:top}
table.riepilogo tr:nth-child(even) td{background:#F7F4EF}
.ricorda{margin-top:16px;font-size:13px}
.firma{display:flex;justify-content:space-between;margin-top:50px;gap:40px}
.fb{flex:1;border-top:1px solid #1A1614;padding-top:12px;font-size:12px}
.note-finali{margin-top:30px;font-size:11px;color:#7A736B;border-top:1px solid #ddd;padding-top:10px}
@media print{body{padding:16px}table.reparto{page-break-inside:avoid}}
</style></head><body>

<div class="intestazione">
  <strong>ICHNOSSICUREZZA S.R.L.</strong>
  Predda Niedda Str. 18 Bis — 07100 Sassari (SS) — P.IVA 02754010905<br>
  info@ichnossicurezza.it | ichnossicurezza@pec.it | www.ichnossicurezza.it | Tel 079/4136984
</div>

<div class="destinatario">
  <strong>Spett.le</strong><br>
  <strong>${s.azienda||"N/D"}</strong><br>
  ${s.indirizzo||""}
</div>

<p class="oggetto">Oggetto: Relazione sopralluogo ${s.tecnico?"del "+s.tecnico+" ":""} del ${dataExt}${s.tipo&&s.tipo!=="Periodico"?" – "+s.tipo:""}.</p>

<h2>PREMESSA</h2>
<div class="premessa">
La seguente relazione viene redatta da <strong>${s.tecnico||"Dott. Giancarlo Falchi"}</strong>, tecnico incaricato della Ichnossicurezza S.r.l.<br><br>
Il sottoscritto, al fine di verificare l'applicazione delle disposizioni in materia di igiene e sicurezza del lavoro, ha eseguito gli opportuni accertamenti e, dopo aver effettuato un sopralluogo, ha redatto il seguente documento.<br><br>
La stima delle criticità riscontrate è stata eseguita nel modo più obiettivo possibile, con classificazione mediante sistema semaforico (Rosso – Elevato, Arancione – Medio, Verde – Lieve).
</div>

<div class="attesta">
ATTESTA SOTTO LA PROPRIA PERSONALE RESPONSABILITÀ quanto segue:<br><br>
L'anno ${(s.data||"").split("-")[0]} addì ${dataExt} il sottoscritto <strong>${s.tecnico||"Dott. Giancarlo Falchi"}</strong>, ha effettuato una visita nei luoghi di lavoro di pertinenza al fine di verificare lo stato di fatto di alcuni aspetti impiantistici, edilizi, igienico-sanitari degli ambienti in esame, oltre che l'applicazione delle disposizioni in materia di igiene e sicurezza del lavoro. La verifica è stata eseguita attraverso la presa visione diretta delle strutture e dei vari ambienti.
</div>

<p style="text-align:right;font-size:12px;color:#7A736B;margin-bottom:16px">Sassari, ${dataExt}</p>

<h2>LEGENDA LIVELLI DI CRITICITÀ</h2>
<div class="legenda">
  <div class="legenda-item"><span class="leg-dot" style="background:#DC2626"></span><div><strong>🔴 ROSSO – ELEVATO</strong><br><span style="font-size:11px;color:#7A736B">Intervento urgente e inderogabile</span></div></div>
  <div class="legenda-item"><span class="leg-dot" style="background:#D97706"></span><div><strong>🟠 ARANCIONE – MEDIO</strong><br><span style="font-size:11px;color:#7A736B">Intervento da pianificare a breve termine</span></div></div>
  <div class="legenda-item"><span class="leg-dot" style="background:#16A34A"></span><div><strong>🟢 VERDE – LIEVE</strong><br><span style="font-size:11px;color:#7A736B">Intervento di miglioramento</span></div></div>
</div>

${s.reparti.map((r,ri)=>{
  const critAp=r.criticita.filter(c=>c.stato==="Aperta");
  if(!critAp.length&&!(r.foto||[]).length) return "";
  return `
<table class="reparto">
  <tr><th colspan="2">Reparto: ${r.nome||"Reparto "+(ri+1)}</th></tr>
  ${critAp.map(c=>`<tr>
    <td class="foto-col">
      ${(c.foto||[]).length?`<div class="foto-grid-rep">${(c.foto||[]).map(f=>`<div><img src="${f.data}"/><p class="foto-cap">${f.comm||""}</p></div>`).join("")}</div>`:"<p style='font-size:11px;color:#aaa;font-style:italic'>Nessuna foto</p>"}
    </td>
    <td class="crit-col">
      <div class="lv-badge" style="color:${txLiv(c.livello)}">
        ${c.livello==="ELEVATA"?"🔴":c.livello==="MEDIA"?"🟠":"🟢"} CRITICITÀ ${c.livello}
      </div>
      ${c.reiterata?`<div class="reit-banner">${c.tipoReit==="parziale"?"⚠ RILIEVO REITERATO PARZIALMENTE – Criticità già segnalata nella precedente Relazione di Sopralluogo. Gli interventi risultano parzialmente attuati, ma non ancora pienamente risolutivi.":"⚠ RILIEVO REITERATO – Criticità già segnalata nella precedente Relazione di Sopralluogo e non risolta."}</div>`:""}
      <div class="crit-title">${c.titolo||"Criticità"}</div>
      ${clean(c.descr)?`<p style="margin-bottom:10px">${clean(c.descr)}</p>`:""}
      ${formatMisure(c.misure)}
      ${clean(c.note)?`<p style="margin-top:8px;font-style:italic;font-size:12px;color:#7A736B">${clean(c.note)}</p>`:""}
    </td>
  </tr>`).join("")}
  ${(r.foto||[]).filter(f=>!r.criticita.some(c=>(c.foto||[]).some(cf=>cf.id===f.id))).length?
    `<tr><td colspan="2"><div style="padding:8px 0"><strong style="font-size:12px">Documentazione fotografica reparto</strong><div class="foto-grid-rep" style="margin-top:6px">${(r.foto||[]).map(f=>`<div><img src="${f.data}"/><p class="foto-cap">${f.comm||""}</p></div>`).join("")}</div></div></td></tr>`
  :""}
</table>`;}).join("")}

<h2>RIEPILOGO CRITICITÀ RILEVATE</h2>
<table class="riepilogo">
<tr><th>N°</th><th>Criticità</th><th>Livello</th><th>Note</th></tr>
${aperte.map((c,i)=>`<tr><td>${i+1}</td><td>${c.rep} — ${c.titolo||"—"}</td><td style="color:${txLiv(c.livello)};font-weight:700">${c.livello==="ELEVATA"?"🔴":c.livello==="MEDIA"?"🟠":"🟢"} ${c.livello}</td><td>${c.reiterata?"<em>REITERATO</em>":"—"}</td></tr>`).join("")}
</table>

${s.note?`<div class="ricorda"><strong>Si ricorda, inoltre:</strong><br>${clean(s.note)}</div>`:""}

<h2>CONCLUSIONI</h2>
<p>${clean(s.concl)||"Il sopralluogo del "+dataExt+" presso "+( s.azienda||"l'azienda")+" ha consentito di verificare "+s.reparti.length+" reparti, rilevando "+aperte.length+" criticità aperte ("+nEl+" elevate, "+nMe+" medie, "+nLi+" lievi"+(reit.length?", di cui "+reit.length+" reiterate":"")+"). Si richiede l'adozione delle misure correttive indicate entro i tempi stabiliti."}</p>

<div class="firma">
  <div class="fb">Il Tecnico incaricato<br><strong>${s.tecnico||"Dott. Giancarlo Falchi"}</strong><br>Ichnossicurezza S.r.l.<br><br>Firma: ________________________</div>
  <div class="fb">Il Datore di Lavoro<br>Per presa visione e accettazione<br><br><br>Firma: ________________________</div>
</div>

<div class="note-finali">
  Il presente verbale ha valore di relazione di sopralluogo periodico ai sensi del D.Lgs. 81/2008 e s.m.i. Non sostituisce la Valutazione dei Rischi (DVR).<br>
  <strong>Ichnossicurezza S.r.l.</strong> — Predda Niedda Str. 18 Bis, 07100 Sassari — Tel. 079/4136984 — info@ichnossicurezza.it
</div>

</body></html>`;
};

// ── APP ROOT ──────────────────────────────────────────────────
export default function App() {
  const [lista,    setLista]   = useState([]);
  const [sopr,     setSopr]    = useState(null);
  const [vista,    setV]       = useState("home");
  const [showIA,   setIA]      = useState(false);
  const [saved,    setSaved]   = useState(false);
  const [analisi,  setAnalisi] = useState("");
  const [analLoad, setAL]      = useState(false);
  const idVerbale = useState(()=>"vb"+uid())[0];
  const haKey = Boolean(akGet());

  useEffect(()=>{ setLista(dbLoad()); },[]);

  useEffect(()=>{
    if(!sopr) return;
    setLista(prev=>{
      const esiste=prev.find(s=>s.id===sopr.id);
      const nuova=esiste?prev.map(s=>s.id===sopr.id?sopr:s):[sopr,...prev];
      dbSave(nuova); return nuova;
    });
    setSaved(true);
    const t=setTimeout(()=>setSaved(false),1500);
    return()=>clearTimeout(t);
  },[sopr]);

  // Updater
  const updR    = useCallback((rId,k,v)=>setSopr(s=>({...s,reparti:s.reparti.map(r=>r.id!==rId?r:{...r,[k]:v})})),[]);
  const updC    = useCallback((rId,cId,k,v)=>setSopr(s=>({...s,reparti:s.reparti.map(r=>r.id!==rId?r:{...r,criticita:r.criticita.map(c=>c.id!==cId?c:{...c,[k]:v})})})),[]);
  const delR    = useCallback((rId)=>setSopr(s=>({...s,reparti:s.reparti.filter(r=>r.id!==rId)})),[]);
  const addC    = useCallback((rId,c)=>setSopr(s=>({...s,reparti:s.reparti.map(r=>r.id!==rId?r:{...r,criticita:[...r.criticita,c]})})),[]);
  const delC    = useCallback((rId,cId)=>setSopr(s=>({...s,reparti:s.reparti.map(r=>r.id!==rId?r:{...r,criticita:r.criticita.filter(c=>c.id!==cId)})})),[]);
  const addFoto = useCallback((rId,f)=>setSopr(s=>({...s,reparti:s.reparti.map(r=>r.id!==rId?r:{...r,foto:[...(r.foto||[]),f]})})),[]);
  const delFoto = useCallback((rId,fId)=>setSopr(s=>({...s,reparti:s.reparti.map(r=>r.id!==rId?r:{...r,foto:(r.foto||[]).filter(f=>f.id!==fId)})})),[]);
  const commFoto= useCallback((rId,fId,comm)=>setSopr(s=>({...s,reparti:s.reparti.map(r=>r.id!==rId?r:{...r,foto:(r.foto||[]).map(f=>f.id!==fId?f:{...f,comm})})})),[]);

  const ncTot = sopr?.reparti.reduce((s,r)=>s+r.criticita.filter(c=>c.stato==="Aperta").length,0)||0;
  const nEl   = sopr?.reparti.reduce((s,r)=>s+r.criticita.filter(c=>c.stato==="Aperta"&&c.livello==="ELEVATA").length,0)||0;
  const nMe   = sopr?.reparti.reduce((s,r)=>s+r.criticita.filter(c=>c.stato==="Aperta"&&c.livello==="MEDIA").length,0)||0;
  const nLi   = sopr?.reparti.reduce((s,r)=>s+r.criticita.filter(c=>c.stato==="Aperta"&&c.livello==="LIEVE").length,0)||0;

  const nuovoSopr = ()=>{ setSopr(mkSopr()); setAnalisi(""); setV("editor"); };
  const duplica   = (s)=>{ const c={...JSON.parse(JSON.stringify(s)),id:uid(),creato:new Date().toISOString()}; setLista(p=>{const n=[c,...p];dbSave(n);return n;}); };
  const elimina   = (id)=>{ if(!window.confirm("Eliminare questo sopralluogo?")) return; setLista(p=>{const n=p.filter(s=>s.id!==id);dbSave(n);return n;}); if(sopr?.id===id){setSopr(null);setV("home");} };

  // Carica vecchio verbale
  const caricaVerbale = async(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    setAL(true);
    try{
      const testo=await new Promise((res,rej)=>{const r=new FileReader();r.onload=ev=>res(ev.target.result);r.onerror=()=>rej(new Error("Errore lettura"));r.readAsText(file);});
      setSopr(s=>({...s,vecchioVerbale:testo.slice(0,3000)}));
      const critAttuale=sopr?.reparti.flatMap(r=>r.criticita.map(c=>c.titolo||c.descr)).filter(Boolean).join("\n");
      if(critAttuale&&akGet()){
        const prompt="Sei un tecnico RSPP di Ichnossicurezza S.r.l. Analizza il VECCHIO verbale di sopralluogo e confrontalo con le criticita del NUOVO sopralluogo. Una criticita e REITERATA se descrive lo stesso problema nella stessa area, anche formulato diversamente. Rispondi SOLO con JSON array: [{\"titolo\":\"...\",\"reiterata\":true}]. VECCHIO verbale: "+testo.slice(0,1500)+" --- NUOVE criticita: "+critAttuale;
        const risp=await callAI(prompt,800);
        try{
          const arr=JSON.parse(risp.replace(/```json|```/g,"").trim());
          const conta=arr.filter(x=>x.reiterata).length;
          setSopr(function(prev){
            const newR=prev.reparti.map(function(r){
              const newC=r.criticita.map(function(c){
                const titC=(c.titolo||"").toLowerCase();
                const found=arr.find(function(x){return x.titolo&&titC.includes(x.titolo.toLowerCase().slice(0,15));});
                return found?Object.assign({},c,{reiterata:found.reiterata}):c;
              });
              return Object.assign({},r,{criticita:newC});
            });
            return Object.assign({},prev,{reparti:newR});
          });
          setAnalisi("Analisi completata: "+conta+" criticità reiterate rilevate.");
        }catch(e2){setAnalisi("Verbale caricato. Analisi non disponibile.");}
      }else{setAnalisi("Verbale caricato. Aggiungi criticità e ricarica per il confronto.");}
    }catch(ex){setAnalisi("Errore: "+ex.message);}
    finally{setAL(false);e.target.value="";}
  };

  const scaricaHTML=()=>{
    const html=generaHTML(sopr);
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;
    a.download=`Verbale_${(sopr.azienda||"sopralluogo").replace(/\s+/g,"_")}_${sopr.data}.html`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  };
  const stampa=()=>{
    const html=generaHTML(sopr);
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const w=window.open(url,"_blank");
    if(w)setTimeout(()=>w.print(),800);
  };
  const generaConcl=async()=>{
    if(!akGet()){setIA(true);return;}
    try{
      const reitCount = sopr.reparti.reduce((s,r)=>s+r.criticita.filter(c=>c.reiterata&&c.stato==="Aperta").length,0); const t=await callAI("Sei il redattore verbali Ichnossicurezza S.r.l. Conclusioni verbale sopralluogo presso \"" + (sopr.azienda||"azienda") + "\" del " + dataIT(sopr.data) + ". Criticita: " + nEl + " elevate, " + nMe + " medie, " + nLi + " lievi. Stile: tecnico-formale, asciutto, 3 frasi brevi max. NON citare leggi. Rispondi con SOLO il testo, senza titoli, senza simboli #, senza markdown.");
      setSopr(s=>({...s,concl:t}));
    }catch(ex){if(ex.message==="NO_KEY")setIA(true);}
  };

  const pg={background:T.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"};
  const wr={maxWidth:640,margin:"0 auto",padding:"16px 14px 90px"};

  // ── HOME ──────────────────────────────────────────────────
  if(vista==="home") return (
    <div style={pg}><div style={{...wr,paddingTop:28}}>
      {/* Logo */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <div style={{width:46,height:46,borderRadius:11,background:T.accent,
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Shield size={26} color="#fff"/>
        </div>
        <div>
          <h2 style={{margin:0,fontFamily:"Georgia,serif",fontSize:19,color:T.text}}>Ichnossicurezza</h2>
          <p style={{margin:0,fontSize:12,color:T.muted}}>Gestione Sopralluoghi — D.Lgs. 81/2008</p>
        </div>
        <button onClick={()=>setIA(true)}
          style={{marginLeft:"auto",padding:"6px 11px",borderRadius:7,
            border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer",
            fontSize:11,fontWeight:700,color:haKey?T.ok:T.warn,
            display:"flex",alignItems:"center",gap:4}}>
          <Key size={12}/>{haKey?"IA ✓":"IA ⚠"}
        </button>
      </div>

      <Btn onClick={nuovoSopr} full sz="l" icon={<Plus size={16}/>}
        style={{marginBottom:16}}>
        Nuovo sopralluogo
      </Btn>

      {lista.length===0&&(
        <div style={{textAlign:"center",padding:"44px 20px",borderRadius:10,
          border:`2px dashed ${T.border}`}}>
          <FolderOpen size={30} style={{color:T.muted,marginBottom:10}}/>
          <p style={{color:T.muted,fontSize:13,margin:0}}>Nessun sopralluogo salvato</p>
        </div>
      )}

      {lista.map(s=>{
        const ap=s.reparti.reduce((t,r)=>t+r.criticita.filter(c=>c.stato==="Aperta").length,0);
        const el=s.reparti.reduce((t,r)=>t+r.criticita.filter(c=>c.stato==="Aperta"&&c.livello==="ELEVATA").length,0);
        const rt=s.reparti.reduce((t,r)=>t+r.criticita.filter(c=>c.reiterata&&c.stato==="Aperta").length,0);
        return (
          <Card key={s.id} style={{padding:14}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:3,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {s.azienda||"Azienda non inserita"}
                </div>
                <div style={{fontSize:12,color:T.muted,marginBottom:8}}>
                  {s.data} · {s.tipo} · {s.tecnico||"—"}
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  <Pill color="gray">{s.reparti.length} reparti</Pill>
                  {el>0&&<Pill color="red">🔴 {el} elevate</Pill>}
                  {ap>0&&<Pill color="gray">{ap} tot. NC</Pill>}
                  {rt>0&&<Pill color="orange">⟳ {rt} reit.</Pill>}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                <Btn v="p" sz="s" icon={<FolderOpen size={12}/>}
                  onClick={()=>{setSopr(s);setAnalisi("");setV("editor");}}>
                  Apri
                </Btn>
                <div style={{display:"flex",gap:4}}>
                  <Btn v="s" sz="xs" icon={<Copy size={10}/>} onClick={()=>duplica(s)}>Duplica</Btn>
                  <Btn v="d" sz="xs" icon={<Trash2 size={10}/>} onClick={()=>elimina(s.id)}>Elimina</Btn>
                </div>
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

  // ── VERBALE ───────────────────────────────────────────────
  if(vista==="verbale") return (
    <div style={pg}><div style={wr}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <button onClick={()=>setV("editor")}
          style={{padding:8,borderRadius:7,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer"}}>
          <ArrowLeft size={16}/>
        </button>
        <h3 style={{margin:0,fontFamily:"Georgia,serif",fontSize:17}}>Verbale di sopralluogo</h3>
      </div>

      {/* Riepilogo */}
      <Card style={{padding:14,marginBottom:12}}>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {[["🔴",nEl,"Elevate","#DC2626"],["🟠",nMe,"Medie","#D97706"],["🟢",nLi,"Lievi","#16A34A"]].map(([e,n,l,c])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:700,color:c}}>{n}</div>
              <div style={{fontSize:11,color:T.muted}}>{e} {l}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{padding:16,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:700,color:T.muted}}>CONCLUSIONI</span>
          <Btn v="a" sz="xs" onClick={generaConcl} icon={<Sparkles size={11}/>}>Genera con IA</Btn>
        </div>
        <Inp value={sopr.concl||""} onChange={v=>setSopr(s=>({...s,concl:v}))}
          placeholder="Conclusioni del sopralluogo..." rows={5}/>
      </Card>

      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <Btn onClick={stampa} full sz="m" icon={<Download size={14}/>}>Stampa / PDF</Btn>
        <Btn onClick={scaricaHTML} v="s" full sz="m" icon={<FileText size={14}/>}>Scarica HTML (Word)</Btn>
      </div>
      <p style={{fontSize:11,color:T.muted,textAlign:"center",margin:"4px 0 0"}}>
        Apri il file HTML in Word → Salva come .docx
      </p>
    </div>
    {showIA&&<ModalIA onClose={()=>setIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── EDITOR ────────────────────────────────────────────────
  return (
    <div style={pg}><div style={wr}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <button onClick={()=>setV("home")}
          style={{padding:8,borderRadius:7,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer"}}>
          <ArrowLeft size={16}/>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:"Georgia,serif",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {sopr.azienda||"Nuovo sopralluogo"}
          </div>
          <div style={{fontSize:11,color:T.muted,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            {sopr.data}
            {nEl>0&&<span style={{color:"#DC2626",fontWeight:700}}>🔴 {nEl}</span>}
            {nMe>0&&<span style={{color:"#D97706",fontWeight:700}}>🟠 {nMe}</span>}
            {nLi>0&&<span style={{color:"#16A34A",fontWeight:700}}>🟢 {nLi}</span>}
            {saved&&<span style={{color:T.ok,fontWeight:700}}>✓ Salvato</span>}
          </div>
        </div>
        <button onClick={()=>setIA(true)}
          style={{padding:"5px 9px",borderRadius:7,border:`1px solid ${T.border}`,background:"#fff",
            cursor:"pointer",fontSize:11,fontWeight:700,color:haKey?T.ok:T.warn,
            display:"flex",alignItems:"center",gap:3}}>
          <Key size={11}/>{haKey?"IA":"IA⚠"}
        </button>
        <Btn onClick={()=>setV("verbale")} sz="s" icon={<FileText size={13}/>}>Verbale</Btn>
      </div>

      {/* Dati generali */}
      <Card style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:10,
          textTransform:"uppercase",letterSpacing:"0.6px"}}>Dati sopralluogo</div>
        <Fld label="Azienda / Ente">
          <Inp value={sopr.azienda} onChange={v=>setSopr(s=>({...s,azienda:v}))} placeholder="Ragione sociale"/>
        </Fld>
        <Fld label="Indirizzo">
          <Inp value={sopr.indirizzo} onChange={v=>setSopr(s=>({...s,indirizzo:v}))} placeholder="Via, città"/>
        </Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Data">
            <Inp type="date" value={sopr.data} onChange={v=>setSopr(s=>({...s,data:v}))}/>
          </Fld>
          <Fld label="Tipo">
            <select value={sopr.tipo} onChange={e=>setSopr(s=>({...s,tipo:e.target.value}))}
              style={{width:"100%",padding:"9px 12px",fontSize:14,borderRadius:7,
                border:`1px solid ${T.border}`,outline:"none",fontFamily:"inherit",background:"#fff"}}>
              {TIPI.map(t=><option key={t}>{t}</option>)}
            </select>
          </Fld>
        </div>
        <Fld label="Tecnico incaricato">
          <Inp value={sopr.tecnico} onChange={v=>setSopr(s=>({...s,tecnico:v}))} placeholder="Nome e cognome"/>
        </Fld>
        <Fld label="Note generali">
          <AIField value={sopr.note} onChange={v=>setSopr(s=>({...s,note:v}))}
            placeholder="Condizioni generali, presenti al sopralluogo..." rows={2}
            promptEmpty={`Sei il redattore dei verbali Ichnossicurezza S.r.l. Scrivi una breve nota generale per il verbale di sopralluogo presso "${sopr.azienda||"l'azienda"}". Molto semplice, formale, max 2 frasi. NON citare leggi. Rispondi con SOLO il testo, senza titoli, senza simboli #.`}
            promptFull={v=>`Sei il redattore dei verbali Ichnossicurezza S.r.l. Rielabora questo testo in modo molto semplice, formale e chiaro, SENZA aggiungere contenuti nuovi, SENZA inserire norme, SENZA allungarlo. Mantieni il significato originale. Testo: "${v}". Rispondi con SOLO il testo rielaborato, senza titoli, senza simboli #.`}
            onNoKey={()=>setIA(true)}/>
        </Fld>
      </Card>

      {/* Confronto vecchio verbale */}
      <Card style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,
          textTransform:"uppercase",letterSpacing:"0.6px"}}>Confronto con verbale precedente</div>
        <p style={{fontSize:12,color:T.muted,margin:"0 0 10px"}}>
          Carica il verbale precedente per rilevare automaticamente le criticità reiterate.
        </p>
        <label htmlFor={idVerbale}
          style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
            borderRadius:8,border:`2px dashed ${T.border}`,cursor:"pointer",
            background:sopr.vecchioVerbale?"#F0FDF4":"#fff"}}>
          {analLoad
            ?<Loader2 size={16} style={{color:T.purple,animation:"spin 1s linear infinite"}}/>
            :<Upload size={16} style={{color:sopr.vecchioVerbale?T.ok:T.muted}}/>}
          <span style={{fontSize:13,fontWeight:600,color:sopr.vecchioVerbale?T.ok:T.muted}}>
            {sopr.vecchioVerbale?"✓ Verbale precedente caricato":"Carica verbale precedente (.html, .txt)"}
          </span>
          <input id={idVerbale} type="file" accept=".html,.htm,.txt"
            onChange={caricaVerbale} style={{display:"none"}}/>
        </label>
        {analisi&&<p style={{fontSize:12,color:T.ok,margin:"8px 0 0",fontWeight:600}}>{analisi}</p>}
        {sopr.vecchioVerbale&&(
          <button onClick={()=>setSopr(s=>({...s,vecchioVerbale:""}))}
            style={{fontSize:11,color:"#991B1B",border:"none",background:"transparent",cursor:"pointer",marginTop:6}}>
            Rimuovi
          </button>
        )}
      </Card>

      {/* Reparti */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <span style={{fontSize:14,fontWeight:700,color:T.text}}>
          Reparti ({sopr.reparti.length})
        </span>
        <Btn onClick={()=>setSopr(s=>({...s,reparti:[...s.reparti,mkReparto()]}))}
          sz="s" icon={<Plus size={13}/>}>
          Aggiungi reparto
        </Btn>
      </div>

      {sopr.reparti.length===0&&(
        <div style={{textAlign:"center",padding:"30px 20px",borderRadius:10,
          border:`2px dashed ${T.border}`,marginBottom:12}}>
          <AlertTriangle size={24} style={{color:T.muted,marginBottom:8}}/>
          <p style={{color:T.muted,fontSize:13,margin:0}}>Aggiungi il primo reparto visitato</p>
        </div>
      )}

      {sopr.reparti.map((r,ri)=>(
        <RepartoCard key={r.id} r={r} ri={ri}
          updR={updR} updC={updC} addC={addC} delC={delC}
          addFoto={addFoto} delFoto={delFoto} commFoto={commFoto}
          delR={delR} setIA={setIA}
          onScrollTop={()=>{ const el=document.getElementById("reparto-"+r.id); if(el) el.scrollIntoView({behavior:"smooth",block:"start"}); }}
          onAddReparto={()=>{ setSopr(s=>({...s,reparti:[...s.reparti,mkReparto()]})); }}/>
      ))}

      {sopr.reparti.length>0&&(
        <Btn onClick={()=>setV("verbale")} full sz="l" icon={<FileText size={15}/>}
          style={{marginTop:4}}>
          Genera verbale
        </Btn>
      )}
    </div>

    {/* Bottom bar */}
    <div style={{position:"fixed",bottom:0,left:0,right:0,
      background:"rgba(247,244,239,0.96)",borderTop:`1px solid ${T.border}`,padding:"9px 16px"}}>
      <div style={{maxWidth:640,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <Shield size={13} style={{color:T.accent}}/>
          <span style={{fontSize:11,fontWeight:700,color:T.accent}}>Ichnossicurezza</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {nEl>0&&<span style={{fontSize:11,fontWeight:700,color:"#DC2626"}}>🔴 {nEl}</span>}
          {nMe>0&&<span style={{fontSize:11,fontWeight:700,color:"#D97706"}}>🟠 {nMe}</span>}
          {nLi>0&&<span style={{fontSize:11,fontWeight:700,color:"#16A34A"}}>🟢 {nLi}</span>}
          <span style={{fontSize:11,color:T.muted}}>{sopr.reparti.length} reparti</span>
          {saved&&<span style={{fontSize:11,color:T.ok,fontWeight:700}}>✓ Salvato</span>}
        </div>
      </div>
    </div>
    {showIA&&<ModalIA onClose={()=>setIA(false)}/>}
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
