import { db } from '../firebaseConfig.js';
import { doc, updateDoc } from 'firebase/firestore';

export async function updateChore(householdId, choreId, updates) {
  try {
    const choreRef = doc(db, "Households", householdId, "Chores", choreId);
    await updateDoc(choreRef, updates);

    return { success: true };
  } catch (err) {
    console.error("updateChore error:", err.message);
    return { success: false, message: err.message };
  }
}
