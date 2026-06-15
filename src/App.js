import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import rosaImportata from "./data/mia-rosa.json";
import { FaSun, FaMoon, FaShieldAlt, FaFutbol, FaRunning, FaGlobe } from "react-icons/fa";

function App() {
  const [players, setPlayers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editedPlayers, setEditedPlayers] = useState([]);
  const [theme, setTheme] = useState("light");
  const [formation, setFormation] = useState(null);
  const [selectedModulo, setSelectedModulo] = useState("3-4-3");
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [upcomingMatches, setUpcomingMatches] = useState([]);

  const importaRosaInFirebase = async () => {
    try {
      await Promise.all(
        rosaImportata.map((p) => setDoc(doc(db, "rosa", p.name), p))
      );
      alert("✅ Rosa importata con successo!");
    } catch (err) {
      console.error("Errore importazione:", err);
    }
  };

  useEffect(() => {
    const fetchPlayersFromFirebase = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "rosa"));
        const playersData = querySnapshot.docs.map((doc) => doc.data());
        const sorted = playersData.sort((a, b) => {
          if (a.role !== b.role) return a.role.localeCompare(b.role);
          return a.name.localeCompare(b.name);
        });
        setPlayers(sorted);
        setEditedPlayers(sorted);
      } catch (error) {
        console.error("Errore caricamento rosa:", error);
      }
    };
    fetchPlayersFromFirebase();
  }, []);

  const savePlayersToFirebase = async () => {
    try {
      await Promise.all(
        editedPlayers.map((p) => setDoc(doc(db, "rosa", p.name), p))
      );
      setPlayers(editedPlayers);
      setEditing(false);
      alert("Rosa salvata su cloud");
    } catch (error) {
      console.error("Errore salvataggio:", error);
    }
  };

  const calculateOptimalFormation = () => {
    const rolesCount = {
      "3-4-3": { P: 1, D: 3, C: 4, A: 3 },
      "4-3-3": { P: 1, D: 4, C: 3, A: 3 },
      "3-5-2": { P: 1, D: 3, C: 5, A: 2 },
      "4-4-2": { P: 1, D: 4, C: 4, A: 2 },
      "4-5-1": { P: 1, D: 4, C: 5, A: 1 },
      "5-3-2": { P: 1, D: 5, C: 3, A: 2 }
    };
    const schema = rolesCount[selectedModulo];
    const selected = [];
    ["P", "D", "C", "A"].forEach((role) => {
      const filtered = players.filter((p) => p.role === role);
      filtered.sort((a, b) => parseFloat(b.fantamedia || 0) - parseFloat(a.fantamedia || 0));
      selected.push(...filtered.slice(0, schema[role]));
    });
    setFormation({ modulo: selectedModulo, titolari: selected });
  };

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/news");
        const data = await res.json();
        setNews(data);
        setLoadingNews(false);
      } catch (err) {
        console.error("News fetch error:", err);
        setLoadingNews(false);
      }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const res = await fetch("https://v3.football.api-sports.io/fixtures?league=135&season=2025&next=5", {
          headers: { "x-apisports-key": "86d2e487d6ef49e5e3619d086e1448a6" }
        });
        const data = await res.json();
        const matches = data.response.map((f) => `${new Date(f.fixture.date).toLocaleDateString("it-IT")} – ${f.teams.home.name} vs ${f.teams.away.name}`);
        setUpcomingMatches(matches);
      } catch (err) {
        console.error("Fixtures error:", err);
      }
    };
    fetchFixtures();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const getIconByRole = (role) => {
    switch (role) {
      case "P": return <FaGlobe color="orange" title="Portiere" />;
      case "D": return <FaShieldAlt color="green" title="Difensore" />;
      case "C": return <FaRunning color="skyblue" title="Centrocampista" />;
      case "A": return <FaFutbol color="red" title="Attaccante" />;
      default: return null;
    }
  };

  return (
    <div className={`app ${theme}`}>
      <header>
        <h1>Sacha Fantacalcio Hub</h1>
        <button onClick={toggleTheme}>{theme === "light" ? <FaMoon /> : <FaSun />}</button>
      </header>

      <section>
        <h2>La mia Rosa</h2>
        <button onClick={importaRosaInFirebase}>Importa rosa da JSON</button>
        {editing ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Costo</th><th>Nome</th><th>Ruolo</th><th>Squadra</th><th>FM</th></tr>
              </thead>
              <tbody>
                {editedPlayers.map((p, i) => (
                  <tr key={i} className={p.role}>
                    <td><input value={p.costo} onChange={e => { const copy = [...editedPlayers]; copy[i].costo = e.target.value; setEditedPlayers(copy); }} /></td>
                    <td><input value={p.name} onChange={e => { const copy = [...editedPlayers]; copy[i].name = e.target.value; setEditedPlayers(copy); }} /></td>
                    <td><input value={p.role} onChange={e => { const copy = [...editedPlayers]; copy[i].role = e.target.value; setEditedPlayers(copy); }} /></td>
                    <td><input value={p.team} onChange={e => { const copy = [...editedPlayers]; copy[i].team = e.target.value; setEditedPlayers(copy); }} /></td>
                    <td><input value={p.fantamedia} onChange={e => { const copy = [...editedPlayers]; copy[i].fantamedia = e.target.value; setEditedPlayers(copy); }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setEditing(false)}>Chiudi</button>
            <button onClick={savePlayersToFirebase}>Salva</button>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Ruolo</th><th>Nome</th><th>Squadra</th><th>Costo</th><th>FM</th></tr></thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={i} className={p.role}>
                      <td>{getIconByRole(p.role)}</td>
                      <td>{p.name}</td>
                      <td>{p.team}</td>
                      <td>{p.costo}</td>
                      <td>{p.fantamedia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setEditing(true)}>Modifica rosa</button>
          </>
        )}
      </section>

      <section>
        <h2>Formazione AI</h2>
        <select value={selectedModulo} onChange={(e) => setSelectedModulo(e.target.value)}>
          {["3-4-3", "4-3-3", "3-5-2", "4-4-2", "4-5-1", "5-3-2"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button onClick={calculateOptimalFormation}>Calcola formazione</button>
        {formation && (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Ruolo</th><th>Nome</th><th>Squadra</th><th>FM</th></tr></thead>
              <tbody>
                {formation.titolari.map((p, i) => (
                  <tr key={i} className={p.role}>
                    <td>{getIconByRole(p.role)}</td>
                    <td>{p.name}</td>
                    <td>{p.team}</td>
                    <td>{p.fantamedia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Ultime Notizie</h2>
        {loadingNews ? <p>Caricamento...</p> : (
          <ul>{news.slice(0, 10).map((n, i) => (<li key={i}><a href={n.guid}>{n.title}</a> <br /> {n.pubDate}</li>))}</ul>
        )}
      </section>

      <section>
        <h2>Prossime Partite</h2>
        <ul>{upcomingMatches.map((m, i) => (<li key={i}>{m}</li>))}</ul>
      </section>
    </div>
  );
}

export default App;
