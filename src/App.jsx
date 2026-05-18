import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Camera, Sparkles, ArrowLeft, X, Shield, MapPin, AlertTriangle, FileText, Loader2, Image, CheckCircle2, XCircle } from "lucide-react";

const T = {
  bg:"#F5F2ED", surface:"#FFFFFF", border:"#DDD8CF",
  accent:"#B91C1C", text:"#1C1917", muted:"#78716C",
  ok:"#15803D", okBg:"#F0FDF4", warn:"#B45309", warnBg:"#FFFBEB",
  err:"#B91C1C", errBg:"#FEF2F2", blue:"#1D4ED8", blueBg:"#EFF6FF",
};

const RISCHI = ["Elettrico","Incendio","Chimico","Biologico","Rumore","Vibrazioni","Videoterminali (VDT)","Movimentazione manuale carichi","Posture scorrette","Caduta dall'alto","Inciampo / scivolamento","Investimento da mezzi","Taglio / abrasione","Microclima","Illuminazione insufficiente","Stress lavoro-correlato","Lavori in quota","Interferenze (DUVRI)","Emergenza / evacuazione","Agenti cancerogeni"];
const AMBIENTI = ["Ufficio amministrativo","Ufficio tecnico","Sala riunioni","Reception","Reparto produttivo","Magazzino","Officina meccanica","Laboratorio","Mensa / refettorio","Cucina","Spogliatoi","Servizi igienici","Archivio","Locale tecnico","Cabina elettrica","Centrale termica","Area carico/scarico","Cortile / area esterna"];
const ELEMENTI = ["Scaffalatura metallica","Pavimentazione","Scala fissa","Scala portatile","Quadro elettrico","Impianto illuminazione","Impianto antincendio","Estintore","Idrante UNI 45","Uscita di emergenza","Segnaletica sicurezza","Postazione VDT","Carrello elevatore","Transpallet","Trapano","Mola angolare","Compressore","Caldaia","Sostanze chimiche","DPI in dotazione","Cassetta pronto soccorso","Porte REI"];
const MISURE = ["Formazione e informazione (art. 36-37 D.Lgs. 81/08)","Sorveglianza sanitaria","Manutenzione periodica","Procedura operativa specifica","Segnaletica di sicurezza","Limitazione accesso area","Intervento strutturale","Fornitura DPI adeguati","Aggiornamento DVR","Verifica impianti (DPR 462/01)","Prova di evacuazione","Bonifica sostanze pericolose","Sostituzione attrezzatura"];
const GRAVITA = ["Bassa","Media","Alta","Critica"];
const PROB = ["Improbabile","Possibile","Probabile","Quasi certa"];

const uid = () => Math.random().toString(36).slice(2,9);
const oggi = () => new Date().toISOString().split("T")[0];
const KEY = "ichno_v5";
const carica = () => { try { return JSON.parse(localStorage.getItem(KEY)||"null"); } catch { return null; } };
const salva = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };

const mkSopr = () => ({ id:uid(), azienda:"", sede:"", indirizzo:"", nLav:"", data:oggi(), tecnico:"", tipo:"Periodico", note:"", stato:"In corso", ambienti:[] });
const mkAmb  = () => ({ id:uid(), nome:"", ubicazione:"", descr:"", foto:[], elementi:[] });
const mkEl   = () => ({ id:uid(), nome:"", descr:"", conforme:true, rischi:[] });
const mkRisk = () => ({ id:uid(), tipo:"", descr:"", gravita:"Media", prob:"Possibile", nc:[] });
const mkNC   = () => ({ id:uid(), descr:"", misura:"", resp:"", scad:"", gravita:"Media", stato:"Aperta" });

// ── UI BASE ──────────────────────────────────────────────────
const Btn = ({ children, onClick, v="primary", sz="md", icon, disabled, full }) => {
  const s = { primary:{background:T.accent,color:"#fff",border:"none"}, secondary:{background:"#fff",color:T.text,border:`1px solid ${T.border}`}, ghost:{background:"transparent",color:T.muted,border:"none"}, danger:{background:T.errBg,color:T.err,border:`1px solid #FECACA`}, ai:{background:"#4F46E5",color:"#fff",border:"none"} }[v]||{};
  const p = { xs:"6px 10px", sm:"7px 12px", md:"8px 16px", lg:"11px 20px" }[sz]||"8px 16px";
  const fs = { xs:11, sm:12, md:13, lg:15 }[sz]||13;
  return <button onClick={onClick} disabled={disabled} style={{ ...s, padding:p, fontSize:fs, fontWeight:700, borderRadius:8, display:"inline-flex", alignItems:"center", gap:6, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1, width:full?"100%":"auto", justifyContent:full?"center":"flex-start", fontFamily:"inherit" }}>{icon&&<span style={{display:"flex"}}>{icon}</span>}{children}</button>;
};

