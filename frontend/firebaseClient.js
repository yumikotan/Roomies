import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-functions.js";

// Load config from window.FIREBASE_CONFIG (set via script tag in HTML) or from secret file
// Create firebaseConfig.secret.js with: export default { apiKey: "...", ... }
const firebaseConfig = window.FIREBASE_CONFIG || (await import('./firebaseConfig.secret.js')).default;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

const app = initializeApp(firebaseConfig);


const auth=getAuth(app);
const db=getFirestore(app);
const functions=getFunctions(app);

export { app, auth, db, functions };





