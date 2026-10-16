CREATE TABLE users (
  id       SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE notes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  is_public  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Utilizatori de test
INSERT INTO users (username, password) VALUES
  ('alice', 'alice123'),
  ('bob',   'bob123');

-- Notițe de test
INSERT INTO notes (user_id, title, content, is_public) VALUES
  (1, 'Lista de cumpărături', 'Lapte, pâine, ouă', false),
  (1, 'Bun venit!', 'Aceasta este o notiță <b>publică</b>. Toți utilizatorii o pot vedea.', true),
  (2, 'Parola de la Wi-Fi', 'Rețeaua „Acasa”, parola: SuperSecret2026', false),
  (2, 'Examen', 'Examenul la securitate este pe <i>15 ianuarie</i>.', true);
