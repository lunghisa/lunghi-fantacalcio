
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
    console.log("🚀 Importazione avviata! Dati in arrivo:", rosaImportata);
    try {
      await Promise.all(
        rosaImportata.map((p) =>
          setDoc(doc(db, "rosa", p.name), p)
        )
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
        console.log("👥 Giocatori caricati da Firebase:", playersData);
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
        const response = await fetch(
          "https://v3.football.api-sports.io/fixtures?league=135&season=2025&next=10",
          {
            headers: {
              "x-apisports-key": "86d2e487d6ef49e5e3619d086e1448a6"
            }
          }
        );
        const data = await response.json();
        const matches = data.response.map(f =>
          `${new Date(f.fixture.date).toLocaleDateString("it-IT")} – ${f.teams.home.name} vs ${f.teams.away.name}`
        );
        setUpcomingMatches(matches);
      } catch (err) {
        console.error("❌ Errore caricamento 2025:", err);
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
      maxWidth: "900px",
      margin: "0 auto",
      backgroundColor: theme === "light" ? "#f8fafc" : "#0f172a",
      color: theme === "light" ? "#0f172a" : "#f8fafc"
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
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Sacha Fantacalcio Hub</h1>
        <button onClick={toggleTheme} style={{ fontSize: "1.5rem", background: "none", border: "none" }}>
          {theme === "light" ? <FaMoon /> : <FaSun />}
        </button>
      </header>

      <section style={styles.section}>
        <h2>Prossime Partite</h2>
        <ul>{upcomingMatches.map((m, i) => <li key={i}>{m}</li>)}</ul>
      </section>

      <section style={styles.section}>
        <h2>Ultime Notizie</h2>
        {loadingNews ? <p>Caricamento notizie...</p> : (
          <ul>{news.slice(0, 10).map((n, i) => (
            <li key={i}>
              <strong>{n.title}</strong><br />
              <span>{n.pubDate}</span>
            </li>
          ))}</ul>
        )}
      </section>

      <section style={styles.section}>
        <h2>Formazione AI</h2>
        <select value={selectedModulo} onChange={e => setSelectedModulo(e.target.value)}>
          {["3-4-3", "4-3-3", "3-5-2", "4-4-2", "4-5-1", "5-3-2"].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button onClick={calculateOptimalFormation} style={styles.button}>Calcola formazione</button>
        {formation && (
          <div>
            <h3>{formation.modulo}</h3>
            <p>🧤 {formation.titolari.filter(p => p.role === "P").map(p => p.name).join(" ")}</p>
            <p>🛡️ {formation.titolari.filter(p => p.role === "D").map(p => p.name).join(" – ")}</p>
            <p>🎯 {formation.titolari.filter(p => p.role === "C").map(p => p.name).join(" – ")}</p>
            <p>⚽ {formation.titolari.filter(p => p.role === "A").map(p => p.name).join(" – ")}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
