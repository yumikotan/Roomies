import { db } from "../firebaseConfig.js";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { calculateSplits } from "./splitHelper.js";
import { calculateOverallExpenseStatus } from "./statusHelper.js";

// validate required fields
function validateExpenseFields(householdId, payerId, amount) {
  if (!householdId || !payerId || !amount) {
    throw new Error("Missing required fields (householdId, payerId, or amount)");
  }
}

function buildExpenseData(payerId, amount, description, splitMethod, sharedWith, splits_result) {
  const splitsWithStatus = splits_result.map((split) => ({
    ...split,
    overallStatus: "unpaid", // default
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

export async function addExpense(householdId, payerId, amount, description, splitMethod, sharedWith) {
  try {
    validateExpenseFields(householdId, payerId, amount);

    // sharedWith MUST be an array of UIDs
    const splits_result = calculateSplits(splitMethod || "even", amount, sharedWith);

    const expenseData = buildExpenseData(
      payerId,
      amount,
      description,
      splitMethod,
      sharedWith,
      splits_result
    );

    // Save in Households -> householdId -> Expenses
    const docRef = await addDoc(
      collection(db, "Households", householdId, "Expenses"),
      expenseData
    );

    return { success: true, id: docRef.id, splits_result: expenseData.splits_result };
  } catch (error) {
    console.error("Error adding expense:", error.message);
    return { success: false, message: error.message };
  }
}

// get All expenses for a household
export async function getHouseholdExpenses(householdId) {
  try {
    if (!householdId) throw new Error("Missing householdId");

    const snapshot = await getDocs(collection(db, "Households", householdId, "Expenses"));
    const expenses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return { success: true, expenses };
  } catch (error) {
    console.error("Error retrieving expenses:", error.message);
    return { success: false, message: error.message };
  }
}

// Update a user's payment status for a specific expense
export async function updateUserPaymentStatus(householdId, expenseId, userId, newStatus) {
  try {
    const expenseRef = doc(db, "Households", householdId, "Expenses", expenseId);
    const expenseSnap = await getDoc(expenseRef);

    if (!expenseSnap.exists()) {
      throw new Error("Expense not found");
    }

    const expenseData = expenseSnap.data();

    const updatedSplits = expenseData.splits_result.map((split) =>
      split.userId === userId
        ? { ...split, overallStatus: newStatus }
        : split
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
