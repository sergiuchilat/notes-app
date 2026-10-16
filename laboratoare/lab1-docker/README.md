# Laboratorul 1 – Pornește aplicația și găsește riscurile

**Durată:** 90 de minute\
**Varianta ta:** valorile individuale sunt în tabelul de la **sfârșitul fișei**.\
**Unde lucrezi:** pe laptopul tău (Linux)\
**Aplicația:** „Notițe” (NestJS + React + PostgreSQL), pornită cu Docker

## Ce vei învăța

- să pornești o aplicație web completă cu Docker;
- să înțelegi din ce părți este formată aplicația;
- să faci un **model de amenințări** (ce protejăm și de cine);
- să găsești și să repari greșeli de configurare: parole scrise în cod, porturi deschise inutil, aplicații care rulează ca administrator (root).

## Ce predai la final

1. Tabelul cu modelul de amenințări (Pasul 4).
2. Lista celor 4 probleme găsite (Pasul 5), cu explicația de ce sunt periculoase.
3. Capturi de ecran de la Pasul 7 (verificare).
4. Link-ul către repository-ul tău de pe GitHub.

> ⚠️ Atacurile din acest curs se fac **doar pe aplicația ta, pe laptopul tău** (`localhost`). Atacarea altor sisteme este ilegală.

## Pasul 0 – Verifică uneltele (5 min)

Înainte de laborator trebuie să-ți fi pregătit spațiul de lucru după ghidul [Pregătirea spațiului de lucru](../lab0-pregatire/README.md) (Linux sau Windows).

Rulează în terminal (pe Windows, în fereastra **Ubuntu**). Fiecare comandă trebuie să afișeze o versiune:

```bash
docker --version
docker compose version
git --version
node -v          # trebuie să fie v22.x
```

Dacă `docker` cere `sudo`, adaugă-ți utilizatorul în grupul docker, apoi deloghează-te și loghează-te din nou:

```bash
sudo usermod -aG docker $USER
```

## Pasul 1 – Fă-ți propria copie a aplicației (10 min)

1. Deschide pagina aplicației primită de la profesor: `https://github.com/sergiuchilat/notes-app`
2. Apasă butonul verde **Use this template**, apoi **Create a new repository**.
3. Numele: `notes-app`, vizibilitate: **Public**. Apasă **Create repository**.
4. Descarcă repository-ul tău pe laptop (înlocuiește `UTILIZATORUL_TAU`):

```bash
git clone https://github.com/UTILIZATORUL_TAU/notes-app.git
cd notes-app
```

## Pasul 2 – Pornește aplicația (10 min)

```bash
docker compose up -d --build
```

Prima pornire durează câteva minute. Verifică dacă toate cele 3 containere rulează:

```bash
docker compose ps
```

Deschide în browser: **http://localhost:8080**

Intră cu utilizatorul `alice`, parola `alice123`. Încearcă aplicația:

- creează o notiță privată și una publică;
- caută după titlu;
- deschide tab-ul „Notițe publice”;
- ieși din cont și creează-ți un cont nou.

## Pasul 3 – Cum este construită aplicația (10 min)

```
Browser ──► web (Nginx + React, port 8080) ──► api (NestJS, port 3000) ──► db (PostgreSQL, port 5432)
```

| Folder / fișier | Ce conține |
|---|---|
| `frontend/` | Interfața React (ce vede utilizatorul) |
| `backend/` | API-ul NestJS (logica și accesul la baza de date) |
| `db/init.sql` | Tabelele și datele de test |
| `docker-compose.yml` | Cum pornesc cele 3 containere împreună |

Deschide proiectul în VS Code (`code .`) și uită-te prin fișierele din `backend/src/`.

## Pasul 4 – Modelul de amenințări (15 min)

Gândește ca un atacator. Completează tabelul de mai jos în raport (minimum 5 rânduri):

| Ce protejăm (activ) | Cine ar putea ataca | Ce ar putea face | Cât de grav (mic / mediu / mare) |
|---|---|---|---|
| Parolele utilizatorilor | Un atacator din internet | Le fură din baza de date | Mare |
| Notițele private | Alt utilizator al aplicației | ... | ... |
| ... | ... | ... | ... |

**Idei de active:** parolele, notițele private, conturile utilizatorilor, baza de date, serverul, disponibilitatea aplicației.

## Pasul 5 – Găsește problemele de configurare (15 min)

Aplicația are greșeli de configurare ascunse intenționat. Caută-le.

**5.1. Ce porturi sunt deschise?**

```bash
docker compose ps
curl http://localhost:3000/api/health
```

Ce porturi vezi în coloana `PORTS`? Este nevoie ca baza de date (5432) și API-ul (3000) să fie accesibile din afara Docker? Utilizatorii trebuie să ajungă **doar** la portul 8080.

**5.2. Unde sunt scrise parolele?**

```bash
grep -rn "password\|secret" docker-compose.yml backend/src
```

Găsește parola bazei de date și cheia cu care se semnează token-urile de login (JWT). De ce este periculos ca ele să fie scrise în cod și urcate pe GitHub?

**5.3. Cu ce utilizator rulează API-ul?**

```bash
docker compose exec api whoami
```

Dacă răspunsul este `root`, un atacator care preia aplicația are drepturi maxime în container.

📝 **Notează în raport cele 4 probleme** (2 porturi, parolele din cod, root) și de ce sunt periculoase.

