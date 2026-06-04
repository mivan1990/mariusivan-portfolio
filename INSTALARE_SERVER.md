# CS2 Leaderboard — Ghid de instalare pe server Windows

## Ce este aplicatia

Un leaderboard web pentru competitia 2v2 Counter-Strike 2. Afiseaza statistici per jucator
(K/D, ADR, HS%, Win Rate etc.) importate automat din fisierele de backup generate de serverul CS2.

---

## Cerinte minime server

| Componenta | Versiune minima | Necesar pentru |
|------------|----------------|----------------|
| Windows Server / Windows 10+ | orice | sistem de operare |
| Python | 3.11 sau 3.12 | backend API |
| Node.js | 18+ | build frontend (o singura data) |

> **Node.js nu trebuie sa ramana instalat pe server.** E necesar doar pentru pasul de build.
> Daca faci build-ul pe alt calculator (ex: Mac), copiezi doar folderul `frontend/dist/` pe server.

---

## Pasul 1 — Instaleaza Python

1. Mergi la **https://www.python.org/downloads/**
2. Descarca **Python 3.12** (Windows installer 64-bit)
3. Ruleaza installer-ul
4. **IMPORTANT:** Bifezi **"Add Python to PATH"** inainte de Install Now

Verifica instalarea:
```
python --version
```
Trebuie sa afiseze `Python 3.12.x`

---

## Pasul 2 — Copiaza proiectul pe server

Copiaza folderul `CS2Leaderboard` pe server. Recomandat:
```
C:\CS2Leaderboard\
```

Structura trebuie sa arate asa:
```
C:\CS2Leaderboard\
├── backend\
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── parsers\
│   ├── routers\
│   └── services\
└── frontend\
    └── dist\           ← fisierele React (vezi Pasul 3)
```

---

## Pasul 3 — Build frontend React

**Optiunea A: Pe serverul Windows** (daca ai Node.js instalat)

Instaleaza Node.js de la **https://nodejs.org** (versiunea LTS), apoi:
```
cd C:\CS2Leaderboard\frontend
npm install
npm run build
```

**Optiunea B: Pe Mac/alt calculator** (recomandat)

Ruleaza pe calculatorul tau:
```bash
cd CS2Leaderboard/frontend
npm install
npm run build
```
Apoi copiaza folderul `frontend/dist/` pe server la `C:\CS2Leaderboard\frontend\dist\`.

> Dupa build, **Node.js nu mai este necesar** pe server. Folderul `dist/` contine
> fisiere HTML/CSS/JS simple care sunt servite direct de Python.

---

## Pasul 4 — Configureaza backend-ul

Deschide Command Prompt ca Administrator si ruleaza:

```bat
cd C:\CS2Leaderboard\backend

:: Creeaza mediul virtual Python
python -m venv venv

:: Activeaza mediul virtual
venv\Scripts\activate

:: Instaleaza dependintele
pip install -r requirements.txt
```

---

## Pasul 5 — Creeaza fisierul de configurare

In folderul `C:\CS2Leaderboard\backend\` copiaza `.env.example` ca `.env`:

```bat
copy .env.example .env
```

Deschide `.env` cu Notepad si completeaza:

```env
# Secret pentru sesiunile de login (pune orice sir lung si random, min 32 caractere)
JWT_SECRET=pune_aici_un_sir_lung_si_random_de_cel_putin_32_caractere

# Credentiale admin pentru panoul de administrare
ADMIN_USERNAME=admin
ADMIN_PASSWORD=parola_ta_sigura

# Steam API Key (optional - pentru avatarele jucatorilor)
# Obtine GRATUIT de la: https://store.steampowered.com/dev/apikey
STEAM_API_KEY=

# Lasa gol - nu mai e necesar in productie
CORS_ORIGINS=
```

---

## Pasul 6 — Porneste serverul

```bat
cd C:\CS2Leaderboard\backend
venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Aplicatia este acum accesibila la:
- **De pe serverul insusi:** http://localhost:8000
- **Din reteaua locala:** http://IP_SERVER:8000