const Inp = ({ value, onChange, placeholder, type="text", rows, disabled }) => {
  const base = { width:"100%", padding:"8px 12px", fontSize:13, borderRadius:8, border:`1px solid ${T.border}`, outline:"none", fontFamily:"inherit", color:T.text, background:disabled?"#F5F2ED":"#fff", boxSizing:"border-box" };
  if(rows) return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled} style={{...base,resize:"none"}} />;
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={base} />;
};

const Sel = ({ value, onChange, options, placeholder }) => (
  <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", padding:"8px 12px", fontSize:13, borderRadius:8, border:`1px solid ${T.border}`, outline:"none", fontFamily:"inherit", color:value?T.text:T.muted, background:"#fff", boxSizing:"border-box" }}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
);

const Fld = ({ label, children }) => (
  <div style={{marginBottom:12}}>
    <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
    {children}
  </div>
);

const Card = ({ children, style={} }) => (
  <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${T.border}`, marginBottom:12, ...style }}>{children}</div>
);

const Badge = ({ children, color="gray" }) => {
  const m = { gray:{bg:"#F5F2ED",c:T.muted}, red:{bg:T.errBg,c:T.err}, green:{bg:T.okBg,c:T.ok}, yellow:{bg:T.warnBg,c:T.warn}, blue:{bg:T.blueBg,c:T.blue} };
  const s = m[color]||m.gray;
  return <span style={{ background:s.bg, color:s.c, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20, display:"inline-block" }}>{children}</span>;
};

// ── AI ────────────────────────────────────────────────────────
const callAI = async (prompt) => {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800, messages:[{role:"user",content:prompt}] })
  });
  const d = await r.json();
  return d.content?.find(b=>b.type==="text")?.text||"";
};

const AIBtn = ({ prompt, onResult, label="IA" }) => {
  const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); try { onResult(await callAI(prompt)); } catch {} finally { setLoading(false); } };
  return <Btn v="ai" sz="xs" onClick={run} disabled={loading} icon={loading?<Loader2 size={11} style={{animation:"spin 1s linear infinite"}}/>:<Sparkles size={11}/>}>{label}</Btn>;
};

// ── FOTO ─────────────────────────────────────────────────────
const Foto = ({ foto, onChange }) => {
  const leggi = (file) => new Promise(res => {
    if (!file?.type.startsWith("image/")) return res(null);
    const r = new FileReader();
    r.onload = ev => res({ id:uid(), data:ev.target.result, nome:file.name, comm:"" });
    r.onerror = () => res(null);
    r.readAsDataURL(file);
  });

  const onFile = async (e) => {
    const files = Array.from(e.target.files||[]);
    const letti = (await Promise.all(files.map(leggi))).filter(Boolean);
    if (letti.length) onChange([...foto, ...letti]);
    e.target.value = "";
  };

  const idCam = useState(()=>"c"+uid())[0];
  const idGal = useState(()=>"g"+uid())[0];

  const btnFoto = { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, padding:"14px 8px", borderRadius:10, border:`2px dashed ${T.border}`, cursor:"pointer", flex:1 };

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <label htmlFor={idCam} style={{...btnFoto}}>
          <Camera size={20} style={{color:T.accent}}/>
          <span style={{fontSize:11,fontWeight:700,color:T.accent}}>Fotocamera</span>
          <input id={idCam} type="file" accept="image/*" capture="environment" onChange={onFile} style={{display:"none"}}/>
        </label>
        <label htmlFor={idGal} style={{...btnFoto}}>
          <Image size={20} style={{color:T.blue}}/>
          <span style={{fontSize:11,fontWeight:700,color:T.blue}}>Galleria</span>
          <input id={idGal} type="file" accept="image/*" multiple onChange={onFile} style={{display:"none"}}/>
        </label>
      </div>
      {foto.length===0 && <p style={{fontSize:11,color:T.muted,textAlign:"center",margin:"0 0 8px"}}>Nessuna foto</p>}
      {foto.map(f => (
        <div key={f.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:8,borderRadius:8,border:`1px solid ${T.border}`,marginBottom:6}}>
          <img src={f.data} alt="" style={{width:64,height:64,objectFit:"cover",borderRadius:6,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:10,color:T.muted,margin:"0 0 4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.nome}</p>
            <input value={f.comm} onChange={e=>onChange(foto.map(x=>x.id===f.id?{...x,comm:e.target.value}:x))}
              placeholder="Descrizione..." style={{width:"100%",padding:"4px 8px",fontSize:12,borderRadius:6,border:`1px solid ${T.border}`,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </div>
          <button onClick={()=>onChange(foto.filter(x=>x.id!==f.id))} style={{border:"none",background:"transparent",cursor:"pointer",padding:2}}>
            <X size={13} style={{color:T.err}}/>
          </button>
        </div>
      ))}
    </div>
  );
};

// ── NC ────────────────────────────────────────────────────────
const NCItem = ({ nc, onChange, onDel }) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{border:`1px solid #FECACA`,borderRadius:8,padding:10,background:T.errBg,marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:open?10:0}}>
        <AlertTriangle size={13} style={{color:T.err,flexShrink:0}}/>
        <span style={{flex:1,fontSize:12,fontWeight:700,color:T.err,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nc.descr||"Non conformità"}</span>
        <button onClick={()=>onChange({...nc,stato:nc.stato==="Aperta"?"Chiusa":"Aperta"})}
          style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,border:"none",cursor:"pointer",background:nc.stato==="Chiusa"?T.okBg:T.errBg,color:nc.stato==="Chiusa"?T.ok:T.err}}>
          {nc.stato}
        </button>
        <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</button>
        <button onClick={onDel} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={12} style={{color:T.muted}}/></button>
      </div>
      {open && (
        <div>
          <Fld label="Descrizione">
            <div style={{display:"flex",gap:6}}>
              <Inp value={nc.descr} onChange={v=>onChange({...nc,descr:v})} placeholder="Descrivi la NC..." rows={2}/>
              <AIBtn prompt={`Sei un RSPP. Descrivi tecnicamente questa non conformità in 1-2 frasi formali: "${nc.descr||"NC rilevata"}". Solo il testo.`} onResult={v=>onChange({...nc,descr:v})}/>
            </div>
          </Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label="Gravità"><Sel value={nc.gravita} onChange={v=>onChange({...nc,gravita:v})} options={GRAVITA}/></Fld>
            <Fld label="Probabilità"><Sel value={nc.prob||"Possibile"} onChange={v=>onChange({...nc,prob:v})} options={PROB}/></Fld>
          </div>
          <Fld label="Misura correttiva">
            <Sel value={nc.misura} onChange={v=>onChange({...nc,misura:v})} options={MISURE} placeholder="Seleziona..."/>
          </Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label="Responsabile"><Inp value={nc.resp} onChange={v=>onChange({...nc,resp:v})} placeholder="Nome/ruolo"/></Fld>
            <Fld label="Scadenza"><Inp type="date" value={nc.scad} onChange={v=>onChange({...nc,scad:v})}/></Fld>
          </div>
        </div>
      )}
    </div>
  );
};