## Pasul 6 – Repară (20 min)

**6.1. Mută secretele într-un fișier `.env`**

Creează în folderul proiectului fișierul `.env.example` (acesta **se urcă** pe GitHub, ca exemplu):

```bash
DB_NAME=notes
DB_USER=notes
DB_PASSWORD=schimba-aceasta-parola
JWT_SECRET=schimba-cu-un-sir-aleatoriu-de-minimum-32-de-caractere
```

Copiază-l în `.env` și pune valori aleatorii, generate cu `openssl`:

```bash
cp .env.example .env
openssl rand -hex 16     # copiază rezultatul la DB_PASSWORD
openssl rand -hex 32     # copiază rezultatul la JWT_SECRET
nano .env
```

Adaugă `.env` în `.gitignore`, ca să nu ajungă **niciodată** pe GitHub:

```bash
echo ".env" >> .gitignore
```

**6.2. Folosește variabilele în `docker-compose.yml`**

- La serviciul `db`, înlocuiește valorile fixe cu `${DB_NAME}`, `${DB_USER}`, `${DB_PASSWORD}`.
- La serviciul `api`, adaugă:

```yaml
    env_file: .env
    environment:
      DB_HOST: db
```

- **Șterge** secțiunile `ports` de la `db` și de la `api`. Lasă doar portul `8080` la `web`.

**6.3. Citește variabilele în cod**

În `backend/src/db.service.ts`, înlocuiește valorile fixe cu `process.env.DB_HOST`, `process.env.DB_USER`, `process.env.DB_PASSWORD`, `process.env.DB_NAME`.

În `backend/src/auth.ts`, înlocuiește `'secret'` cu `process.env.JWT_SECRET` și oprește aplicația dacă cheia lipsește:

```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET lipsește sau este prea scurt');
}
```

**6.4. Nu rula aplicația ca root**

În `backend/Dockerfile`, adaugă înainte de linia `EXPOSE 3000`:

```dockerfile
USER node
```

**6.5. Repornește totul, cu o bază de date nouă**

Parola bazei de date se setează doar la prima pornire, de aceea ștergem datele vechi (`-v`):

```bash
docker compose down -v
docker compose up -d --build
```

## Pasul 7 – Verifică (5 min)

- [ ] Aplicația merge la http://localhost:8080 și te poți loga cu `alice` / `alice123`
- [ ] `docker compose ps` arată port doar pentru `web` (8080)
- [ ] `curl http://localhost:3000/api/health` nu mai răspunde
- [ ] `docker compose exec api whoami` afișează `node`
- [ ] `git status` **nu** afișează fișierul `.env`

📸 Fă capturi de ecran cu rezultatele.

Salvează modificările pe GitHub:

```bash
git add .
git commit -m "Lab 1: secrete in .env, porturi inchise, fara root"
git push
```

## Întrebări de control

1. De ce nu trebuie urcat fișierul `.env` pe GitHub? Ce faci dacă l-ai urcat din greșeală?
2. Ce înseamnă „suprafață de atac” și cum ai micșorat-o în acest laborator?
3. De ce este mai sigur ca aplicația să nu ruleze ca `root`?

## Probleme frecvente

| Problemă | Soluție |
|---|---|
| `permission denied` la docker | `sudo usermod -aG docker $USER`, apoi deloghează-te și loghează-te din nou |
| `port is already allocated` | Alt program folosește portul 8080. Oprește-l sau schimbă portul în `docker-compose.yml` |
| Login-ul nu mai merge după modificări | Ai uitat `docker compose down -v` sau ai o greșeală în `.env` |
| API-ul se oprește imediat | Vezi eroarea cu `docker compose logs api` |

## Variante – ce diferă de la un student la altul

Toți studenții urmează aceiași pași. Fiecare folosește însă **valorile din varianta lui** în locul valorilor date ca exemplu în fișă. Varianta ta este numărul tău din lista grupei (1–14). Scrie numărul variantei pe prima pagină a raportului.

- **Context:** modelul de amenințări (Pasul 4) îl faci pentru aplicația folosită în contextul variantei tale. Gândește-te ce date sensibile are acel context și cine ar vrea să le fure.
- **Port:** aplicația ta rulează pe portul din tabel, nu pe 8080 (în `docker-compose.yml`, la `web`: `"PORT:80"`).

| Var. | Context | Port |
|---|---|---|
| 1 | Școală (notițe ale profesorilor despre elevi) | 8081 |
| 2 | Clinică (notițe ale medicilor despre pacienți) | 8082 |
| 3 | Bancă (notițe ale consultanților despre clienți) | 8083 |
| 4 | Firmă IT (notițe despre proiecte și clienți) | 8084 |
| 5 | Birou de avocatură (notițe despre dosare) | 8085 |
| 6 | Primărie (notițe despre cererile cetățenilor) | 8086 |
| 7 | Magazin online (notițe despre comenzi) | 8087 |
| 8 | Redacție de știri (notițe despre surse) | 8088 |
| 9 | Club sportiv (notițe despre sportivi) | 8089 |
| 10 | Hotel (notițe despre oaspeți) | 8090 |
| 11 | Farmacie (notițe despre rețete) | 8091 |
| 12 | Service auto (notițe despre clienți și mașini) | 8092 |
| 13 | ONG (notițe despre beneficiari) | 8093 |
| 14 | Universitate (notițe despre studenți și note) | 8094 |
