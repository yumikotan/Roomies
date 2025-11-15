import { db } from "../firebaseConfig.js";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { calculateSplits } from "./splitHelper.js";
import { calculateOverallExpenseStatus } from "./statusHelper.js";

//Validate that all required fields are present.
 
function validateExpenseFields(groupId, payerId, amount) {
  if (!groupId || !payerId || !amount) {
    throw new Error("Missing required fields (groupId, payerId, or amount)");
  }
}
//Build the expense data object to be stored in Firestore.
function buildExpenseData(payerId, amount, description, splitMethod, sharedWith, splits_result) {
  const splitsWithStatus = splits_result.map((split) => ({
    ...split,
    overallStatus: "unpaid",
  }));

  return {
    payerId,
    amount: Number(amount),
    description: description || "",
    splitMethod: splitMethod || "even",
    sharedWith: sharedWith || [],
    splits_result: splitsWithStatus,
    overallStatus: calculateOverallExpenseStatus(splitsWithStatus),
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// Add a new expense to a group's expenses collection.
export async function addExpense(groupId, payerId, amount, description, splitMethod, sharedWith) {
  try {
    validateExpenseFields(groupId, payerId, amount);

    const splits_result = calculateSplits(splitMethod || "even", amount, sharedWith);
    const expenseData = buildExpenseData(payerId, amount, description, splitMethod, sharedWith, splits_result);

    const docRef = await addDoc(collection(db, "Groups", groupId, "Expenses"), expenseData);

    return { success: true, id: docRef.id, splits_result: expenseData.splits_result };
  } catch (error) {
    console.error("Error adding expense:", error.message);
    return { success: false, message: error.message };
  }
}

// Retrieve all expenses for a specific group.
export async function getGroupExpenses(groupId) {
  try {
    if (!groupId) throw new Error("Missing groupId");

    const snapshot = await getDocs(collection(db, "Groups", groupId, "Expenses"));
    const expenses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return { success: true, expenses };
  } catch (error) {
    console.error("Error retrieving expenses:", error.message);
    return { success: false, message: error.message };
  }
}

// Update a specific user's payment status for an expense.
export async function updateUserPaymentStatus(groupId, expenseId, userId, newStatus) {
  try {
    const expenseRef = doc(db, "Groups", groupId, "Expenses", expenseId);
    const expenseSnap = await getDoc(expenseRef);

    if (!expenseSnap.exists()) {
      throw new Error("Expense not found");
    }

    const expenseData = expenseSnap.data();
    const updatedSplits = expenseData.splits_result.map((split) =>
      split.userId === userId ? { ...split, overallStatus: newStatus } : split
    );

    const overallStatus = calculateOverallExpenseStatus(updatedSplits);

    await updateDoc(expenseRef, {
      splits_result: updatedSplits,
      overallStatus,
    });

    return { success: true, overallStatus, splits_result: updatedSplits };
  } catch (error) {
    console.error("Error updating user payment status:", error.message);
    return { success: false, message: error.message };
  }
}