// ── RISCHIO ───────────────────────────────────────────────────
const RiskItem = ({ r, onChange, onDel }) => {
  const [open, setOpen] = useState(false);
  const addNC = () => onChange({...r, nc:[...r.nc, mkNC()]});
  const ncAp = r.nc.filter(n=>n.stato==="Aperta").length;
  return (
    <div style={{border:`1px solid ${T.border}`,borderRadius:8,padding:10,marginBottom:8,background:"#fff"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:{Bassa:T.ok,Media:T.warn,Alta:T.err,Critica:T.err}[r.gravita]||T.muted}}/>
        <button onClick={()=>setOpen(!open)} style={{flex:1,textAlign:"left",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:T.text}}>
          {r.tipo||"Rischio"} {ncAp>0&&<Badge color="red">{ncAp} NC</Badge>}
        </button>
        <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</button>
        <button onClick={onDel} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={12} style={{color:T.muted}}/></button>
      </div>
      {open && (
        <div style={{marginTop:10,paddingLeft:16,borderLeft:`2px solid ${T.border}`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label="Tipo rischio"><Sel value={r.tipo} onChange={v=>onChange({...r,tipo:v})} options={RISCHI} placeholder="Seleziona..."/></Fld>
            <Fld label="Gravità"><Sel value={r.gravita} onChange={v=>onChange({...r,gravita:v})} options={GRAVITA}/></Fld>
          </div>
          <Fld label="Descrizione">
            <div style={{display:"flex",gap:6}}>
              <Inp value={r.descr} onChange={v=>onChange({...r,descr:v})} placeholder="Descrivi il rischio..." rows={2}/>
              <AIBtn prompt={`Sei un RSPP. Descrivi tecnicamente il rischio "${r.tipo||"rischio"}" in 2 frasi, riferimento D.Lgs. 81/08. Solo testo.`} onResult={v=>onChange({...r,descr:v})}/>
            </div>
          </Fld>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:11,fontWeight:700,color:T.muted}}>NON CONFORMITÀ ({r.nc.length})</span>
            <div style={{display:"flex",gap:6}}>
              <AIBtn prompt={`Sei un RSPP. Per il rischio "${r.tipo}", suggerisci 2 non conformità tipiche, una per riga, solo la descrizione breve.`}
                onResult={txt=>{ const righe=txt.split("\n").filter(Boolean).slice(0,2); onChange({...r,nc:[...r.nc,...righe.map(d=>({...mkNC(),descr:d.replace(/^[-•\d.]+\s*/,"")}))]});}}
                label="Suggerisci NC"/>
              <Btn v="danger" sz="xs" icon={<Plus size={11}/>} onClick={addNC}>Aggiungi</Btn>
            </div>
          </div>
          {r.nc.map(n=><NCItem key={n.id} nc={n} onChange={x=>onChange({...r,nc:r.nc.map(y=>y.id===n.id?x:y)})} onDel={()=>onChange({...r,nc:r.nc.filter(y=>y.id!==n.id)})}/>)}
        </div>
      )}
    </div>
  );
};

