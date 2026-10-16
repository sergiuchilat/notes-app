# Pregătirea spațiului de lucru (pentru Laboratoarele 1–3)

Fă acești pași **acasă, înainte de Laboratorul 1**. Durează 45–60 de minute și ai nevoie de internet (se descarcă aproximativ 3 GB).

## Ce vei instala

| Program | La ce folosește |
|---|---|
| **Docker** + Docker Compose | Pornește aplicația „Notițe” (3 containere) |
| **Git** + **GitHub CLI** (`gh`) | Descarci aplicația și îți salvezi munca pe GitHub |
| **Node.js 22** | Instalezi biblioteci noi în aplicație (Lab 2 și Lab 3) |
| **VS Code** | Editezi codul |
| `curl`, `openssl`, `nano` | Comenzi folosite în fișele de laborator |
| **WSL2 + Ubuntu** | *Doar pe Windows:* un Linux complet, în interiorul Windows |

Tot software-ul este **gratuit**.

## Alege varianta ta

- Ai **Linux** (Ubuntu, Linux Mint) → urmează **Partea A**, apoi **Partea C**.
- Ai **Windows 10 sau 11** → urmează **Partea B**, apoi **Partea C**.

> 💡 Pe Windows vei lucra tot în Linux (Ubuntu, prin WSL2). Așa toate comenzile din fișele de laborator merg la fel pentru toată lumea.

# Partea A – Linux (Ubuntu 22.04 / 24.04 sau Linux Mint)

Deschide un terminal (`Ctrl + Alt + T`) și rulează comenzile pe rând. La `sudo` ți se cere parola ta de utilizator. Parola nu apare pe ecran când o scrii; e normal.

## A1. Actualizează sistemul și instalează uneltele de bază

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git openssl nano
```

## A2. Instalează Docker

Adaugă depozitul oficial Docker:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Instalează Docker și Docker Compose:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Permite-i utilizatorului tău să folosească Docker fără `sudo`:

```bash
sudo usermod -aG docker $USER
```

**Deloghează-te și loghează-te din nou** (sau repornește calculatorul), apoi verifică:

```bash
docker run --rm hello-world
```

Trebuie să apară mesajul `Hello from Docker!`.

## A3. Instalează Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v       # trebuie să afișeze v22.x
```

## A4. Instalează GitHub CLI

```bash
sudo mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install -y gh
gh --version
```

## A5. Instalează VS Code

1. Descarcă fișierul **.deb** de pe https://code.visualstudio.com/download
2. Instalează-l:

```bash
sudo apt install -y ~/Downloads/code_*.deb
```

Dacă sistemul tău e în română, folderul se poate numi `~/Descărcări` în loc de `~/Downloads`.

Pornește VS Code din meniu sau din terminal, cu `code`.

➡️ **Continuă cu Partea C.**

# Partea B – Windows 10 / Windows 11

Pe Windows instalezi întâi **WSL2**: un Ubuntu adevărat care rulează în Windows. Apoi instalezi toate uneltele în Ubuntu, exact ca pe Linux.

## B1. Verifică cerințele

**Versiunea de Windows:** apasă `Win + R`, scrie `winver` și apasă Enter.

| Windows | Ce îți trebuie |
|---|---|
| **Windows 11** | Orice versiune, merge |
| **Windows 10** | Versiunea **22H2** (build **19045** sau mai mare) |

> ⚠️ **Ai Windows 10?** Dacă versiunea este mai veche de 22H2, rulează întâi **Windows Update** (Setări → Actualizare și securitate → Windows Update) până la ultima versiune. Fără ea, WSL2 nu se instalează corect.

**Virtualizarea:** deschide **Task Manager** (`Ctrl + Shift + Esc`) → tab-ul **Performance** → **CPU**. În dreapta jos trebuie să scrie **Virtualization: Enabled**.

Dacă scrie **Disabled**, activeaz-o din BIOS/UEFI. Repornește calculatorul, intră în BIOS (de obicei cu tasta `F2`, `F10`, `Del` sau `Esc` la pornire) și activează opțiunea **Intel Virtualization Technology (VT-x)** sau **AMD SVM**. Dacă nu te descurci, cere ajutorul profesorului.

**Memoria:** minimum 8 GB RAM.

## B2. Instalează WSL2 și Ubuntu

1. Apasă **Start**, scrie `PowerShell`, apoi click dreapta → **Run as administrator**.
2. Rulează:

```powershell
wsl --install -d Ubuntu-24.04
```

3. **Repornește calculatorul** când ți se cere.
4. După repornire se deschide o fereastră **Ubuntu** (dacă nu, pornește **Ubuntu** din meniul Start). Așteaptă instalarea, apoi alege:
   - un **nume de utilizator** Linux (litere mici, fără spații, de exemplu `ion`);
   - o **parolă**. Nu apare pe ecran când o scrii; e normal. Țin-o minte: o vei folosi la `sudo`.

**Verifică** în PowerShell:

```powershell
wsl -l -v
```

În coloana `VERSION` trebuie să fie **2**. Dacă este 1:

```powershell
wsl --set-version Ubuntu-24.04 2
```

> 💡 Dacă `wsl --install` doar afișează un text de ajutor sau dă eroare, rulează întâi `wsl --update`, apoi încearcă din nou.

