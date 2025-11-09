import { app, auth, db } from '../firebaseConfig.js';

console.log("Firebase App:", app.name);
console.log("Auth instance:", auth);
console.log("Firestore instance:", db);
