import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronRight, ChevronUp,
  Camera, Sparkles, Download, ArrowLeft, X, Search,
  Shield, Calendar, User, Building2, MapPin, AlertTriangle,
  Copy, FileText, Loader2, CheckCircle2, XCircle, Edit3,
  Image, Eye, EyeOff, RotateCcw, Wand2, BookOpen, List
} from "lucide-react";

// ─── PALETTE ────────────────────────────────────────────────
const T = {
  bg:        "#F5F2ED",
  surface:   "#FFFFFF",
  border:    "#DDD8CF",
  accent:    "#B91C1C",
  accentHov: "#991B1B",
  accentLt:  "#FEF2F2",
  text:      "#1C1917",
  muted:     "#78716C",
  ok:        "#15803D",
  okBg:      "#F0FDF4",
  warn:      "#B45309",
  warnBg:    "#FFFBEB",
  err:       "#B91C1C",
  errBg:     "#FEF2F2",
  blue:      "#1D4ED8",
  blueBg:    "#EFF6FF",
};

// ─── ARCHIVIO ────────────────────────────────────────────────
const ARCHIVIO = {
  rischi: [
    "Elettrico","Incendio","Chimico","Biologico","Rumore","Vibrazioni meccaniche",
    "Videoterminali (VDT)","Movimentazione manuale carichi","Posture scorrette",
    "Caduta dall'alto","Inciampo / scivolamento","Investimento da mezzi",
    "Taglio / abrasione","Schiacciamento","Microclima","Illuminazione insufficiente",
    "Polveri e aerosol","Atmosfere esplosive (ATEX)","Spazi confinati",
    "Stress lavoro-correlato","Lavori in quota","Interferenze (DUVRI)",
    "Emergenza ed evacuazione","Radiazioni ottiche artificiali",
    "Campi elettromagnetici","Agenti cancerogeni","Rischio biologico aereo",
    "Rischio ergonomico","Rischio stradale","Rischio rapina / aggressione"
  ],
  ambienti: [
    "Ufficio amministrativo","Ufficio tecnico","Sala riunioni","Reception / ingresso",
    "Reparto produttivo","Magazzino","Officina meccanica","Laboratorio",
    "Mensa / refettorio","Cucina","Spogliatoi","Servizi igienici","Archivio",
    "Locale tecnico","Cabina elettrica","Centrale termica","Area carico/scarico",
    "Cortile / area esterna","Parcheggio","Piano interrato","Terrazza / tetto",
    "Camera degenza","Sala visita","Pronto soccorso","Sala operatoria"
  ],
  elementi: [
    "Scaffalatura metallica","Scaffalatura in legno","Pavimentazione",
    "Scala fissa","Scala portatile","Trabattello","Passerella / ballatoio",
    "Quadro elettrico","Impianto illuminazione","Impianto di terra",
    "Impianto antincendio","Estintore","Idrante UNI 45","Uscita di emergenza",
    "Segnaletica di sicurezza","Postazione VDT","Carrello elevatore",
    "Transpallet manuale","Trapano","Mola angolare","Sega circolare",
    "Compressore","Autoclave","Caldaia","Impianto idrico","Impianto gas",
    "Sostanze chimiche","DPI in dotazione","Cassetta pronto soccorso",
    "Defibrillatore (DAE)","Barella","Finestre / infissi","Porte REI"
  ],
  dpi: [
    "Casco di protezione","Occhiali di sicurezza","Visiera protettiva",
    "Otoprotettori (cuffie/tappi)","Mascherina FFP2","Mascherina FFP3",
    "Respiratore con filtri","Guanti antitaglio","Guanti chimici",
    "Guanti antivibrazioni","Scarpe di sicurezza S1","Scarpe di sicurezza S3",
    "Stivali di sicurezza","Imbracatura anticaduta","Longe con assorbitore",
    "Indumenti alta visibilità","Tuta protettiva","Grembiule in pelle"
  ],
  misure: [
    "Formazione e informazione (art. 36-37 D.Lgs. 81/08)",
    "Sorveglianza sanitaria obbligatoria",
    "Manutenzione periodica programmata",
    "Redazione/aggiornamento procedura operativa",
    "Installazione/ripristino segnaletica di sicurezza",
    "Limitazione e controllo accesso all'area",
    "Intervento strutturale/impiantistico",
    "Fornitura e utilizzo DPI adeguati",
    "Aggiornamento DVR",
    "Verifica periodica impianti (DPR 462/01)",
    "Effettuazione prova di evacuazione",
    "Aggiornamento piano di emergenza",
    "Bonifica e rimozione sostanze pericolose",
    "Riduzione esposizione alla fonte",
    "Sostituzione attrezzatura non conforme",
    "Installazione protezione collettiva"
  ],
  gravita: ["Bassa","Media","Alta","Critica"],
  probabilita: ["Improbabile","Possibile","Probabile","Quasi certa"],
  priorita: ["Bassa","Media","Alta","Immediata"],
};

const RP_MATRIX = {
  "Bassa-Improbabile":1,"Bassa-Possibile":2,"Bassa-Probabile":3,"Bassa-Quasi certa":4,
  "Media-Improbabile":2,"Media-Possibile":4,"Media-Probabile":6,"Media-Quasi certa":8,
  "Alta-Improbabile":3,"Alta-Possibile":6,"Alta-Probabile":9,"Alta-Quasi certa":12,
  "Critica-Improbabile":4,"Critica-Possibile":8,"Critica-Probabile":12,"Critica-Quasi certa":16,
};
const rpScore = (g,p) => RP_MATRIX[`${g}-${p}`] || 0;
const rpColor = (s) => s<=2?T.ok:s<=6?T.warn:T.err;
const rpBg   = (s) => s<=2?T.okBg:s<=6?T.warnBg:T.errBg;
const rpLabel= (s) => s<=2?"Basso":s<=6?"Medio":s<=9?"Alto":"Critico";

const gravColor = (g) => ({Bassa:T.ok,Media:T.warn,Alta:T.err,Critica:T.err}[g]||T.muted);

// ─── UTILS ──────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,10);
const oggi = () => new Date().toISOString().split("T")[0];

const STORAGE_KEY = "ichno_sopr_v4";
const loadData = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"); } catch { return null; } };
const saveData = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