## B3. Activează systemd în Ubuntu (necesar pentru Docker)

În fereastra **Ubuntu**:

```bash
cat /etc/wsl.conf
```

Dacă **nu** apare `systemd=true`, rulează:

```bash
printf "[boot]\nsystemd=true\n" | sudo tee /etc/wsl.conf
```

Apoi, în **PowerShell**, repornește WSL:

```powershell
wsl --shutdown
```

Redeschide **Ubuntu** din meniul Start.

## B4. Instalează uneltele în Ubuntu

De aici înainte lucrezi **doar în fereastra Ubuntu**, nu în PowerShell.

Rulează **exact pașii A1, A2, A3 și A4 din Partea A**, în fereastra Ubuntu.

La pasul A2, în loc de „deloghează-te și loghează-te din nou”, închide fereastra Ubuntu, rulează `wsl --shutdown` în PowerShell și redeschide Ubuntu. Apoi verifică:

```bash
docker run --rm hello-world
```

## B5. Instalează VS Code pe Windows

1. Descarcă și instalează VS Code **pentru Windows** de pe https://code.visualstudio.com/download
2. În VS Code, deschide **Extensions** (`Ctrl + Shift + X`), caută **WSL** (de la Microsoft) și apasă **Install**.
3. Verifică: în fereastra Ubuntu scrie `code .`. VS Code se deschide și în colțul din stânga jos apare **WSL: Ubuntu-24.04**.

## B6. Reguli importante pe Windows

- Ține proiectele **în Ubuntu**, în folderul tău (`cd ~`), **nu** în `C:\` (`/mnt/c/...`). Altfel totul merge foarte încet.
- Comenzile din fișe se rulează în fereastra **Ubuntu**.
- Aplicațiile pornite în Ubuntu se deschid în browserul din Windows, la adresa obișnuită (de exemplu http://localhost:8080).

> 💡 **Alternativă:** dacă preferi **Docker Desktop** pentru Windows, instalează-l de pe docker.com. Apoi, în Settings → Resources → **WSL Integration**, activează Ubuntu-24.04 și **sari peste pasul A2**. Nu instala ambele variante de Docker.

➡️ **Continuă cu Partea C.**

# Partea C – Pentru toți: Git, GitHub și verificarea finală

Pe Windows, comenzile din această parte se rulează în fereastra **Ubuntu**.

## C1. Spune-i lui Git cine ești

```bash
git config --global user.name "Prenume Nume"
git config --global user.email "emailul-tau@exemplu.com"
```

Folosește același email ca la contul de GitHub.

## C2. Cont GitHub și conectare

1. Dacă nu ai cont, creează-l gratuit pe https://github.com/signup
2. Conectează-te din terminal:

```bash
gh auth login
```

Alege, pe rând: **GitHub.com** → **HTTPS** → **Yes** (autentificare Git) → **Login with a web browser**.

Copiază codul afișat, deschide https://github.com/login/device în browser, lipește codul și confirmă.

Verifică:

```bash
gh auth status        # trebuie să apară: Logged in to github.com
```

## C3. Verificarea finală

Rulează comenzile de mai jos. Fiecare trebuie să afișeze o versiune, fără erori:

```bash
docker --version
docker compose version
git --version
gh --version
node -v               # v22.x
npm -v
openssl version
```

**Testul complet:** descarcă și pornește aplicația de laborator, ca să fii sigur că totul merge:

```bash
cd ~
git clone https://github.com/sergiuchilat/notes-app.git test-notes
cd test-notes
docker compose up -d --build
```

Prima pornire durează câteva minute. Apoi deschide în browser **http://localhost:8080** și intră cu `alice` / `alice123`. Dacă vezi notițele, spațiul tău de lucru este gata. ✅

Oprește și șterge testul (în Lab 1 îți vei face propria copie):

```bash
docker compose down -v
cd ~
rm -rf test-notes
```

📸 **Adu la Laboratorul 1** o captură de ecran cu rezultatul comenzilor de verificare și cu aplicația deschisă în browser.

## Probleme frecvente

| Problemă | Soluție |
|---|---|
| `permission denied ... docker.sock` | Ai uitat să te deloghezi după `usermod`. Linux: deloghează-te și loghează-te din nou. Windows: `wsl --shutdown` în PowerShell, apoi redeschide Ubuntu |
| `Cannot connect to the Docker daemon` | Linux: `sudo systemctl start docker`. Windows: verifică pasul B3 (systemd), apoi `sudo systemctl start docker` |
| `port is already allocated` la 8080 | Alt program folosește portul. Repornește calculatorul sau oprește programul respectiv |
| Windows: `Virtualization: Disabled` | Activeaz-o din BIOS (pasul B1) |
| Windows: `wsl` nu este recunoscut | Windows 10 prea vechi. Rulează Windows Update până la versiunea 22H2 |
| Windows: totul merge foarte încet | Proiectul e în `/mnt/c/...`. Mută-l în folderul tău din Ubuntu (`cd ~`) |
| `node -v` arată altă versiune decât 22 | Repetă pasul A3 |
| `gh auth login` nu deschide browserul | Deschide manual https://github.com/login/device și introdu codul |
