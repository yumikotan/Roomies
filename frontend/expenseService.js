console.log('EXPENSESERVICE.JS LOADING - ' + new Date().toISOString());

import { db } from "./firebaseClient.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

function calculateSplits(amount, members, method, customPercents) {
  const splits = [];
  
  if (method === "even") {
    const sharePerPerson = amount / members.length;
    
    members.forEach(member => {
      splits.push({
        userId: member.uid,
        share: sharePerPerson,
        percent: 100 / members.length,
        hasPaid: false
      });
    });
    
    return splits;
  }
  
  //custom split method
  members.forEach(member => {
    const percent = customPercents[member.uid] || 0;
    const share = (percent / 100) * amount;
    
    splits.push({
      userId: member.uid,
      share: share,
      percent: percent,
      hasPaid: false
    });
  });
  
  return splits;
}

export async function addExpense(
  householdId,
  createdBy,
  amount,
  description,
  method,
  customPercents,
  members
) {
  try {
    console.log('Adding expense:', { amount, method, members: members.length, customPercents });
    const splits = calculateSplits(amount, members, method, customPercents);
    console.log('Calculated splits:', splits);
    await addDoc(collection(db, "Households", householdId, "Expenses"), {
      description,
      amount,
      createdBy,
      createdByEmail: members.find(m => m.uid === createdBy)?.email || createdBy,
      splits,
      method,
      splitMethod: method,
      overallStatus: "active",
      createdAt: Timestamp.now()
    });
    
    console.log('Expense added successfully');
    return { success: true };
  } catch (error) {
    console.error('Error adding expense:', error);
    return { success: false, message: error.message };
  }
}

export async function getHouseholdExpenses(householdId) {
  try {
    const snap = await getDocs(collection(db, "Households", householdId, "Expenses"));
    
    return snap.docs
      .map(docRef => ({
        id: docRef.id,
        ...docRef.data()
      }))
      .filter(expense => !expense.deleted); // Filter out deleted expenses
  } catch (error) {
    console.error('Error getting expenses:', error);
    return [];
  }
}

export async function updateUserPaymentStatus(householdId, expenseId, userId, paid) {
  try {
    const expRef = doc(db, "Households", householdId, "Expenses", expenseId);
    const snap = await getDoc(expRef);
    
    if (!snap.exists()) {
      console.warn('Expense not found');
      return { success: false };
    }
    
    const exp = snap.data();
    exp.splits = exp.splits.map(split => {
      if (split.userId === userId) {
        return { ...split, hasPaid: paid };
      }
      return split;
    });
    
    const everyonePaid = exp.splits.every(s => s.hasPaid);
    exp.overallStatus = everyonePaid ? "paid" : "active";
    
    await updateDoc(expRef, exp);
    
    console.log('Payment status updated');
    return { success: true };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, message: error.message };
  }
}

export async function updateExpense(
  householdId,
  expenseId,
  amount,
  description,
  method,
  customPercents,
  paymentStatuses = {},
  selectedMembers = null
) {
  try {
    const expRef = doc(db, "Households", householdId, "Expenses", expenseId);
    const snap = await getDoc(expRef);
    
    if (!snap.exists()) {
      console.warn('Expense not found');
      return { success: false };
    }
    
    const exp = snap.data();
    
    //use selectedMembers if provided, otherwise get all household members
    let members;
    if (selectedMembers && selectedMembers.length > 0) {
      members = selectedMembers;
    } else {
      const householdDoc = await getDoc(doc(db, "Households", householdId));
      if (!householdDoc.exists()) {
        return { success: false, message: "Household not found" };
      }
      
      const householdData = householdDoc.data();
      const memberEmails = householdData.members || [];
      members = memberEmails.map(email => ({ uid: email, email }));
    }
    
    const splits = calculateSplits(amount, members, method, customPercents);
    
    //update payment statuses from existing expensse data and new checkbox states
    splits.forEach(split => {
      const existingSplit = exp.splits?.find(s => s.userId === split.userId);
      if (paymentStatuses.hasOwnProperty(split.userId)) {
        split.hasPaid = paymentStatuses[split.userId];
      } 
      else if(existingSplit) {
        split.hasPaid = existingSplit.hasPaid || false;
      }else{  // Default to not paid
        split.hasPaid = false;
      }
    });
    
    //if all splits are paid to update overall status
    const allPaid = splits.every(s => s.hasPaid);
    const overallStatus = allPaid ? "paid" : "active";
    
    await updateDoc(expRef, {
      description,
      amount,
      splitMethod: method,
      splits,
      overallStatus,
      updatedAt: Timestamp.now()
    });
    
    console.log('Expense updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating expense:', error);
    return { success: false, message: error.message };
  }
}

console.log('expenseService.js loaded');
