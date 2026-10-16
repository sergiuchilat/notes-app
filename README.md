# Notițe – aplicație pentru laboratoarele de securitate web

> ⚠️ **Aplicație vulnerabilă intenționat, creată pentru învățare.** Conține greșeli de securitate puse cu bună știință. Nu o publica pe internet în forma aceasta. Rulează versiunea vulnerabilă doar local (`localhost`).

Pe parcursul semestrului lucrezi pe această aplicație: **NestJS + React + PostgreSQL**, în Docker. Găsești vulnerabilitățile, le repari, apoi publici aplicația în siguranță pe propriul server.

## Laboratoare

| Lab | Tema | Fișa |
|---|---|---|
| 0 | Pregătirea spațiului de lucru (Linux sau Windows) | [laboratoare/lab0-pregatire](laboratoare/lab0-pregatire/README.md) |
| 1 | Pornește aplicația și găsește riscurile | [laboratoare/lab1-docker](laboratoare/lab1-docker/README.md) |
| 2 | SQL Injection și XSS | [laboratoare/lab2-injectii](laboratoare/lab2-injectii/README.md) |
| 3 | Securizează login-ul și accesul la date | [laboratoare/lab3-autentificare](laboratoare/lab3-autentificare/README.md) |
| 4 | Securizează serverul Linux (DigitalOcean) | [laboratoare/lab4-server-linux](laboratoare/lab4-server-linux/README.md) |
| 5 | Deploy și securizarea serverului web (Nginx, HTTPS, GitHub Actions) | [laboratoare/lab5-server-web](laboratoare/lab5-server-web/README.md) |

Fiecare fișă are la final tabelul cu **variantele individuale**.

## Prezentări

| Ora | Tema | Vizualizare în browser | Descărcare |
|---|---|---|---|
| 1 | Introducere în securitatea web și a serverelor | [PDF](prezentari/Lesson01_Introduction_to_Security.pdf) | [PowerPoint](https://github.com/sergiuchilat/notes-app/raw/main/prezentari/Lesson01_Introduction_to_Security.pptx) |

## Pornire rapidă

```bash
docker compose up -d --build
```

Deschide http://localhost:8080 și intră cu `alice` / `alice123`.

## Ce îți trebuie

- Laptop cu **Linux** (Ubuntu recomandat), minimum 8 GB RAM
- **Docker** și Docker Compose, **Node.js 22**, **Git**, **VS Code**
- Cont **GitHub** și cont **DigitalOcean** (din Lab 4)

## Reguli

- Atacurile se fac **doar** pe aplicația ta de pe laptop (`localhost`) și pe propriul server.
- Pe serverul public ajunge doar codul **reparat**.
- Fișierul `.env` (parole, chei) **nu** se urcă niciodată pe GitHub.
