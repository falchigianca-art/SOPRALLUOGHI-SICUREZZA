# Sopralluoghi Sicurezza

App web per consulenti della sicurezza sul lavoro (D.Lgs. 81/2008): sopralluogo dinamico, archivi modificabili, supporto IA, generazione automatica della relazione tecnica.

## Avvio rapido

### Opzione A — StackBlitz (più veloce, nessuna installazione)

1. Vai su **https://stackblitz.com/**
2. Login (anche con Google)
3. In alto a destra: **"Create new"** → **"Vite + React"**
4. Una volta aperto il progetto vuoto, **trascina dentro tutti i file di questa cartella** (sostituisci quelli esistenti se chiede conferma)
5. Aspetta che `npm install` finisca da solo
6. L'anteprima parte automaticamente
7. In alto trovi il pulsante **"Connect to GitHub"** o l'URL pubblico — copia l'URL e aprilo dal telefono

**Per installare l'app sul telefono come icona:**
- iPhone (Safari): tocca condividi → "Aggiungi a schermata Home"
- Android (Chrome): menu → "Installa app" / "Aggiungi a schermata Home"

### Opzione B — CodeSandbox

1. Vai su **https://codesandbox.io/**
2. Login → **"Create"** → **"Import from disk"** o **"Upload zip"**
3. Carica lo zip → si apre il progetto
4. Premi **"Open Preview"** in alto, copia l'URL e usalo dal telefono

### Opzione C — Computer locale (per sviluppo)

```bash
npm install
npm run dev
```

Poi vai su `http://localhost:5173`.

Per un build di produzione: `npm run build`. La cartella `dist/` può essere caricata su Netlify, Vercel, GitHub Pages o qualsiasi hosting statico.

## Funzioni IA

L'app usa l'API di Claude (Anthropic) per:
- migliorare i testi tecnici
- suggerire rischi pertinenti per ogni elemento
- suggerire misure preventive e protettive

Servono passi una volta sola:
1. Vai su https://console.anthropic.com/settings/keys
2. Crea una API key
3. Nell'app, clicca l'icona "Impostazioni" in alto a destra
4. Incolla la chiave → Salva

La chiave resta **solo nel tuo browser** (localStorage), non viene mai inviata altrove.

L'app funziona normalmente anche **senza chiave**: in quel caso le funzioni IA sono disattivate ma tutto il resto (campi editabili, foto, archivi, generazione relazione) funziona comunque.

## Sicurezza della chiave API

L'app chiama l'API direttamente dal browser usando l'header `anthropic-dangerous-direct-browser-access`. Per uso personale è ok. Se l'app dovesse diventare multiutente o pubblica, va spostata la chiamata su un backend proprio per non esporre la chiave.

## Dati e privacy

Tutti i dati (sopralluoghi, foto, archivi) vengono salvati nel **localStorage del browser**. Non c'è server, non c'è cloud. Pulendo i dati del browser, perdi tutto.

Per non perdere i sopralluoghi: scarica la relazione (HTML/PDF) appena finita.

## Limiti noti

- Niente sincronizzazione tra dispositivi (è un'app monoutente single-device)
- Niente backend, niente login
- Le foto sono compresse a 1280px per non saturare lo storage
- Il `.docx` non è nativo: si esporta `.html` apribile in Word

## Stack

- Vite + React 18
- Tailwind CSS
- lucide-react (icone)
- API Claude (opzionale, per IA)
