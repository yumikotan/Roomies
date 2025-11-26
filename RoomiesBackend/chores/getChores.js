import { db } from '../firebaseConfig.js';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export async function getChores(householdId) {
  try {
    const choresRef = collection(db, "Households", householdId, "Chores");
    const q = query(choresRef, orderBy("due_date"));
    const snap = await getDocs(q);

    const chores = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    return { success: true, chores };
  } catch (err) {
    console.error("getChores error:", err.message);
    return { success: false, message: err.message };
  }
}
