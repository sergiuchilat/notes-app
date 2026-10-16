# Laboratorul 5 – Deploy și securizarea serverului web

**Durată:** 2 × 90 de minute\
**Varianta ta:** valorile individuale sunt în tabelul de la **sfârșitul fișei**.\
**Unde lucrezi:** pe serverul DigitalOcean din Laboratorul 4, pe laptop și pe GitHub

## Ce vei învăța

- să publici aplicația pe serverul tău (**deploy**);
- să pui **Nginx** în fața aplicației;
- să activezi **HTTPS** gratuit cu Let's Encrypt;
- să securizezi Nginx: versiune ascunsă, headere de securitate, limitarea cererilor;
- să faci **deploy automat** cu GitHub Actions la fiecare `git push`.

## Ce predai la final

1. Adresa aplicației tale: `https://ADRESA_IP.sslip.io`
2. Capturi de ecran de la verificări (Pașii 8 și 12).
3. Link către un deploy reușit din tab-ul **Actions** de pe GitHub.
4. Raportul final al cursului (vezi la sfârșit).

```
Internet ──► Nginx pe server (HTTPS, port 443) ──► containerul web (127.0.0.1:8080) ──► api ──► db
```

# Partea 1 – Aplicația pe server

## Pasul 1 – Pregătește aplicația pentru server (10 min, pe laptop)

**1.1.** În `docker-compose.yml`, la serviciul `web`, publică portul doar local (vezi Lab 4, Pasul 8.3):

```yaml
    ports:
      - "127.0.0.1:8080:80"
```

Adaugă și `restart: unless-stopped` la fiecare serviciu, ca aplicația să pornească singură după o repornire a serverului.

**1.2.** Pe server, aplicația stă în spatele a două Nginx-uri. Ca API-ul să vadă adresa IP **reală** a utilizatorului (necesară pentru limitarea login-ului din Lab 3), modifică `backend/src/main.ts`:

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';

// în bootstrap():
const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.setGlobalPrefix('api');
app.set('trust proxy', 2);
```

Fără această linie, limita de 5 încercări de login s-ar aplica **tuturor utilizatorilor împreună**.

**1.3.** Salvează pe GitHub:

```bash
git add .
git commit -m "Lab 5: pregatire pentru server"
git push
```

## Pasul 2 – Pornește aplicația pe server (15 min)

Conectează-te la server și descarcă aplicația (înlocuiește `UTILIZATORUL_TAU`):

```bash
ssh deploy@ADRESA_IP
git clone https://github.com/UTILIZATORUL_TAU/notes-app.git ~/notes-app
cd ~/notes-app
```

Creează fișierul `.env` **direct pe server**, cu valori noi, diferite de cele de pe laptop:

```bash
cp .env.example .env
openssl rand -hex 16     # pentru DB_PASSWORD
openssl rand -hex 32     # pentru JWT_SECRET
nano .env
chmod 600 .env
```

Pornește aplicația:

```bash
docker compose up -d --build
docker compose ps
curl -I http://127.0.0.1:8080
```

Trebuie să primești `HTTP/1.1 200 OK`.

# Partea 2 – Nginx și HTTPS

## Pasul 3 – Domeniul tău gratuit (5 min)

Pentru HTTPS ai nevoie de un nume de domeniu. Folosim serviciul gratuit **sslip.io**: orice adresă de forma `ADRESA_IP.sslip.io` duce automat la serverul tău.

Exemplu: dacă IP-ul este `164.90.12.34`, domeniul tău este `164.90.12.34.sslip.io`.

```bash
getent hosts ADRESA_IP.sslip.io     # trebuie să afișeze IP-ul tău
```

În pașii următori, înlocuiește `DOMENIUL_TAU` cu acest domeniu.

## Pasul 4 – Nginx în fața aplicației (15 min)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/notes
```

Scrie configurația de pornire:

```nginx
server {
    listen 80;
    server_name DOMENIUL_TAU;
    server_tokens off;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activează site-ul:

```bash
sudo ln -s /etc/nginx/sites-available/notes /etc/nginx/sites-enabled/notes
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Deschide în browser `http://DOMENIUL_TAU`. Trebuie să apară aplicația.

## Pasul 5 – HTTPS gratuit cu Let's Encrypt (10 min)

```bash
sudo certbot --nginx -d DOMENIUL_TAU --redirect -m emailul-tau@exemplu.com --agree-tos -n
```

