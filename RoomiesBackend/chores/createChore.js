// makes a new chore but I still need to finish some parts

import { db } from '../firebaseConfig.js';
import { collection, addDoc } from 'firebase/firestore';

/*
   TODO:
   - finish validation for rotating chores
   - add default values?
*/

export async function createChore(householdId, choreData) {
  try {
    if (!householdId || !choreData) {
      throw new Error("Missing info for creating a chore.");
    }

    const newChore = {
      title: choreData.title || "",
      description: choreData.description || "",
      assignmentType: choreData.assignmentType || "single",
      assignedMembers: choreData.assignedMembers || [],

      // TODO: figure out how rotation works
      rotation: choreData.rotation || null,

      dueDate: choreData.dueDate || null,
      dueTime: choreData.dueTime || null,
      notes: choreData.notes || "",
      status: "pending",

      createdAt: new Date().toISOString(),
    };

    const choresRef = collection(db, 'Households', householdId, 'Chores');
    const res = await addDoc(choresRef, newChore);

    console.log("Chore created but still need to test:", res.id);

    return { success: true, id: res.id };
  } catch (err) {
    console.error("Error creating chore:", err.message);
    return { success: false, message: err.message };
  }
}
