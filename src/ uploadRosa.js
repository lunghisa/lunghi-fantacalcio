// uploadRosa.js
import { initializeApp } from "firebase/app";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import rosa from "./mia-rosa.json"; // il file JSON convertito
import firebaseConfig from "./firebaseConfig"; // o definisci qui il config

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadRosa() {
  for (const p of rosa) {
    await setDoc(doc(db, "rosa", p.name), p);
    console.log(`Aggiunto: ${p.name}`);
  }
  console.log("Upload completato.");
}

uploadRosa();