// ── ELEMENTO ──────────────────────────────────────────────────
const ElItem = ({ el, onChange, onDel }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("rischi");
  const addR = () => onChange({...el, rischi:[...el.rischi, mkRisk()]});
  const ncTot = el.rischi.reduce((s,r)=>s+r.nc.filter(n=>n.stato==="Aperta").length,0);
  return (
    <div style={{border:`1px solid ${T.border}`,borderRadius:8,padding:10,marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>onChange({...el,conforme:!el.conforme})} style={{border:"none",background:"transparent",cursor:"pointer",flexShrink:0}}>
          {el.conforme?<CheckCircle2 size={16} style={{color:T.ok}}/>:<XCircle size={16} style={{color:T.err}}/>}
        </button>
        <button onClick={()=>setOpen(!open)} style={{flex:1,textAlign:"left",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:T.text}}>
          {el.nome||"Elemento"} {ncTot>0&&<Badge color="red">{ncTot} NC</Badge>}
        </button>
        <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
        <button onClick={onDel} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={13} style={{color:T.muted}}/></button>
      </div>
      {open && (
        <div style={{marginTop:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <Fld label="Elemento"><Sel value={el.nome} onChange={v=>onChange({...el,nome:v})} options={ELEMENTI} placeholder="Seleziona..."/></Fld>
            <Fld label="Stato">
              <select value={el.conforme?"Conforme":"Non conforme"} onChange={e=>onChange({...el,conforme:e.target.value==="Conforme"})}
                style={{width:"100%",padding:"8px 12px",fontSize:13,borderRadius:8,border:`1px solid ${T.border}`,fontFamily:"inherit"}}>
                <option>Conforme</option><option>Non conforme</option>
              </select>
            </Fld>
          </div>
          <Fld label="Osservazioni">
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <Inp value={el.descr} onChange={v=>onChange({...el,descr:v})} placeholder="Note sull'elemento..." rows={2}/>
              <AIBtn prompt={`Sei un RSPP. Osservazione tecnica per "${el.nome||"elemento"}" in 1-2 frasi. Solo testo.`} onResult={v=>onChange({...el,descr:v})}/>
            </div>
          </Fld>
          <div style={{display:"flex",gap:4,marginBottom:10,padding:3,background:T.bg,borderRadius:8}}>
            {[["rischi",`Rischi (${el.rischi.length})`],["foto",`Foto`]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"6px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:tab===k?"#fff":"transparent",color:tab===k?T.accent:T.muted}}>
                {l}
              </button>
            ))}
          </div>
          {tab==="rischi" && (
            <div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginBottom:8}}>
                <AIBtn prompt={`Sei un RSPP. Per "${el.nome||"elemento"}", elenca 3 rischi tipici, uno per riga, solo il nome.`}
                  onResult={txt=>{ const r=txt.split("\n").filter(Boolean).slice(0,3); onChange({...el,rischi:[...el.rischi,...r.map(t=>({...mkRisk(),tipo:t.replace(/^[-•\d.]+\s*/,"")}))]});}}
                  label="Suggerisci rischi"/>
                <Btn v="secondary" sz="xs" icon={<Plus size={11}/>} onClick={addR}>Aggiungi</Btn>
              </div>
              {el.rischi.map(r=><RiskItem key={r.id} r={r} onChange={x=>onChange({...el,rischi:el.rischi.map(y=>y.id===r.id?x:y)})} onDel={()=>onChange({...el,rischi:el.rischi.filter(y=>y.id!==r.id)})}/>)}
            </div>
          )}
          {tab==="foto" && <Foto foto={el.foto||[]} onChange={f=>onChange({...el,foto:f})}/>}
        </div>
      )}
    </div>
  );
};

