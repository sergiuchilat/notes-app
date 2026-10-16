# Laboratorul 4 – Securizează serverul Linux

**Durată:** 90 de minute\
**Varianta ta:** valorile individuale sunt în tabelul de la **sfârșitul fișei**.\
**Unde lucrezi:** pe un server propriu în cloud (DigitalOcean) și pe laptop

## Ce vei învăța

- să creezi un server Linux în cloud;
- să te conectezi cu **cheie SSH** în loc de parolă;
- să blochezi accesul direct ca `root`;
- să configurezi un **firewall** (ufw);
- să blochezi automat atacatorii cu **Fail2ban**;
- să instalezi Docker în siguranță.

## Ce predai la final

1. Adresa IP a serverului tău.
2. Capturi de ecran de la fiecare verificare (Pasul 9).
3. Rezultatul comenzii `sudo fail2ban-client status sshd`.
4. Răspunsurile la întrebările de control.

> ⚠️ Serverul este **public**, pe internet. Pe el ajunge doar codul **reparat**. Versiunile vulnerabile ale aplicației rulează doar pe laptop.

> 💰 Serverul costă bani din creditul tău DigitalOcean. **Șterge-l la sfârșitul semestrului** (Droplet → Destroy).

## Pasul 1 – Creează o cheie SSH pe laptop (5 min)

O cheie SSH este o pereche de fișiere: una **privată** (rămâne doar la tine) și una **publică** (o pui pe server). Este mult mai sigură decât o parolă.

```bash
ssh-keygen -t ed25519 -C "emailul-tau@exemplu.com"
```

Apasă Enter la întrebări. Poți pune o parolă pentru cheie (recomandat). Afișează cheia **publică**:

```bash
cat ~/.ssh/id_ed25519.pub
```

> ⚠️ Fișierul `~/.ssh/id_ed25519` (fără `.pub`) este cheia **privată**. Nu o trimite nimănui.

## Pasul 2 – Creează serverul (10 min)

În DigitalOcean: **Create → Droplets**

| Setare | Valoare |
|---|---|
| Region | Frankfurt (FRA1) |
| Image | **Ubuntu 24.04 (LTS)** |
| Size | Basic → Regular → **2 GB / 1 CPU** |
| Authentication | **SSH Key** → New SSH Key → lipește cheia publică |
| Hostname | `notes-numeprenume` |

Apasă **Create Droplet** și notează **adresa IP** a serverului.

## Pasul 3 – Prima conectare și actualizări (10 min)

```bash
ssh root@ADRESA_IP
```

Actualizează sistemul:

```bash
apt update && apt upgrade -y
```

Dacă apare o fereastră despre servicii de repornit, apasă Enter.

## Pasul 4 – Creează un utilizator obișnuit (10 min)

Nu lucrăm ca `root`. Creăm utilizatorul `deploy`, care poate deveni administrator doar cu `sudo`:

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Ultima comandă copiază cheia ta SSH și pentru `deploy`.

**Fără să închizi** terminalul cu `root`, deschide un **terminal nou** pe laptop și verifică:

```bash
ssh deploy@ADRESA_IP
sudo whoami      # trebuie să afișeze: root
```

De acum lucrezi doar ca `deploy`.

## Pasul 5 – Securizează SSH (10 min)

Creează un fișier cu regulile noastre:

```bash
sudo nano /etc/ssh/sshd_config.d/01-hardening.conf
```

Scrie în el:

```
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
MaxAuthTries 3
```

| Regulă | Ce face |
|---|---|
| `PermitRootLogin no` | Nimeni nu se mai poate conecta direct ca `root` |
| `PasswordAuthentication no` | Conectare doar cu cheie SSH, parolele nu mai sunt acceptate |
| `MaxAuthTries 3` | Maximum 3 încercări pe conexiune |

> 💡 Numele începe cu `01-` intenționat: SSH citește fișierele în ordine alfabetică și folosește **prima** valoare găsită. Așa regulile noastre au prioritate.

Verifică și aplică:

```bash
sudo sshd -t
sudo systemctl restart ssh
sudo sshd -T | grep -E "permitrootlogin|passwordauthentication"
```

Într-un terminal nou de pe laptop, verifică faptul că `root` nu mai poate intra:

```bash
ssh root@ADRESA_IP      # trebuie să apară: Permission denied
```

## Pasul 6 – Firewall (10 min)

Permitem doar ce este necesar: SSH (22), HTTP (80) și HTTPS (443). Restul se blochează.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

> ⚠️ Comanda `ufw allow OpenSSH` trebuie dată **înainte** de `ufw enable`, altfel îți blochezi propriul acces.

## Pasul 7 – Fail2ban: blochează automat atacatorii (10 min)

Serverul tău este deja „vizitat” de boți care încearcă parole la SSH. Uită-te:

```bash
sudo journalctl -u ssh --since "1 hour ago" | grep -iE "invalid user|failed" | tail -n 10
```

Instalează Fail2ban:

```bash
sudo apt install -y fail2ban
sudo nano /etc/fail2ban/jail.local
```

Scrie în fișier:

```ini
[sshd]
enabled  = true
backend  = systemd
maxretry = 5
findtime = 10m
bantime  = 1h
```

