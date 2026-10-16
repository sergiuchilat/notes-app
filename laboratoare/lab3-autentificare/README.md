# Laboratorul 3 – Securizează login-ul și accesul la date

**Durată:** 90 de minute\
**Varianta ta:** valorile individuale sunt în tabelul de la **sfârșitul fișei**.\
**Unde lucrezi:** pe laptopul tău, în aplicația „Notițe” (după Laboratoarele 1 și 2)

## Ce vei învăța

- cum se salvează corect parolele (**hashing** cu bcrypt);
- cum faci ca token-ul de login (JWT) să **expire**;
- cum te asiguri că fiecare utilizator are acces **doar la datele lui** (autorizare);
- cum limitezi numărul de încercări de login.

## Ce predai la final

1. Lista problemelor găsite la revizuirea codului (Pasul 1).
2. Codul reparat (link către commit-ul de pe GitHub).
3. Capturi de ecran de la verificarea finală (Pasul 6).
4. Răspunsurile la întrebările de control.

## Pasul 1 – Revizuirea codului (15 min)

Citește fișierele de mai jos și răspunde la întrebări. Notează răspunsurile în raport.

**Parolele** – `backend/src/auth.controller.ts` și baza de date:

```bash
docker compose exec db psql -U notes -d notes -c "SELECT id, username, password FROM users;"
```

- Cum sunt salvate parolele? Ce s-ar întâmpla dacă cineva ar copia baza de date?

**Token-ul de login** – `backend/src/auth.ts`:

- Token-ul are o dată de expirare? Ce se întâmplă dacă cineva îl copiază?

**Accesul la notițe** – `backend/src/notes.controller.ts`, funcțiile `get` și `remove`:

- Compară interogarea SQL din `list` cu cea din `get`. Ce condiție lipsește din `get` și din `remove`?

**Încercările de login:**

- Există vreo limită pentru câte parole poate încerca cineva pe minut?

## Pasul 2 – Salvează parolele ca hash (20 min)

O parolă nu se salvează niciodată în clar. Se salvează un **hash**: un rezultat dintr-o funcție care nu poate fi inversată. La login comparăm parola primită cu hash-ul.

**2.1.** Instalează biblioteca bcrypt:

```bash
cd backend
npm install bcryptjs
cd ..
```

**2.2.** În `auth.controller.ts`, importă biblioteca:

```typescript
import * as bcrypt from 'bcryptjs';
```

**2.3.** La **înregistrare** (`register`):

- cere o parolă de minimum 8 caractere;
- salvează hash-ul, nu parola:

```typescript
const hash = await bcrypt.hash(password, 10);
// în INSERT folosește hash în loc de password
```

**2.4.** La **login**:

- caută utilizatorul doar după nume (cu interogare parametrizată, `$1`);
- verifică parola cu `bcrypt.compare`:

```typescript
const result = await this.db.query(
  'SELECT id, username, password FROM users WHERE username = $1',
  [username],
);
const user = result.rows[0];
if (!user || !(await bcrypt.compare(password, user.password))) {
  throw new UnauthorizedException('Utilizator sau parolă greșită');
}
```

> 💡 Mesajul de eroare este același pentru „utilizator inexistent” și „parolă greșită”. Altfel, oricine ar putea afla ce conturi există.

**2.5.** Transformă în hash parolele utilizatorilor deja existenți:

```bash
docker compose exec db psql -U notes -d notes -c \
  "CREATE EXTENSION IF NOT EXISTS pgcrypto; UPDATE users SET password = crypt(password, gen_salt('bf', 10)) WHERE password NOT LIKE '\$2%';"
```

## Pasul 3 – Token-ul trebuie să expire (5 min)

În `backend/src/auth.ts`, în funcția `createToken`, adaugă o expirare de o oră:

```typescript
return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
```

## Pasul 4 – Fiecare vede doar notițele lui (15 min)

Faptul că un utilizator este **autentificat** nu înseamnă că are voie să vadă **orice** notiță. Trebuie verificat și că notița **îi aparține** (autorizare).

În `notes.controller.ts`, în funcțiile `get` și `remove`:

- adaugă `@Req() req` ca parametru;
- folosește `ParseIntPipe`, ca `id` să fie obligatoriu un număr: `@Param('id', ParseIntPipe) id: number`;
- adaugă în interogare condiția `AND user_id = $2`, cu valoarea `req.user.sub`:

```typescript
'SELECT id, title, content, is_public, created_at FROM notes WHERE id = $1 AND user_id = $2',
[id, req.user.sub],
```

- la `remove`, dacă nu s-a șters nimic (`result.rowCount === 0`), răspunde cu `NotFoundException`.

## Pasul 5 – Limitează încercările de login (15 min)

**5.1.** Instalează modulul de limitare:

```bash
cd backend
npm install @nestjs/throttler
cd ..
```

