import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import Papa from "papaparse";
import rosaImportata from "./data/mia-rosa.json";
import { FaSun, FaMoon } from "react-icons/fa";
import './App.css';

function App() {
  const [players, setPlayers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editedPlayers, setEditedPlayers] = useState([]);
  const [theme, setTheme] = useState("light");
  const [formation, setFormation] = useState(() => {
    const saved = localStorage.getItem("formation");
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedModulo, setSelectedModulo] = useState(() => {
    return localStorage.getItem("selectedModulo") || "3-4-3";
  });
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [injuryHighlights, setInjuryHighlights] = useState([]);
  const [playersOut, setPlayersOut] = useState([]);
  const [showAllNews, setShowAllNews] = useState(false);
  const [upcomingMatches, setUpcomingMatches] = useState([]);

  const importaRosaInFirebase = async () => {
    console.log("🚀 Importazione avviata! Dati in arrivo:", rosaImportata);
    try {
      await Promise.all(
        rosaImportata.map((p) => setDoc(doc(db, "rosa", p.name), p))
      );
      alert("✅ Importazione completata!");
    } catch (err) {
      console.error("❌ Errore durante l'importazione della rosa:", err);
    }
  };

  useEffect(() => {
    const fetchPlayersFromFirebase = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "rosa"));
        const playersData = querySnapshot.docs.map((doc) => doc.data());
        setPlayers(playersData);
        setEditedPlayers(playersData);
      } catch (error) {
        console.error("Errore caricamento rosa da Firebase:", error);
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
      alert("Rosa salvata su cloud con successo");
    } catch (error) {
      console.error("Errore salvataggio Firebase:", error);
    }
  };

  const calculateOptimalFormation = () => {
    if (players.length === 0) return;
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
    const outNames = playersOut.map((p) => p.toLowerCase());
    ["P", "D", "C", "A"].forEach((role) => {
      const filtered = players.filter(
        (p) => p.role === role && !outNames.includes(p.name.toLowerCase())
      );
      filtered.sort(
        (a, b) => parseFloat(b.fantamedia || 0) - parseFloat(a.fantamedia || 0)
      );
      selected.push(...filtered.slice(0, schema[role]));
    });
    const newFormation = { modulo: selectedModulo, titolari: selected };
    setFormation(newFormation);
    localStorage.setItem("formation", JSON.stringify(newFormation));
  };

  useEffect(() => {
    localStorage.setItem("selectedModulo", selectedModulo);
  }, [selectedModulo]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/news");
        const data = await response.json();
        const sortedNews = [...data].sort(
          (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
        );
        setNews(sortedNews);
        setLoadingNews(false);
        const keywords = ["infortun", "stop", "out", "squalific"];
        const infortunati = sortedNews.filter((item) =>
          keywords.some((k) => item.title.toLowerCase().includes(k))
        );
        setInjuryHighlights(infortunati);
        const outNames = [];
        players.forEach((p) => {
          const nameLower = p.name.toLowerCase();
          if (
            infortunati.some((item) =>
              item.title.toLowerCase().includes(nameLower)
            )
          ) {
            outNames.push(p.name);
          }
        });
        setPlayersOut(outNames);
      } catch (error) {
        console.error("Errore nel recupero delle news:", error);
        setLoadingNews(false);
      }
    };
    fetchNews();
  }, [players]);

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const response = await fetch(
          "https://v3.football.api-sports.io/fixtures?league=135&season=2025&next=10",
          {
            headers: {
              "x-apisports-key": "86d2e487d6ef49e5e3619d086e1448a6"
            }
          }
        );
        const data = await response.json();
        const matches = data.response.map(
          (f) =>
            `${new Date(f.fixture.date).toLocaleDateString("it-IT")} – ${f.teams.home.name} vs ${f.teams.away.name}`
        );
        setUpcomingMatches(matches);
      } catch (err) {
        console.error("❌ Errore caricamento 2025:", err);
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

  return (
    <div className={`app ${theme}`}>

      <header>
        <h1>Sacha Fantacalcio Hub</h1>
        <button onClick={toggleTheme}>
          {theme === "light" ? <FaMoon /> : <FaSun />}
        </button>
      </header>

      <section>
        <h2>La mia Rosa</h2>
        <button onClick={importaRosaInFirebase}>Importa rosa da JSON</button>
        {editing ? (
          <>
            <ul>
              {editedPlayers.map((p, i) => (
                <li key={i}>
                  <input value={p.costo} onChange={(e) => {
                    const copy = [...editedPlayers];
                    copy[i].costo = e.target.value;
                    setEditedPlayers(copy);
                  }} />
                  <input value={p.name} onChange={(e) => {
                    const copy = [...editedPlayers];
                    copy[i].name = e.target.value;
                    setEditedPlayers(copy);
                  }} />
                  <input value={p.role} onChange={(e) => {
                    const copy = [...editedPlayers];
                    copy[i].role = e.target.value;
                    setEditedPlayers(copy);
                  }} />
                  <input value={p.team} onChange={(e) => {
                    const copy = [...editedPlayers];
                    copy[i].team = e.target.value;
                    setEditedPlayers(copy);
                  }} />
                  <input value={p.fantamedia} onChange={(e) => {
                    const copy = [...editedPlayers];
                    copy[i].fantamedia = e.target.value;
                    setEditedPlayers(copy);
                  }} />
                </li>
              ))}
            </ul>
            <button onClick={() => setEditing(false)}>Chiudi Modifica</button>
            <button onClick={savePlayersToFirebase}>Salva su Firebase</button>
          </>
        ) : (
          <>
            <table className="rosa-table">
  <thead>
    <tr>
      <th>💰 Costo</th>
      <th>Nome</th>
      <th>Ruolo</th>
      <th>Squadra</th>
      <th>FM</th>
    </tr>
  </thead>
 <tbody>
  {[...players]
    .sort((a, b) => {
      const roleOrder = { P: 1, D: 2, C: 3, A: 4 };
      if (a.role !== b.role) {
        return roleOrder[a.role] - roleOrder[b.role];
      }
      return a.name.localeCompare(b.name);
    })
    .map((p, i) => (
      <tr
        key={i}
        className={`role-${p.role}`}
        style={{ color: playersOut.includes(p.name) ? "red" : "inherit" }}
      >
        <td>{p.costo}</td>
        <td>{p.name}</td>
        <td>{p.role}</td>
        <td>{p.team}</td>
        <td>{p.fantamedia}</td>
      </tr>
    ))}
</tbody>
</table>
            <button onClick={() => setEditing(true)}>Modifica rosa</button>
          </>
        )}
      </section>

      <section>
        <h2>Formazione AI</h2>
        <select
          value={selectedModulo}
          onChange={(e) => setSelectedModulo(e.target.value)}
        >
          {["3-4-3", "4-3-3", "3-5-2", "4-4-2", "4-5-1", "5-3-2"].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button onClick={calculateOptimalFormation}>Calcola formazione</button>
        {formation && (
  <div style={{ marginTop: "1rem" }}>
    <h3>Modulo: {formation.modulo}</h3>
    <table className="rosa-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Ruolo</th>
          <th>Squadra</th>
          <th>FM</th>
        </tr>
      </thead>
      <tbody>
        {[...formation.titolari]
          .sort((a, b) => {
            const roleOrder = { P: 1, D: 2, C: 3, A: 4 };
            if (a.role !== b.role) {
              return roleOrder[a.role] - roleOrder[b.role];
            }
            return a.name.localeCompare(b.name);
          })
          .map((p, i) => (
            <tr key={i} className={`role-${p.role}`}>
              <td>{p.name}</td>
              <td>{p.role}</td>
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
        {loadingNews ? (
          <p>Caricamento notizie...</p>
        ) : (
          <ul>
            {(showAllNews ? news : news.slice(0, 10)).map((article, index) => (
              <li key={index}>
                <a href={article.guid} target="_blank" rel="noopener noreferrer">
                  {article.title}
                </a>
                <p>{article.pubDate}</p>
              </li>
            ))}
          </ul>
        )}
        {news.length > 10 && (
          <button onClick={() => setShowAllNews(!showAllNews)}>
            {showAllNews ? "Nascondi notizie" : "Vedi altre notizie"}
          </button>
        )}
      </section>

      <section>
        <h2>Prossime Partite</h2>
        <ul>
          {upcomingMatches.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