// ─── FACTORY ─────────────────────────────────────────────────
const mkSopralluogo = () => ({
  id:uid(), azienda:"", sede:"", indirizzo:"", nLavoratori:"",
  data:oggi(), tecnico:"", tipo:"Periodico", note:"",
  ambienti:[], stato:"In corso"
});
const mkAmbiente = () => ({ id:uid(), nome:"", ubicazione:"", descrizione:"", foto:[], elementi:[] });
const mkElemento = () => ({ id:uid(), nome:"", descrizione:"", conforme:true, rischi:[], note:"" });
const mkRischio  = () => ({ id:uid(), tipo:"", descrizione:"", gravita:"Media", probabilita:"Possibile", dpiRichiesti:[], nonConformita:[] });
const mkNC       = () => ({ id:uid(), descrizione:"", misura:"", responsabile:"", scadenza:"", priorita:"Media", stato:"Aperta", note:"" });

// ─── COMPONENTI UI ───────────────────────────────────────────
const Btn = ({ children, onClick, variant="primary", size="md", icon, disabled, full, className="" }) => {
  const szMap = { xs:"px-2.5 py-1 text-xs gap-1", sm:"px-3 py-1.5 text-xs gap-1.5", md:"px-4 py-2 text-sm gap-2", lg:"px-5 py-2.5 text-base gap-2" };
  const styles = {
    primary:   { background:T.accent,   color:"#fff",     border:"none" },
    secondary: { background:T.surface,  color:T.text,     border:`1px solid ${T.border}` },
    ghost:     { background:"transparent", color:T.muted, border:"none" },
    danger:    { background:T.errBg,    color:T.err,      border:`1px solid #FECACA` },
    success:   { background:T.okBg,     color:T.ok,       border:`1px solid #BBF7D0` },
    warn:      { background:T.warnBg,   color:T.warn,     border:`1px solid #FDE68A` },
    ai:        { background:"#4F46E5",  color:"#fff",     border:"none" },
  };
  const s = styles[variant]||styles.primary;
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center font-semibold rounded-lg transition-all duration-100 select-none ${szMap[size]} ${full?"w-full justify-center":""} ${disabled?"opacity-40 cursor-not-allowed":"cursor-pointer"} ${className}`}
      style={s}
      onMouseEnter={e=>{ if(!disabled&&variant==="primary") e.currentTarget.style.background=T.accentHov; }}
      onMouseLeave={e=>{ if(!disabled&&variant==="primary") e.currentTarget.style.background=T.accent; }}>
      {icon&&<span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

const Card = ({children,className="",style={}}) => (
  <div className={`rounded-xl bg-white border ${className}`} style={{borderColor:T.border,...style}}>{children}</div>
);

const Badge = ({children,color="gray",dot}) => {
  const map={gray:{bg:"#F5F2ED",c:T.muted},red:{bg:T.errBg,c:T.err},green:{bg:T.okBg,c:T.ok},yellow:{bg:T.warnBg,c:T.warn},blue:{bg:T.blueBg,c:T.blue},purple:{bg:"#F5F3FF",c:"#6D28D9"}};
  const s=map[color]||map.gray;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{background:s.bg,color:s.c}}>
      {dot&&<span className="w-1.5 h-1.5 rounded-full" style={{background:s.c}}/>}
      {children}
    </span>
  );
};

const Fld = ({label,children,hint}) => (
  <div>
    <label className="block text-xs font-semibold mb-1" style={{color:T.muted}}>{label}</label>
    {children}
    {hint&&<p className="text-xs mt-1" style={{color:T.muted}}>{hint}</p>}
  </div>
);

const Inp = ({value,onChange,placeholder,type="text",rows,disabled}) => {
  const base = "w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors";
  const s = {borderColor:T.border,color:T.text,background:disabled?"#F5F2ED":"#fff",fontFamily:"inherit"};
  if(rows) return (
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled}
      className={`${base} resize-none`} style={s}
      onFocus={e=>{if(!disabled)e.target.style.borderColor=T.accent}} onBlur={e=>e.target.style.borderColor=T.border}/>
  );
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      className={base} style={s}
      onFocus={e=>{if(!disabled)e.target.style.borderColor=T.accent}} onBlur={e=>e.target.style.borderColor=T.border}/>
  );
};

const Sel = ({value,onChange,options,placeholder}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    className="w-full px-3 py-2 rounded-lg text-sm border outline-none bg-white"
    style={{borderColor:T.border,color:value?T.text:T.muted,fontFamily:"inherit"}}
    onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}>
    {placeholder&&<option value="">{placeholder}</option>}
    {options.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
);

// ─── AI HELPER ───────────────────────────────────────────────
const callAI = async (prompt) => {
  const resp = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:1000,
      messages:[{role:"user",content:prompt}]
    })
  });
  const d = await resp.json();
  return d.content?.find(b=>b.type==="text")?.text || "";
};

// ─── AI BUTTON ───────────────────────────────────────────────
const AIBtn = ({prompt,onResult,label="IA",size="xs"}) => {
  const [loading,setLoading]=useState(false);
  const run = async()=>{
    setLoading(true);
    try{ const r=await callAI(prompt); onResult(r); }catch{}finally{setLoading(false);}
  };
  return (
    <Btn variant="ai" size={size} onClick={run} disabled={loading}
      icon={loading?<Loader2 size={11} className="animate-spin"/>:<Sparkles size={11}/>}>
      {label}
    </Btn>
  );
};

// ─── FOTO UPLOADER ───────────────────────────────────────────
// In artifact React l'unico modo affidabile per aprire il file picker
// è usare <label htmlFor> che wrappa direttamente <input type="file">.
// NON funziona: ref.click(), input nascosto con opacity:0, input outside DOM.
const FotoUploader = ({foto,onChange}) => {
  const idCam = useState(()=>"cam_"+uid())[0];
  const idGal = useState(()=>"gal_"+uid())[0];

  const leggiFile = (file) => new Promise((res) => {
    if(!file||!file.type.startsWith("image/")) return res(null);
    const r = new FileReader();
    r.onload  = ev => res({id:uid(), data:ev.target.result, nome:file.name, commento:""});
    r.onerror = () => res(null);
    r.readAsDataURL(file);
  });

  const handleChange = async (e) => {
    const files = Array.from(e.target.files||[]);
    if(!files.length) return;
    const letti = await Promise.all(files.map(leggiFile));
    const valide = letti.filter(Boolean);
    if(valide.length) onChange([...foto, ...valide]);
    e.target.value = "";
  };

  const rimuovi = (id) => onChange(foto.filter(f=>f.id!==id));
  const aggComm = (id,c) => onChange(foto.map(f=>f.id===id?{...f,commento:c}:f));

  const lbBase = {
    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
    gap:6,padding:"14px 8px",borderRadius:12,border:`2px dashed ${T.border}`,
    cursor:"pointer",flex:1,userSelect:"none",transition:"border-color 0.15s"
  };

  return (
    <div>
      {/* Due label cliccabili — ognuna wrappa il proprio input */}
      <div style={{display:"flex",gap:8,marginBottom:12}}>

        <label htmlFor={idCam}
          style={{...lbBase}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
          onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
          <Camera size={22} style={{color:T.accent}}/>
          <span style={{fontSize:11,fontWeight:700,color:T.accent}}>Fotocamera</span>
          <input
            id={idCam}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleChange}
            style={{display:"none"}}
          />
        </label>

        <label htmlFor={idGal}
          style={{...lbBase}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=T.blue}
          onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
          <Image size={22} style={{color:T.blue}}/>
          <span style={{fontSize:11,fontWeight:700,color:T.blue}}>Galleria / File</span>
          <input
            id={idGal}
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            style={{display:"none"}}
          />
        </label>

      </div>

      {foto.length === 0 && (
        <p style={{fontSize:11,color:T.muted,textAlign:"center",marginBottom:8}}>
          Nessuna foto aggiunta
        </p>
      )}

      {foto.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {foto.map(f=>(
            <div key={f.id} style={{display:"flex",gap:10,alignItems:"flex-start",
              padding:8,borderRadius:10,border:`1px solid ${T.border}`}}>
              <img src={f.data} alt={f.nome}
                style={{width:72,height:72,objectFit:"cover",borderRadius:8,
                  flexShrink:0,border:`1px solid ${T.border}`,cursor:"pointer"}}
                onClick={()=>{
                  const w=window.open("about:blank","_blank");
                  if(w){w.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${f.data}" style="max-width:100%;max-height:100vh;border-radius:4px"></body></html>`);w.document.close();}
                }}/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:10,color:T.muted,margin:"0 0 4px",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.nome}</p>
                <input value={f.commento} onChange={e=>aggComm(f.id,e.target.value)}
                  placeholder="Descrizione foto..."
                  style={{width:"100%",padding:"5px 8px",fontSize:12,borderRadius:6,
                    border:`1px solid ${T.border}`,fontFamily:"inherit",outline:"none",
                    boxSizing:"border-box"}}/>
              </div>
              <button onClick={()=>rimuovi(f.id)}
                style={{padding:4,borderRadius:"50%",border:"none",
                  background:"transparent",cursor:"pointer",flexShrink:0,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                <X size={14} style={{color:T.err}}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
};

// ─── NON CONFORMITÀ ──────────────────────────────────────────
const NCEditor = ({nc,onChange,onDelete}) => {
  const [open,setOpen]=useState(true);
  const score = rpScore(nc.gravita||"Media",nc.probabilita||"Possibile");
  return (
    <div className="rounded-lg border p-3" style={{borderColor:"#FECACA",background:T.errBg}}>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={()=>setOpen(!open)} className="flex-1 flex items-center gap-2 text-left">
          <AlertTriangle size={13} style={{color:T.err,flexShrink:0}}/>
          <span className="text-xs font-semibold truncate" style={{color:T.err}}>
            {nc.descrizione||"Non conformità"}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{background:rpBg(score),color:rpColor(score)}}>
            {rpLabel(score)}
          </span>
        </button>
        <button onClick={()=>onChange({...nc,stato:nc.stato==="Aperta"?"Chiusa":"Aperta"})}
          className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
          style={{background:nc.stato==="Chiusa"?T.okBg:T.errBg,color:nc.stato==="Chiusa"?T.ok:T.err,border:`1px solid ${nc.stato==="Chiusa"?"#BBF7D0":"#FECACA"}`}}>
          {nc.stato}
        </button>
        <button onClick={()=>setOpen(!open)}>{open?<ChevronUp size={13} style={{color:T.muted}}/>:<ChevronDown size={13} style={{color:T.muted}}/>}</button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-red-100"><Trash2 size={12} style={{color:T.err}}/></button>
      </div>
      {open&&(
        <div className="space-y-2.5 mt-2">
          <Fld label="Descrizione non conformità">
            <div className="flex gap-1.5">
              <Inp value={nc.descrizione} onChange={v=>onChange({...nc,descrizione:v})} placeholder="Descrivi la NC..." rows={2}/>
              <AIBtn prompt={`Sei un RSPP. Descrivi in modo professionale questa non conformità in 1-2 frasi tecniche e formali, con riferimento al D.Lgs. 81/08: "${nc.descrizione||"non conformità rilevata"}". Rispondi solo con la descrizione migliorata.`}
                onResult={v=>onChange({...nc,descrizione:v})}/>
            </div>
          </Fld>
          <div className="grid grid-cols-2 gap-2">
            <Fld label="Gravità">
              <Sel value={nc.gravita} onChange={v=>onChange({...nc,gravita:v})} options={ARCHIVIO.gravita}/>
            </Fld>
            <Fld label="Probabilità">
              <Sel value={nc.probabilita} onChange={v=>onChange({...nc,probabilita:v})} options={ARCHIVIO.probabilita}/>
            </Fld>
          </div>
          <Fld label="Misura correttiva">
            <div className="flex gap-1.5">
              <Sel value={nc.misura} onChange={v=>onChange({...nc,misura:v})} options={ARCHIVIO.misure} placeholder="Seleziona misura..."/>
              <AIBtn prompt={`Suggerisci la misura correttiva più appropriata per questa non conformità: "${nc.descrizione}". Scegli dalla lista o suggerisci un'alternativa tecnica. Risposta in max 2 righe.`}
                onResult={v=>onChange({...nc,misura:v})}/>
            </div>
          </Fld>
          <div className="grid grid-cols-2 gap-2">
            <Fld label="Responsabile">
              <Inp value={nc.responsabile} onChange={v=>onChange({...nc,responsabile:v})} placeholder="Nome/ruolo"/>
            </Fld>
            <Fld label="Scadenza">
              <Inp type="date" value={nc.scadenza} onChange={v=>onChange({...nc,scadenza:v})}/>
            </Fld>
          </div>
          <Fld label="Priorità">
            <Sel value={nc.priorita} onChange={v=>onChange({...nc,priorita:v})} options={ARCHIVIO.priorita}/>
          </Fld>
          <Fld label="Note">
            <Inp value={nc.note||""} onChange={v=>onChange({...nc,note:v})} placeholder="Riferimenti normativi, dettagli..." rows={2}/>
          </Fld>
        </div>
      )}
    </div>
  );
};

