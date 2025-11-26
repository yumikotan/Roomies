

import { db } from '../firebaseConfig.js';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function createChore(householdId, choreData) {
  try {
    if (!householdId) throw new Error("Missing household ID.")
    if (!choreData.title || !choreData) throw new Error("Missing info for creating a chore.");

    let formattedDate = null;
    if (choreData.due_date) {
      formattedDate = Timestamp.fromDate(new Date(choreData.due_date));
    }

    const newChore = {
      title: choreData.title,
      description: choreData.description || "",
      assignment_type: choreData.assignment_type || "single",
      assigned_members: choreData.assigned_members || [],
      due_date: formattedDate,
      due_time: choreData.due_time || "",
      status: "pending",
      created_at: new Date().toISOString(),

      rotational_freq: choreData.rotational_freq || null,
      rotational_order: choreData.rotational_order || [],
    };

    const choresRef = collection(db, 'Households', householdId, 'Chores');
    const res = await addDoc(choresRef, newChore);

    console.log("Chore created:", res.id);

    return { success: true, id: res.id };
  } catch (err) {
    console.error("Error creating chore:", err.message);
    return { success: false, message: err.message };
  }
}
