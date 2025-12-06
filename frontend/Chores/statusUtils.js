import { db } from "../firebaseClient.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export async function setChoreStatus(householdId, choreId, status) {
  try {
    const choreRef = doc(db, "Households", householdId, "Chores", choreId);

    await updateDoc(choreRef, {
      status,
      status_updated_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    console.error("setChoreStatus error:", err.message);
    return { success: false, message: err.message };
  }
}