Deschide `https://DOMENIUL_TAU`. Apare lacătul în browser. Certificatul se reînnoiește automat. Verifică:

```bash
sudo certbot renew --dry-run
```

> 💡 Dacă certbot dă eroare de „rate limit”, încearcă domeniul `ADRESA_IP.nip.io`, care funcționează la fel.

## Pasul 6 – Securizează Nginx (20 min)

Înlocuiește tot conținutul fișierului `/etc/nginx/sites-available/notes` cu configurația de mai jos:

```nginx
# Maximum 10 cereri pe secundă de la aceeași adresă IP
limit_req_zone $binary_remote_addr zone=perip:10m rate=10r/s;

# HTTP -> HTTPS
server {
    listen 80;
    server_name DOMENIUL_TAU;
    server_tokens off;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name DOMENIUL_TAU;

    ssl_certificate     /etc/letsencrypt/live/DOMENIUL_TAU/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMENIUL_TAU/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Ascunde versiunea Nginx
    server_tokens off;

    # Limite și timeout-uri
    client_max_body_size  1m;
    client_body_timeout   10s;
    client_header_timeout 10s;
    keepalive_timeout     15s;
    limit_req_status      429;

    # Headere de securitate
    add_header X-Content-Type-Options    "nosniff" always;
    add_header X-Frame-Options           "DENY" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy   "default-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Blochează fișierele ascunse (.env, .git)
    location ~ /\. {
        return 404;
    }

    location / {
        limit_req zone=perip burst=20 nodelay;

        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Înlocuiește automat `DOMENIUL_TAU` peste tot (pune domeniul tău în comandă):

```bash
sudo sed -i 's/DOMENIUL_TAU/164.90.12.34.sslip.io/g' /etc/nginx/sites-available/notes
sudo nginx -t
sudo systemctl reload nginx
```

| Header | Ce face |
|---|---|
| `X-Content-Type-Options` | Browserul nu „ghicește” tipul fișierelor |
| `X-Frame-Options` | Site-ul nu poate fi pus într-un `<iframe>` pe alt site (clickjacking) |
| `Referrer-Policy` | Nu trimite adresa completă a paginii către alte site-uri |
| `Content-Security-Policy` | Browserul încarcă scripturi doar de pe site-ul tău (a doua linie de apărare contra XSS) |
| `Strict-Transport-Security` | Browserul folosește întotdeauna HTTPS pentru site-ul tău |

## Pasul 7 – Testează limitarea cererilor (5 min)

Trimite 40 de cereri foarte repede către **serverul tău** și numără răspunsurile:

```bash
for i in $(seq 1 40); do
  curl -s -o /dev/null -w "%{http_code}\n" https://DOMENIUL_TAU/
done | sort | uniq -c
```

O parte din răspunsuri trebuie să fie `429` (Too Many Requests).

## Pasul 8 – Verifică (10 min)

De pe laptop:

```bash
curl -I http://DOMENIUL_TAU             # 301, redirecționare spre https
curl -I https://DOMENIUL_TAU            # 200, Server: nginx (fără versiune) + cele 5 headere
curl -I https://DOMENIUL_TAU/.env       # 404
nmap -Pn ADRESA_IP                      # deschise doar 22, 80, 443
```

- [ ] HTTP redirecționează automat spre HTTPS
- [ ] `Server: nginx`, fără număr de versiune
- [ ] Apar toate cele 5 headere de securitate
- [ ] `/.env` → `404`
- [ ] `nmap`: deschise doar 22, 80, 443 (8080 și 5432 nu apar)
- [ ] Aplicația merge în browser, cu lacăt

📸 Fă capturi de ecran cu rezultatele.

# Partea 3 – Deploy automat cu GitHub Actions

Până acum ai făcut deploy „de mână”. Acum automatizăm: la fiecare `git push`, GitHub **verifică** aplicația (inclusiv dependențele cu vulnerabilități cunoscute) și apoi o **publică** pe server.

```
git push ──► GitHub Actions: npm audit + build ──► SSH pe server ──► git pull + docker compose up
```

## Pasul 9 – O cheie SSH doar pentru GitHub (10 min)

Pe **laptop**, creează o cheie separată, folosită doar pentru deploy:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "github-actions"
cat ~/.ssh/github_deploy.pub
```