// ── AMBIENTE ──────────────────────────────────────────────────
const AmbItem = ({ amb, onChange, onDel, idx }) => {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("el");
  const addEl = () => onChange({...amb, elementi:[...amb.elementi, mkEl()]});
  const ncTot = amb.elementi.reduce((s,e)=>s+e.rischi.reduce((s2,r)=>s2+r.nc.filter(n=>n.stato==="Aperta").length,0),0);
  return (
    <Card>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:open?12:0}}>
          <MapPin size={15} style={{color:T.accent,flexShrink:0}}/>
          <button onClick={()=>setOpen(!open)} style={{flex:1,textAlign:"left",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:700,color:T.text}}>
            {amb.nome||`Ambiente ${idx}`}
            {" "}<Badge color="gray">{amb.elementi.length} el.</Badge>
            {" "}<Badge color="gray">{(amb.foto||[]).length} foto</Badge>
            {ncTot>0&&<>{" "}<Badge color="red">{ncTot} NC</Badge></>}
          </button>
          <button onClick={()=>setOpen(!open)} style={{border:"none",background:"transparent",cursor:"pointer"}}>{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
          <button onClick={onDel} style={{border:"none",background:"transparent",cursor:"pointer"}}><Trash2 size={14} style={{color:T.muted}}/></button>
        </div>
        {open && (
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <Fld label="Nome ambiente"><Sel value={amb.nome} onChange={v=>onChange({...amb,nome:v})} options={AMBIENTI} placeholder="Seleziona..."/></Fld>
              <Fld label="Ubicazione"><Inp value={amb.ubicazione} onChange={v=>onChange({...amb,ubicazione:v})} placeholder="Piano, ala..."/></Fld>
            </div>
            <Fld label="Descrizione">
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                <Inp value={amb.descr} onChange={v=>onChange({...amb,descr:v})} placeholder="Condizioni generali..." rows={2}/>
                <AIBtn prompt={`Sei un RSPP. Descrivi l'ambiente "${amb.nome||"ambiente"}" in 2 frasi tecniche. Solo testo.`} onResult={v=>onChange({...amb,descr:v})}/>
              </div>
            </Fld>
            <div style={{display:"flex",gap:4,marginBottom:10,padding:3,background:T.bg,borderRadius:8}}>
              {[["el",`Elementi (${amb.elementi.length})`],["foto",`Foto (${(amb.foto||[]).length})`]].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"6px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:tab===k?"#fff":"transparent",color:tab===k?T.accent:T.muted}}>
                  {l}
                </button>
              ))}
            </div>
            {tab==="el" && (
              <>
                {amb.elementi.map((el,i)=><ElItem key={el.id} el={el} idx={i+1} onChange={x=>onChange({...amb,elementi:amb.elementi.map(y=>y.id===el.id?x:y)})} onDel={()=>onChange({...amb,elementi:amb.elementi.filter(y=>y.id!==el.id)})}/>)}
                <Btn v="secondary" sz="sm" icon={<Plus size={12}/>} onClick={addEl} full>Aggiungi elemento</Btn>
              </>
            )}
            {tab==="foto" && <Foto foto={amb.foto||[]} onChange={f=>onChange({...amb,foto:f})}/>}
          </>
        )}
      </div>
    </Card>
  );
};

