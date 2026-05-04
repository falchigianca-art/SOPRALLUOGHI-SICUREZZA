import React, { useState, useEffect, useRef } from 'react';
import { Plus, Copy, Trash2, Camera, Sparkles, ChevronRight, ChevronDown, FileText, Building2, MapPin, ShieldAlert, Download, Mail, X, Edit3, Search, ArrowLeft, FolderTree, Wand2, Loader2, Settings, Key } from 'lucide-react';

// ============================================================
//  ARCHIVIO INTERNO PRECARICATO (modificabile)
// ============================================================
const ARCHIVIO_INIZIALE = {
  rischi: [
    'Elettrico', 'Incendio', 'Chimico', 'Biologico', 'Rumore', 'Vibrazioni',
    'Videoterminali (VDT)', 'Movimentazione manuale carichi', 'Ergonomico',
    'Caduta dall\'alto', 'Inciampo / scivolamento', 'Investimento',
    'Taglio / abrasione', 'Schiacciamento', 'Microclima', 'Illuminazione',
    'Atmosfere esplosive (ATEX)', 'Spazi confinati', 'Stress lavoro-correlato',
    'Lavori in quota', 'Attrezzature di lavoro', 'Macchine', 'Impianti',
    'Interferenze (DUVRI)', 'Emergenza ed evacuazione', 'Radiazioni ionizzanti',
    'Radiazioni ottiche artificiali', 'Campi elettromagnetici', 'Agenti cancerogeni'
  ],
  ambienti: [
    'Ufficio amministrativo', 'Ufficio tecnico', 'Sala riunioni', 'Reception',
    'Reparto produttivo', 'Magazzino', 'Officina', 'Laboratorio', 'Mensa',
    'Spogliatoi', 'Servizi igienici', 'Archivio', 'Locale tecnico',
    'Cabina elettrica', 'Centrale termica', 'Area carico/scarico', 'Cortile esterno'
  ],
  attrezzature: [
    'Computer / postazione VDT', 'Stampante multifunzione', 'Scaffalatura',
    'Carrello elevatore', 'Transpallet manuale', 'Trapano', 'Mola',
    'Sega circolare', 'Compressore', 'Quadro elettrico', 'Estintore',
    'Idrante UNI 45', 'Scala portatile', 'Trabattello'
  ],
  dpi: [
    'Casco di protezione', 'Occhiali di sicurezza', 'Visiera',
    'Otoprotettori', 'Mascherina FFP2/FFP3', 'Guanti antitaglio',
    'Guanti chimici', 'Scarpe di sicurezza S3', 'Imbracatura anticaduta',
    'Indumenti ad alta visibilità', 'Grembiule di protezione'
  ],
  misurePreventive: [
    'Formazione e informazione lavoratori (art. 36-37 D.Lgs. 81/08)',
    'Sorveglianza sanitaria',
    'Manutenzione periodica programmata',
    'Procedura operativa specifica',
    'Segnaletica di sicurezza conforme',
    'Limitazione accesso area',
    'Riduzione esposizione alla fonte'
  ],
  riferimentiNormativi: [
    'D.Lgs. 81/2008 - Testo Unico Sicurezza',
    'D.Lgs. 81/2008 art. 15 - Misure generali di tutela',
    'D.Lgs. 81/2008 art. 17 - Obblighi del datore di lavoro',
    'D.Lgs. 81/2008 Titolo III - Attrezzature di lavoro e DPI',
    'D.Lgs. 81/2008 Titolo VII - VDT',
    'D.Lgs. 81/2008 Titolo VIII - Agenti fisici',
    'D.M. 10/03/1998 - Sicurezza antincendio',
    'D.M. 02/09/2021 - Criteri antincendio luoghi di lavoro',
    'CEI 64-8 - Impianti elettrici',
    'UNI EN ISO 7010 - Segnaletica'
  ]
};

const ESITI = ['conforme', 'non conforme', 'da verificare', 'non applicabile'];
const STATI_NC = ['aperta', 'in corso', 'chiusa', 'verificata'];

// ============================================================
//  STORAGE (localStorage)
// ============================================================
const STORAGE_KEY = 'sopralluoghi_state_v1';
const API_KEY_STORAGE = 'sopralluoghi_api_key';

const loadState = () => {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};
const saveState = (state) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {
    console.warn('Storage pieno, foto troppe?', e);
  }
};

// ============================================================
//  IA — chiamata diretta all'API Groq (free tier) con chiave utente
//  Modello: llama-3.3-70b-versatile
// ============================================================
const callGroq = async (apiKey, prompt, maxTokens = 1000) => {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'Sei un RSPP/CSE italiano con 20 anni di esperienza in sopralluoghi di sicurezza sul lavoro (D.Lgs. 81/2008, decreti attuativi, norme CEI/UNI/EN). Scrivi sempre in italiano tecnico-professionale, sintetico, con terminologia precisa del settore. Eviti formulazioni generiche e banali. Quando viene chiesto un JSON, restituisci SOLO il JSON valido senza preamboli, spiegazioni o blocchi markdown.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
};

const migliorаConIA = async (apiKey, testo, contesto) => {
  if (!apiKey) throw new Error('Inserisci la tua chiave API in Impostazioni');
  const prompt = `Sei un RSPP che redige relazioni tecniche di sopralluogo. Riscrivi il testo dell'utente trasformandolo in una descrizione tecnica professionale.

REGOLE OBBLIGATORIE:
1. Usa terminologia tecnica del settore sicurezza (es. "esposizione" non "rischio per", "elemento osservato" non "cosa", "evidenza riscontrata" non "ho visto")
2. Aggiungi precisione: SE il testo originale è vago, deduci e specifica (es. "rotto" → "deteriorato con perdita di funzionalità")
3. Forma impersonale o passiva ("si rileva che...", "risulta assente...", "è stata constatata...")
4. NIENTE preamboli, NIENTE virgolette attorno alla risposta, NIENTE "Ecco il testo riscritto:"
5. Mantieni la lunghezza simile all'originale: NON espandere troppo
6. Cita riferimenti normativi (D.Lgs. 81/08, art. specifici) SOLO se chiaramente pertinenti
7. NON inventare fatti non presenti nel testo originale

CONTESTO DEL CAMPO: ${contesto}
TESTO ORIGINALE DELL'UTENTE: "${testo}"

Riscrivi adesso il testo migliorandolo:`;
  return await callGroq(apiKey, prompt, 800);
};

