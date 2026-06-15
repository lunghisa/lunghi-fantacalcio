// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCG6w2VZ3CyysFBiyVzFnYQt8-lwicXH4A",
  authDomain: "sacha-fantacalcio-hub.firebaseapp.com",
  projectId: "sacha-fantacalcio-hub",
  storageBucket: "sacha-fantacalcio-hub.firebasestorage.app",
  messagingSenderId: "662636053047",
  appId: "1:662636053047:web:e8e16481cfea80a022b5b2",
  measurementId: "G-2XGXBW74RB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ✅ Aggiungi questa riga che mancava
const db = getFirestore(app);

export { db };