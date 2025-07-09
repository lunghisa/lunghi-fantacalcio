import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import Papa from "papaparse";
import rosaImportata from "./data/mia-rosa.json";
import { FaSun, FaMoon } from "react-icons/fa";

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
    try {
      await Promise.all(
        rosaImportata.map((p) =>
          setDoc(doc(db, "rosa", p.name), p)
        )
      );
      alert("Importazione completata!");
    } catch (err) {
      console.error("Errore importazione rosa:", err);
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
        editedPlayers.map((p) =>
          setDoc(doc(db, "rosa", p.name), p)
        )
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
      const filtered = players.filter((p) => p.role === role && !outNames.includes(p.name.toLowerCase()));
      filtered.sort((a, b) => parseFloat(b.fantamedia || 0) - parseFloat(a.fantamedia || 0));
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
        const sortedNews = [...data].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        setNews(sortedNews);
        setLoadingNews(false);
        const keywords = ["infortun", "stop", "out", "squalific"];
        const infortunati = sortedNews.filter((item) => keywords.some((k) => item.title.toLowerCase().includes(k)));
        setInjuryHighlights(infortunati);
        const outNames = [];
        players.forEach((p) => {
          const nameLower = p.name.toLowerCase();
          if (infortunati.some((item) => item.title.toLowerCase().includes(nameLower))) {
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
        const response = await fetch("https://www.sosfanta.com/feed/");
        const text = await response.text();
        const matches = text.match(/\b[A-Z][a-z]+\s-\s[A-Z][a-z]+\b/g);
        if (matches) setUpcomingMatches([...new Set(matches.slice(0, 5))]);
      } catch (err) {
        console.error("Errore caricamento calendario:", err);
      }
    };
    fetchFixtures();
  }, []);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const exportCSV = () => {
    const csv = Papa.unparse(editedPlayers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "mia-rosa-export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const styles = {
    container: {
      fontFamily: "Arial, sans-serif",
      padding: "1rem",
      maxWidth: "800px",
      margin: "0 auto",
      backgroundColor: theme === "light" ? "#dbeafe" : "#1e293b",
      color: theme === "light" ? "#000" : "#fff"
    },
    section: { marginBottom: "2rem" },
    button: {
      padding: "0.5rem 1rem",
      margin: "0.5rem",
      backgroundColor: theme === "light" ? "#3B82F6" : "#2563eb",
      color: "#fff",
      border: "none",
      borderRadius: "0.25rem",
      cursor: "pointer"
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <img src="./logo.jpg" alt="Logo" style={{ width: "250px" }} />
<button onClick={toggleTheme} style={{
  background: "none",
  border: "none",
  fontSize: "1.5rem",
  cursor: "pointer",
  color: theme === "light" ? "#000" : "#fff",
  borderRadius: "50%",
  padding: "0.5rem"
}}>
  {theme === "light" ? <FaMoon /> : <FaSun />}
</button>      

</div>

      <h1>Sacha Fantacalcio Hub</h1>

      <section style={styles.section}>
        <h2>Prossime Partite</h2>
        <ul>
          {upcomingMatches.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      </section>

      <section style={styles.section}>
        <h2>Infortuni</h2>
        <ul>
          {injuryHighlights.map((item, idx) => (
            <li key={idx}><strong>{item.title}</strong></li>
          ))}
        </ul>
      </section>

      <section style={styles.section}>
        <h2>La mia Rosa</h2>
        <button onClick={importaRosaInFirebase} style={styles.button}>Importa rosa da JSON</button>
        {editing ? (
          <>
            <ul>
              {editedPlayers.map((p, i) => (
                <li key={i}>
                  <input value={p.name} onChange={e => {
                    const copy = [...editedPlayers];
                    copy[i].name = e.target.value;
                    setEditedPlayers(copy);
                  }} />
                  <input value={p.role} onChange={e => {
                    const copy = [...editedPlayers];
                    copy[i].role = e.target.value;
                    setEditedPlayers(copy);
                  }} />
                  <input value={p.team} onChange={e => {
                    const copy = [...editedPlayers];
                    copy[i].team = e.target.value;
                    setEditedPlayers(copy);
                  }} />
                  <input value={p.fantamedia} onChange={e => {
                    const copy = [...editedPlayers];
                    copy[i].fantamedia = e.target.value;
                    setEditedPlayers(copy);
                  }} />
                </li>
              ))}
            </ul>
            <button onClick={() => setEditing(false)} style={styles.button}>Chiudi Modifica</button>
            <button onClick={exportCSV} style={styles.button}>Esporta CSV</button>
            <button onClick={savePlayersToFirebase} style={styles.button}>Salva su Firebase</button>
          </>
        ) : (
          <>
            {["P", "D", "C", "A"].map(role => (
              <div key={role}>
                <h3>{role === "P" ? "Portieri" : role === "D" ? "Difensori" : role === "C" ? "Centrocampisti" : "Attaccanti"}</h3>
                <ul>
                  {players.filter(p => p.role === role).map((p, i) => (
                    <li key={i} style={{ color: playersOut.includes(p.name) ? "red" : "inherit" }}>
                      {p.name} - {p.team} - FM: {p.fantamedia}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button onClick={() => setEditing(true)} style={styles.button}>Modifica rosa</button>
          </>
        )}
      </section>

      <section style={styles.section}>
        <h2>Formazione AI</h2>
        <select value={selectedModulo} onChange={e => setSelectedModulo(e.target.value)}>
          {Object.keys({
            "3-4-3": {}, "4-3-3": {}, "3-5-2": {}, "4-4-2": {}, "4-5-1": {}, "5-3-2": {}
          }).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button onClick={calculateOptimalFormation} style={styles.button}>Calcola formazione</button>
        {formation && (
          <div style={{ marginTop: "1rem" }}>
            <h3>Modulo: {formation.modulo}</h3>
            <p>🧤 {formation.titolari.filter(p => p.role === "P").map(p => p.name).join(" ")}</p>
            <p>🛡️ {formation.titolari.filter(p => p.role === "D").map(p => p.name).join(" – ")}</p>
            <p>🎯 {formation.titolari.filter(p => p.role === "C").map(p => p.name).join(" – ")}</p>
            <p>⚽ {formation.titolari.filter(p => p.role === "A").map(p => p.name).join(" – ")}</p>
          </div>
        )}
      </section>

<section style={styles.section}>
  <h2>Ultime Notizie</h2>
  {loadingNews ? (
    <p>Caricamento notizie...</p>
  ) : (
    <ul>
      {(showAllNews ? news : news.slice(0, 10)).map((article, index) => (
        <li key={index} style={{ marginBottom: "1rem" }}>
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: "bold", color: "#1D4ED8", textDecoration: "none" }}
          >
            {article.title}
          </a>
          <p>{article.pubDate}</p>
        </li>
      ))}
    </ul>
  )}
  {news.length > 10 && (
    <button onClick={() => setShowAllNews(!showAllNews)} style={styles.button}>
      {showAllNews ? "Nascondi notizie" : "Vedi altre notizie"}
    </button>
  )}
</section>

      <footer style={{ textAlign: "center", marginTop: "2rem", color: theme === "light" ? "#888" : "#ccc" }}>
        <p>© 2025 lunghi.ch - Tutti i diritti riservati.</p>
      </footer>
    </div>
  );
}

export default App;

