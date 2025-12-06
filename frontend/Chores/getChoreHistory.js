import { db } from "../firebaseClient.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export async function getChoreHistory(householdId, choreId) {
  try {
    const historyRef = collection(
      db,
      "Households",
      householdId,
      "Chores",
      choreId,
      "History"
    );

    const q = query(historyRef, orderBy("timestamp", "desc"));
    const snap = await getDocs(q);

    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    return { success: true, events };
  } catch (err) {
    console.error("getChoreHistory error:", err.message);
    return { success: false, message: err.message };
  }
}
