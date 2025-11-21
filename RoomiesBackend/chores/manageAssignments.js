import { db } from '../firebaseConfig.js';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function claimVoluntaryChore(householdId, choreId, userEmail) {
  try {
    const choreRef = doc(db, "Households", householdId, "Chores", choreId);
    const snap = await getDoc(choreRef);

    if (!snap.exists()) throw new Error("Chore not found.");
    const chore = snap.data();

    if (chore.assignment_type !== "voluntary") {
      throw new Error("This isn't a voluntary chore.");
    }

    await updateDoc(choreRef, {
      assigned_members: arrayUnion(userEmail),
      status: "in_progress",
    });

    return { success: true };
  } catch (err) {
    console.error("claimVoluntaryChore error:", err.message);
    return { success: false, message: err.message };
  }
}

export async function setAssignedMembers(householdId, choreId, members) {
  try {
    const choreRef = doc(db, "Households", householdId, "Chores", choreId);

    await updateDoc(choreRef, {
      assigned_members: members,
    });

    return { success: true };
  } catch (err) {
    console.error("setAssignedMembers error:", err.message);
    return { success: false, message: err.message };
  }
}