// ─── RISCHIO ─────────────────────────────────────────────────
const RischioEditor = ({rischio,onChange,onDelete}) => {
  const [open,setOpen]=useState(false);
  const addNC = () => onChange({...rischio,nonConformita:[...rischio.nonConformita,mkNC()]});
  const updNC = (id,nc) => onChange({...rischio,nonConformita:rischio.nonConformita.map(n=>n.id===id?nc:n)});
  const delNC = (id) => onChange({...rischio,nonConformita:rischio.nonConformita.filter(n=>n.id!==id)});
  const ncAperte = rischio.nonConformita.filter(n=>n.stato==="Aperta").length;
  return (
    <div className="rounded-lg border p-2.5 mb-2" style={{borderColor:T.border}}>
      <div className="flex items-center gap-2">
        <button onClick={()=>setOpen(!open)} className="flex-1 flex items-center gap-2 text-left">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:gravColor(rischio.gravita)}}/>
          <span className="text-xs font-medium" style={{color:T.text}}>{rischio.tipo||"Rischio"}</span>
          <Badge color={rischio.gravita==="Alta"||rischio.gravita==="Critica"?"red":rischio.gravita==="Media"?"yellow":"green"}>
            {rischio.gravita}
          </Badge>
          {ncAperte>0&&<Badge color="red">{ncAperte} NC</Badge>}
          {open?<ChevronUp size={13} style={{color:T.muted}}/>:<ChevronDown size={13} style={{color:T.muted}}/>}
        </button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-red-50"><Trash2 size={11} style={{color:T.muted}}/></button>
      </div>
      {open&&(
        <div className="mt-2.5 space-y-2.5">
          <Fld label="Tipo di rischio">
            <div className="flex gap-1.5">
              <Sel value={rischio.tipo} onChange={v=>onChange({...rischio,tipo:v})} options={ARCHIVIO.rischi} placeholder="Seleziona rischio..."/>
            </div>
          </Fld>
          <div className="grid grid-cols-2 gap-2">
            <Fld label="Gravità">
              <Sel value={rischio.gravita} onChange={v=>onChange({...rischio,gravita:v})} options={ARCHIVIO.gravita}/>
            </Fld>
            <Fld label="Probabilità">
              <Sel value={rischio.probabilita} onChange={v=>onChange({...rischio,probabilita:v})} options={ARCHIVIO.probabilita}/>
            </Fld>
          </div>
          <Fld label="Descrizione">
            <div className="flex gap-1.5">
              <Inp value={rischio.descrizione} onChange={v=>onChange({...rischio,descrizione:v})}
                placeholder="Descrivi il rischio..." rows={2}/>
              <AIBtn prompt={`Sei un RSPP. Descrivi tecnicamente il rischio "${rischio.tipo}" in un contesto lavorativo, in 2 frasi. Fai riferimento al D.Lgs. 81/08. Rispondi solo con la descrizione.`}
                onResult={v=>onChange({...rischio,descrizione:v})}/>
            </div>
          </Fld>
          <Fld label="DPI richiesti">
            <div className="flex flex-wrap gap-1.5">
              {ARCHIVIO.dpi.map(d=>{
                const sel=(rischio.dpiRichiesti||[]).includes(d);
                return(
                  <button key={d} onClick={()=>onChange({...rischio,dpiRichiesti:sel?rischio.dpiRichiesti.filter(x=>x!==d):[...(rischio.dpiRichiesti||[]),d]})}
                    className="text-xs px-2 py-0.5 rounded-full border transition-all"
                    style={{background:sel?T.accent:"#fff",color:sel?"#fff":T.muted,borderColor:sel?T.accent:T.border}}>
                    {d}
                  </button>
                );
              })}
            </div>
          </Fld>
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{color:T.muted}}>Non conformità ({rischio.nonConformita.length})</span>
              <Btn size="xs" icon={<Plus size={11}/>} onClick={addNC}>Aggiungi NC</Btn>
            </div>
            {rischio.nonConformita.map(nc=>(
              <NCEditor key={nc.id} nc={nc} onChange={n=>updNC(nc.id,n)} onDelete={()=>delNC(nc.id)}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ELEMENTO ────────────────────────────────────────────────
const ElementoEditor = ({elemento,onChange,onDelete}) => {
  const [open,setOpen]=useState(false);
  const addRischio = () => onChange({...elemento,rischi:[...elemento.rischi,mkRischio()]});
  const updR = (id,r) => onChange({...elemento,rischi:elemento.rischi.map(x=>x.id===id?r:x)});
  const delR = (id) => onChange({...elemento,rischi:elemento.rischi.filter(x=>x.id!==id)});
  const ncTot = elemento.rischi.reduce((s,r)=>s+r.nonConformita.filter(n=>n.stato==="Aperta").length,0);
  return (
    <div className="rounded-lg border p-3 mb-2 bg-white" style={{borderColor:T.border}}>
      <div className="flex items-center gap-2">
        <button onClick={()=>setOpen(!open)} className="flex-1 flex items-center gap-2 text-left">
          {open?<ChevronUp size={14} style={{color:T.muted}}/>:<ChevronDown size={14} style={{color:T.muted}}/>}
          <span className="text-sm font-medium" style={{color:T.text}}>{elemento.nome||"Elemento"}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold`}
            style={{background:elemento.conforme?T.okBg:T.errBg,color:elemento.conforme?T.ok:T.err}}>
            {elemento.conforme?"✓ Conforme":"✗ Non conforme"}
          </span>
          {ncTot>0&&<Badge color="red">{ncTot} NC</Badge>}
        </button>
        <button onClick={()=>onChange({...elemento,conforme:!elemento.conforme})}
          className="p-1.5 rounded-lg text-xs"
          style={{background:elemento.conforme?T.errBg:T.okBg,color:elemento.conforme?T.err:T.ok}}>
          {elemento.conforme?<XCircle size={14}/>:<CheckCircle2 size={14}/>}
        </button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} style={{color:T.muted}}/></button>
      </div>
      {open&&(
        <div className="mt-3 space-y-3 pl-4 border-l-2" style={{borderColor:T.border}}>
          <div className="grid grid-cols-2 gap-2">
            <Fld label="Elemento">
              <Sel value={elemento.nome} onChange={v=>onChange({...elemento,nome:v})} options={ARCHIVIO.elementi} placeholder="Seleziona..."/>
            </Fld>
            <Fld label="Stato">
              <Sel value={elemento.conforme?"Conforme":"Non conforme"}
                onChange={v=>onChange({...elemento,conforme:v==="Conforme"})}
                options={["Conforme","Non conforme"]}/>
            </Fld>
          </div>
          <Fld label="Descrizione / osservazioni">
            <div className="flex gap-1.5">
              <Inp value={elemento.descrizione} onChange={v=>onChange({...elemento,descrizione:v})}
                placeholder="Osservazioni sull'elemento..." rows={2}/>
              <AIBtn prompt={`Sei un RSPP. Scrivi in modo professionale un'osservazione tecnica per l'elemento "${elemento.nome||"elemento"}" in 1-2 frasi. Rispondi solo con il testo.`}
                onResult={v=>onChange({...elemento,descrizione:v})}/>
            </div>
          </Fld>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{color:T.muted}}>Rischi ({elemento.rischi.length})</span>
              <div className="flex gap-1.5">
                <AIBtn size="xs"
                  prompt={`Sei un RSPP. Per l'elemento "${elemento.nome||"elemento"}" in un posto di lavoro, elenca i 3 principali rischi presenti, uno per riga, solo il nome del rischio senza numeri o trattini. Rispondi solo con i nomi.`}
                  onResult={txt=>{
                    const righe = txt.split("\n").map(r=>r.trim()).filter(Boolean).slice(0,3);
                    const nuovi = righe.map(t=>({...mkRischio(),tipo:t}));
                    onChange({...elemento,rischi:[...elemento.rischi,...nuovi]});
                  }} label="Suggerisci rischi"/>
                <Btn size="xs" icon={<Plus size={11}/>} onClick={addRischio}>Aggiungi</Btn>
              </div>
            </div>
            {elemento.rischi.map(r=>(
              <RischioEditor key={r.id} rischio={r} onChange={x=>updR(r.id,x)} onDelete={()=>delR(r.id)}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── AMBIENTE ────────────────────────────────────────────────
const AmbienteEditor = ({ambiente,onChange,onDelete,index}) => {
  const [open,setOpen]=useState(true);
  const [tab,setTab]=useState("elementi");
  const addEl = () => onChange({...ambiente,elementi:[...ambiente.elementi,mkElemento()]});
  const updEl = (id,el) => onChange({...ambiente,elementi:ambiente.elementi.map(e=>e.id===id?el:e)});
  const delEl = (id) => onChange({...ambiente,elementi:ambiente.elementi.filter(e=>e.id!==id)});
  const ncTot = ambiente.elementi.reduce((s,e)=>s+e.rischi.reduce((s2,r)=>s2+r.nonConformita.filter(n=>n.stato==="Aperta").length,0),0);
  return (
    <Card className="mb-3">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} style={{color:T.accent,flexShrink:0}}/>
          <button onClick={()=>setOpen(!open)} className="flex-1 flex items-center gap-2 text-left">
            <span className="font-semibold text-sm" style={{color:T.text}}>
              {ambiente.nome||`Ambiente ${index}`}
            </span>
            {ncTot>0&&<Badge color="red">{ncTot} NC aperte</Badge>}
            <Badge color="gray">{ambiente.elementi.length} el.</Badge>
            <Badge color="gray">{ambiente.foto.length} foto</Badge>
            {open?<ChevronUp size={14} style={{color:T.muted}}/>:<ChevronDown size={14} style={{color:T.muted}}/>}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50">
            <Trash2 size={14} style={{color:T.muted}}/>
          </button>
        </div>
        {open&&(
          <div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Fld label="Nome ambiente">
                <Sel value={ambiente.nome} onChange={v=>onChange({...ambiente,nome:v})}
                  options={ARCHIVIO.ambienti} placeholder="Seleziona..."/>
              </Fld>
              <Fld label="Ubicazione">
                <Inp value={ambiente.ubicazione} onChange={v=>onChange({...ambiente,ubicazione:v})} placeholder="Piano, ala, ecc."/>
              </Fld>
            </div>
            <Fld label="Descrizione generale">
              <div className="flex gap-1.5 mb-3">
                <Inp value={ambiente.descrizione} onChange={v=>onChange({...ambiente,descrizione:v})}
                  placeholder="Condizioni generali rilevate..." rows={2}/>
                <AIBtn prompt={`Sei un RSPP. Scrivi una descrizione tecnica professionale per l'ambiente "${ambiente.nome||"ambiente lavorativo"}" durante un sopralluogo, in 2-3 frasi. Rispondi solo con la descrizione.`}
                  onResult={v=>onChange({...ambiente,descrizione:v})}/>
              </div>
            </Fld>
            {/* Sub-tabs */}
            <div className="flex gap-1 mb-3 p-0.5 rounded-lg" style={{background:T.bg}}>
              {[["elementi",`Elementi (${ambiente.elementi.length})`],["foto",`Foto (${ambiente.foto.length})`]].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)}
                  className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-all"
                  style={{background:tab===k?"#fff":"transparent",color:tab===k?T.accent:T.muted,
                    boxShadow:tab===k?"0 1px 3px rgba(0,0,0,.08)":"none"}}>
                  {l}
                </button>
              ))}
            </div>
            {tab==="elementi"&&(
              <div>
                {ambiente.elementi.map((el,i)=>(
                  <ElementoEditor key={el.id} elemento={el} index={i+1}
                    onChange={e=>updEl(el.id,e)} onDelete={()=>delEl(el.id)}/>
                ))}
                <Btn variant="secondary" size="sm" icon={<Plus size={13}/>} onClick={addEl} full>
                  Aggiungi elemento
                </Btn>
              </div>
            )}
            {tab==="foto"&&(
              <FotoUploader foto={ambiente.foto}
                onChange={f=>onChange({...ambiente,foto:f})}/>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// ─── GENERATORE RELAZIONE ─────────────────────────────────────
const generaHTML = (sopr) => {
  const tutteNC = sopr.ambienti.flatMap(a=>a.elementi.flatMap(e=>e.rischi.flatMap(r=>r.nonConformita.map(nc=>({
    ...nc, ambiente:a.nome, elemento:e.nome, rischio:r.tipo, gravita:nc.gravita, probabilita:nc.probabilita
  })))));
  const ncAperte = tutteNC.filter(n=>n.stato==="Aperta");

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Verbale Sopralluogo — ${sopr.azienda} — ${sopr.data}</title>
<style>
*{box-sizing:border-box}
body{font-family:Georgia,serif;max-width:850px;margin:0 auto;padding:40px 30px;color:#1C1917;line-height:1.7;font-size:14px}
.logo{font-size:11px;color:#78716C;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
h1{font-size:22px;color:#B91C1C;border-bottom:2px solid #B91C1C;padding-bottom:10px;margin-bottom:24px}
h2{font-size:16px;color:#1C1917;border-left:3px solid #B91C1C;padding-left:10px;margin-top:32px}
h3{font-size:14px;color:#44403C;margin-top:20px}
.meta{background:#F5F2ED;border-radius:8px;padding:16px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.meta-row{display:flex;gap:8px}
.meta-label{font-size:11px;color:#78716C;text-transform:uppercase;letter-spacing:0.5px;min-width:110px}
.meta-val{font-size:13px;font-weight:600}
table{width:100%;border-collapse:collapse;margin:16px 0;font-size:12px}
th{background:#1C1917;color:#fff;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
td{padding:8px 12px;border-bottom:1px solid #DDD8CF;vertical-align:top}
tr:nth-child(even) td{background:#F5F2ED}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.badge-red{background:#FEF2F2;color:#B91C1C}
.badge-yellow{background:#FFFBEB;color:#B45309}
.badge-green{background:#F0FDF4;color:#15803D}
.rp{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700}
.amb{margin-bottom:24px;border:1px solid #DDD8CF;border-radius:8px;overflow:hidden}
.amb-header{background:#F5F2ED;padding:12px 16px;font-weight:600;border-bottom:1px solid #DDD8CF}
.amb-body{padding:16px}
.foto-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.foto-item{text-align:center}
.foto-item img{width:160px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #DDD8CF}
.foto-item p{font-size:10px;color:#78716C;margin:4px 0 0}
.firma{display:flex;justify-content:space-between;margin-top:60px;gap:40px}
.firma-box{flex:1;border-top:1px solid #1C1917;padding-top:12px;font-size:12px}
.disclaimer{margin-top:40px;padding:16px;background:#FFFBEB;border-radius:8px;font-size:11px;color:#78716C;border:1px solid #FDE68A}
@media print{body{padding:20px}}
</style></head><body>
<p class="logo">Ichnossicurezza S.r.l. — Documento riservato</p>
<h1>Verbale di Sopralluogo<br><small style="font-size:14px;font-weight:normal;color:#44403C">${sopr.azienda||"N/D"} — ${sopr.data}</small></h1>

<div class="meta">
  <div class="meta-row"><span class="meta-label">Azienda</span><span class="meta-val">${sopr.azienda||"—"}</span></div>
  <div class="meta-row"><span class="meta-label">Sede</span><span class="meta-val">${sopr.sede||"—"}</span></div>
  <div class="meta-row"><span class="meta-label">Indirizzo</span><span class="meta-val">${sopr.indirizzo||"—"}</span></div>
  <div class="meta-row"><span class="meta-label">N° Lavoratori</span><span class="meta-val">${sopr.nLavoratori||"—"}</span></div>
  <div class="meta-row"><span class="meta-label">Data</span><span class="meta-val">${sopr.data}</span></div>
  <div class="meta-row"><span class="meta-label">Tipo</span><span class="meta-val">${sopr.tipo}</span></div>
  <div class="meta-row"><span class="meta-label">Tecnico RSPP</span><span class="meta-val">${sopr.tecnico||"—"}</span></div>
  <div class="meta-row"><span class="meta-label">Stato</span><span class="meta-val">${sopr.stato}</span></div>
</div>

<h2>1. Ambienti visitati</h2>
${sopr.ambienti.map((a,i)=>`
<div class="amb">
  <div class="amb-header">${i+1}. ${a.nome||"Ambiente"} ${a.ubicazione?"— "+a.ubicazione:""}</div>
  <div class="amb-body">
    ${a.descrizione?`<p>${a.descrizione}</p>`:""}
    ${a.elementi.length>0?`
    <h3>Elementi verificati</h3>
    <table><tr><th>Elemento</th><th>Stato</th><th>Rischi</th><th>Osservazioni</th></tr>
    ${a.elementi.map(e=>`<tr>
      <td>${e.nome||"—"}</td>
      <td><span class="badge ${e.conforme?"badge-green":"badge-red"}">${e.conforme?"Conforme":"Non conforme"}</span></td>
      <td>${e.rischi.map(r=>`<span class="badge badge-yellow">${r.tipo}</span>`).join(" ")}</td>
      <td>${e.descrizione||"—"}</td>
    </tr>`).join("")}
    </table>`:""}
    ${a.foto.length>0?`<h3>Documentazione fotografica</h3>
    <div class="foto-grid">${a.foto.map(f=>`<div class="foto-item"><img src="${f.data}" alt="${f.nome}"/><p>${f.commento||f.nome}</p></div>`).join("")}</div>`:""}
  </div>
</div>`).join("")}

<h2>2. Non conformità rilevate (${ncAperte.length} aperte)</h2>
${ncAperte.length===0?`<p>Nessuna non conformità rilevata durante il sopralluogo.</p>`:`
<table>
  <tr><th>#</th><th>Ambiente</th><th>Elemento</th><th>NC</th><th>Gravità</th><th>Probabilità</th><th>Misura</th><th>Responsabile</th><th>Scadenza</th></tr>
  ${ncAperte.map((nc,i)=>{
    const s=rpScore(nc.gravita,nc.probabilita);
    const cl=s<=2?"badge-green":s<=6?"badge-yellow":"badge-red";
    return `<tr>
      <td>${i+1}</td><td>${nc.ambiente}</td><td>${nc.elemento}</td>
      <td>${nc.descrizione}</td>
      <td><span class="badge ${cl}">${nc.gravita}</span></td>
      <td>${nc.probabilita}</td>
      <td>${nc.misura||"—"}</td>
      <td>${nc.responsabile||"—"}</td>
      <td>${nc.scadenza||"—"}</td>
    </tr>`;
  }).join("")}
</table>`}

${sopr.note?`<h2>3. Note e osservazioni generali</h2><p>${sopr.note}</p>`:""}

<h2>${sopr.note?"4":"3"}. Conclusioni</h2>
<p>Dal sopralluogo effettuato presso <strong>${sopr.azienda||"l'azienda"}</strong> in data <strong>${sopr.data}</strong>, sono stati visitati <strong>${sopr.ambienti.length}</strong> ambienti, verificati <strong>${sopr.ambienti.reduce((s,a)=>s+a.elementi.length,0)}</strong> elementi e rilevate <strong>${ncAperte.length}</strong> non conformità aperte. Si raccomanda l'adozione delle misure correttive indicate entro le scadenze stabilite.</p>

<div class="firma">
  <div class="firma-box">Il Tecnico RSPP incaricato<br><strong>${sopr.tecnico||"_______________"}</strong><br><br>Firma: _____________________</div>
  <div class="firma-box">Per presa visione — Il Datore di Lavoro<br><br><br>Firma: _____________________</div>
</div>

<div class="disclaimer">
  <strong>Nota.</strong> La presente relazione ha valore di verbale di sopralluogo periodico ai sensi del D.Lgs. 81/2008. Non sostituisce la valutazione dei rischi (DVR) né le misurazioni strumentali. Ichnossicurezza S.r.l. — P.IVA 02754910905 — info@ichnossicurezza.it — Tel. 079-4136984
</div>
</body></html>`;
};

// ─── SCHERMATA START ─────────────────────────────────────────
const SchermatStart = ({onNuovo,onContinua,hasDati}) => (
  <div className="text-center py-8">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
      style={{background:T.accent}}>
      <Shield size={32} color="#fff"/>
    </div>
    <h1 className="text-2xl font-bold mb-1" style={{color:T.text,fontFamily:"Georgia,serif"}}>Ichnossicurezza</h1>
    <p className="text-sm mb-8" style={{color:T.muted}}>Gestione Sopralluoghi — D.Lgs. 81/2008</p>
    <div className="space-y-3 max-w-sm mx-auto">
      <Btn onClick={onNuovo} full icon={<Plus size={16}/>} size="lg">Nuovo sopralluogo</Btn>
      {hasDati&&<Btn onClick={onContinua} variant="secondary" full icon={<Edit3 size={16}/>} size="lg">Continua sopralluogo salvato</Btn>}
    </div>
  </div>
);

// ─── APP ROOT ─────────────────────────────────────────────────
export default function App() {
  const [sopr,setSopr]       = useState(null);
  const [vista,setVista]     = useState("start"); // start | editor | relazione
  const [aiRelaz,setAiRelaz] = useState("");
  const [aiLoad,setAiLoad]   = useState(false);
  const [salvato,setSalvato] = useState(false);
  const hasDati = Boolean(loadData());

  useEffect(()=>{
    if(sopr) { saveData(sopr); setSalvato(true); const t=setTimeout(()=>setSalvato(false),1500); return()=>clearTimeout(t); }
  },[sopr]);

  const nuovoSopr = () => { setSopr(mkSopralluogo()); setVista("editor"); setAiRelaz(""); };
  const continuaSopr = () => { const d=loadData(); if(d){setSopr(d);setVista("editor");} };

  const addAmb = () => setSopr(s=>({...s,ambienti:[...s.ambienti,mkAmbiente()]}));
  const updAmb = (id,a) => setSopr(s=>({...s,ambienti:s.ambienti.map(x=>x.id===id?a:x)}));
  const delAmb = (id) => setSopr(s=>({...s,ambienti:s.ambienti.filter(x=>x.id!==id)}));

  const ncTot = sopr?.ambienti.reduce((s,a)=>s+a.elementi.reduce((s2,e)=>s2+e.rischi.reduce((s3,r)=>s3+r.nonConformita.filter(n=>n.stato==="Aperta").length,0),0),0)||0;

  const apriRelazione = async () => {
    setVista("relazione");
    if(!aiRelaz){
      setAiLoad(true);
      try{
        const nc = sopr.ambienti.flatMap(a=>a.elementi.flatMap(e=>e.rischi.flatMap(r=>r.nonConformita)));
        const txt = await callAI(`Sei un RSPP. Scrivi le conclusioni professionali per un verbale di sopralluogo presso "${sopr.azienda||"azienda"}" del ${sopr.data}. Ambienti visitati: ${sopr.ambienti.map(a=>a.nome).join(", ")||"nessuno"}. Non conformità aperte: ${nc.filter(n=>n.stato==="Aperta").length}. Scrivi 2-3 frasi conclusive formali e una raccomandazione finale. Solo il testo, nessun titolo.`);
        setAiRelaz(txt);
      }catch{}finally{setAiLoad(false);}
    }
  };

  // Salva HTML nel localStorage e apre nuova tab che lo legge
  const apriVerbale = (conPrint) => {
    const html = generaHTML({...sopr, conclusioniAI: aiRelaz});
    const KEY = "ichno_verbale_tmp";
    try {
      localStorage.setItem(KEY, html);
    } catch(e) {
      // Se localStorage pieno (foto pesanti), usa blob
    }
    // Blob URL — metodo più affidabile in artifact
    const blob = new Blob([conPrint ? html.replace("</body>",`<script>setTimeout(()=>window.print(),800)<\/script></body>`) : html],
      {type:"text/html;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  };

  const stampa = () => apriVerbale(true);

  const scarica = () => {
    const html = generaHTML({...sopr, conclusioniAI: aiRelaz});
    const blob = new Blob([html],{type:"text/html;charset=utf-8"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `Verbale_${(sopr.azienda||"sopralluogo").replace(/[^a-zA-Z0-9]/g,"_")}_${sopr.data}.html`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 10000);
  };

  if(vista==="start") return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{maxWidth:600,margin:"0 auto",padding:"40px 16px"}}>
        <SchermatStart onNuovo={nuovoSopr} onContinua={continuaSopr} hasDati={hasDati}/>
      </div>
    </div>
  );

  if(vista==="relazione") return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{maxWidth:600,margin:"0 auto",padding:"20px 16px 80px"}}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={()=>setVista("editor")} className="p-2 rounded-lg border" style={{borderColor:T.border}}>
            <ArrowLeft size={16}/>
          </button>
          <h2 className="font-bold" style={{color:T.text,fontFamily:"Georgia,serif"}}>Verbale di sopralluogo</h2>
        </div>
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{color:T.muted}}>Conclusioni generate dall'AI</span>
            <AIBtn prompt={`Sei un RSPP. Scrivi conclusioni professionali per un verbale di sopralluogo presso "${sopr.azienda}". Ambienti: ${sopr.ambienti.map(a=>a.nome).join(", ")}. NC aperte: ${ncTot}. 2-3 frasi formali. Solo testo.`}
              onResult={setAiRelaz} label="Rigenera" size="sm"/>
          </div>
          {aiLoad?<div className="flex items-center gap-2 py-4"><Loader2 size={16} className="animate-spin" style={{color:T.accent}}/><span className="text-sm" style={{color:T.muted}}>Generazione in corso...</span></div>
          :<Inp value={aiRelaz} onChange={setAiRelaz} placeholder="Conclusioni del sopralluogo..." rows={5}/>}
        </Card>
        <div className="flex gap-3">
          <Btn onClick={stampa} full icon={<Download size={15}/>} size="md">Stampa / PDF</Btn>
          <Btn onClick={scarica} variant="secondary" full icon={<FileText size={15}/>} size="md">Scarica HTML</Btn>
        </div>
        <p className="text-xs text-center mt-3" style={{color:T.muted}}>
          Il file HTML si apre in Word e si salva come .docx
        </p>
      </div>
    </div>
  );

  // ─── EDITOR ───────────────────────────────────────────────
  return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{maxWidth:600,margin:"0 auto",padding:"16px 16px 100px"}}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={()=>setVista("start")} className="p-2 rounded-lg border" style={{borderColor:T.border}}>
            <ArrowLeft size={16}/>
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-sm" style={{color:T.text,fontFamily:"Georgia,serif"}}>
              {sopr.azienda||"Nuovo sopralluogo"}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{color:T.muted}}>{sopr.data}</span>
              {ncTot>0&&<Badge color="red">{ncTot} NC aperte</Badge>}
              {salvato&&<span className="text-xs" style={{color:T.ok}}>✓ Salvato</span>}
            </div>
          </div>
          <Btn onClick={apriRelazione} icon={<FileText size={14}/>} size="sm">Verbale</Btn>
        </div>

        {/* Dati generali */}
        <Card className="p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:T.muted}}>Dati sopralluogo</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Azienda *">
                <Inp value={sopr.azienda} onChange={v=>setSopr(s=>({...s,azienda:v}))} placeholder="Ragione sociale"/>
              </Fld>
              <Fld label="Sede">
                <Inp value={sopr.sede} onChange={v=>setSopr(s=>({...s,sede:v}))} placeholder="Es. Sede centrale"/>
              </Fld>
            </div>
            <Fld label="Indirizzo">
              <Inp value={sopr.indirizzo} onChange={v=>setSopr(s=>({...s,indirizzo:v}))} placeholder="Via, città"/>
            </Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="N° lavoratori">
                <Inp type="number" value={sopr.nLavoratori} onChange={v=>setSopr(s=>({...s,nLavoratori:v}))}/>
              </Fld>
              <Fld label="Data">
                <Inp type="date" value={sopr.data} onChange={v=>setSopr(s=>({...s,data:v}))}/>
              </Fld>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Consulente RSPP">
                <Inp value={sopr.tecnico} onChange={v=>setSopr(s=>({...s,tecnico:v}))} placeholder="Nome e cognome"/>
              </Fld>
              <Fld label="Tipo sopralluogo">
                <Sel value={sopr.tipo} onChange={v=>setSopr(s=>({...s,tipo:v}))}
                  options={["Periodico","Straordinario","Primo sopralluogo","Follow-up NC","Audit"]}/>
              </Fld>
            </div>
            <Fld label="Note generali">
              <div className="flex gap-1.5">
                <Inp value={sopr.note} onChange={v=>setSopr(s=>({...s,note:v}))}
                  placeholder="Condizioni generali, accessi, persone presenti..." rows={2}/>
                <AIBtn prompt={`Sei un RSPP. Scrivi una nota introduttiva professionale per un sopralluogo presso "${sopr.azienda||"azienda"}" con ${sopr.nLavoratori||"N"} lavoratori, del tipo "${sopr.tipo}". 2 frasi. Solo testo.`}
                  onResult={v=>setSopr(s=>({...s,note:v}))}/>
              </div>
            </Fld>
          </div>
        </Card>

        {/* Ambienti */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{color:T.text}}>
            Ambienti visitati ({sopr.ambienti.length})
          </p>
          <Btn onClick={addAmb} icon={<Plus size={14}/>} size="sm">Aggiungi</Btn>
        </div>

        {sopr.ambienti.length===0&&(
          <div className="text-center py-10 rounded-xl border-2 border-dashed mb-4" style={{borderColor:T.border}}>
            <MapPin size={24} className="mx-auto mb-2" style={{color:T.muted}}/>
            <p className="text-sm" style={{color:T.muted}}>Nessun ambiente aggiunto</p>
            <p className="text-xs mt-1" style={{color:T.muted}}>Aggiungi gli ambienti che hai visitato</p>
          </div>
        )}

        {sopr.ambienti.map((a,i)=>(
          <AmbienteEditor key={a.id} ambiente={a} index={i+1}
            onChange={x=>updAmb(a.id,x)} onDelete={()=>delAmb(a.id)}/>
        ))}

        {sopr.ambienti.length>0&&(
          <Btn onClick={apriRelazione} full icon={<FileText size={15}/>} size="lg" className="mt-2">
            Genera verbale
          </Btn>
        )}
      </div>

      {/* Barra bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t py-2.5 px-4"
        style={{background:"rgba(245,242,237,0.97)",borderColor:T.border,backdropFilter:"blur(8px)"}}>
        <div style={{maxWidth:600,margin:"0 auto"}} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={13} style={{color:T.accent}}/>
            <span className="text-xs font-semibold" style={{color:T.accent}}>Ichnossicurezza</span>
          </div>
          <div className="flex items-center gap-3">
            {ncTot>0&&<Badge color="red" dot>{ncTot} NC aperte</Badge>}
            <span className="text-xs" style={{color:T.muted}}>{sopr.ambienti.length} ambienti</span>
            {salvato&&<span className="text-xs" style={{color:T.ok}}>✓ Salvato</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
