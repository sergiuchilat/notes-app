# Laboratorul 2 – SQL Injection și XSS

**Durată:** 90 de minute\
**Varianta ta:** valorile individuale sunt în tabelul de la **sfârșitul fișei**.\
**Unde lucrezi:** pe laptopul tău, în aplicația „Notițe” din Laboratorul 1

## Ce vei învăța

- ce este SQL Injection și cum se previne cu interogări parametrizate;
- ce este XSS și cum se previne la afișarea conținutului în React;
- cum se validează datele primite de la utilizator.

## Ce predai la final

1. Problemele găsite și explicația lor.
2. Codul reparat (link către commit-ul de pe GitHub).
3. Capturi de ecran înainte și după reparare.
4. Răspunsurile la întrebările de control.

> ⚠️ Testele se fac **doar pe aplicația ta, pe laptopul tău** (`localhost`).

## Pașii laboratorului

> ✏️ **De completat de profesor.**

## Întrebări de control

1. De ce o interogare parametrizată oprește SQL Injection?
2. De ce este periculos `dangerouslySetInnerHTML` în React?
3. Ce informații nu trebuie afișate utilizatorului într-un mesaj de eroare?

## Variante – ce diferă de la un student la altul

Toți studenții urmează aceiași pași. Fiecare folosește însă **valorile din varianta lui**. Varianta ta este numărul tău din lista grupei (1–14). Scrie numărul variantei pe prima pagină a raportului.

- **Căutare în:** câmpul (sau câmpurile) în care caută funcția de căutare a notițelor. Scrie interogarea **parametrizată** (`$1`, `$2`), fără text lipit în SQL.
- **Lungime maximă căutare:** dacă textul căutat e mai lung, API-ul răspunde cu o eroare clară (`400 Bad Request`).
- **Tag-uri HTML permise:** singurele tag-uri pe care le păstrează DOMPurify la afișarea notițelor. Toate celelalte se elimină:

```javascript
DOMPurify.sanitize(note.content, { ALLOWED_TAGS: ['b', 'i'], ALLOWED_ATTR: [] })
```

| Var. | Căutare în | Lungime maximă căutare | Tag-uri HTML permise |
|---|---|---|---|
| 1 | titlu | 30 caractere | `b, i` |
| 2 | conținut | 50 caractere | `b, i, u` |
| 3 | titlu sau conținut | 100 caractere | `strong, em` |
| 4 | titlu | 40 caractere | `b, i, br` |
| 5 | conținut | 60 caractere | `b, i, ul, li` |
| 6 | titlu sau conținut | 80 caractere | `strong, em, br` |
| 7 | titlu | 20 caractere | `b, u` |
| 8 | conținut | 30 caractere | `i, u, br` |
| 9 | titlu sau conținut | 50 caractere | `b, i, u, br` |
| 10 | titlu | 100 caractere | `strong, em, ul, li` |
| 11 | conținut | 40 caractere | `b, i, p` |
| 12 | titlu sau conținut | 60 caractere | `em, br` |
| 13 | titlu | 80 caractere | `b, i, ol, li` |
| 14 | conținut | 20 caractere | `strong, u` |