// ── VERBALE HTML ──────────────────────────────────────────────
const generaHTML = (s, conclusioni) => {
  const tutteNC = s.ambienti.flatMap(a=>a.elementi.flatMap(e=>e.rischi.flatMap(r=>r.nc.map(n=>({...n,amb:a.nome,el:e.nome,risk:r.tipo})))));
  const ncAp = tutteNC.filter(n=>n.stato==="Aperta");
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Verbale ${s.azienda} ${s.data}</title>
<style>body{font-family:Georgia,serif;max-width:850px;margin:0 auto;padding:40px 30px;color:#1C1917;line-height:1.7;font-size:14px}
h1{color:#B91C1C;border-bottom:2px solid #B91C1C;padding-bottom:10px}h2{color:#1C1917;border-left:3px solid #B91C1C;padding-left:10px;margin-top:28px}
.meta{background:#F5F2ED;border-radius:8px;padding:16px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mr{display:flex;gap:8px}.ml{font-size:11px;color:#78716C;min-width:110px}.mv{font-size:13px;font-weight:600}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}
th{background:#1C1917;color:#fff;padding:7px 10px;text-align:left;font-size:11px}
td{padding:7px 10px;border-bottom:1px solid #DDD8CF;vertical-align:top}tr:nth-child(even)td{background:#F5F2ED}
.firma{display:flex;justify-content:space-between;margin-top:60px;gap:40px}
.fb{flex:1;border-top:1px solid #1C1917;padding-top:12px;font-size:12px}
.disc{margin-top:40px;padding:14px;background:#FFFBEB;border-radius:8px;font-size:11px;color:#78716C;border:1px solid #FDE68A}
.foto-grid{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.foto-grid img{width:150px;height:110px;object-fit:cover;border-radius:6px;border:1px solid #DDD8CF}
</style></head><body>
<p style="font-size:11px;color:#78716C;text-transform:uppercase;letter-spacing:1px">Ichnossicurezza S.r.l.</p>
<h1>Verbale di Sopralluogo<br><small style="font-size:14px;font-weight:normal;color:#44403C">${s.azienda||"N/D"} — ${s.data}</small></h1>
<div class="meta">
  <div class="mr"><span class="ml">Azienda</span><span class="mv">${s.azienda||"—"}</span></div>
  <div class="mr"><span class="ml">Sede</span><span class="mv">${s.sede||"—"}</span></div>
  <div class="mr"><span class="ml">Indirizzo</span><span class="mv">${s.indirizzo||"—"}</span></div>
  <div class="mr"><span class="ml">N° lavoratori</span><span class="mv">${s.nLav||"—"}</span></div>
  <div class="mr"><span class="ml">Data</span><span class="mv">${s.data}</span></div>
  <div class="mr"><span class="ml">Tipo</span><span class="mv">${s.tipo}</span></div>
  <div class="mr"><span class="ml">Tecnico RSPP</span><span class="mv">${s.tecnico||"—"}</span></div>
</div>
<h2>1. Ambienti visitati</h2>
${s.ambienti.map((a,i)=>`<div style="margin-bottom:20px;border:1px solid #DDD8CF;border-radius:8px;overflow:hidden">
  <div style="background:#F5F2ED;padding:10px 14px;font-weight:700">${i+1}. ${a.nome||"Ambiente"} ${a.ubicazione?"— "+a.ubicazione:""}</div>
  <div style="padding:12px 14px">
    ${a.descr?`<p>${a.descr}</p>`:""}
    ${a.elementi.length?`<table><tr><th>Elemento</th><th>Stato</th><th>Rischi</th><th>Osservazioni</th></tr>
    ${a.elementi.map(e=>`<tr><td>${e.nome||"—"}</td><td style="color:${e.conforme?"#15803D":"#B91C1C"};font-weight:700">${e.conforme?"✓ OK":"✗ NC"}</td><td>${e.rischi.map(r=>`<span style="background:#FFFBEB;color:#B45309;font-size:10px;padding:1px 6px;border-radius:10px;margin:2px">${r.tipo}</span>`).join("")||"—"}</td><td>${e.descr||"—"}</td></tr>`).join("")}</table>`:""}
    ${(a.foto||[]).length?`<p style="font-weight:700;margin-top:12px">Foto</p><div class="foto-grid">${a.foto.map(f=>`<div><img src="${f.data}"/><p style="font-size:10px;color:#78716C;margin:3px 0">${f.comm||f.nome}</p></div>`).join("")}</div>`:""}
  </div>
</div>`).join("")}
<h2>2. Non conformità aperte (${ncAp.length})</h2>
${ncAp.length===0?`<p>Nessuna non conformità rilevata.</p>`:`
<table><tr><th>#</th><th>Ambiente</th><th>Elemento</th><th>Descrizione</th><th>Gravità</th><th>Misura</th><th>Responsabile</th><th>Scadenza</th></tr>
${ncAp.map((n,i)=>`<tr><td>${i+1}</td><td>${n.amb}</td><td>${n.el}</td><td>${n.descr}</td><td>${n.gravita}</td><td>${n.misura||"—"}</td><td>${n.resp||"—"}</td><td>${n.scad||"—"}</td></tr>`).join("")}
</table>`}
${s.note?`<h2>3. Note generali</h2><p>${s.note}</p>`:""}
<h2>Conclusioni</h2>
<p>${conclusioni||`Dal sopralluogo del ${s.data} presso ${s.azienda||"l'azienda"} sono stati visitati ${s.ambienti.length} ambienti e rilevate ${ncAp.length} non conformità aperte. Si raccomanda l'adozione delle misure correttive entro le scadenze stabilite.`}</p>
<div class="firma">
  <div class="fb">Il Tecnico RSPP<br><strong>${s.tecnico||"_______________"}</strong><br><br>Firma: _____________________</div>
  <div class="fb">Il Datore di Lavoro<br><br><br>Firma: _____________________</div>
</div>
<div class="disc"><strong>Nota.</strong> Verbale di sopralluogo ai sensi del D.Lgs. 81/2008. Ichnossicurezza S.r.l. — Tel. 079-4136984 — info@ichnossicurezza.it</div>
</body></html>`;
};

// ── APP ───────────────────────────────────────────────────────
export default function App() {
  const [sopr, setSopr]     = useState(null);
  const [vista, setVista]   = useState("start");
  const [concl, setConcl]   = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    const d = carica();
    if (d?.sopr) { setSopr(d.sopr); setConcl(d.concl||""); }
  }, []);

  useEffect(() => {
    if (sopr) {
      salva({ sopr, concl });
      setSaved(true);
      const t = setTimeout(()=>setSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [sopr, concl]);

  const nuovo = () => { setSopr(mkSopr()); setConcl(""); setVista("editor"); };
  const continua = () => { const d=carica(); if(d?.sopr){setSopr(d.sopr);setConcl(d.concl||"");setVista("editor");} };

  const addAmb = () => setSopr(s=>({...s, ambienti:[...s.ambienti, mkAmb()]}));
  const updAmb = (id,a) => setSopr(s=>({...s, ambienti:s.ambienti.map(x=>x.id===id?a:x)}));
  const delAmb = (id) => setSopr(s=>({...s, ambienti:s.ambienti.filter(x=>x.id!==id)}));

  const ncTot = sopr?.ambienti.reduce((s,a)=>s+a.elementi.reduce((s2,e)=>s2+e.rischi.reduce((s3,r)=>s3+r.nc.filter(n=>n.stato==="Aperta").length,0),0),0)||0;

  const apriVerbale = async () => {
    setVista("verbale");
    if (!concl) {
      setAiLoad(true);
      try {
        const nc = sopr.ambienti.flatMap(a=>a.elementi.flatMap(e=>e.rischi.flatMap(r=>r.nc)));
        const t = await callAI(`Sei un RSPP. Conclusioni professionali per verbale di sopralluogo presso "${sopr.azienda||"azienda"}" del ${sopr.data}. Ambienti: ${sopr.ambienti.map(a=>a.nome).join(", ")||"nessuno"}. NC aperte: ${nc.filter(n=>n.stato==="Aperta").length}. 2-3 frasi formali. Solo testo.`);
        setConcl(t);
      } catch {} finally { setAiLoad(false); }
    }
  };

  const scaricaVerbale = () => {
    const html = generaHTML(sopr, concl);
    const blob = new Blob([html], {type:"text/html;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Verbale_${(sopr.azienda||"sopralluogo").replace(/\s+/g,"_")}_${sopr.data}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
  };

  const s = { page:{ background:T.bg, minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif" }, wrap:{ maxWidth:600, margin:"0 auto", padding:"16px 14px 90px" } };

  // START
  if (vista==="start") return (
    <div style={s.page}>
      <div style={{...s.wrap, paddingTop:60, textAlign:"center"}}>
        <div style={{width:64,height:64,borderRadius:16,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <Shield size={32} color="#fff"/>
        </div>
        <h2 style={{color:T.text,fontFamily:"Georgia,serif",margin:"0 0 4px"}}>Ichnossicurezza</h2>
        <p style={{color:T.muted,fontSize:13,marginBottom:40}}>Gestione Sopralluoghi — D.Lgs. 81/2008</p>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:280,margin:"0 auto"}}>
          <Btn onClick={nuovo} full sz="lg" icon={<Plus size={16}/>}>Nuovo sopralluogo</Btn>
          {carica()?.sopr && <Btn onClick={continua} v="secondary" full sz="lg">Continua sopralluogo salvato</Btn>}
        </div>
      </div>
    </div>
  );

  // VERBALE
  if (vista==="verbale") return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <button onClick={()=>setVista("editor")} style={{padding:8,borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer"}}><ArrowLeft size={16}/></button>
          <h3 style={{margin:0,fontFamily:"Georgia,serif",color:T.text}}>Verbale di sopralluogo</h3>
        </div>
        <Card style={{padding:16,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:700,color:T.muted}}>Conclusioni</span>
            <AIBtn prompt={`RSPP: conclusioni professionali per sopralluogo "${sopr.azienda}" del ${sopr.data}. NC aperte: ${ncTot}. 2-3 frasi. Solo testo.`} onResult={setConcl} label="Rigenera con IA"/>
          </div>
          {aiLoad ? <div style={{textAlign:"center",padding:20,color:T.muted,fontSize:13}}><Loader2 size={18} style={{animation:"spin 1s linear infinite"}}/> Generazione...</div>
          : <Inp value={concl} onChange={setConcl} placeholder="Conclusioni del sopralluogo..." rows={5}/>}
        </Card>
        <Btn onClick={scaricaVerbale} full sz="lg" icon={<FileText size={15}/>}>Scarica verbale HTML</Btn>
        <p style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:8}}>Apri il file scaricato in Word → Salva come .docx</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  // EDITOR
  return (
    <div style={s.page}>
      <div style={s.wrap}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
          <button onClick={()=>setVista("start")} style={{padding:8,borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer"}}><ArrowLeft size={16}/></button>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:"Georgia,serif"}}>{sopr.azienda||"Nuovo sopralluogo"}</div>
            <div style={{fontSize:11,color:T.muted,display:"flex",alignItems:"center",gap:8}}>
              {sopr.data}
              {ncTot>0&&<Badge color="red">{ncTot} NC</Badge>}
              {saved&&<span style={{color:T.ok,fontWeight:700}}>✓ Salvato</span>}
            </div>
          </div>
          <Btn onClick={apriVerbale} sz="sm" icon={<FileText size={13}/>}>Verbale</Btn>
        </div>

        {/* Dati */}
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
            <Fld label="Tipo"><Sel value={sopr.tipo} onChange={v=>setSopr(s=>({...s,tipo:v}))} options={["Periodico","Straordinario","Primo sopralluogo","Follow-up","Audit"]}/></Fld>
          </div>
          <Fld label="Note generali"><Inp value={sopr.note} onChange={v=>setSopr(s=>({...s,note:v}))} placeholder="Condizioni generali, presenti..." rows={2}/></Fld>
        </Card>

        {/* Ambienti */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:14,fontWeight:700,color:T.text}}>Ambienti ({sopr.ambienti.length})</span>
          <Btn onClick={addAmb} sz="sm" icon={<Plus size={13}/>}>Aggiungi</Btn>
        </div>

        {sopr.ambienti.length===0 && (
          <div style={{textAlign:"center",padding:"30px 20px",borderRadius:12,border:`2px dashed ${T.border}`,marginBottom:12}}>
            <MapPin size={24} style={{color:T.muted,marginBottom:8}}/>
            <p style={{color:T.muted,fontSize:13,margin:0}}>Aggiungi il primo ambiente visitato</p>
          </div>
        )}

        {sopr.ambienti.map((a,i)=>(
          <AmbItem key={a.id} amb={a} idx={i+1}
            onChange={x=>updAmb(a.id,x)}
            onDel={()=>delAmb(a.id)}/>
        ))}

        {sopr.ambienti.length>0 && (
          <Btn onClick={apriVerbale} full sz="lg" icon={<FileText size={15}/>}>Genera verbale</Btn>
        )}

        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* Bottom bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(245,242,237,0.96)",borderTop:`1px solid ${T.border}`,padding:"10px 16px",backdropFilter:"blur(8px)"}}>
        <div style={{maxWidth:600,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Shield size={13} style={{color:T.accent}}/>
            <span style={{fontSize:11,fontWeight:700,color:T.accent}}>Ichnossicurezza</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {ncTot>0&&<Badge color="red">{ncTot} NC aperte</Badge>}
            <span style={{fontSize:11,color:T.muted}}>{sopr.ambienti.length} ambienti</span>
          </div>
        </div>
      </div>
    </div>
  );
}