Pentru a gasi IP-ul serverului:
```
ipconfig
```
Cauta `IPv4 Address` (ex: `192.168.1.100`)

---

## Pasul 7 — Deschide portul in firewall

Ca aplicatia sa fie accesibila din alte calculatoare din retea:

```bat
netsh advfirewall firewall add rule name="CS2 Leaderboard" dir=in action=allow protocol=TCP localport=8000
```

---

## Pasul 8 (Optional) — Ruleaza ca Windows Service

Fara acest pas, serverul se opreste cand inchizi Command Prompt-ul.
Cu NSSM, serverul porneste automat cu Windows-ul.

**Descarca NSSM** de la **https://nssm.cc/download**
Extrage `nssm.exe` in `C:\CS2Leaderboard\`

```bat
cd C:\CS2Leaderboard

:: Instaleaza serviciul
nssm install CS2Leaderboard

:: Se deschide o fereastra grafica - completeaza:
::   Path:              C:\CS2Leaderboard\backend\venv\Scripts\python.exe
::   Startup directory: C:\CS2Leaderboard\backend
::   Arguments:         -m uvicorn main:app --host 0.0.0.0 --port 8000

:: Porneste serviciul
nssm start CS2Leaderboard
```

Comenzi utile pentru serviciu:
```bat
nssm start CS2Leaderboard    :: porneste
nssm stop CS2Leaderboard     :: opreste
nssm restart CS2Leaderboard  :: reporneste
nssm remove CS2Leaderboard   :: dezinstaleaza serviciul
```

---

## Verificare finala

Dupa pornire, deschide browserul si mergi la `http://localhost:8000`:

| URL | Ce trebuie sa vezi |
|-----|--------------------|
| `http://IP:8000` | Pagina leaderboard |
| `http://IP:8000/matches` | Pagina meciuri |
| `http://IP:8000/admin/login` | Pagina login admin |
| `http://IP:8000/docs` | Documentatia API (Swagger) |

---

## Utilizare dupa instalare

### Adaugare meci nou

1. Dupa ce meciul s-a terminat pe serverul CS2, gaseste fisierul backup:
   ```
   C:\cs2server\game\csgo\backup_roundXX.txt
   ```
2. Mergi la `http://IP:8000/admin/login` si autentifica-te
3. In tab-ul **Upload Meci**, trage fisierul sau apasa sa il selectezi
4. Sistemul importa automat statisticile
5. Mergi la tab-ul **Jucatori** si completeaza **Nume Real** si **Echipa** pentru jucatorii noi

### Prima autentificare admin

- Username: valoarea `ADMIN_USERNAME` din `.env` (default: `admin`)
- Parola: valoarea `ADMIN_PASSWORD` din `.env` (default: `admin123`)

---

## Depanare probleme frecvente

**`ModuleNotFoundError`**
```bat
:: Asigura-te ca venv-ul e activ (trebuie sa apara "(venv)" in prompt)
venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**Portul 8000 e deja folosit**
```bat
:: Foloseste alt port
python -m uvicorn main:app --host 0.0.0.0 --port 8080
```

**Aplicatia nu e accesibila din retea**
```bat
:: Verifica firewall-ul (Pasul 7)
:: Verifica ca serverul ruleaza cu --host 0.0.0.0 (nu 127.0.0.1)
```

**Baza de date corupta sau erori la start**
```bat
:: Sterge baza de date si restarteaza (se recreeaza automat, dar pierzi datele!)
del C:\CS2Leaderboard\backend\cs2leaderboard.db
```

---

## Structura fisiere importante

| Fisier | Rol |
|--------|-----|
| `backend\.env` | Configurare (parole, chei API) — nu il distribui |
| `backend\cs2leaderboard.db` | Baza de date SQLite — fa backup regulat |
| `frontend\dist\` | Fisierele web compilate |
