import { db } from '../firebaseConfig.js';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export async function rotateChores(householdId) {
  try {
    const choresRef = collection(db, "Households", householdId, "Chores");
    const q = query(choresRef, where("assignment_type", "==", "rotating"));
    const snap = await getDocs(q);

    let rotated = 0;

    for (const d of snap.docs) {
      const chore = d.data();

      if (!Array.isArray(chore.rotational_order)) continue;

      const order = [...chore.rotational_order];
      if (order.length < 2) continue;

      const first = order.shift();
      order.push(first);

      const choreRef = doc(db, "Households", householdId, "Chores", d.id);

      await updateDoc(choreRef, {
        rotational_order: order,
        assigned_members: [order[0]],
        last_rotated_at: new Date().toISOString(),
      });

      rotated++;
    }

    return { success: true, rotated };
  } catch (err) {
    console.error("rotateChores error:", err.message);
    return { success: false, message: err.message };
  }
}
