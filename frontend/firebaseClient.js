import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDskrxKhHOiiSXsJoSwyACGauTW6boSHa4",
  authDomain: "roomies-979da.firebaseapp.com",
  projectId: "roomies-979da",
  storageBucket: "roomies-979da.firebasestorage.app",
  messagingSenderId: "1085428143975",
  appId: "1:1085428143975:web:a4428c3ccac5cc948301c2",
  measurementId: "G-12MEM1LVG2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