const suggerisciConIA = async (apiKey, tipo, contesto) => {
  if (!apiKey) throw new Error('Inserisci la tua chiave API in Impostazioni');
  const prompts = {
    rischi: `Sei un RSPP/CSE con 20 anni di esperienza. Stai analizzando un elemento osservato durante un sopralluogo aziendale.

ELEMENTO OSSERVATO: "${contesto}"

Genera 4-6 rischi SPECIFICI e CONCRETI riferiti proprio a quell'elemento, NON rischi generici. Ogni rischio deve descrivere una situazione di esposizione reale, citando il meccanismo di danno o le condizioni di pericolo.

ESEMPI di buona qualità (per altro elemento):
- Elemento "Quadro elettrico generale": ["Contatto diretto con parti in tensione per pannello frontale non chiudibile a chiave", "Innesco di incendio per surriscaldamento di morsetti allentati", "Arco elettrico per cortocircuito su componenti vetusti", "Folgorazione per assenza di interruttore differenziale a monte", "Esposizione a campi elettromagnetici per personale che opera in prossimità prolungata"]
- Elemento "Carrello elevatore": ["Investimento di pedoni per assenza di percorsi separati", "Ribaltamento per superamento della portata nominale", "Caduta del carico per assenza di forche bloccate", "Schiacciamento operatore tra carrello e scaffalatura", "Esposizione a vibrazioni trasmesse al corpo intero", "Inalazione di gas combusti in ambienti chiusi non ventilati"]

Restituisci SOLO un array JSON di stringhe, senza markdown, senza preamboli, senza numerazioni.

Genera adesso 4-6 rischi specifici per: "${contesto}"`,

    nonConformita: `Sei un RSPP/auditor di sistemi di gestione sicurezza. Stai documentando una non conformità dopo aver rilevato un rischio in sopralluogo.

RISCHIO RILEVATO: "${contesto}"

Genera 1-3 non conformità che TIPICAMENTE si riscontrano per questo rischio, con riferimento normativo PRECISO (D.Lgs. 81/08, decreti attuativi, norme tecniche CEI/UNI). Ogni descrizione deve indicare il difetto specifico, non genericità.

ESEMPIO buona qualità (per altro rischio):
Rischio "Caduta dall'alto" → [{"descrizione":"Assenza di parapetti normati su passerella sopraelevata, parametri non conformi (altezza < 1m, mancanza corrente intermedio e fascia fermapiede)","norma":"D.Lgs. 81/08 Allegato IV punto 1.7.2.1; UNI EN ISO 14122-3"},{"descrizione":"Utilizzo di scala portatile per lavori prolungati senza sistemi anticaduta o linea vita","norma":"D.Lgs. 81/08 art. 113 e art. 115"}]

Restituisci SOLO un array JSON di oggetti {"descrizione":"...","norma":"..."}, senza markdown, senza altro testo.

Genera adesso le non conformità per: "${contesto}"`,

    misurePreventive: `Sei un RSPP esperto. Devi proporre misure preventive e protettive PRATICHE, ATTUABILI e SPECIFICHE per il rischio osservato (NON frasi generiche tipo "informare i lavoratori").

RISCHIO: "${contesto}"

Genera 3-5 misure CONCRETE seguendo la gerarchia D.Lgs. 81/08 art. 15: 1) eliminazione del pericolo, 2) sostituzione, 3) misure tecniche/collettive, 4) misure organizzative/procedurali, 5) DPI come ultimo ricorso. Ogni misura deve essere attuabile e verificabile.

ESEMPIO buona qualità (per altro rischio):
Rischio "Esposizione a rumore in officina" → ["Sostituzione del compressore esistente con modello insonorizzato (LpA <80 dB(A))","Installazione di pannelli fonoassorbenti sulle pareti del locale compressori","Confinamento della sorgente con cabina insonorizzante e segnalazione di zona ad accesso limitato","Turnazione del personale per ridurre l'esposizione giornaliera al di sotto di 80 dB(A)","Fornitura di otoprotettori SNR≥27 dB con sorveglianza sanitaria audiometrica annuale"]

Restituisci SOLO un array JSON di stringhe, senza markdown, senza numerazioni, senza preamboli.

Genera adesso le misure per: "${contesto}"`
  };
  const text = await callGroq(apiKey, prompts[tipo], 1500);
  let clean = text.replace(/```json|```/g, '').trim();
  const match = clean.match(/\[[\s\S]*\]/);
  if (match) clean = match[0];
  try { return JSON.parse(clean); } catch { return []; }
};

// ============================================================
//  CONTEXT IA (per non passare apiKey ovunque)
// ============================================================
const IAContext = React.createContext({ apiKey: '', openSettings: () => {} });

// ============================================================
//  HELPERS
// ============================================================
const uid = () => Math.random().toString(36).slice(2, 10);
const oggi = () => new Date().toISOString().slice(0, 10);
const codiceNC = (i) => `NC-${String(i + 1).padStart(3, '0')}`;

// ============================================================
//  COMPONENTI UI BASE
// ============================================================
const Btn = ({ children, onClick, variant = 'default', size = 'md', icon: Icon, type = 'button', disabled, title }) => {
  const base = 'inline-flex items-center gap-2 font-medium transition-all border';
  const sizes = { sm: 'text-xs px-2.5 py-1.5', md: 'text-sm px-3.5 py-2', lg: 'text-base px-5 py-2.5' };
  const variants = {
    default: 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-900',
    primary: 'bg-stone-900 hover:bg-stone-800 border-stone-900 text-stone-50',
    danger: 'bg-white hover:bg-red-50 border-red-300 text-red-700',
    accent: 'bg-amber-50 hover:bg-amber-100 border-amber-400 text-amber-900',
    ghost: 'bg-transparent hover:bg-stone-100 border-transparent text-stone-700'
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      {Icon && <Icon size={size === 'sm' ? 13 : 15} strokeWidth={2} />}
      {children}
    </button>
  );
};

const Field = ({ label, children, hint, required }) => (
  <label className="block">
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-600">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {hint && <span className="text-[10px] text-stone-500">{hint}</span>}
    </div>
    {children}
  </label>
);

const Input = ({ value, onChange, ...rest }) => (
  <input value={value || ''} onChange={e => onChange(e.target.value)}
    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
    {...rest} />
);

const Textarea = ({ value, onChange, rows = 3, onIA, contesto, ...rest }) => {
  const { apiKey, openSettings } = React.useContext(IAContext);
  const [busy, setBusy] = useState(false);
  const handleIA = async () => {
    if (!value || busy) return;
    if (!apiKey) { openSettings(); return; }
    setBusy(true);
    try {
      const out = await migliorаConIA(apiKey, value, contesto || '');
      if (out) onChange(out);
    } catch (e) { alert('Errore IA: ' + e.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="relative">
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-2 text-sm bg-white border border-stone-300 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors resize-y"
        {...rest} />
      {onIA !== false && (
        <button type="button" onClick={handleIA} disabled={busy || !value}
          title="Migliora con IA"
          className="absolute bottom-2 right-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-400 text-amber-900 disabled:opacity-40 inline-flex items-center gap-1">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
          IA
        </button>
      )}
    </div>
  );
};

const Select = ({ value, onChange, options, placeholder }) => (
  <select value={value || ''} onChange={e => onChange(e.target.value)}
    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900">
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const Pill = ({ children, color = 'stone' }) => {
  const colors = {
    stone: 'bg-stone-100 text-stone-700 border-stone-300',
    red: 'bg-red-50 text-red-800 border-red-300',
    amber: 'bg-amber-50 text-amber-800 border-amber-300',
    green: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    blue: 'bg-sky-50 text-sky-800 border-sky-300',
    gray: 'bg-stone-50 text-stone-500 border-stone-300'
  };
  return <span className={`inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 border ${colors[color]}`}>{children}</span>;
};

const colorEsito = (e) => ({ 'conforme': 'green', 'non conforme': 'red', 'da verificare': 'amber', 'non applicabile': 'gray' }[e] || 'stone');
const colorStato = (s) => ({ 'aperta': 'red', 'in corso': 'amber', 'chiusa': 'blue', 'verificata': 'green' }[s] || 'stone');

// ============================================================
//  MODAL ARCHIVIO
// ============================================================
const ArchivioPicker = ({ open, onClose, lista, onSelect, titolo, onAdd }) => {
  const [q, setQ] = useState('');
  const [nuovo, setNuovo] = useState('');
  if (!open) return null;
  const filtrati = lista.filter(v => v.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-stone-50 w-full max-w-lg max-h-[80vh] flex flex-col border border-stone-900" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-stone-300 flex items-center justify-between">
          <h3 className="font-serif text-lg">{titolo}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-4 border-b border-stone-200">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca o digita per creare..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 focus:border-stone-900 focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtrati.map(v => (
            <button key={v} onClick={() => { onSelect(v); onClose(); }}
              className="w-full text-left px-5 py-2.5 text-sm hover:bg-stone-200 border-b border-stone-200">
              {v}
            </button>
          ))}
          {filtrati.length === 0 && <div className="p-5 text-sm text-stone-500 italic">Nessun risultato.</div>}
        </div>
        <div className="p-4 border-t border-stone-300 bg-stone-100 flex gap-2">
          <input value={nuovo} onChange={e => setNuovo(e.target.value)} placeholder="Aggiungi nuova voce..."
            className="flex-1 px-3 py-2 text-sm bg-white border border-stone-300 focus:border-stone-900 focus:outline-none" />
          <Btn variant="primary" size="sm" icon={Plus}
            onClick={() => { if (nuovo.trim()) { onAdd(nuovo.trim()); onSelect(nuovo.trim()); setNuovo(''); onClose(); } }}>
            Aggiungi
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ============================================================
//  FOTO con compressione (per non saturare localStorage)
// ============================================================
const compressImage = (file, maxDim = 1280, quality = 0.7) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else { width = Math.round(width * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = ev.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const FotoUploader = ({ foto, setFoto }) => {
  const inputRef = useRef();
  const [busy, setBusy] = useState(false);
  const handleFile = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        const data = await compressImage(f);
        setFoto(prev => [...prev, { id: uid(), data, commento: '', nome: f.name }]);
      }
    } catch (err) { alert('Errore caricamento foto: ' + err.message); }
    finally { setBusy(false); e.target.value = ''; }
  };
  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple
        className="hidden" onChange={handleFile} />
      <div className="flex flex-wrap gap-2">
        {foto.map(f => (
          <div key={f.id} className="relative w-24 h-24 group">
            <img src={f.data} alt="" className="w-full h-full object-cover border border-stone-300" />
            <button onClick={() => setFoto(prev => prev.filter(x => x.id !== f.id))}
              className="absolute top-0 right-0 p-1 bg-stone-900/80 text-white">
              <X size={11} />
            </button>
          </div>
        ))}
        <button onClick={() => inputRef.current?.click()} disabled={busy}
          className="w-24 h-24 border-2 border-dashed border-stone-400 hover:border-stone-900 hover:bg-stone-100 flex flex-col items-center justify-center text-stone-600 disabled:opacity-50">
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          <span className="text-[10px] mt-1 uppercase tracking-wider">Foto</span>
        </button>
      </div>
      {foto.map(f => (
        <div key={f.id + '-c'} className="mt-2">
          <input value={f.commento} onChange={e => setFoto(prev => prev.map(x => x.id === f.id ? { ...x, commento: e.target.value } : x))}
            placeholder={`Commento: ${f.nome}`}
            className="w-full px-2 py-1 text-xs bg-white border border-stone-200 focus:border-stone-900 focus:outline-none" />
        </div>
      ))}
    </div>
  );
};

// ============================================================
//  RISCHIO
// ============================================================
const RischioCard = ({ rischio, onChange, onDelete, onDuplicate, archivio, setArchivio, onAggiungiNC }) => {
  const { apiKey, openSettings } = React.useContext(IAContext);
  const [open, setOpen] = useState(true);
  const [pickerRischio, setPickerRischio] = useState(false);
  const [busySugg, setBusySugg] = useState(false);

  const set = (k, v) => onChange({ ...rischio, [k]: v });

  const suggerisciMisure = async () => {
    if (busySugg) return;
    if (!apiKey) { openSettings(); return; }
    setBusySugg(true);
    try {
      const sugg = await suggerisciConIA(apiKey, 'misurePreventive', `${rischio.tipologia}: ${rischio.descrizione}`);
      if (sugg.length > 0) {
        set('misuraPreventiva', (rischio.misuraPreventiva ? rischio.misuraPreventiva + '\n' : '') + sugg.slice(0, 2).join('\n'));
        if (sugg.length > 2) set('misuraProtettiva', sugg.slice(2).join('\n'));
      }
    } catch(e) { alert('Errore IA: ' + e.message); }
    finally { setBusySugg(false); }
  };

  return (
    <div className="border border-stone-300 bg-white">
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-stone-100 border-b border-stone-300 gap-2">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 flex-1 text-left min-w-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Pill color="red">Rischio</Pill>
          <span className="font-medium text-sm truncate">{rischio.tipologia || '— senza tipologia —'}</span>
          {rischio.esito && <Pill color={colorEsito(rischio.esito)}>{rischio.esito}</Pill>}
        </button>
        <div className="flex gap-1">
          <Btn size="sm" variant="ghost" icon={Copy} onClick={onDuplicate}>Duplica</Btn>
          <Btn size="sm" variant="danger" icon={Trash2} onClick={onDelete}>Elimina</Btn>
        </div>
      </div>
      {open && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Tipologia rischio">
              <div className="flex gap-2">
                <Input value={rischio.tipologia} onChange={v => set('tipologia', v)} placeholder="Scrivi o seleziona..." />
                <Btn size="sm" icon={FolderTree} onClick={() => setPickerRischio(true)}>Archivio</Btn>
              </div>
            </Field>
            <Field label="Esito">
              <Select value={rischio.esito} onChange={v => set('esito', v)} options={ESITI} placeholder="—" />
            </Field>
          </div>
          <Field label="Descrizione del rischio">
            <Textarea value={rischio.descrizione} onChange={v => set('descrizione', v)}
              contesto={`Rischio ${rischio.tipologia} in contesto sopralluogo sicurezza`} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Probabilità">
              <Select value={rischio.probabilita} onChange={v => set('probabilita', v)} options={['1 - Improbabile','2 - Poco probabile','3 - Probabile','4 - Molto probabile']} placeholder="—" />
            </Field>
            <Field label="Gravità">
              <Select value={rischio.gravita} onChange={v => set('gravita', v)} options={['1 - Lieve','2 - Modesta','3 - Grave','4 - Gravissima']} placeholder="—" />
            </Field>
            <Field label="Priorità" hint="P × G">
              <Input value={rischio.priorita} onChange={v => set('priorita', v)} placeholder="es. 6 - Media" />
            </Field>
          </div>
          <Field label="Evidenza riscontrata">
            <Textarea value={rischio.evidenza} onChange={v => set('evidenza', v)}
              contesto={`Evidenza del rischio ${rischio.tipologia}`} rows={2} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Misura preventiva">
              <Textarea value={rischio.misuraPreventiva} onChange={v => set('misuraPreventiva', v)}
                contesto={`Misura preventiva per rischio ${rischio.tipologia}`} rows={2} />
            </Field>
            <Field label="Misura protettiva">
              <Textarea value={rischio.misuraProtettiva} onChange={v => set('misuraProtettiva', v)}
                contesto={`Misura protettiva per rischio ${rischio.tipologia}`} rows={2} />
            </Field>
          </div>
          <Field label="Note">
            <Textarea value={rischio.note} onChange={v => set('note', v)} rows={2} contesto="Note tecniche di sopralluogo" />
          </Field>
          <Field label="Foto / evidenze fotografiche">
            <FotoUploader foto={rischio.foto || []} setFoto={(updater) => set('foto', typeof updater === 'function' ? updater(rischio.foto || []) : updater)} />
          </Field>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-200">
            <Btn size="sm" variant="accent" icon={Sparkles} onClick={suggerisciMisure} disabled={busySugg}>
              {busySugg ? 'Sto pensando...' : 'Suggerisci misure (IA)'}
            </Btn>
            <Btn size="sm" variant="primary" icon={ShieldAlert} onClick={onAggiungiNC}>Genera Non Conformità</Btn>
          </div>
        </div>
      )}
      <ArchivioPicker open={pickerRischio} onClose={() => setPickerRischio(false)}
        titolo="Archivio rischi" lista={archivio.rischi} onSelect={v => set('tipologia', v)}
        onAdd={v => setArchivio(a => ({ ...a, rischi: [...a.rischi, v] }))} />
    </div>
  );
};