Pe **server**, adaugă cheia publică la utilizatorul `deploy`:

```bash
nano ~/.ssh/authorized_keys      # lipește cheia pe o linie nouă, la final
```

> 💡 O cheie separată se poate șterge oricând de pe server fără să-ți afecteze propriul acces.

## Pasul 10 – Secretele în GitHub (5 min)

Pe GitHub, în repository-ul tău: **Settings → Secrets and variables → Actions → New repository secret**

| Nume | Valoare |
|---|---|
| `SSH_HOST` | adresa IP a serverului |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | tot conținutul fișierului `~/.ssh/github_deploy` (cheia **privată**) |

Afișezi cheia privată cu `cat ~/.ssh/github_deploy`. Copiază tot, inclusiv liniile `-----BEGIN` și `-----END`.

> ⚠️ Secretele nu apar niciodată în cod și nici în logurile GitHub. Nu le scrie în fișiere din repository.

## Pasul 11 – Pipeline-ul (15 min)

Pe laptop, creează fișierul `.github/workflows/deploy.yml`:

```yaml
name: Verificare și deploy

on:
  push:
    branches: [main]

jobs:
  verificare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Backend - instalare, audit de securitate, build
        working-directory: backend
        run: |
          npm ci
          npm audit --audit-level=high
          npm run build

      - name: Frontend - instalare, audit de securitate, build
        working-directory: frontend
        run: |
          npm ci
          npm audit --audit-level=high
          npm run build

  deploy:
    needs: verificare
    runs-on: ubuntu-latest
    steps:
      - name: Deploy pe server prin SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd ~/notes-app
            git pull
            docker compose up -d --build
            docker image prune -f
```

| Etapă | Ce face |
|---|---|
| `verificare` | Instalează dependențele, caută vulnerabilități cunoscute (`npm audit`) și verifică dacă aplicația se construiește |
| `deploy` | Rulează **doar dacă verificarea a trecut**. Se conectează prin SSH și actualizează aplicația |

## Pasul 12 – Testează deploy-ul automat (15 min)

**12.1.** Fă o modificare vizibilă, de exemplu titlul din `frontend/src/App.jsx` devine `📝 Notițele mele`, apoi:

```bash
git add .
git commit -m "Lab 5: deploy automat"
git push
```

Pe GitHub, deschide tab-ul **Actions** și urmărește pipeline-ul. Când ambele etape sunt verzi ✅, reîncarcă site-ul: modificarea apare.

**12.2.** Verifică faptul că pipeline-ul **oprește** dependențele vulnerabile. Instalează intenționat o versiune veche, cu vulnerabilități cunoscute:

```bash
cd backend
npm install lodash@4.17.15
cd ..
git add . && git commit -m "test: dependenta veche" && git push
```

Etapa `verificare` trebuie să **eșueze** ❌ la `npm audit`, iar `deploy` nu mai rulează. Codul vulnerabil nu ajunge pe server.

Elimină pachetul și publică din nou:

```bash
cd backend
npm uninstall lodash
cd ..
git add . && git commit -m "elimin dependenta veche" && git push
```

📸 Fă capturi de ecran cu un pipeline reușit și cu cel oprit de `npm audit`.

## Întrebări de control

1. De ce aplicația ascultă doar pe `127.0.0.1:8080` și nu direct pe portul 80?
2. Ce protejează HTTPS? Ce **nu** protejează?
3. De ce cheia privată de deploy se pune în GitHub Secrets și nu în repository?
4. Ce avantaj are un pipeline care rulează `npm audit` înainte de deploy?

## Raportul final al cursului

1. Adresa aplicației tale, funcțională, cu HTTPS.
2. Un tabel cu **toate** problemele de securitate găsite în Laboratoarele 1–5 și cum le-ai reparat.
3. Ce ai mai securiza dacă aplicația ar avea utilizatori reali (minimum 3 idei).
4. Prezentare de 5 minute la ultima oră.

> 💰 La sfârșitul semestrului, după evaluare, **șterge serverul** din DigitalOcean (Droplet → Destroy).

## Probleme frecvente