**5.2.** În `app.module.ts`, adaugă modulul:

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }])],
  // ... restul rămâne la fel
})
```

**5.3.** În `auth.controller.ts`, protejează controller-ul și pune o limită mai strictă pe login, de **5 încercări pe minut**:

```typescript
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  // ...

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(...) { ... }
}
```

**5.4.** Reconstruiește aplicația:

```bash
docker compose up -d --build
```

## Pasul 6 – Verifică (15 min)

- [ ] Te poți loga cu `alice` / `alice123`
- [ ] Un cont nou cu parola `123` este refuzat (minimum 8 caractere)
- [ ] În baza de date, toate parolele încep cu `$2a$` sau `$2b$` (sunt hash-uri):

```bash
docker compose exec db psql -U notes -d notes -c "SELECT username, password FROM users;"
```

- [ ] Logat ca `alice`, cererea pentru o notiță a lui `bob` răspunde cu `404`. Ia token-ul din browser (DevTools → Application → Local Storage → `token`):

```bash
TOKEN="lipeste-aici-tokenul-lui-alice"
curl -s http://localhost:8080/api/notes/3 -H "Authorization: Bearer $TOKEN"
```

- [ ] După 5 parole greșite într-un minut, login-ul răspunde cu `429 Too Many Requests`:

```bash
for i in $(seq 1 8); do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" -d '{"username":"alice","password":"gresit"}'
done; echo
```

- [ ] Decodează token-ul tău pe https://jwt.io: are câmpul `exp` (data expirării)

📸 Fă capturi de ecran cu rezultatele, apoi salvează pe GitHub:

```bash
git add .
git commit -m "Lab 3: bcrypt, expirare JWT, autorizare, limitare login"
git push
```

## Întrebări de control

1. Care e diferența dintre **criptare** și **hashing**? De ce folosim hashing pentru parole?
2. Care e diferența dintre **autentificare** și **autorizare**? Dă un exemplu din această aplicație.
3. De ce e important ca token-ul să expire?
4. Ce tip de atac oprește limitarea încercărilor de login?

## Probleme frecvente

| Problemă | Soluție |
|---|---|
| Nu mă mai pot loga după Pasul 2 | Ai uitat Pasul 2.5 (hash pentru parolele existente) |
| `Cannot find module 'bcryptjs'` | Rulează `npm install` în `backend`, apoi `docker compose up -d --build` |
| Primesc mereu `429` | Așteaptă un minut. Limita se resetează |
| `401` la `curl` | Token-ul a expirat sau e copiat greșit. Loghează-te din nou și copiază-l iar |

## Variante – ce diferă de la un student la altul

Toți studenții urmează aceiași pași. Fiecare folosește însă **valorile din varianta lui** în locul valorilor date ca exemplu în fișă. Varianta ta este numărul tău din lista grupei (1–14). Scrie numărul variantei pe prima pagină a raportului.

- **Parolă minimă:** lungimea minimă a parolei la înregistrare (Pasul 2.3).
- **Expirare JWT:** valoarea pentru `expiresIn` (Pasul 3).
- **Limită login:** încercări permise / interval, în `@Throttle` (Pasul 5.3). Exemplu: `5 / 5 min` înseamnă `{ limit: 5, ttl: 300000 }`.
- **Regulă în plus:** o validare suplimentară pe care o implementezi singur. Mesajul de eroare trebuie să fie clar pentru utilizator.

| Var. | Parolă minimă | Expirare JWT | Limită login | Regulă în plus |
|---|---|---|---|---|
| 1 | 8 caractere | `15m` | 3 / 1 min | parola conține cel puțin o cifră |
| 2 | 10 caractere | `30m` | 5 / 1 min | parola nu poate fi egală cu numele de utilizator |
| 3 | 12 caractere | `1h` | 5 / 5 min | numele de utilizator: doar litere și cifre, 3–20 caractere |
| 4 | 10 caractere | `2h` | 10 / 10 min | parola conține o literă mare și o cifră |
| 5 | 12 caractere | `30m` | 3 / 5 min | titlul notiței: maximum 100 de caractere |
| 6 | 8 caractere | `15m` | 4 / 1 min | parola conține cel puțin un caracter special (!@#$...) |
| 7 | 12 caractere | `1h` | 5 / 1 min | numele de utilizator: doar litere mici, 3–15 caractere |
| 8 | 10 caractere | `2h` | 3 / 1 min | conținutul notiței: maximum 2000 de caractere |
| 9 | 8 caractere | `1h` | 10 / 10 min | parola nu poate conține cuvântul „parola” sau „password” |
| 10 | 12 caractere | `15m` | 5 / 5 min | parola conține o literă mare și o literă mică |
| 11 | 10 caractere | `2h` | 4 / 1 min | numele de utilizator nu poate fi „admin” sau „root” |
| 12 | 8 caractere | `30m` | 3 / 5 min | titlul notiței: minimum 3 caractere |
| 13 | 12 caractere | `1h` | 5 / 1 min | parola nu poate începe sau termina cu spațiu |
| 14 | 10 caractere | `15m` | 4 / 1 min | parola conține cel puțin două cifre |
