// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrqA2iVULv_TP2tHUi_eOc_59IyeYyZ54",
  authDomain: "lunghi-fantacalcio.firebaseapp.com",
  projectId: "lunghi-fantacalcio",
  storageBucket: "lunghi-fantacalcio.firebasestorage.app",
  messagingSenderId: "115221302043",
  appId: "1:115221302043:web:ffa6bdff6a4b68bb27a1be"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };