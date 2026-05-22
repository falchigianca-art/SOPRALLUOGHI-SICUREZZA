import React, { useState, useEffect, useRef } from "react";
import {
  Shield, Plus, Trash2, Camera, X, ChevronDown, ChevronRight, FileText,
  Download, Sparkles, Settings, ArrowLeft
} from "lucide-react";

/* ============================================================
   SOPRALLUOGHI SICUREZZA — ICHNOSSICUREZZA S.R.L.
   Formato verbale: Reparto → Criticità (allineato alla skill
   verbale-sopralluogo-ichnossicurezza). Output HTML stampabile.
   ============================================================ */

// ── PALETTE / TEMA ───────────────────────────────────────────
const T = {
  bg:      "#f7f4ef",      // sabbia chiaro
  card:    "#ffffff",
  paper:   "#fdfbf7",
  ink:     "#1a1614",
  muted:   "#7a736b",
  border:  "#e4ddd2",
  accent:  "#b91c1c",      // rosso Ichnos
  accentDk:"#7f1313",
  red:     "#b91c1c", redBg: "#fde8e8",
  orange:  "#d97706", orangeBg:"#fef3c7",
  green:   "#15803d", greenBg: "#d1fae5",
  yellow:  "#b45309", yellowBg:"#fef3c7",
};

// ── LIVELLI ──────────────────────────────────────────────────
const LIVELLI = [
  { val: "ELEVATA", label: "🔴 ELEVATA", color: T.red,    bg: T.redBg,    desc: "Intervento urgente e inderogabile" },
  { val: "MEDIA",   label: "🟠 MEDIA",   color: T.orange, bg: T.orangeBg, desc: "Intervento a breve termine" },
  { val: "LIEVE",   label: "🟢 LIEVE",   color: T.green,  bg: T.greenBg,  desc: "Intervento di miglioramento" },
];
const lvlInfo = (v) => LIVELLI.find(l => l.val === v) || LIVELLI[1];

// ── TIPI DI REITERAZIONE ─────────────────────────────────────
const REITER = [
  { val: "NESSUNA",   label: "— Nessuna (criticità nuova)" },
  { val: "SEMPLICE",  label: "⚠ Reiterato (semplice)" },
  { val: "ESTESO",    label: "⚠ Reiterato — non risolto" },
  { val: "AGGRAVATO", label: "⚠ Reiterato e AGGRAVATO" },
  { val: "PARZIALE",  label: "⚠ Reiterato parzialmente" },
];

// ── REPARTI SUGGERITI ────────────────────────────────────────
const REPARTI_SUGG = [
  "UFFICI", "UFFICI - DOTAZIONI ANTINCENDIO",
  "IMPIANTO DI BETONAGGIO - PROTEZIONI E CATENELLE",
  "IMPIANTO DI BETONAGGIO - SCALE E ACCESSI IN QUOTA",
  "IMPIANTO DI BETONAGGIO - SCARICO INERTI E ASPIRAZIONE",
  "AREA ESTERNA - QUADRI ELETTRICI",
  "AREA ESTERNA - PRESIDI ANTINCENDIO",
  "DEPOSITI E STOCCAGGIO PRODOTTI CHIMICI",
  "OFFICINA",
  "AREA LAVAGGIO MEZZI",
  "GRUPPO ELETTROGENO",
  "MAGAZZINO",
  "CASA COMUNALE",
  "ARCHIVIO COMUNALE",
  "BIBLIOTECA / SALA LETTURA",
  "AULA SCOLASTICA",
  "PALESTRA",
  "MENSA / CUCINA",
  "SPOGLIATOI",
  "BAGNI / SERVIZI IGIENICI",
  "PIAZZALE / AREA ESTERNA",
];

// ── STORAGE ──────────────────────────────────────────────────
const STORE_KEY    = "ichnos_sopralluogo_v3";
const APIKEY_STORE = "ichnos_apikey";

const carica = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); }
  catch { return null; }
};
const salva = (d) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch {} };

const getApiKey = () => { try { return localStorage.getItem(APIKEY_STORE) || ""; } catch { return ""; } };
const setApiKey = (k) => { try { localStorage.setItem(APIKEY_STORE, k); } catch {} };

