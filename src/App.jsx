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
const DB_KEY = "ichno_sopr_v9";
const AK     = "ichno_ak";
const akGet  = () => localStorage.getItem(AK)||"";
const akSet  = (k) => localStorage.setItem(AK,k);
const dbLoad = () => { try { return JSON.parse(localStorage.getItem(DB_KEY)||"[]"); } catch { return []; } };
const dbSave = (l) => { try { localStorage.setItem(DB_KEY,JSON.stringify(l)); } catch { alert("Spazio insufficiente. Elimina sopralluoghi vecchi."); } };

const mkSopr   = () => ({ id:uid(), azienda:"", indirizzo:"", data:oggi(), tecnico:"", tipo:"Periodico", note:"", reparti:[], concl:"", vecchioVerbale:"", creato:new Date().toISOString() });
const mkReparto= () => ({ id:uid(), nome:"", foto:[], criticita:[] });
const mkCrit   = () => ({ id:uid(), titolo:"", descr:"", misure:"", livello:"ELEVATA", stato:"Aperta", reiterata:false, note:"", foto:[] });

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

// ── CRITICITÀ ─────────────────────────────────────────────────
const CritCard = ({rId,c,updC,delC,setIA}) => {
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

        {c.reiterata&&<Pill color="orange">⟳ Reiterata</Pill>}

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
            <Inp value={c.titolo} onChange={v=>updC(rId,c.id,"titolo",v)}
              placeholder="Es. Quadro elettrico privo di segregazione"/>
          </Fld>

          <Fld label="Descrizione tecnica">
            <AIField value={c.descr} onChange={v=>updC(rId,c.id,"descr",v)}
              placeholder="Descrizione tecnica della criticità rilevata..." rows={3}
              promptEmpty={`Sei il redattore dei verbali di sopralluogo di Ichnossicurezza S.r.l. Scrivi la descrizione tecnica per questa criticità: "${c.titolo||"criticità"}" (livello: ${c.livello}). REGOLE ASSOLUTE: 1) Max 3 frasi brevi e dirette. 2) Inizia con una di queste formule variando: "È stata riscontrata", "È stato rilevato", "Si è riscontrata la presenza di", "È stata rilevata", "È emersa", "Si rileva". 3) Descrivi SOLO cosa c'è fisicamente, dove si trova, perché è pericoloso. 4) NON citare mai leggi o articoli. 5) NON usare mai "Durante il sopralluogo è stato riscontrato" come formula fissa. 6) Stile asciutto, niente frasi lunghe. Rispondi SOLO con la descrizione, nient'altro.`}
              promptFull={v=>`Sei il redattore dei verbali Ichnossicurezza S.r.l. Riscrivi questa descrizione rispettando: frasi brevi e dirette, terza persona, NON citare leggi, NON usare "Durante il sopralluogo è stato riscontrato" come apertura fissa, max 3 frasi. Testo: "${v}". Rispondi SOLO con la descrizione riscritta.`}
              onNoKey={()=>setIA(true)}/>
          </Fld>

          <Fld label="Misura preventiva / correttiva">
            <AIField value={c.misure} onChange={v=>updC(rId,c.id,"misure",v)}
              placeholder="Misure correttive da adottare..." rows={3}
              promptEmpty={`Sei il redattore dei verbali Ichnossicurezza S.r.l. Per questa criticità: "${c.descr||c.titolo||"criticità"}", scrivi le misure correttive. FORMATO OBBLIGATORIO ESATTO: ogni riga inizia con "1." "2." "3." ecc. Ogni misura: verbo concreto + azione specifica. Esempi di apertura: "Provvedere a...", "Installare...", "Verificare...", "Sostituire...", "Apporre...", "Garantire...", "Disporre...", "Rimuovere...", "Effettuare...". Max 4 misure. Frasi brevi. NON citare leggi. NON usare formule generiche. Rispondi SOLO con l'elenco numerato.`}
              promptFull={v=>`Sei il redattore dei verbali Ichnossicurezza S.r.l. Riscrivi queste misure: ogni punto numerato, verbo concreto, frasi brevi, NON citare leggi. Misure: "${v}". Rispondi SOLO con l'elenco numerato migliorato.`}
              onNoKey={()=>setIA(true)}/>
          </Fld>

          <Fld label="Note">
            <Inp value={c.note||""} onChange={v=>updC(rId,c.id,"note",v)}
              placeholder="Annotazioni aggiuntive..." rows={2}/>
          </Fld>

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
              <CritCard key={c.id} rId={r.id} c={c} updC={updC} delC={delC} setIA={setIA}/>
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
  const tutteCrit=s.reparti.flatMap(r=>r.criticita.map(c=>({...c,rep:r.nome})));
  const aperte=tutteCrit.filter(c=>c.stato==="Aperta");
  const nEl=aperte.filter(c=>c.livello==="ELEVATA").length;
  const nMe=aperte.filter(c=>c.livello==="MEDIA").length;
  const nLi=aperte.filter(c=>c.livello==="LIEVE").length;
  const reit=aperte.filter(c=>c.reiterata);

  const dotLiv=(l)=>l==="ELEVATA"?"#DC2626":l==="MEDIA"?"#D97706":"#16A34A";
  const bgLiv=(l)=>l==="ELEVATA"?"#FEF2F2":l==="MEDIA"?"#FFFBEB":"#F0FDF4";
  const brdLiv=(l)=>l==="ELEVATA"?"#FECACA":l==="MEDIA"?"#FDE68A":"#BBF7D0";
  const txLiv=(l)=>l==="ELEVATA"?"#991B1B":l==="MEDIA"?"#92400E":"#14532D";

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Verbale di Sopralluogo — ${s.azienda||"N/D"} — ${s.data}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;max-width:850px;margin:0 auto;padding:40px 32px;color:#1A1614;line-height:1.75;font-size:14px}
.logo{font-size:10px;color:#7A736B;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}
h1{color:#C0392B;border-bottom:2px solid #C0392B;padding-bottom:10px;margin-bottom:28px;font-size:22px}
h2{color:#1A1614;border-left:4px solid #C0392B;padding-left:12px;margin:32px 0 16px;font-size:16px}
h3{font-size:14px;color:#44403C;margin:18px 0 10px}
.meta{background:#F7F4EF;border-radius:8px;padding:18px;margin-bottom:28px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mr{display:flex;gap:10px}
.ml{font-size:11px;color:#7A736B;min-width:130px;flex-shrink:0;text-transform:uppercase;letter-spacing:0.4px}
.mv{font-size:13px;font-weight:700}
.riepilogo-box{background:#F7F4EF;border-radius:8px;padding:16px;margin-bottom:28px;display:flex;gap:24px;flex-wrap:wrap}
.riepilogo-item{display:flex;align-items:center;gap:8px}
.dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.riepilogo-num{font-size:22px;font-weight:700}
.riepilogo-lbl{font-size:11px;color:#7A736B;text-transform:uppercase}
.reparto-box{margin-bottom:28px}
.reparto-head{background:#C0392B;color:#fff;padding:10px 16px;border-radius:8px 8px 0 0;font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px}
.reparto-body{border:1px solid #E2DDD6;border-top:none;border-radius:0 0 8px 8px;overflow:hidden}
.crit-box{padding:16px;border-bottom:1px solid #E2DDD6;page-break-inside:avoid}
.crit-box:last-child{border-bottom:none}
.crit-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.crit-title{font-weight:700;font-size:14px}
.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700}
.reit-banner{background:#FFFBEB;border-left:4px solid #F59E0B;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#92400E;font-style:italic}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:12px}
th{background:#1A1614;color:#fff;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
td{padding:8px 12px;border-bottom:1px solid #E2DDD6;vertical-align:top}
tr:nth-child(even) td{background:#F7F4EF}
.foto-grid{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
.foto-item img{width:160px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #E2DDD6}
.foto-item p{font-size:10px;color:#7A736B;margin:4px 0 0;text-align:center;max-width:160px}
.firma{display:flex;justify-content:space-between;margin-top:60px;gap:40px}
.fb{flex:1;border-top:1px solid #1A1614;padding-top:14px;font-size:12px}
.disclaimer{margin-top:40px;padding:14px 16px;background:#FFFBEB;border-radius:8px;font-size:11px;color:#7A736B;border:1px solid #FDE68A}
@media print{body{padding:20px}.reparto-box,.crit-box{page-break-inside:avoid}}
</style></head><body>

<p class="logo">Ichnossicurezza S.r.l. — Consulenza in materia di Salute e Sicurezza sul Lavoro</p>

<h1>Verbale di Sopralluogo<br>
<small style="font-size:15px;font-weight:normal;color:#44403C">${s.azienda||"N/D"} — ${s.data}</small></h1>

<div class="meta">
  <div class="mr"><span class="ml">Azienda / Ente</span><span class="mv">${s.azienda||"—"}</span></div>
  <div class="mr"><span class="ml">Indirizzo</span><span class="mv">${s.indirizzo||"—"}</span></div>
  <div class="mr"><span class="ml">Data sopralluogo</span><span class="mv">${s.data}</span></div>
  <div class="mr"><span class="ml">Tipo</span><span class="mv">${s.tipo}</span></div>
  <div class="mr"><span class="ml">Tecnico incaricato</span><span class="mv">${s.tecnico||"—"}</span></div>
  <div class="mr"><span class="ml">Reparti visitati</span><span class="mv">${s.reparti.length}</span></div>
</div>

<h2>Riepilogo criticità rilevate</h2>
<div class="riepilogo-box">
  <div class="riepilogo-item">
    <span class="dot" style="background:#DC2626"></span>
    <div><div class="riepilogo-num" style="color:#DC2626">${nEl}</div><div class="riepilogo-lbl">Elevate</div></div>
  </div>
  <div class="riepilogo-item">
    <span class="dot" style="background:#D97706"></span>
    <div><div class="riepilogo-num" style="color:#D97706">${nMe}</div><div class="riepilogo-lbl">Medie</div></div>
  </div>
  <div class="riepilogo-item">
    <span class="dot" style="background:#16A34A"></span>
    <div><div class="riepilogo-num" style="color:#16A34A">${nLi}</div><div class="riepilogo-lbl">Lievi</div></div>
  </div>
  <div class="riepilogo-item">
    <span class="dot" style="background:#D97706"></span>
    <div><div class="riepilogo-num" style="color:#D97706">${reit.length}</div><div class="riepilogo-lbl">Reiterate</div></div>
  </div>
  <div class="riepilogo-item">
    <span class="dot" style="background:#1A1614"></span>
    <div><div class="riepilogo-num">${aperte.length}</div><div class="riepilogo-lbl">Totale</div></div>
  </div>
</div>

<h2>Dettaglio per reparto</h2>
${s.reparti.map((r,ri)=>{
  const cAp=r.criticita.filter(c=>c.stato==="Aperta");
  return `<div class="reparto-box">
  <div class="reparto-head">
    <span style="opacity:0.7">${ri+1}.</span> ${r.nome||"Reparto"}
  </div>
  <div class="reparto-body">
    ${cAp.length===0?`<div style="padding:14px;color:#7A736B;font-style:italic">Nessuna criticità aperta.</div>`
    :cAp.map((c,ci)=>`<div class="crit-box" style="background:${bgLiv(c.livello)}">
      <div class="crit-head">
        <span class="dot" style="background:${dotLiv(c.livello)}"></span>
        <div class="crit-title">${ci+1}. ${c.titolo||"Criticità"}</div>
        <span class="badge" style="background:${bgLiv(c.livello)};color:${txLiv(c.livello)};border:1px solid ${brdLiv(c.livello)}">${c.livello}</span>
        ${c.reiterata?`<span class="badge" style="background:#FFFBEB;color:#92400E;border:1px solid #FDE68A">⟳ REITERATA</span>`:""}
      </div>
      ${c.reiterata?`<div class="reit-banner"><em>⚠ RILIEVO REITERATO – Criticità già segnalata nella Relazione di Sopralluogo precedente e non risolta.</em></div>`:""}
      ${c.descr?`<p style="margin-bottom:10px"><strong>Descrizione:</strong> ${c.descr}</p>`:""}
      ${c.misure?`<p style="margin-bottom:10px"><strong>Misura correttiva:</strong> ${c.misure}</p>`:""}
      ${c.note?`<p style="margin-bottom:0;font-style:italic;font-size:12px;color:#7A736B">Nota: ${c.note}</p>`:""}
      ${(c.foto||[]).length?`<div style="margin-top:10px"><strong style="font-size:12px">Foto:</strong>
      <div class="foto-grid">${(c.foto||[]).map(f=>`<div class="foto-item"><img src="${f.data}"/><p>${f.comm||f.nome}</p></div>`).join("")}</div></div>`:""}
    </div>`).join("")}
    ${(r.foto||[]).length?`<div style="padding:14px;border-top:1px solid #E2DDD6">
    <strong style="font-size:12px">Documentazione fotografica</strong>
    <div class="foto-grid">${r.foto.map(f=>`<div class="foto-item"><img src="${f.data}"/><p>${f.comm||f.nome}</p></div>`).join("")}</div>
    </div>`:""}
  </div>
</div>`;}).join("")}

<h2>Tabella riepilogativa</h2>
${aperte.length===0?`<p>Nessuna criticità aperta.</p>`:`
<table>
<tr><th>#</th><th>Reparto</th><th>Criticità</th><th>Livello</th><th>Misura correttiva</th><th>Stato</th></tr>
${aperte.map((c,i)=>`<tr>
  <td>${i+1}</td>
  <td>${c.rep}</td>
  <td>${c.titolo||"—"}</td>
  <td><span style="color:${txLiv(c.livello)};font-weight:700">● ${c.livello}</span></td>
  <td>${c.misure?c.misure.slice(0,70)+(c.misure.length>70?"…":""):"—"}</td>
  <td>${c.reiterata?"⟳ Reiterata":"Nuova"}</td>
</tr>`).join("")}
</table>`}

${reit.length?`<h2>Criticità reiterate (${reit.length})</h2>
<p style="margin-bottom:14px">Le seguenti criticità erano già presenti nel precedente verbale e non risultano ancora risolte:</p>
<table>
<tr><th>#</th><th>Reparto</th><th>Criticità</th><th>Livello</th></tr>
${reit.map((c,i)=>`<tr><td>${i+1}</td><td>${c.rep}</td><td>${c.titolo||"—"}</td><td style="color:${txLiv(c.livello)};font-weight:700">● ${c.livello}</td></tr>`).join("")}
</table>`:""}

${s.note?`<h2>Note generali</h2><p>${s.note}</p>`:""}

<h2>Conclusioni</h2>
<p>${s.concl||`Il sopralluogo del ${s.data} presso ${s.azienda||"l'azienda"} ha consentito di ispezionare ${s.reparti.length} reparti, rilevando complessivamente ${aperte.length} criticità aperte (${nEl} elevate, ${nMe} medie, ${nLi} lievi)${reit.length?`, di cui ${reit.length} reiterate rispetto al precedente verbale`:""}. Si richiede l'adozione delle misure correttive indicate entro i tempi stabiliti.`}</p>

<div class="firma">
  <div class="fb">
    Il Tecnico incaricato<br>
    <strong>${s.tecnico||"Dott. Giancarlo Falchi"}</strong><br>
    Consulente in materia di Sicurezza sul Lavoro<br><br>
    Firma: ________________________
  </div>
  <div class="fb">
    Il Datore di Lavoro<br>
    Per presa visione e accettazione<br><br><br>
    Firma: ________________________
  </div>
</div>

<div class="disclaimer">
  <strong>Nota.</strong> Il presente documento costituisce verbale di sopralluogo periodico in materia di salute e sicurezza sul lavoro ai sensi del D.Lgs. 81/2008 e s.m.i. Non sostituisce la Valutazione dei Rischi (DVR). <strong>Ichnossicurezza S.r.l.</strong> — Via Rockefeller 24, 07100 Sassari (SS) — Tel. 079-4136984 — info@ichnossicurezza.it
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
      const reitCount = sopr.reparti.reduce((s,r)=>s+r.criticita.filter(c=>c.reiterata&&c.stato==="Aperta").length,0); const t=await callAI(`Sei un tecnico RSPP di Ichnossicurezza S.r.l. Redigi le conclusioni del verbale di sopralluogo effettuato presso "${sopr.azienda||"azienda"}" in data ${sopr.data}. Reparti/aree ispezionati: ${sopr.reparti.map(r=>r.nome).filter(Boolean).join(", ")||"nessuno specificato"}. Criticità rilevate: ${nEl} elevate, ${nMe} medie, ${nLi} lievi, di cui ${reitCount} reiterate. Stile: tecnico-formale, terza persona, come i verbali Ichnossicurezza. Struttura: 1) sintetica descrizione dell'esito del sopralluogo; 2) invito ad adottare le misure correttive indicate; 3) disponibilità del tecnico per chiarimenti. Non citare articoli di legge. 3-4 frasi. Solo il testo delle conclusioni.`);
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
          <Inp value={sopr.note} onChange={v=>setSopr(s=>({...s,note:v}))}
            placeholder="Condizioni generali, presenti al sopralluogo..." rows={2}/>
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
          onAddReparto={()=>{ setSopr(s=>({...s,reparti:[...s.reparti,mkReparto()]})); setTimeout(()=>{ const all=document.querySelectorAll("[data-reparto]"); if(all.length) all[all.length-1].scrollIntoView({behavior:"smooth",block:"start"}); },200); }}/>
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
