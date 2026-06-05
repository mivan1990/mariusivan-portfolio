# mariusivan.ro — Portofoliu Interactiv

Portofoliu personal cu design **Windows XP**, accesibil la [mariusivan.ro](https://mariusivan.ro).

Vizitatorii sunt întâmpinați de un desktop interactiv cu ferestre, iconițe și taskbar — fiecare fereastră prezintă un proiect real.

---

## Proiecte prezentate

| Proiect | Descriere |
|---|---|
| **CS2 Scoreboard** | Platformă internă de competiție 2v2 CS2 pentru angajații FEG — leaderboard, meciuri, bracket, pariuri |
| **Casa Pariurilor** | Sistem de pariuri pe meciurile CS2 cu cote calculate automat |
| **Fortuna WC2026** | Aplicație de pariuri pe meciurile FIFA World Cup 2026 cu date reale |
| **Numlock.ro** | Magazin online de deskmaturi construit pe Shopify |

---

## Stack

**Frontend:** React · TypeScript · Vite · Tailwind CSS  
**Backend:** Python FastAPI · SQLite  
**Plugin CS2:** C# (Game State Integration)  
**Hosting:** VPS Ubuntu · nginx · Let's Encrypt

---

## Rulare locală

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Copiază `backend/.env.example` în `backend/.env` și completează variabilele înainte de pornire.

---

[github.com/mivan1990](https://github.com/mivan1990)