// ── HELPERS ──────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const oggi = () => new Date().toISOString().slice(0, 10);
const ggMmYyyy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const dataEstesa = (iso) => {
  if (!iso) return "";
  const mesi = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${mesi[parseInt(m)-1]} ${y}`;
};

// ── FACTORY ──────────────────────────────────────────────────
const mkCriticita = () => ({
  id: uid(),
  livello: "MEDIA",
  titolo: "",
  tipo_reiterazione: "NESSUNA",
  data_reiterato: "",
  descrizione: "",
  riferimenti: "",
  misure: [""],
  foto: [],
});
const mkReparto = () => ({
  id: uid(),
  nome: "",
  criticita: [mkCriticita()],
  aperto: true,
});
const mkSopralluogo = () => ({
  destinatario: "",
  indirizzo_destinatario: "",
  data_sopralluogo: oggi(),
  data_redazione: oggi(),
  is_aggiornamento: false,
  data_relazione_precedente: "",
  tipologia_destinatario: "privato", // "pubblico" | "privato"
  tecnici: [{ nome: "Dott. Falchi Giancarlo", ruolo: "Consulente esterno in materia di Igiene e Sicurezza" }],
  reparti: [mkReparto()],
  raccomandazioni_finali: [],
});

// ── API CLAUDE ───────────────────────────────────────────────
async function callAI(prompt) {
  const k = getApiKey();
  if (!k) throw new Error("APIKEY_MISSING");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": k,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`API ${r.status}: ${t.slice(0,200)}`);
  }
  const data = await r.json();
  return data.content?.find(b => b.type === "text")?.text || "";
}

// ── COMPONENTI BASE ──────────────────────────────────────────
const Btn = ({ children, onClick, variant="primary", icon, full, sz="md", disabled }) => {
  const sty = {
    primary:   { bg: T.accent, color: "#fff", border: T.accent },
    ghost:     { bg: "transparent", color: T.ink, border: T.border },
    danger:    { bg: T.redBg, color: T.red, border: T.red },
    success:   { bg: T.greenBg, color: T.green, border: T.green },
    soft:      { bg: T.paper, color: T.ink, border: T.border },
  }[variant];
  const pad = sz === "sm" ? "6px 10px" : sz === "lg" ? "12px 16px" : "9px 14px";
  const fs  = sz === "sm" ? 12 : sz === "lg" ? 14 : 13;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
        background: sty.bg, color: sty.color, border:`1px solid ${sty.border}`,
        padding: pad, borderRadius: 8, fontSize: fs, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        width: full ? "100%" : "auto", fontFamily: "inherit",
      }}>
      {icon}{children}
    </button>
  );
};

const Field = ({ label, children, hint }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display:"block", fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>}
    {children}
    {hint && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{hint}</div>}
  </div>
);

const Input = (props) => (
  <input {...props} style={{
    width: "100%", padding: "9px 11px", border: `1px solid ${T.border}`,
    borderRadius: 7, fontSize: 14, fontFamily: "inherit", background: "#fff",
    boxSizing: "border-box", ...(props.style||{})
  }} />
);

const Textarea = (props) => (
  <textarea {...props} style={{
    width: "100%", padding: "9px 11px", border: `1px solid ${T.border}`,
    borderRadius: 7, fontSize: 14, fontFamily: "inherit", background: "#fff",
    boxSizing: "border-box", resize: "vertical", minHeight: 70, ...(props.style||{})
  }} />
);

const Select = (props) => (
  <select {...props} style={{
    width: "100%", padding: "9px 11px", border: `1px solid ${T.border}`,
    borderRadius: 7, fontSize: 14, fontFamily: "inherit", background: "#fff",
    boxSizing: "border-box", ...(props.style||{})
  }} />
);

const Badge = ({ children, color = "ink", bg }) => {
  const colors = { red: T.red, orange: T.orange, green: T.green, ink: T.ink, muted: T.muted };
  const bgs    = { red: T.redBg, orange: T.orangeBg, green: T.greenBg, ink: T.bg, muted: T.bg };
  return (
    <span style={{
      background: bg || bgs[color], color: colors[color], padding: "2px 8px",
      borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap"
    }}>{children}</span>
  );
};

// ── CRITICITÀ CARD ───────────────────────────────────────────
function CriticitaCard({ nc, onChange, onDelete, idx }) {
  const [open, setOpen] = useState(true);
  const fileRef = useRef();
  const L = lvlInfo(nc.livello);

  const upd = (k, v) => onChange({ ...nc, [k]: v });
  const updMisura = (i, v) => {
    const m = [...nc.misure]; m[i] = v; upd("misure", m);
  };
  const addMisura = () => upd("misure", [...nc.misure, ""]);
  const delMisura = (i) => upd("misure", nc.misure.filter((_, j) => j !== i));

  const onFoto = (e) => {
    const files = Array.from(e.target.files || []);
    Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res({ id: uid(), data: r.result, name: f.name });
      r.readAsDataURL(f);
    }))).then(imgs => upd("foto", [...nc.foto, ...imgs]));
    e.target.value = "";
  };
  const delFoto = (id) => upd("foto", nc.foto.filter(f => f.id !== id));

  const aiSuggerisciDescr = async () => {
    if (!nc.titolo) { alert("Inserisci prima un titolo per la criticità."); return; }
    try {
      const prompt = `Sei un consulente RSPP italiano. Per la criticità di sicurezza intitolata "${nc.titolo}" di livello ${nc.livello}, scrivi una descrizione tecnica oggettiva di 2-4 frasi nel registro formale dei verbali di sopralluogo (D.Lgs. 81/08). Usa formule come "Durante il sopralluogo è stato rilevato..." oppure "È stata riscontrata la presenza di...". Specifica DOVE, COSA, PERCHÉ è un rischio. Solo il testo della descrizione, nient'altro.`;
      const txt = await callAI(prompt);
      upd("descrizione", txt.trim());
    } catch (e) {
      if (e.message === "APIKEY_MISSING") alert("Configura la chiave API nelle impostazioni.");
      else alert("Errore IA: " + e.message);
    }
  };

  const aiSuggerisciMisure = async () => {
    if (!nc.titolo && !nc.descrizione) { alert("Compila prima titolo o descrizione."); return; }
    try {
      const prompt = `Sei un consulente RSPP italiano. Per la criticità "${nc.titolo}" (livello ${nc.livello}) con descrizione "${nc.descrizione || "—"}", elenca da 3 a 6 misure correttive concrete da inserire dopo "Si dispone pertanto quanto segue:" nel verbale di sopralluogo (D.Lgs. 81/08). Una misura per riga, NON numerare, NON usare bullet o trattini iniziali. Tono imperativo formale ("Installare", "Predisporre", "Verificare").`;
      const txt = await callAI(prompt);
      const righe = txt.split("\n").map(s => s.replace(/^[\-\*\d\.\)]+\s*/, "").trim()).filter(Boolean);
      upd("misure", righe.length ? righe : nc.misure);
    } catch (e) {
      if (e.message === "APIKEY_MISSING") alert("Configura la chiave API nelle impostazioni.");
      else alert("Errore IA: " + e.message);
    }
  };

  const aiRiferimenti = async () => {
    if (!nc.titolo && !nc.descrizione) { alert("Compila prima titolo o descrizione."); return; }
    try {
      const prompt = `Per la criticità "${nc.titolo}" - "${nc.descrizione || ""}", indica i riferimenti normativi italiani applicabili (D.Lgs. 81/08 articoli, allegati, norme UNI/CEI, decreti ministeriali). Una sola riga sintetica, formato: "D.Lgs. 81/08 art. X - Allegato Y - UNI EN ZZZZ". Solo i riferimenti, niente altro.`;
      const txt = await callAI(prompt);
      upd("riferimenti", txt.trim().replace(/^["']|["']$/g, ""));
    } catch (e) {
      if (e.message === "APIKEY_MISSING") alert("Configura la chiave API nelle impostazioni.");
      else alert("Errore IA: " + e.message);
    }
  };

  return (
    <div style={{
      border: `2px solid ${L.color}`, borderRadius: 10, marginBottom: 12, background: "#fff",
      overflow: "hidden",
    }}>
      <div onClick={() => setOpen(!open)} style={{
        background: L.bg, padding: "10px 12px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {open ? <ChevronDown size={16} style={{ color: L.color }} /> : <ChevronRight size={16} style={{ color: L.color }} />}
        <span style={{ fontSize: 11, fontWeight: 800, color: L.color, letterSpacing: 0.5 }}>
          #{idx+1} · {L.label.split(" ")[1]}
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {nc.titolo || <em style={{ color: T.muted, fontWeight: 400 }}>(senza titolo)</em>}
        </span>
        {nc.tipo_reiterazione !== "NESSUNA" && <Badge color="orange">REIT</Badge>}
        {nc.foto.length > 0 && <Badge color="muted">{nc.foto.length}📷</Badge>}
      </div>

      {open && (
        <div style={{ padding: 12 }}>
          <Field label="Livello criticità">
            <Select value={nc.livello} onChange={e => upd("livello", e.target.value)}>
              {LIVELLI.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
            </Select>
          </Field>

          <Field label="Titolo (MAIUSCOLO, breve, con azione)">
            <Input
              value={nc.titolo}
              onChange={e => upd("titolo", e.target.value.toUpperCase())}
              placeholder="ES. SCALA NON CONFORME DA ELIMINARE"
            />
          </Field>

          <Field label="Reiterazione">
            <Select value={nc.tipo_reiterazione} onChange={e => upd("tipo_reiterazione", e.target.value)}>
              {REITER.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
            </Select>
          </Field>

          {nc.tipo_reiterazione !== "NESSUNA" && (
            <Field label="Data verbale precedente (per la dicitura)">
              <Input type="date" value={nc.data_reiterato} onChange={e => upd("data_reiterato", e.target.value)} />
            </Field>
          )}

          <Field label="Descrizione tecnica">
            <Textarea
              value={nc.descrizione}
              onChange={e => upd("descrizione", e.target.value)}
              placeholder="Durante il sopralluogo è stato rilevato..."
            />
            <div style={{ marginTop: 4 }}>
              <Btn variant="soft" sz="sm" icon={<Sparkles size={12} />} onClick={aiSuggerisciDescr}>Genera con IA</Btn>
            </div>
          </Field>

          <Field label="Riferimenti normativi">
            <Input
              value={nc.riferimenti}
              onChange={e => upd("riferimenti", e.target.value)}
              placeholder="D.Lgs. 81/08 art. X - UNI EN ..."
            />
            <div style={{ marginTop: 4 }}>
              <Btn variant="soft" sz="sm" icon={<Sparkles size={12} />} onClick={aiRiferimenti}>Suggerisci con IA</Btn>
            </div>
          </Field>

          <Field label="Misure (Si dispone pertanto quanto segue)">
            {nc.misure.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 13, color: T.muted, paddingTop: 9, minWidth: 18 }}>{i+1}.</div>
                <Textarea
                  value={m}
                  onChange={e => updMisura(i, e.target.value)}
                  placeholder="Es. Installare immediatamente..."
                  style={{ minHeight: 50, flex: 1 }}
                />
                {nc.misure.length > 1 && (
                  <button onClick={() => delMisura(i)} style={{
                    background: "transparent", border: "none", color: T.muted, cursor: "pointer", padding: 4
                  }}><Trash2 size={14} /></button>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <Btn variant="soft" sz="sm" icon={<Plus size={12} />} onClick={addMisura}>Aggiungi</Btn>
              <Btn variant="soft" sz="sm" icon={<Sparkles size={12} />} onClick={aiSuggerisciMisure}>Genera con IA</Btn>
            </div>
          </Field>

          <Field label={`Foto (${nc.foto.length})`}>
            {nc.foto.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6, marginBottom: 8 }}>
                {nc.foto.map(f => (
                  <div key={f.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
                    <img src={f.data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => delFoto(f.id)} style={{
                      position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.7)",
                      color: "#fff", border: "none", borderRadius: 4, width: 22, height: 22, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={onFoto} style={{ display: "none" }} />
            <Btn variant="soft" sz="sm" icon={<Camera size={13} />} onClick={() => fileRef.current?.click()}>Scatta / Aggiungi foto</Btn>
          </Field>

          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 8, textAlign: "right" }}>
            <Btn variant="danger" sz="sm" icon={<Trash2 size={12} />} onClick={onDelete}>Elimina criticità</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── REPARTO CARD ─────────────────────────────────────────────
function RepartoCard({ r, onChange, onDelete, idx }) {
  const upd = (k, v) => onChange({ ...r, [k]: v });
  const updNC = (id, nc) => upd("criticita", r.criticita.map(c => c.id === id ? nc : c));
  const delNC = (id)   => upd("criticita", r.criticita.filter(c => c.id !== id));
  const addNC = ()     => upd("criticita", [...r.criticita, mkCriticita()]);

  const stats = { e: 0, m: 0, l: 0 };
  r.criticita.forEach(c => {
    if (c.livello === "ELEVATA") stats.e++;
    else if (c.livello === "MEDIA") stats.m++;
    else stats.l++;
  });

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
      marginBottom: 14, overflow: "hidden",
    }}>
      <div style={{ padding: 12, borderBottom: r.aperto ? `1px solid ${T.border}` : "none", background: T.paper }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <button onClick={() => upd("aperto", !r.aperto)} style={{
            background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex"
          }}>
            {r.aperto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.accent, letterSpacing: 0.5 }}>REPARTO #{idx+1}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {stats.e > 0 && <Badge color="red">{stats.e}🔴</Badge>}
            {stats.m > 0 && <Badge color="orange">{stats.m}🟠</Badge>}
            {stats.l > 0 && <Badge color="green">{stats.l}🟢</Badge>}
          </div>
        </div>
        <Input
          list={`reparti-${r.id}`}
          value={r.nome}
          onChange={e => upd("nome", e.target.value.toUpperCase())}
          placeholder="NOME REPARTO (MAIUSCOLO)"
          style={{ fontWeight: 700 }}
        />
        <datalist id={`reparti-${r.id}`}>
          {REPARTI_SUGG.map(s => <option key={s} value={s} />)}
        </datalist>
      </div>

      {r.aperto && (
        <div style={{ padding: 12 }}>
          {r.criticita.map((c, i) => (
            <CriticitaCard
              key={c.id} nc={c} idx={i}
              onChange={nc => updNC(c.id, nc)}
              onDelete={() => delNC(c.id)}
            />
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" icon={<Plus size={14} />} onClick={addNC} full>Aggiungi criticità</Btn>
            <Btn variant="danger" sz="md" icon={<Trash2 size={14} />} onClick={onDelete}>Reparto</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MODALE IMPOSTAZIONI IA ───────────────────────────────────
function ModalSettings({ onClose }) {
  const [k, setK] = useState(getApiKey());
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 20, maxWidth: 480, width: "100%",
        maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Impostazioni IA</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
          Le funzioni IA usano l'API Anthropic. La chiave si salva solo nel tuo browser.
          Ottienila gratis su <code style={{ background: T.bg, padding: "1px 5px", borderRadius: 3 }}>console.anthropic.com</code>.
        </p>
        <Field label="API Key (sk-ant-...)">
          <Input value={k} onChange={e => setK(e.target.value)} placeholder="sk-ant-..." type="password" />
        </Field>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="primary" full onClick={() => { setApiKey(k); onClose(); }}>Salva</Btn>
          <Btn variant="ghost" onClick={() => { setApiKey(""); setK(""); }}>Rimuovi</Btn>
        </div>
      </div>
    </div>
  );
}

// ── GENERAZIONE HTML VERBALE ─────────────────────────────────
function generaHTML(S) {
  const banner = (nc) => {
    if (nc.tipo_reiterazione === "NESSUNA") return "";
    const data = nc.data_reiterato ? ggMmYyyy(nc.data_reiterato) : (S.data_relazione_precedente ? ggMmYyyy(S.data_relazione_precedente) : "");
    let testo = "⚠ RILIEVO REITERATO";
    if (nc.tipo_reiterazione === "ESTESO")    testo = `⚠ RILIEVO REITERATO – Criticità già segnalata${data ? " nella Relazione del " + data : ""} e non risolta.`;
    if (nc.tipo_reiterazione === "AGGRAVATO") testo = "⚠ RILIEVO REITERATO E AGGRAVATO";
    if (nc.tipo_reiterazione === "PARZIALE")  testo = "⚠ RILIEVO REITERATO PARZIALMENTE";
    return `<div class="banner">${testo}</div>`;
  };

  const fotoHtml = (foto) => {
    if (!foto || !foto.length) return "";
    return `<div class="foto-grid">${foto.map(f => `<img src="${f.data}" alt="" />`).join("")}</div>`;
  };

  const totale = S.reparti.reduce((s, r) => s + r.criticita.length, 0);
  const cnt = { ELEVATA: 0, MEDIA: 0, LIEVE: 0 };
  S.reparti.forEach(r => r.criticita.forEach(c => cnt[c.livello]++));

  const tecnici = S.tecnici.length > 1 ? "i sottoscritti" : "il sottoscritto";
  const verbo   = S.tecnici.length > 1 ? "hanno" : "ha";
  const nomi    = S.tecnici.map(t => t.nome).join(", ");
  const ruoli   = S.tecnici[0]?.ruolo || "Consulente esterno in materia di Igiene e Sicurezza";
  const dataLunga = `L'anno ${S.data_sopralluogo.slice(0,4)} addì ${parseInt(S.data_sopralluogo.slice(8,10))} del mese di ${["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"][parseInt(S.data_sopralluogo.slice(5,7))-1]}`;

  let oggetto = `Relazione sopralluogo dello staff tecnico della Ichnossicurezza s.r.l. del ${dataEstesa(S.data_sopralluogo)}`;
  if (S.is_aggiornamento && S.data_relazione_precedente) {
    oggetto += ` – Aggiornamento alla precedente Relazione del ${dataEstesa(S.data_relazione_precedente)}.`;
  } else { oggetto += "."; }

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Relazione Sopralluogo - ${S.destinatario}</title>
<style>
  @page { size: A4; margin: 2cm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #000; max-width: 21cm; margin: 0 auto; padding: 1.5cm 1cm; background: #fff; }
  .header { text-align: center; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #999; }
  .header h1 { font-size: 16pt; margin: 0 0 4px; }
  .header .sub { font-size: 9pt; color: #555; }
  .spett { margin: 16px 0; }
  .spett .lbl { font-size: 10pt; color: #555; }
  .spett .dest { font-weight: bold; font-size: 12pt; margin: 4px 0; }
  .oggetto { margin: 16px 0; text-align: justify; }
  h2.sez { font-size: 13pt; text-align: center; margin: 24px 0 12px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
  .legenda { display: flex; gap: 8px; margin: 12px 0; }
  .legenda > div { flex: 1; padding: 10px; text-align: center; border-radius: 4px; border: 1px solid; }
  .leg-r { background: #fde8e8; border-color: #b91c1c; color: #b91c1c; }
  .leg-o { background: #fef3c7; border-color: #d97706; color: #d97706; }
  .leg-v { background: #d1fae5; border-color: #15803d; color: #15803d; }
  .leg b { display: block; font-size: 11pt; }
  .leg span { font-size: 9pt; font-style: italic; }
  .reparto-h { background: #4472C4; color: #fff; padding: 8px 12px; font-weight: bold; margin: 20px 0 0; border-radius: 4px 4px 0 0; }
  .reparto-b { border: 1px solid #ccc; border-top: none; padding: 12px; border-radius: 0 0 4px 4px; }
  .nc { margin-bottom: 18px; border-left: 4px solid; padding-left: 12px; page-break-inside: avoid; }
  .nc.ELEVATA { border-color: #b91c1c; }
  .nc.MEDIA   { border-color: #d97706; }
  .nc.LIEVE   { border-color: #15803d; }
  .nc h3 { font-size: 11pt; margin: 0 0 6px; text-transform: uppercase; }
  .nc h3 .lvl { font-size: 9pt; padding: 2px 6px; border-radius: 3px; margin-right: 6px; }
  .lvl.ELEVATA { background: #fde8e8; color: #b91c1c; }
  .lvl.MEDIA   { background: #fef3c7; color: #d97706; }
  .lvl.LIEVE   { background: #d1fae5; color: #15803d; }
  .banner { background: #fef3c7; color: #b45309; border: 1px solid #b45309; padding: 4px 8px; font-size: 9.5pt; font-weight: bold; margin: 4px 0 8px; border-radius: 3px; }
  .descr { text-align: justify; margin: 4px 0 8px; }
  .rif { font-style: italic; font-size: 9.5pt; color: #444; margin: 4px 0 8px; }
  .misure { background: #fafafa; border: 1px solid #eee; padding: 8px 8px 8px 28px; margin: 6px 0; }
  .misure .lbl { font-weight: bold; margin-bottom: 4px; margin-left: -16px; }
  .misure ol { margin: 0; padding-left: 16px; }
  .misure li { margin-bottom: 4px; }
  .foto-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 8px 0; }
  .foto-grid img { width: 100%; height: auto; max-height: 120px; object-fit: cover; border: 1px solid #ccc; border-radius: 3px; }
  .riepilogo { margin-top: 30px; border: 1px solid #ccc; border-radius: 4px; padding: 12px; background: #fafafa; }
  .riepilogo h3 { margin: 0 0 8px; font-size: 12pt; }
  .stats { display: flex; gap: 12px; }
  .stats > div { flex: 1; text-align: center; padding: 8px; border-radius: 4px; }
  .firma { margin-top: 50px; text-align: right; }
  .firma .ruolo { font-size: 10pt; color: #555; }
  .firma .nome { font-weight: bold; }
  .nota-finale { margin-top: 24px; font-style: italic; font-size: 9.5pt; color: #444; text-align: justify; }
  @media print { .no-print { display: none !important; } }
</style></head>
<body>

<div class="no-print" style="position:sticky;top:0;background:#1a1614;color:#fff;padding:12px;border-radius:6px;margin-bottom:20px;text-align:center">
  <button onclick="window.print()" style="background:#b91c1c;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer">🖨️ Stampa / Salva come PDF</button>
  <span style="margin-left:12px;font-size:12px;opacity:0.7">Usa "Salva come PDF" nella finestra di stampa</span>
</div>

<div class="header">
  <h1>ICHNOSSICUREZZA S.R.L</h1>
  <div class="sub">Zona Ind.le Predda Niedda St. 18 bis - 07100 (SS) — P.IVA 02754010905</div>
  <div class="sub">info@ichnossicurezza.it · www.ichnossicurezza.it · Tel 079/4136984</div>
</div>

<div class="spett">
  <div class="lbl">Spett.le</div>
  <div class="dest">${S.destinatario}</div>
  <div>${S.indirizzo_destinatario}</div>
</div>

<div class="oggetto"><b>Oggetto:</b> ${oggetto}</div>

<h2 class="sez">PREMESSA</h2>
<p>La seguente relazione viene redatta dal ${S.tecnici[S.tecnici.length-1].nome}, Agrotecnico laureato in tecniche della prevenzione nell'ambiente e nei luoghi di lavoro, ${ruoli} del ${S.destinatario}.</p>
<p>Il sottoscritto, al fine di verificare l'applicazione delle disposizioni in materia di igiene e sicurezza del lavoro, ha eseguito gli opportuni accertamenti, e dopo aver effettuato un sopralluogo in loco, ha redatto il seguente documento.</p>
${S.is_aggiornamento ? `<p>La presente relazione costituisce aggiornamento alla Relazione di Sopralluogo del ${dataEstesa(S.data_relazione_precedente)}, con verifica dello stato di attuazione delle prescrizioni precedentemente impartite ed individuazione di ulteriori criticità riscontrate.</p>` : ""}
<p>La stima delle criticità riscontrate è stata eseguita nel modo più obbiettivo possibile, con classificazione mediante sistema semaforico (Rosso – Elevato, Arancione – Medio, Verde – Lieve).</p>

<h2 class="sez">ATTESTAZIONE DI RESPONSABILITÀ</h2>
<p style="text-align:center;font-weight:bold">ATTESTA SOTTO LA PROPRIA PERSONALE RESPONSABILITÀ</p>
<p style="text-align:center;font-style:italic">quanto segue:</p>
<p>${dataLunga} ${tecnici} ${nomi}, ${ruoli}, ${verbo} effettuato una visita nei luoghi di lavoro di pertinenza al fine di verificare lo stato di fatto di alcuni aspetti organizzativo-tecnici, igienico-sanitari degli ambienti in esame oltre che l'applicazione delle disposizioni in materia di igiene e sicurezza del lavoro.</p>
<p>La verifica è stata eseguita attraverso la presa visione diretta delle strutture e dei vari ambienti.</p>
<p>Sassari, ${ggMmYyyy(S.data_redazione)}</p>

<h2 class="sez">LEGENDA LIVELLI DI CRITICITÀ</h2>
<div class="legenda">
  <div class="leg-r leg"><b>● ROSSO – ELEVATO</b><span>Intervento urgente e inderogabile</span></div>
  <div class="leg-o leg"><b>● ARANCIONE – MEDIO</b><span>Intervento a breve termine</span></div>
  <div class="leg-v leg"><b>● VERDE – LIEVE</b><span>Intervento di miglioramento</span></div>
</div>

${S.reparti.map((r, ri) => `
<div class="reparto-h">REPARTO: ${r.nome || "(senza nome)"}</div>
<div class="reparto-b">
${r.criticita.map((nc, ci) => `
<div class="nc ${nc.livello}">
  <h3><span class="lvl ${nc.livello}">${nc.livello}</span>${nc.titolo || "(senza titolo)"}</h3>
  ${banner(nc)}
  ${nc.descrizione ? `<div class="descr">${nc.descrizione}</div>` : ""}
  ${nc.riferimenti ? `<div class="rif"><b>Riferimenti normativi:</b> ${nc.riferimenti}</div>` : ""}
  ${nc.misure.filter(m => m.trim()).length > 0 ? `
  <div class="misure">
    <div class="lbl">Si dispone pertanto quanto segue:</div>
    <ol>${nc.misure.filter(m => m.trim()).map(m => `<li>${m}</li>`).join("")}</ol>
  </div>` : ""}
  ${fotoHtml(nc.foto)}
</div>
`).join("")}
</div>
`).join("")}

<div class="riepilogo">
  <h3>Riepilogo criticità rilevate</h3>
  <div class="stats">
    <div style="background:#fde8e8;color:#b91c1c"><b style="font-size:18pt">${cnt.ELEVATA}</b><br>🔴 ELEVATE</div>
    <div style="background:#fef3c7;color:#d97706"><b style="font-size:18pt">${cnt.MEDIA}</b><br>🟠 MEDIE</div>
    <div style="background:#d1fae5;color:#15803d"><b style="font-size:18pt">${cnt.LIEVE}</b><br>🟢 LIEVI</div>
    <div style="background:#eee"><b style="font-size:18pt">${totale}</b><br>TOTALE</div>
  </div>
</div>

<p class="nota-finale">Si ricorda che la presente Relazione costituisce strumento di supporto al Datore di Lavoro per l'adempimento degli obblighi previsti dalla normativa vigente in materia di salute e sicurezza nei luoghi di lavoro. L'attuazione delle prescrizioni indicate è di competenza del Datore di Lavoro, che ne risponde direttamente. Si resta a disposizione per ogni eventuale chiarimento.</p>

<div class="firma">
${S.tecnici.map(t => `<div style="margin-bottom:24px"><div class="ruolo">${t.ruolo}</div><div class="nome">${t.nome}</div><br><div>Firma: _____________________</div></div>`).join("")}
</div>

</body></html>`;
}

// ── APP PRINCIPALE ───────────────────────────────────────────
export default function App() {
  const [S, setS] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showApri, setShowApri] = useState(true);

  useEffect(() => {
    const d = carica();
    if (d) setS(d);
  }, []);

  useEffect(() => {
    if (S) salva(S);
  }, [S]);

  const upd  = (k, v) => setS({ ...S, [k]: v });
  const updT = (i, k, v) => {
    const t = [...S.tecnici]; t[i] = { ...t[i], [k]: v }; upd("tecnici", t);
  };
  const addT = () => upd("tecnici", [...S.tecnici, { nome: "", ruolo: "" }]);
  const delT = (i) => upd("tecnici", S.tecnici.filter((_, j) => j !== i));

  const updR = (id, r) => upd("reparti", S.reparti.map(x => x.id === id ? r : x));
  const delR = (id)    => upd("reparti", S.reparti.filter(x => x.id !== id));
  const addR = ()      => upd("reparti", [...S.reparti, mkReparto()]);

  const nuovo = () => {
    if (S && !confirm("Sei sicuro? I dati attuali andranno persi (se non hai esportato il verbale).")) return;
    setS(mkSopralluogo());
    setShowApri(false);
  };
  const continua = () => { setShowApri(false); };

  const apriVerbale = () => {
    const html = generaHTML(S);
    const w = window.open("", "_blank");
    if (!w) { alert("Il browser ha bloccato la finestra. Consenti i popup."); return; }
    w.document.write(html);
    w.document.close();
  };

  const esportaJSON = () => {
    const json = {
      destinatario: S.destinatario,
      indirizzo_destinatario: S.indirizzo_destinatario,
      data_sopralluogo_estesa: dataEstesa(S.data_sopralluogo),
      data_sopralluogo_lunga: (() => {
        const mesi = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
        const [y, m, d] = S.data_sopralluogo.split("-");
        const giorni = ["zero","uno","due","tre","quattro","cinque","sei","sette","otto","nove","dieci","undici","dodici","tredici","quattordici","quindici","sedici","diciassette","diciotto","diciannove","venti","ventuno","ventidue","ventitre","ventiquattro","venticinque","ventisei","ventisette","ventotto","ventinove","trenta","trentuno"];
        return `L'anno ${y} addì ${giorni[parseInt(d)] || parseInt(d)} del mese di ${mesi[parseInt(m)-1]}`;
      })(),
      data_redazione: `Sassari, ${ggMmYyyy(S.data_redazione)}`,
      is_aggiornamento: S.is_aggiornamento,
      data_relazione_precedente: S.data_relazione_precedente ? dataEstesa(S.data_relazione_precedente) : "",
      ruolo_tecnico: S.tecnici[0]?.ruolo || "",
      tecnici: S.tecnici,
      reparti: S.reparti.map(r => ({
        nome: r.nome,
        criticita: r.criticita.map(c => ({
          livello: c.livello,
          titolo: c.titolo,
          tipo_reiterazione: c.tipo_reiterazione,
          data_reiterato: c.data_reiterato ? dataEstesa(c.data_reiterato) : undefined,
          descrizione: c.descrizione,
          riferimenti: c.riferimenti,
          misure: c.misure.filter(m => m.trim()),
          foto: [], // foto base64 troppo pesanti per JSON skill
        })),
      })),
      raccomandazioni_finali: S.raccomandazioni_finali || [],
    };
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verbale_${(S.destinatario || "sopralluogo").replace(/\s+/g, "_")}_${S.data_sopralluogo}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── SCHERMATA INIZIALE ───────────────────────────────────
  if (!S || showApri) {
    const esistente = carica();
    return (
      <div style={{ minHeight: "100vh", background: T.bg, padding: "20px 16px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32, paddingTop: 20 }}>
            <Shield size={48} style={{ color: T.accent }} />
            <h1 style={{ fontSize: 22, margin: "12px 0 4px", color: T.ink }}>Sopralluoghi Sicurezza</h1>
            <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>ICHNOSSICUREZZA S.R.L. · D.Lgs. 81/08</p>
          </div>

          {esistente && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>SOPRALLUOGO IN CORSO</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{esistente.destinatario || "(senza destinatario)"}</div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
                Data: {ggMmYyyy(esistente.data_sopralluogo)} · {esistente.reparti.length} reparti · {esistente.reparti.reduce((s, r) => s + r.criticita.length, 0)} criticità
              </div>
              <Btn variant="primary" full icon={<ChevronRight size={14} />} onClick={continua}>Continua</Btn>
            </div>
          )}

          <Btn variant={esistente ? "ghost" : "primary"} full sz="lg" icon={<Plus size={16} />} onClick={nuovo}>
            Nuovo sopralluogo
          </Btn>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button onClick={() => setShowSettings(true)} style={{
              background: "transparent", border: "none", color: T.muted, fontSize: 12, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <Settings size={12} /> Impostazioni IA {getApiKey() ? "✓" : "(non configurata)"}
            </button>
          </div>

          {showSettings && <ModalSettings onClose={() => setShowSettings(false)} />}
        </div>
      </div>
    );
  }

  // ── EDITOR ───────────────────────────────────────────────
  const totC = S.reparti.reduce((s, r) => s + r.criticita.length, 0);
  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      {/* Header sticky */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10, background: T.ink, color: "#fff",
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
      }}>
        <button onClick={() => setShowApri(true)} style={{
          background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4
        }}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>Sopralluogo</div>
          <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {S.destinatario || "(nuovo)"}
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} style={{
          background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4
        }}><Settings size={18} /></button>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 16px 100px" }}>

        {/* DATI ANAGRAFICI */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, color: T.accent }}>📋 Dati del sopralluogo</h3>
          <Field label="Destinatario (azienda o ente)">
            <Input value={S.destinatario} onChange={e => upd("destinatario", e.target.value)} placeholder="DUO PC CALCESTRUZZI S.R.L." />
          </Field>
          <Field label="Indirizzo completo">
            <Input value={S.indirizzo_destinatario} onChange={e => upd("indirizzo_destinatario", e.target.value)} placeholder="Via .., snc - 07XXX Comune (SS)" />
          </Field>
          <Field label="Tipologia destinatario">
            <Select value={S.tipologia_destinatario} onChange={e => upd("tipologia_destinatario", e.target.value)}>
              <option value="privato">Privato (azienda/S.R.L./S.p.A.)</option>
              <option value="pubblico">Pubblico (Comune/Ente)</option>
            </Select>
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Field label="Data sopralluogo">
                <Input type="date" value={S.data_sopralluogo} onChange={e => upd("data_sopralluogo", e.target.value)} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Data redazione">
                <Input type="date" value={S.data_redazione} onChange={e => upd("data_redazione", e.target.value)} />
              </Field>
            </div>
          </div>
          <Field>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={S.is_aggiornamento} onChange={e => upd("is_aggiornamento", e.target.checked)} />
              È aggiornamento di un verbale precedente
            </label>
          </Field>
          {S.is_aggiornamento && (
            <Field label="Data verbale precedente">
              <Input type="date" value={S.data_relazione_precedente} onChange={e => upd("data_relazione_precedente", e.target.value)} />
            </Field>
          )}
        </div>

        {/* TECNICI */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, color: T.accent }}>👤 Tecnici firmatari</h3>
          {S.tecnici.map((t, i) => (
            <div key={i} style={{ background: T.paper, padding: 10, borderRadius: 8, marginBottom: 8, border: `1px solid ${T.border}` }}>
              <Field label={`Tecnico #${i+1} — Nome`}>
                <Input value={t.nome} onChange={e => updT(i, "nome", e.target.value)} placeholder="Dott. Falchi Giancarlo" />
              </Field>
              <Field label="Ruolo">
                <Input value={t.ruolo} onChange={e => updT(i, "ruolo", e.target.value)} placeholder="Consulente esterno..." />
              </Field>
              {S.tecnici.length > 1 && (
                <Btn variant="danger" sz="sm" icon={<Trash2 size={12} />} onClick={() => delT(i)}>Rimuovi tecnico</Btn>
              )}
            </div>
          ))}
          <Btn variant="ghost" sz="sm" icon={<Plus size={12} />} onClick={addT} full>Aggiungi tecnico</Btn>
        </div>

        {/* REPARTI */}
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: T.accent, padding: "0 4px" }}>
            🏭 Reparti e criticità ({totC})
          </h3>
          {S.reparti.map((r, i) => (
            <RepartoCard
              key={r.id} r={r} idx={i}
              onChange={x => updR(r.id, x)}
              onDelete={() => delR(r.id)}
            />
          ))}
          <Btn variant="primary" full sz="lg" icon={<Plus size={16} />} onClick={addR}>Aggiungi reparto</Btn>
        </div>

      </div>

      {/* Bottom bar azioni */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(247,244,239,0.97)",
        borderTop: `1px solid ${T.border}`, padding: "10px 16px", backdropFilter: "blur(8px)", zIndex: 20,
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", gap: 8 }}>
          <Btn variant="ghost" icon={<Download size={14} />} onClick={esportaJSON}>JSON</Btn>
          <Btn variant="primary" icon={<FileText size={14} />} onClick={apriVerbale} full>Genera verbale</Btn>
        </div>
      </div>

      {showSettings && <ModalSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