// ============================================================
//  NON CONFORMITÀ
// ============================================================
const NCCard = ({ nc, indice, onChange, onDelete, archivio, setArchivio }) => {
  const [open, setOpen] = useState(true);
  const [pickerNorma, setPickerNorma] = useState(false);
  const set = (k, v) => onChange({ ...nc, [k]: v });
  return (
    <div className="border-2 border-red-300 bg-red-50/30">
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-red-100/60 border-b border-red-300 gap-2">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 flex-1 text-left min-w-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Pill color="red">{codiceNC(indice)}</Pill>
          <span className="font-medium text-sm truncate">{nc.descrizione || '— Non conformità senza descrizione —'}</span>
          <Pill color={colorStato(nc.stato)}>{nc.stato || 'aperta'}</Pill>
        </button>
        <Btn size="sm" variant="danger" icon={Trash2} onClick={onDelete}>Elimina</Btn>
      </div>
      {open && (
        <div className="p-4 space-y-3 bg-white">
          <Field label="Descrizione non conformità">
            <Textarea value={nc.descrizione} onChange={v => set('descrizione', v)}
              contesto="Descrizione di una non conformità in sopralluogo sicurezza" />
          </Field>
          <Field label="Riferimento normativo">
            <div className="flex gap-2">
              <Input value={nc.norma} onChange={v => set('norma', v)} placeholder="es. D.Lgs. 81/08 art. 71" />
              <Btn size="sm" icon={FolderTree} onClick={() => setPickerNorma(true)}>Archivio</Btn>
            </div>
          </Field>
          <Field label="Evidenza">
            <Textarea value={nc.evidenza} onChange={v => set('evidenza', v)} rows={2} contesto="Evidenza di non conformità" />
          </Field>
          <Field label="Misura correttiva">
            <Textarea value={nc.misuraCorrettiva} onChange={v => set('misuraCorrettiva', v)} contesto="Misura correttiva per non conformità" rows={2} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Responsabile">
              <Input value={nc.responsabile} onChange={v => set('responsabile', v)} placeholder="Nome / ruolo" />
            </Field>
            <Field label="Scadenza">
              <Input type="date" value={nc.scadenza} onChange={v => set('scadenza', v)} />
            </Field>
            <Field label="Stato">
              <Select value={nc.stato} onChange={v => set('stato', v)} options={STATI_NC} />
            </Field>
          </div>
          <Field label="Foto">
            <FotoUploader foto={nc.foto || []} setFoto={(u) => set('foto', typeof u === 'function' ? u(nc.foto || []) : u)} />
          </Field>
        </div>
      )}
      <ArchivioPicker open={pickerNorma} onClose={() => setPickerNorma(false)}
        titolo="Riferimenti normativi" lista={archivio.riferimentiNormativi} onSelect={v => set('norma', v)}
        onAdd={v => setArchivio(a => ({ ...a, riferimentiNormativi: [...a.riferimentiNormativi, v] }))} />
    </div>
  );
};

// ============================================================
//  ELEMENTO
// ============================================================
const ElementoCard = ({ elemento, onChange, onDelete, onDuplicate, archivio, setArchivio }) => {
  const { apiKey, openSettings } = React.useContext(IAContext);
  const [open, setOpen] = useState(true);
  const [pickerEl, setPickerEl] = useState(false);
  const [busySugg, setBusySugg] = useState(false);
  const set = (k, v) => onChange({ ...elemento, [k]: v });

  const aggiungiRischio = (tipologia = '') => {
    set('rischi', [...elemento.rischi, {
      id: uid(), tipologia, descrizione: '', esito: '', probabilita: '', gravita: '', priorita: '',
      evidenza: '', misuraPreventiva: '', misuraProtettiva: '', note: '', foto: [], nonConformita: []
    }]);
  };

  const suggerisciRischi = async () => {
    if (busySugg) return;
    if (!apiKey) { openSettings(); return; }
    setBusySugg(true);
    try {
      const sugg = await suggerisciConIA(apiKey, 'rischi', elemento.nome);
      const nuovi = sugg.map(s => ({
        id: uid(), tipologia: s, descrizione: '', esito: '', probabilita: '', gravita: '', priorita: '',
        evidenza: '', misuraPreventiva: '', misuraProtettiva: '', note: '', foto: [], nonConformita: []
      }));
      set('rischi', [...elemento.rischi, ...nuovi]);
    } catch(e) { alert('Errore IA: ' + e.message); }
    finally { setBusySugg(false); }
  };

  const aggiornaRischio = (id, nuovo) => set('rischi', elemento.rischi.map(r => r.id === id ? nuovo : r));
  const eliminaRischio = (id) => set('rischi', elemento.rischi.filter(r => r.id !== id));
  const duplicaRischio = (id) => {
    const r = elemento.rischi.find(x => x.id === id);
    set('rischi', [...elemento.rischi, { ...r, id: uid(), foto: [], nonConformita: [] }]);
  };
  const generaNCdaRischio = (idR) => {
    const r = elemento.rischi.find(x => x.id === idR);
    const nuovaNC = {
      id: uid(), rischioId: idR,
      descrizione: r.evidenza || r.descrizione || '',
      norma: '', evidenza: r.evidenza || '', misuraCorrettiva: r.misuraPreventiva || '',
      responsabile: '', scadenza: '', stato: 'aperta', foto: []
    };
    set('rischi', elemento.rischi.map(x => x.id === idR ? { ...x, nonConformita: [...(x.nonConformita || []), nuovaNC] } : x));
  };

  return (
    <div className="border border-stone-400 bg-stone-50">
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-stone-200 border-b border-stone-400 gap-2">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 flex-1 text-left min-w-0">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <Pill color="blue">Elemento</Pill>
          <span className="font-serif font-medium truncate">{elemento.nome || '— senza nome —'}</span>
          {elemento.rischi.length > 0 && <Pill>{elemento.rischi.length} rischi</Pill>}
        </button>
        <div className="flex gap-1">
          <Btn size="sm" variant="ghost" icon={Copy} onClick={onDuplicate}>Duplica</Btn>
          <Btn size="sm" variant="danger" icon={Trash2} onClick={onDelete}>Elimina</Btn>
        </div>
      </div>
      {open && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nome elemento osservato">
              <div className="flex gap-2">
                <Input value={elemento.nome} onChange={v => set('nome', v)} placeholder="es. Quadro elettrico generale" />
                <Btn size="sm" icon={FolderTree} onClick={() => setPickerEl(true)}>Archivio</Btn>
              </div>
            </Field>
            <Field label="Tipologia / categoria">
              <Input value={elemento.tipologia} onChange={v => set('tipologia', v)} placeholder="es. Impianto / Attrezzatura / Postazione" />
            </Field>
          </div>
          <Field label="Descrizione e osservazioni">
            <Textarea value={elemento.descrizione} onChange={v => set('descrizione', v)}
              contesto={`Elemento osservato: ${elemento.nome}`} rows={2} />
          </Field>
          <Field label="Foto">
            <FotoUploader foto={elemento.foto || []} setFoto={(u) => set('foto', typeof u === 'function' ? u(elemento.foto || []) : u)} />
          </Field>

          <div className="pt-3 border-t border-stone-300">
            <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
              <h4 className="font-serif text-sm uppercase tracking-wider">Rischi associati</h4>
              <div className="flex gap-2">
                <Btn size="sm" variant="accent" icon={Sparkles} onClick={suggerisciRischi} disabled={busySugg || !elemento.nome}>
                  {busySugg ? 'Sto pensando...' : 'Suggerisci con IA'}
                </Btn>
                <Btn size="sm" variant="primary" icon={Plus} onClick={() => aggiungiRischio()}>Aggiungi rischio</Btn>
              </div>
            </div>
            <div className="space-y-3">
              {elemento.rischi.map(r => (
                <div key={r.id}>
                  <RischioCard rischio={r}
                    onChange={(n) => aggiornaRischio(r.id, n)}
                    onDelete={() => eliminaRischio(r.id)}
                    onDuplicate={() => duplicaRischio(r.id)}
                    archivio={archivio} setArchivio={setArchivio}
                    onAggiungiNC={() => generaNCdaRischio(r.id)} />
                  {(r.nonConformita || []).length > 0 && (
                    <div className="ml-3 md:ml-6 mt-2 space-y-2 border-l-2 border-red-300 pl-3">
                      {r.nonConformita.map((nc, i) => (
                        <NCCard key={nc.id} nc={nc} indice={i}
                          onChange={(n) => aggiornaRischio(r.id, { ...r, nonConformita: r.nonConformita.map(x => x.id === nc.id ? n : x) })}
                          onDelete={() => aggiornaRischio(r.id, { ...r, nonConformita: r.nonConformita.filter(x => x.id !== nc.id) })}
                          archivio={archivio} setArchivio={setArchivio} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {elemento.rischi.length === 0 && (
                <div className="text-sm text-stone-500 italic py-3 text-center border border-dashed border-stone-300">
                  Nessun rischio rilevato. Aggiungi manualmente o suggerisci con IA.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <ArchivioPicker open={pickerEl} onClose={() => setPickerEl(false)}
        titolo="Archivio elementi / attrezzature" lista={archivio.attrezzature} onSelect={v => set('nome', v)}
        onAdd={v => setArchivio(a => ({ ...a, attrezzature: [...a.attrezzature, v] }))} />
    </div>
  );
};

// ============================================================
//  AMBIENTE
// ============================================================
const AmbienteCard = ({ ambiente, onChange, onDelete, onDuplicate, archivio, setArchivio }) => {
  const [open, setOpen] = useState(true);
  const [pickerAmb, setPickerAmb] = useState(false);
  const set = (k, v) => onChange({ ...ambiente, [k]: v });

  const aggiungiElemento = () => {
    set('elementi', [...ambiente.elementi, { id: uid(), nome: '', tipologia: '', descrizione: '', foto: [], rischi: [] }]);
  };
  const aggiornaEl = (id, n) => set('elementi', ambiente.elementi.map(e => e.id === id ? n : e));
  const eliminaEl = (id) => set('elementi', ambiente.elementi.filter(e => e.id !== id));
  const duplicaEl = (id) => {
    const e = ambiente.elementi.find(x => x.id === id);
    const dup = JSON.parse(JSON.stringify(e));
    dup.id = uid();
    dup.foto = [];
    dup.rischi = dup.rischi.map(r => ({ ...r, id: uid(), foto: [], nonConformita: [] }));
    set('elementi', [...ambiente.elementi, dup]);
  };

  return (
    <div className="border-2 border-stone-900 bg-white">
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-stone-900 text-stone-50 gap-2">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-3 flex-1 text-left min-w-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <MapPin size={16} />
          <span className="font-serif text-base truncate">{ambiente.nome || '— Ambiente senza nome —'}</span>
          {ambiente.elementi.length > 0 && (
            <span className="text-[10px] uppercase tracking-wider bg-stone-700 px-2 py-0.5">
              {ambiente.elementi.length} elementi
            </span>
          )}
        </button>
        <div className="flex gap-1">
          <Btn size="sm" variant="ghost" icon={Copy} onClick={onDuplicate}>Duplica</Btn>
          <Btn size="sm" variant="danger" icon={Trash2} onClick={onDelete}>Elimina</Btn>
        </div>
      </div>
      {open && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nome ambiente" required>
              <div className="flex gap-2">
                <Input value={ambiente.nome} onChange={v => set('nome', v)} placeholder="es. Reparto produzione" />
                <Btn size="sm" icon={FolderTree} onClick={() => setPickerAmb(true)}>Archivio</Btn>
              </div>
            </Field>
            <Field label="Ubicazione / piano">
              <Input value={ambiente.ubicazione} onChange={v => set('ubicazione', v)} placeholder="es. Piano terra, lato est" />
            </Field>
          </div>
          <Field label="Descrizione ambiente">
            <Textarea value={ambiente.descrizione} onChange={v => set('descrizione', v)}
              contesto={`Ambiente di lavoro: ${ambiente.nome}`} rows={2} />
          </Field>
          <Field label="Foto ambiente">
            <FotoUploader foto={ambiente.foto || []} setFoto={(u) => set('foto', typeof u === 'function' ? u(ambiente.foto || []) : u)} />
          </Field>

          <div className="pt-3 border-t border-stone-300">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-serif text-sm uppercase tracking-wider">Elementi osservati</h4>
              <Btn size="sm" variant="primary" icon={Plus} onClick={aggiungiElemento}>Aggiungi elemento</Btn>
            </div>
            <div className="space-y-3">
              {ambiente.elementi.map(e => (
                <ElementoCard key={e.id} elemento={e}
                  onChange={(n) => aggiornaEl(e.id, n)}
                  onDelete={() => eliminaEl(e.id)}
                  onDuplicate={() => duplicaEl(e.id)}
                  archivio={archivio} setArchivio={setArchivio} />
              ))}
              {ambiente.elementi.length === 0 && (
                <div className="text-sm text-stone-500 italic py-4 text-center border border-dashed border-stone-300">
                  Nessun elemento osservato in questo ambiente.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <ArchivioPicker open={pickerAmb} onClose={() => setPickerAmb(false)}
        titolo="Archivio ambienti" lista={archivio.ambienti} onSelect={v => set('nome', v)}
        onAdd={v => setArchivio(a => ({ ...a, ambienti: [...a.ambienti, v] }))} />
    </div>
  );
};

// ============================================================
//  RELAZIONE HTML
// ============================================================
const generaRelazioneHTML = (sopr) => {
  const tutteNC = [];
  sopr.ambienti.forEach(a => a.elementi.forEach(e => e.rischi.forEach(r => (r.nonConformita || []).forEach(nc => tutteNC.push({ ...nc, ambiente: a.nome, elemento: e.nome, rischio: r.tipologia })))));
  const tutteFoto = [];
  sopr.ambienti.forEach(a => {
    (a.foto || []).forEach(f => tutteFoto.push({ ...f, ctx: `Ambiente: ${a.nome}` }));
    a.elementi.forEach(e => {
      (e.foto || []).forEach(f => tutteFoto.push({ ...f, ctx: `${a.nome} → ${e.nome}` }));
      e.rischi.forEach(r => (r.foto || []).forEach(f => tutteFoto.push({ ...f, ctx: `${a.nome} → ${e.nome} → ${r.tipologia}` })));
    });
  });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relazione — ${sopr.azienda}</title>
<style>
  @page { size: A4; margin: 2cm 2cm 2.5cm 2cm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; line-height: 1.5; font-size: 11pt; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 22pt; border-bottom: 3px double #1c1917; padding-bottom: 8px; margin-top: 0; }
  h2 { font-size: 14pt; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #78716c; padding-bottom: 4px; margin-top: 28px; }
  h3 { font-size: 12pt; color: #44403c; margin-top: 18px; }
  h4 { font-size: 11pt; margin: 12px 0 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
  th, td { border: 1px solid #78716c; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f5f5f4; font-family: 'Helvetica Neue', sans-serif; text-transform: uppercase; font-size: 9pt; letter-spacing: 0.5px; }
  .meta { background: #f5f5f4; padding: 12px 16px; border-left: 4px solid #1c1917; margin: 14px 0; }
  .nc { border: 1px solid #b91c1c; padding: 10px; margin: 10px 0; background: #fef2f2; }
  .nc-code { display: inline-block; background: #b91c1c; color: white; padding: 2px 8px; font-family: monospace; font-size: 9pt; }
  .disclaimer { background: #fffbeb; border: 1px dashed #d97706; padding: 12px; margin-top: 30px; font-size: 9pt; font-style: italic; }
  .firma { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .firma > div { border-top: 1px solid #1c1917; padding-top: 6px; font-size: 10pt; }
  .foto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .foto-grid img { width: 100%; border: 1px solid #78716c; }
  .foto-grid .cap { font-size: 9pt; color: #57534e; margin-top: 2px; }
  ul { margin: 4px 0 4px 20px; padding: 0; }
  .toc { font-size: 10pt; }
  .toc li { margin: 2px 0; }
  @media print { .no-print { display: none; } body { padding: 0; } }
</style></head><body>
  <div class="no-print" style="position: fixed; top: 10px; right: 10px; z-index: 100;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #1c1917; color: white; border: none; cursor: pointer; font-family: sans-serif;">Stampa / Salva PDF</button>
  </div>

  <h1>Relazione tecnica di sopralluogo<br><small style="font-size: 12pt; font-weight: normal; color: #57534e;">Sicurezza sul lavoro — D.Lgs. 81/2008</small></h1>

  <div class="meta">
    <strong>Azienda:</strong> ${sopr.azienda}<br>
    <strong>Sede sopralluogo:</strong> ${sopr.sede}<br>
    <strong>Data:</strong> ${sopr.data}<br>
    <strong>Tecnico incaricato:</strong> ${sopr.tecnico}
  </div>

  <h2>1. Indice ambienti visitati</h2>
  <ol class="toc">
    ${sopr.ambienti.map(a => `<li><strong>${a.nome}</strong>${a.ubicazione ? ` — ${a.ubicazione}` : ''} (${a.elementi.length} elementi osservati)</li>`).join('')}
  </ol>

  <h2>2. Ambienti, elementi e rischi rilevati</h2>
  ${sopr.ambienti.map((a, i) => `
    <h3>2.${i+1} ${a.nome}</h3>
    ${a.descrizione ? `<p>${a.descrizione}</p>` : ''}
    ${a.elementi.map((e, j) => `
      <h4>2.${i+1}.${j+1} ${e.nome || 'Elemento'}${e.tipologia ? ` <small>(${e.tipologia})</small>` : ''}</h4>
      ${e.descrizione ? `<p>${e.descrizione}</p>` : ''}
      ${e.rischi.length > 0 ? `
      <table>
        <thead><tr><th>Rischio</th><th>Esito</th><th>P</th><th>G</th><th>Priorità</th><th>Evidenza</th></tr></thead>
        <tbody>
          ${e.rischi.map(r => `<tr>
            <td>${r.tipologia || '—'}<br><small>${r.descrizione || ''}</small></td>
            <td>${r.esito || '—'}</td>
            <td>${(r.probabilita || '—').split(' - ')[0]}</td>
            <td>${(r.gravita || '—').split(' - ')[0]}</td>
            <td>${r.priorita || '—'}</td>
            <td>${r.evidenza || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<p><em>Nessun rischio specifico associato.</em></p>'}
    `).join('')}
  `).join('')}

  <h2>3. Non conformità rilevate</h2>
  ${tutteNC.length === 0 ? '<p><em>Nessuna non conformità rilevata.</em></p>' :
    tutteNC.map((nc, i) => `
      <div class="nc">
        <div class="nc-code">${codiceNC(i)}</div>
        <strong style="margin-left: 8px;">${nc.descrizione}</strong>
        <table style="margin-top: 8px;">
          <tr><th style="width: 30%;">Ambiente / elemento</th><td>${nc.ambiente} → ${nc.elemento}</td></tr>
          <tr><th>Rischio collegato</th><td>${nc.rischio || '—'}</td></tr>
          <tr><th>Riferimento normativo</th><td>${nc.norma || '—'}</td></tr>
          <tr><th>Evidenza</th><td>${nc.evidenza || '—'}</td></tr>
          <tr><th>Misura correttiva</th><td>${nc.misuraCorrettiva || '—'}</td></tr>
          <tr><th>Responsabile</th><td>${nc.responsabile || '—'}</td></tr>
          <tr><th>Scadenza</th><td>${nc.scadenza || '—'}</td></tr>
          <tr><th>Stato</th><td>${nc.stato || 'aperta'}</td></tr>
        </table>
      </div>`).join('')}

  <h2>4. Misure preventive e protettive proposte</h2>
  ${(() => {
    const misure = [];
    sopr.ambienti.forEach(a => a.elementi.forEach(e => e.rischi.forEach(r => {
      if (r.misuraPreventiva || r.misuraProtettiva) {
        misure.push({ ambito: `${a.nome} / ${e.nome} / ${r.tipologia}`, prev: r.misuraPreventiva, prot: r.misuraProtettiva });
      }
    })));
    return misure.length === 0 ? '<p><em>Nessuna misura registrata.</em></p>' : `
      <table>
        <thead><tr><th>Ambito</th><th>Misure preventive</th><th>Misure protettive</th></tr></thead>
        <tbody>${misure.map(m => `<tr><td>${m.ambito}</td><td>${(m.prev || '—').replace(/\n/g, '<br>')}</td><td>${(m.prot || '—').replace(/\n/g, '<br>')}</td></tr>`).join('')}</tbody>
      </table>`;
  })()}

  <h2>5. Piano di miglioramento</h2>
  ${tutteNC.length === 0 ? '<p><em>Non sono richieste azioni correttive.</em></p>' : `
    <table>
      <thead><tr><th>Cod.</th><th>Azione</th><th>Responsabile</th><th>Scadenza</th><th>Stato</th></tr></thead>
      <tbody>${tutteNC.map((nc, i) => `<tr><td>${codiceNC(i)}</td><td>${nc.misuraCorrettiva || nc.descrizione}</td><td>${nc.responsabile || '—'}</td><td>${nc.scadenza || '—'}</td><td>${nc.stato || 'aperta'}</td></tr>`).join('')}</tbody>
    </table>`}

  <h2>6. Allegato fotografico</h2>
  ${tutteFoto.length === 0 ? '<p><em>Nessuna foto allegata.</em></p>' : `
    <div class="foto-grid">
      ${tutteFoto.map(f => `<div><img src="${f.data}" alt=""><div class="cap"><strong>${f.ctx}</strong>${f.commento ? ` — ${f.commento}` : ''}</div></div>`).join('')}
    </div>`}

  <h2>7. Conclusioni</h2>
  <p>Dal sopralluogo effettuato presso <strong>${sopr.azienda}</strong> — sede di <strong>${sopr.sede}</strong> in data <strong>${sopr.data}</strong>, sono stati visitati ${sopr.ambienti.length} ambienti, sono stati osservati complessivamente ${sopr.ambienti.reduce((s, a) => s + a.elementi.length, 0)} elementi e sono state rilevate <strong>${tutteNC.length} non conformità</strong>. Si raccomanda l'attuazione delle misure correttive secondo le scadenze indicate nel piano di miglioramento.</p>

  ${sopr.conclusioni ? `<p>${sopr.conclusioni}</p>` : ''}

  <div class="firma">
    <div>Il Tecnico incaricato<br><strong>${sopr.tecnico}</strong></div>
    <div>Per presa visione — Datore di Lavoro<br>&nbsp;</div>
  </div>

  <div class="disclaimer">
    <strong>Disclaimer.</strong> La presente relazione è stata redatta con il supporto di strumenti di intelligenza artificiale per la stesura e l'organizzazione dei contenuti. Il documento <strong>non sostituisce</strong> sopralluoghi tecnici approfonditi, verifiche documentali, misurazioni strumentali e valutazioni effettuate da figure abilitate ai sensi del D.Lgs. 81/2008. Le informazioni in esso contenute hanno valore di supporto consulenziale e necessitano di validazione da parte del professionista incaricato.
  </div>
</body></html>`;
};

// ============================================================
//  MODAL IMPOSTAZIONI (chiave API)
// ============================================================
const SettingsModal = ({ open, onClose, apiKey, setApiKey }) => {
  const [val, setVal] = useState(apiKey);
  useEffect(() => setVal(apiKey), [apiKey, open]);
  if (!open) return null;
  const salva = () => {
    setApiKey(val);
    if (val) localStorage.setItem(API_KEY_STORAGE, val);
    else localStorage.removeItem(API_KEY_STORAGE);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-stone-50 w-full max-w-lg border border-stone-900" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-stone-300 flex items-center justify-between">
          <h3 className="font-serif text-lg flex items-center gap-2"><Key size={16} /> Impostazioni IA</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-300 p-3 text-xs text-amber-900 leading-relaxed">
            Per usare le funzioni di intelligenza artificiale ("Migliora con IA", "Suggerisci rischi", ecc.) serve una chiave API personale di <strong>Groq</strong> (gratuita).
            La chiave resta salvata <strong>solo nel tuo browser</strong> (localStorage), non viene mai inviata altrove.
          </div>
          <Field label="Chiave API Groq">
            <input type="password" value={val} onChange={e => setVal(e.target.value)}
              placeholder="gsk_..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 focus:border-stone-900 focus:outline-none font-mono" />
          </Field>
          <div className="text-xs text-stone-600">
            Ottieni una chiave gratuita da <a href="https://console.groq.com/keys" target="_blank" rel="noopener" className="underline">console.groq.com/keys</a>.
            Senza chiave puoi usare l'app normalmente, le funzioni IA saranno disattivate.
          </div>
          <div className="flex gap-2 pt-2">
            <Btn variant="primary" onClick={salva}>Salva</Btn>
            <Btn onClick={onClose}>Annulla</Btn>
            {apiKey && <Btn variant="danger" onClick={() => { setVal(''); }}>Rimuovi</Btn>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
//  APP PRINCIPALE
// ============================================================
const initialSopralluogo = () => ({
  id: uid(), azienda: '', sede: '', data: oggi(), tecnico: '',
  conclusioni: '', ambienti: []
});

export default function App() {
  const [sopralluogo, setSopralluogo] = useState(initialSopralluogo());
  const [archivio, setArchivio] = useState(ARCHIVIO_INIZIALE);
  const [vista, setVista] = useState('start');
  const [emailDest, setEmailDest] = useState('');
  const [emailOggetto, setEmailOggetto] = useState('');
  const [emailTesto, setEmailTesto] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate da localStorage
  useEffect(() => {
    const s = loadState();
    if (s) {
      if (s.sopralluogo) setSopralluogo(s.sopralluogo);
      if (s.archivio) setArchivio(s.archivio);
      if (s.vista && s.sopralluogo?.azienda) setVista(s.vista);
    }
    const k = localStorage.getItem(API_KEY_STORAGE);
    if (k) setApiKey(k);
    setHydrated(true);
  }, []);

  // Salva su localStorage
  useEffect(() => {
    if (hydrated) saveState({ sopralluogo, archivio, vista });
  }, [sopralluogo, archivio, vista, hydrated]);

  const aggiungiAmbiente = () => {
    setSopralluogo(s => ({ ...s, ambienti: [...s.ambienti, { id: uid(), nome: '', ubicazione: '', descrizione: '', foto: [], elementi: [] }] }));
  };
  const aggiornaAmbiente = (id, n) => setSopralluogo(s => ({ ...s, ambienti: s.ambienti.map(a => a.id === id ? n : a) }));
  const eliminaAmbiente = (id) => setSopralluogo(s => ({ ...s, ambienti: s.ambienti.filter(a => a.id !== id) }));
  const duplicaAmbiente = (id) => {
    const a = sopralluogo.ambienti.find(x => x.id === id);
    const dup = JSON.parse(JSON.stringify(a));
    dup.id = uid(); dup.foto = [];
    dup.elementi = dup.elementi.map(e => ({ ...e, id: uid(), foto: [], rischi: e.rischi.map(r => ({ ...r, id: uid(), foto: [], nonConformita: [] })) }));
    setSopralluogo(s => ({ ...s, ambienti: [...s.ambienti, dup] }));
  };

  const aprirRelazione = () => {
    const html = generaRelazioneHTML(sopralluogo);
    const w = window.open('', '_blank');
    if (!w) { alert('Il browser ha bloccato la finestra. Consenti i popup per questo sito.'); return; }
    w.document.write(html); w.document.close();
  };

  const scaricaHTML = () => {
    const html = generaRelazioneHTML(sopralluogo);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relazione_${sopralluogo.azienda || 'sopralluogo'}_${sopralluogo.data}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inviaEmail = () => {
    const oggetto = emailOggetto || `Relazione tecnica sopralluogo — ${sopralluogo.azienda} — ${sopralluogo.data}`;
    const corpo = emailTesto || `Egregi,\n\nin allegato la relazione tecnica relativa al sopralluogo effettuato presso ${sopralluogo.azienda} (sede di ${sopralluogo.sede}) in data ${sopralluogo.data}.\n\nLa relazione include ambienti visitati, rischi rilevati, non conformità e piano di miglioramento.\n\nCordiali saluti,\n${sopralluogo.tecnico}\n\n— Nota: scaricare separatamente il file della relazione e allegarlo manualmente al messaggio.`;
    window.location.href = `mailto:${emailDest}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
  };

  const nuovoSopralluogo = () => {
    if (confirm('Iniziare un nuovo sopralluogo? I dati attuali andranno persi se non hai esportato la relazione.')) {
      setSopralluogo(initialSopralluogo());
      setVista('start');
    }
  };

  const datiObbligatoriOk = sopralluogo.azienda && sopralluogo.sede && sopralluogo.data && sopralluogo.tecnico;

  if (!hydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <IAContext.Provider value={{ apiKey, openSettings: () => setSettingsOpen(true) }}>
      <div className="min-h-screen bg-stone-100" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
        <style>{`.font-serif { font-family: 'Georgia', 'Times New Roman', serif; }`}</style>

        <header className="bg-stone-900 text-stone-50 border-b-4 border-red-700 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-red-700 flex items-center justify-center flex-shrink-0"><ShieldAlert size={20} /></div>
              <div className="min-w-0">
                <h1 className="font-serif text-base md:text-xl leading-tight truncate">Sopralluoghi Sicurezza</h1>
                <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-stone-400 hidden sm:block">D.Lgs. 81/2008 — Strumento per consulenti</p>
              </div>
            </div>
            <div className="flex gap-1 md:gap-2 flex-shrink-0">
              <Btn size="sm" variant="ghost" icon={Settings} onClick={() => setSettingsOpen(true)} title="Impostazioni IA">
                <span className="hidden sm:inline text-stone-50">{apiKey ? 'IA attiva' : 'IA off'}</span>
              </Btn>
              {vista !== 'start' && (
                <>
                  <Btn size="sm" variant="ghost" onClick={() => setVista('start')}>
                    <ArrowLeft size={13} className="text-stone-50" />
                    <span className="hidden sm:inline text-stone-50">Dati iniziali</span>
                  </Btn>
                  <Btn size="sm" onClick={nuovoSopralluogo}>Nuovo</Btn>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-3 md:px-6 py-6 md:py-8">

          {vista === 'start' && (
            <div className="max-w-2xl">
              <div className="mb-6 md:mb-8">
                <p className="text-[11px] uppercase tracking-[0.3em] text-red-700 font-semibold">Nuovo sopralluogo</p>
                <h2 className="font-serif text-2xl md:text-3xl mt-1">Dati identificativi</h2>
                <p className="text-stone-600 mt-2 text-sm">Compila i campi obbligatori per iniziare. Tutto il resto si costruisce dinamicamente sul campo.</p>
              </div>

              <div className="bg-white border border-stone-300 p-5 md:p-6 space-y-4">
                <Field label="Ragione sociale azienda" required>
                  <Input value={sopralluogo.azienda} onChange={v => setSopralluogo(s => ({ ...s, azienda: v }))} placeholder="es. Acme S.r.l." />
                </Field>
                <Field label="Sede del sopralluogo" required>
                  <Input value={sopralluogo.sede} onChange={v => setSopralluogo(s => ({ ...s, sede: v }))} placeholder="es. Via Roma 12, Cagliari" />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Data" required>
                    <Input type="date" value={sopralluogo.data} onChange={v => setSopralluogo(s => ({ ...s, data: v }))} />
                  </Field>
                  <Field label="Tecnico incaricato" required>
                    <Input value={sopralluogo.tecnico} onChange={v => setSopralluogo(s => ({ ...s, tecnico: v }))} placeholder="Nome cognome" />
                  </Field>
                </div>
                <div className="pt-2">
                  <Btn variant="primary" size="lg" icon={ChevronRight} disabled={!datiObbligatoriOk}
                    onClick={() => setVista('sopralluogo')}>
                    Inizia sopralluogo
                  </Btn>
                </div>
              </div>

              <div className="mt-6 bg-amber-50 border border-amber-300 p-4 text-xs text-amber-900 leading-relaxed">
                <strong>Disclaimer.</strong> Le relazioni generate con supporto IA non sostituiscono sopralluoghi approfonditi,
                verifiche documentali, misurazioni strumentali e valutazioni di figure abilitate.
              </div>
            </div>
          )}

          {vista === 'sopralluogo' && (
            <div>
              <div className="bg-white border border-stone-300 p-4 md:p-5 mb-5 md:mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Azienda</div>
                  <div className="font-serif text-sm md:text-base truncate">{sopralluogo.azienda}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Sede</div>
                  <div className="font-serif text-sm md:text-base truncate">{sopralluogo.sede}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Data</div>
                  <div className="font-serif text-sm md:text-base">{sopralluogo.data}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Tecnico</div>
                  <div className="font-serif text-sm md:text-base truncate">{sopralluogo.tecnico}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-serif text-xl md:text-2xl">Albero sopralluogo</h2>
                  <p className="text-xs text-stone-600 mt-0.5">Costruisci ambienti, elementi e rischi mentre ti muovi nei luoghi di lavoro.</p>
                </div>
                <div className="flex gap-2">
                  <Btn variant="primary" icon={Plus} onClick={aggiungiAmbiente}>Ambiente</Btn>
                  <Btn variant="accent" icon={FileText} onClick={() => setVista('relazione')} disabled={sopralluogo.ambienti.length === 0}>Relazione</Btn>
                </div>
              </div>

              <div className="space-y-5">
                {sopralluogo.ambienti.map(a => (
                  <AmbienteCard key={a.id} ambiente={a}
                    onChange={(n) => aggiornaAmbiente(a.id, n)}
                    onDelete={() => { if (confirm(`Eliminare l'ambiente "${a.nome}"?`)) eliminaAmbiente(a.id); }}
                    onDuplicate={() => duplicaAmbiente(a.id)}
                    archivio={archivio} setArchivio={setArchivio} />
                ))}
                {sopralluogo.ambienti.length === 0 && (
                  <div className="bg-white border-2 border-dashed border-stone-300 p-8 md:p-12 text-center">
                    <Building2 size={32} className="mx-auto text-stone-400 mb-3" />
                    <h3 className="font-serif text-lg">Nessun ambiente ancora</h3>
                    <p className="text-sm text-stone-600 mt-1 mb-4">Inizia aggiungendo il primo ambiente del sopralluogo.</p>
                    <Btn variant="primary" icon={Plus} onClick={aggiungiAmbiente}>Aggiungi primo ambiente</Btn>
                  </div>
                )}
              </div>
            </div>
          )}

          {vista === 'relazione' && (
            <div>
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-[0.3em] text-red-700 font-semibold">Output</p>
                <h2 className="font-serif text-2xl md:text-3xl mt-1">Relazione tecnica</h2>
              </div>

              <div className="bg-white border border-stone-300 p-5 md:p-6 mb-5">
                <h3 className="font-serif text-lg mb-3">Conclusioni personalizzate</h3>
                <Textarea value={sopralluogo.conclusioni}
                  onChange={v => setSopralluogo(s => ({ ...s, conclusioni: v }))}
                  contesto="Conclusioni di una relazione tecnica di sopralluogo sicurezza"
                  rows={5}
                  placeholder="Aggiungi conclusioni, raccomandazioni, sintesi finale..." />
              </div>

              <div className="bg-stone-900 text-stone-50 p-5 md:p-6 mb-5">
                <h3 className="font-serif text-lg mb-4">Riepilogo</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><div className="text-2xl md:text-3xl font-serif">{sopralluogo.ambienti.length}</div><div className="text-stone-400 text-xs uppercase tracking-wider">Ambienti</div></div>
                  <div><div className="text-2xl md:text-3xl font-serif">{sopralluogo.ambienti.reduce((s, a) => s + a.elementi.length, 0)}</div><div className="text-stone-400 text-xs uppercase tracking-wider">Elementi</div></div>
                  <div><div className="text-2xl md:text-3xl font-serif">{sopralluogo.ambienti.reduce((s, a) => s + a.elementi.reduce((s2, e) => s2 + e.rischi.length, 0), 0)}</div><div className="text-stone-400 text-xs uppercase tracking-wider">Rischi</div></div>
                  <div><div className="text-2xl md:text-3xl font-serif text-red-400">{sopralluogo.ambienti.reduce((s, a) => s + a.elementi.reduce((s2, e) => s2 + e.rischi.reduce((s3, r) => s3 + (r.nonConformita || []).length, 0), 0), 0)}</div><div className="text-stone-400 text-xs uppercase tracking-wider">Non conformità</div></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <Btn variant="primary" size="lg" icon={FileText} onClick={aprirRelazione}>Anteprima / Stampa PDF</Btn>
                <Btn size="lg" icon={Download} onClick={scaricaHTML}>Scarica HTML/Word</Btn>
                <Btn size="lg" variant="accent" icon={Mail} onClick={() => setVista('email')}>Invia via email</Btn>
              </div>

              <div className="bg-amber-50 border border-amber-300 p-4 text-xs text-amber-900 leading-relaxed">
                <strong>Note formato.</strong> "Anteprima / Stampa PDF" apre la relazione in una nuova scheda da cui usare la stampa del browser per salvarla come PDF. "Scarica HTML/Word" produce un file <code>.html</code> apribile e modificabile direttamente in Microsoft Word (File → Apri → seleziona .html → salva come .docx).
              </div>
            </div>
          )}

          {vista === 'email' && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <Btn size="sm" variant="ghost" icon={ArrowLeft} onClick={() => setVista('relazione')}>Torna alla relazione</Btn>
                <h2 className="font-serif text-2xl md:text-3xl mt-3">Invia relazione via email</h2>
              </div>

              <div className="bg-white border border-stone-300 p-5 md:p-6 space-y-4">
                <Field label="Destinatari" hint="Separa più indirizzi con virgola">
                  <Input value={emailDest} onChange={setEmailDest} placeholder="rspp@azienda.it, datore@azienda.it" />
                </Field>
                <Field label="Oggetto">
                  <Input value={emailOggetto} onChange={setEmailOggetto}
                    placeholder={`Relazione tecnica sopralluogo — ${sopralluogo.azienda} — ${sopralluogo.data}`} />
                </Field>
                <Field label="Testo del messaggio">
                  <Textarea value={emailTesto} onChange={setEmailTesto} rows={10} contesto="Email di accompagnamento a relazione tecnica sicurezza"
                    placeholder={`Egregi,\n\nin allegato la relazione tecnica...`} />
                </Field>

                <div className="pt-2 flex flex-wrap gap-3">
                  <Btn variant="primary" size="lg" icon={Mail} onClick={inviaEmail} disabled={!emailDest}>Apri client email</Btn>
                  <Btn size="lg" icon={Download} onClick={scaricaHTML}>Scarica relazione</Btn>
                </div>
                <p className="text-xs text-stone-600 italic pt-2 border-t border-stone-200">
                  Suggerimento: scarica prima la relazione, poi premi "Apri client email": il messaggio si comporrà automaticamente, allega il file scaricato e invia.
                </p>
              </div>
            </div>
          )}

        </main>

        <footer className="border-t border-stone-300 mt-12 py-6 bg-stone-50">
          <div className="max-w-6xl mx-auto px-4 md:px-6 text-xs text-stone-600 text-center">
            Strumento di supporto per consulenti sicurezza — i dati restano nel tuo browser. Non sostituisce le valutazioni di figure abilitate.
          </div>
        </footer>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}
          apiKey={apiKey} setApiKey={setApiKey} />
      </div>
    </IAContext.Provider>
  );
}
