import admin from "firebase-admin";
import fs from "fs";

// Load your Firebase service account
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function listUsers() {
  const list = await admin.auth().listUsers(10);
  console.log("Users:", list.users.map(u => u.email));
}

listUsers();