Adică: cine greșește de 5 ori în 10 minute este blocat o oră.

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd
```

Revino peste o oră și rulează din nou ultima comandă: vei vedea adrese IP blocate.

## Pasul 8 – Actualizări automate și Docker (15 min)

**8.1. Actualizări de securitate automate**

```bash
sudo apt install -y unattended-upgrades
cat /etc/apt/apt.conf.d/20auto-upgrades
```

Ambele linii trebuie să aibă valoarea `"1"`.

**8.2. Instalează Docker**

```bash
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker deploy
exit
```

Conectează-te din nou (`ssh deploy@ADRESA_IP`) și verifică:

```bash
docker run --rm hello-world
```

> ⚠️ Cine face parte din grupul `docker` are practic drepturi de `root`. Adaugă în acest grup doar utilizatorii de încredere.

**8.3. Atenție: Docker ocolește firewall-ul!**

Pornește un container de test pe portul 8081:

```bash
docker run -d --name test -p 8081:80 nginx:alpine
```

Pe laptop, deschide `http://ADRESA_IP:8081`. Pagina se deschide, **deși ufw nu permite portul 8081**! Docker își scrie propriile reguli de firewall, înaintea celor din ufw.

Șterge containerul:

```bash
docker rm -f test
```

**Concluzie:** pe server, porturile containerelor se publică doar pe `127.0.0.1` (de exemplu `"127.0.0.1:8080:80"`). Așa vom face în Laboratorul 5.

## Pasul 9 – Verifică (10 min)

Pe laptop, instalează `nmap` și scanează **doar serverul tău**:

```bash
sudo apt install -y nmap
nmap -Pn ADRESA_IP
```

- [ ] `nmap` arată deschis doar portul `22` (80 și 443 se deschid în Laboratorul 5)
- [ ] `ssh root@ADRESA_IP` → `Permission denied`
- [ ] `sudo sshd -T | grep passwordauthentication` → `no`
- [ ] `sudo ufw status` → `active`, cu regulile pentru 22, 80, 443
- [ ] `sudo fail2ban-client status sshd` → jail-ul este activ
- [ ] `docker run --rm hello-world` merge ca utilizator `deploy`

📸 Fă capturi de ecran cu rezultatele.

## Întrebări de control

1. De ce este o cheie SSH mai sigură decât o parolă?
2. De ce nu lucrăm direct ca `root`?
3. Ce face Fail2ban și de ce este util pe un server public?
4. De ce trebuie publicate porturile Docker doar pe `127.0.0.1`?

## Probleme frecvente

| Problemă | Soluție |
|---|---|
| `Permission denied (publickey)` ca `deploy` | Repetă comanda `rsync` din Pasul 4, conectat ca `root` |
| Te-ai blocat singur afară | DigitalOcean → Droplet → **Access → Launch Recovery Console** |
| `sshd -t` dă eroare | Ai o greșeală de scriere în `01-hardening.conf` |
| `docker: permission denied` | Deloghează-te și conectează-te din nou după `usermod` |

## Variante – ce diferă de la un student la altul

Toți studenții urmează aceiași pași. Fiecare folosește însă **valorile din varianta lui** în locul valorilor date ca exemplu în fișă. Varianta ta este numărul tău din lista grupei (1–14). Scrie numărul variantei pe prima pagină a raportului.

- **Utilizator:** în loc de `deploy`, creează un utilizator cu **prenumele tău** (litere mici, fără diacritice). Folosește-l peste tot unde fișa spune `deploy`.
- **Fail2ban:** valorile pentru `maxretry`, `findtime`, `bantime` din `jail.local` (Pasul 7).
- **Regulă SSH în plus:** o linie (sau două) în plus în `01-hardening.conf` (Pasul 5). Află din documentație (`man sshd_config`) ce face și explică în raport. La `AllowUsers`, pune numele utilizatorului tău.

| Var. | maxretry | findtime | bantime | Regulă SSH în plus |
|---|---|---|---|---|
| 1 | 3 | 10m | 1h | `MaxAuthTries 2` |
| 2 | 5 | 10m | 2h | `LoginGraceTime 30` |
| 3 | 4 | 5m | 24h | `ClientAliveInterval 300 + ClientAliveCountMax 2` |
| 4 | 3 | 30m | 12h | `AllowUsers deploy` |
| 5 | 5 | 5m | 1h | `MaxSessions 3` |
| 6 | 4 | 10m | 6h | `LoginGraceTime 20` |
| 7 | 3 | 10m | 24h | `MaxAuthTries 2` |
| 8 | 5 | 30m | 2h | `AllowUsers deploy` |
| 9 | 4 | 5m | 1h | `ClientAliveInterval 600 + ClientAliveCountMax 1` |
| 10 | 3 | 5m | 6h | `MaxSessions 2` |
| 11 | 5 | 10m | 12h | `LoginGraceTime 45` |
| 12 | 4 | 30m | 24h | `AllowUsers deploy` |
| 13 | 3 | 30m | 2h | `MaxAuthTries 2` |
| 14 | 5 | 5m | 6h | `ClientAliveInterval 300 + ClientAliveCountMax 3` |
