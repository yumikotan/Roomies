import { db } from '../firebaseConfig.js';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function logChoreEvent(householdId, choreId, event) {
  try {
    if (!householdId || !choreId) throw new Error("Missing IDs.");

    const historyEntry = {
      action: event.action,
      performed_by: event.performed_by,
      timestamp: Timestamp.now(),
      event_id: `${choreId}_${Date.now()}`,
      chore_id: choreId,
    };

    const historyRef = collection(
      db,
      "Households",
      householdId,
      "Chores",
      choreId,
      "History"
    );

    await addDoc(historyRef, historyEntry);

    console.log("History logged:", historyEntry.action);
    return { success: true };
  } catch (err) {
    console.error("logChoreEvent error:", err.message);
    return { success: false, message: err.message };
  }
}