| Problemă | Soluție |
|---|---|
| `502 Bad Gateway` | Aplicația nu rulează. Pe server: `cd ~/notes-app && docker compose ps` și `docker compose logs` |
| certbot: `Timeout during connect` | Portul 80 e blocat. Verifică `sudo ufw status` (Lab 4, Pasul 6) |
| Actions: `ssh: handshake failed` | Cheia publică nu e în `~/.ssh/authorized_keys` sau secretul `SSH_KEY` e incomplet |
| Actions: `git pull` cere parolă | Repository-ul tău trebuie să fie **Public** |
| Build-ul pe server se oprește | Serverul are prea puțină memorie. Folosește varianta cu 2 GB RAM |

## Variante – ce diferă de la un student la altul

Toți studenții urmează aceiași pași. Fiecare folosește însă **valorile din varianta lui** în locul valorilor date ca exemplu în fișă. Varianta ta este numărul tău din lista grupei (1–14). Scrie numărul variantei pe prima pagină a raportului.

- **Limitare:** valorile pentru `rate=` (în `limit_req_zone`) și `burst=` (în `limit_req`) (Pasul 6).
- **HSTS:** valoarea `max-age` din headerul `Strict-Transport-Security`, în secunde.
- **Header în plus:** un al șaselea header de securitate. Explică în raport ce face.
- **Sarcină în plus:** o configurare Nginx pe care o faci singur, cu ajutorul documentației (nginx.org).

| Var. | rate | burst | HSTS max-age | Header în plus | Sarcină în plus |
|---|---|---|---|---|---|
| 1 | `5r/s` | 10 | 86400 | `Permissions-Policy "camera=(), microphone=(), geolocation=()"` | pagină proprie pentru eroarea 502 (aplicația oprită) |
| 2 | `10r/s` | 20 | 604800 | `Cross-Origin-Opener-Policy "same-origin"` | pagină proprie pentru eroarea 429 (prea multe cereri) |
| 3 | `20r/s` | 40 | 2592000 | `Cross-Origin-Resource-Policy "same-origin"` | loguri Nginx separate: /var/log/nginx/notes_access.log |
| 4 | `8r/s` | 15 | 15768000 | `X-Permitted-Cross-Domain-Policies "none"` | pagină proprie pentru eroarea 404 |
| 5 | `15r/s` | 30 | 31536000 | `Permissions-Policy "geolocation=(), payment=()"` | limită de 5 cereri/s doar pentru /api/auth/ |
| 6 | `5r/s` | 5 | 604800 | `Cross-Origin-Opener-Policy "same-origin"` | pagină proprie pentru eroarea 502 (aplicația oprită) |
| 7 | `10r/s` | 10 | 2592000 | `Permissions-Policy "camera=(), microphone=()"` | loguri Nginx separate: /var/log/nginx/notes_access.log |
| 8 | `12r/s` | 24 | 86400 | `Cross-Origin-Resource-Policy "same-origin"` | pagină proprie pentru eroarea 429 (prea multe cereri) |
| 9 | `6r/s` | 12 | 15768000 | `X-Permitted-Cross-Domain-Policies "none"` | limită de 5 cereri/s doar pentru /api/auth/ |
| 10 | `20r/s` | 20 | 31536000 | `Permissions-Policy "usb=(), bluetooth=()"` | pagină proprie pentru eroarea 404 |
| 11 | `8r/s` | 8 | 2592000 | `Cross-Origin-Opener-Policy "same-origin"` | pagină proprie pentru eroarea 502 (aplicația oprită) |
| 12 | `15r/s` | 15 | 604800 | `Cross-Origin-Resource-Policy "same-site"` | limită de 5 cereri/s doar pentru /api/auth/ |
| 13 | `10r/s` | 30 | 15768000 | `Permissions-Policy "fullscreen=(self)"` | pagină proprie pentru eroarea 429 (prea multe cereri) |
| 14 | `5r/s` | 15 | 86400 | `X-Permitted-Cross-Domain-Policies "none"` | loguri Nginx separate: /var/log/nginx/notes_access.log |

**Atenție, valori din laboratoarele anterioare:**

- În loc de portul `8080`, folosește **portul tău din Laboratorul 1** (în `docker-compose.yml` și în `proxy_pass` din Nginx).
- În loc de utilizatorul `deploy`, folosește **utilizatorul tău din Laboratorul 4** (inclusiv la secretul `SSH_USER`).

**Cum verifică profesorul** (de la distanță):

```bash
curl -sI https://ADRESA_IP.sslip.io | grep -iE "strict-transport|permissions|cross-origin|x-permitted"
```
