import { useEffect, useState } from 'react';
import { api } from './api';

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('username'));

  function onLogin({ token, username }) {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    setUser(username);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
  }

  return (
    <main>
      <header>
        <h1>📝 Notițe</h1>
        {user && (
          <div>
            Salut, <strong>{user}</strong> <button onClick={logout}>Ieșire</button>
          </div>
        )}
      </header>
      {user ? <Notes onAuthError={logout} /> : <AuthForm onLogin={onLogin} />}
    </main>
  );
}

function AuthForm({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      onLogin(await api('/auth/' + mode, { method: 'POST', body: { username, password } }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Autentificare' : 'Cont nou'}</h2>
      <input placeholder="Utilizator" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="Parolă" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button type="submit">{mode === 'login' ? 'Intră' : 'Creează contul'}</button>
      <p>
        <a href="#" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Nu ai cont? Creează unul' : 'Ai deja cont? Autentifică-te'}
        </a>
      </p>
    </form>
  );
}

function Notes({ onAuthError }) {
  const [tab, setTab] = useState('mine');
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const path = tab === 'mine' ? '/notes?search=' + encodeURIComponent(search) : '/notes/public';
      setNotes(await api(path));
    } catch (err) {
      if (err.message.includes('autentificat')) onAuthError();
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [tab]);

  async function remove(id) {
    await api('/notes/' + id, { method: 'DELETE' });
    load();
  }

  return (
    <>
      <nav>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>Notițele mele</button>
        <button className={tab === 'public' ? 'active' : ''} onClick={() => setTab('public')}>Notițe publice</button>
      </nav>

      {tab === 'mine' && (
        <>
          <NewNote onCreated={load} />
          <form className="search" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <input placeholder="Caută după titlu..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="submit">Caută</button>
          </form>
        </>
      )}

      {error && <p className="error">{error}</p>}

      {notes.map((note) => (
        <article className="card" key={note.id}>
          <h3>{note.title}</h3>
          {note.username && <small>de {note.username}</small>}
          {/* Permitem formatare HTML în notițe (bold, italic...) */}
          <div dangerouslySetInnerHTML={{ __html: note.content }} />
          {tab === 'mine' && <button onClick={() => remove(note.id)}>Șterge</button>}
        </article>
      ))}
    </>
  );
}

function NewNote({ onCreated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  async function submit(e) {
    e.preventDefault();
    await api('/notes', { method: 'POST', body: { title, content, isPublic } });
    setTitle('');
    setContent('');
    setIsPublic(false);
    onCreated();
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Notiță nouă</h2>
      <input placeholder="Titlu" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea placeholder="Conținut (poți folosi <b>, <i>)" value={content} onChange={(e) => setContent(e.target.value)} />
      <label>
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Publică (o văd toți)
      </label>
      <button type="submit">Salvează</button>
    </form>
  );
}
