import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDskrxKhHOiiSXsJoSwyACGauTW6boSHa4",
  authDomain: "roomies-979da.firebaseapp.com",
  projectId: "roomies-979da",
  storageBucket: "roomies-979da.appspot.com", 
  messagingSenderId: "1085428143975",
  appId: "1:1085428143975:web:a4428c3ccac5cc943801c2",
  measurementId: "G-12MEM1LVG2"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);


await auth._initializationPromise;

console.log(" Firebase initialized successfully:", app.name);

export { app, db, auth };
