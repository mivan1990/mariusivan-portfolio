# mariusivan.ro — Interactive Portfolio

**[🇷🇴 Română](#română) · [🇬🇧 English](#english)**

---

## English

### About

Personal portfolio built as an interactive **Windows XP desktop**, live at [mariusivan.ro](https://mariusivan.ro).

Instead of a traditional portfolio page, visitors land on a fully functional XP-style desktop — complete with icons, windows, a start menu, and a taskbar. Each window showcases a real project I built.

The concept was intentional: make the portfolio itself a project worth noticing.

### Projects on the Desktop

| Project | Description |
|---|---|
| **CS2 Scoreboard** | Internal 2v2 CS2 competition platform built for FEG employees — live stats, leaderboard, bracket, match history and a betting system |
| **Casa Pariurilor** | Betting system integrated with CS2 Scoreboard — odds calculated automatically from player K/D, ADR and Win Rate |
| **Fortuna WC2026** | Internal betting app for FIFA World Cup 2026 matches with real live data |
| **Numlock.ro** | Online store for desk mats, built from scratch on Shopify |

### Stack

**Frontend:** React · TypeScript · Vite · Tailwind CSS  
**Backend:** Python FastAPI · SQLite  
**CS2 Plugin:** C# (Game State Integration)  
**Hosting:** VPS Ubuntu · nginx · Let's Encrypt

### Run Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your values
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

---

## Română

### Despre

Portofoliu personal construit ca un **desktop Windows XP** interactiv, disponibil la [mariusivan.ro](https://mariusivan.ro).

În loc de o pagină de portofoliu clasică, vizitatorii ajung pe un desktop XP funcțional — cu iconițe, ferestre, start menu și taskbar. Fiecare fereastră prezintă un proiect real pe care l-am construit.

Conceptul a fost intenționat: portofoliul în sine să fie un proiect demn de atenție.

### Proiecte pe Desktop

| Proiect | Descriere |
|---|---|
| **CS2 Scoreboard** | Platformă internă de competiție 2v2 CS2 pentru angajații FEG — statistici live, leaderboard, bracket, istoric meciuri și sistem de pariuri |
| **Casa Pariurilor** | Sistem de pariuri integrat cu CS2 Scoreboard — cote calculate automat din K/D, ADR și Win Rate al jucătorilor |
| **Fortuna WC2026** | Aplicație internă de pariuri pe meciurile FIFA World Cup 2026 cu date reale live |
| **Numlock.ro** | Magazin online de deskmaturi construit de la zero pe Shopify |

### Stack

**Frontend:** React · TypeScript · Vite · Tailwind CSS  
**Backend:** Python FastAPI · SQLite  
**Plugin CS2:** C# (Game State Integration)  
**Hosting:** VPS Ubuntu · nginx · Let's Encrypt

### Rulare locală

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # completează valorile
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

---

[github.com/mivan1990](https://github.com/mivan1990)
