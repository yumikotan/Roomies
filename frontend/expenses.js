console.log('EXPENSES.JS LOADING - ' + new Date().toISOString());

import { db, auth } from "./firebaseClient.js";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  addExpense,
  getHouseholdExpenses,
  updateUserPaymentStatus,
  updateExpense
} from "./expenseService.js";

console.log('Expenses imports successful');

let globalHouseholdId = null;
let globalHouseholdMembers = [];
let globalUser = null;
let currentEditExpenseId = null;

export async function initExpenses() {
  console.log('Initializing expenses view');
  const user = auth.currentUser;
  if (!user) {
    console.warn('No user logged in');
    return;
  }
  
  globalUser = user;
  
  const userDoc = await getDoc(doc(db, "ProfileUsers", user.uid));
  if (!userDoc.exists()) {
    console.warn('User profile not found');
    return;
  }
  
  const userData = userDoc.data();
  globalHouseholdId = userData.group_id;
  
  console.log('Household ID:', globalHouseholdId);
  
  if (!globalHouseholdId) {
    const container = document.getElementById("expenses-list-container");
    if (container) {
      container.innerHTML = '<p style="color: #234029; text-align: center; padding: 40px;">No expenses yet</p>';
    }
    await loadAllExpenses();
    return;
  }
  



  const householdDoc = await getDoc(doc(db, "Households", globalHouseholdId));
  if (householdDoc.exists()) {
    const householdData = householdDoc.data();
    const memberEmails = householdData.members || [];
    globalHouseholdMembers = [];
    for (const email of memberEmails) {
      try {
        const q = query(
          collection(db, "ProfileUsers"),
          where("email", "==", email)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const userData = snap.docs[0].data();

          globalHouseholdMembers.push({
            email: email,
            uid: userData.uid,

            name: userData.name || email.split('@')[0],
            icon: userData.icon
          });

        }else{//if no profile found
          globalHouseholdMembers.push({
            email: email,
            uid: email,
            name: email.split('@')[0]
          });

        }
      } catch (err) {
        console.error("Error fetching member profile:", err);
        globalHouseholdMembers.push({
          email: email,
          uid: email,
          name: email.split('@')[0]
        });

      }
    }
  }
  
  console.log('Household members:', globalHouseholdMembers.length);
  
  setupMemberSelectList();
  setupSplitMethodDropdown();
  await loadAllExpenses();
}

function setupMemberSelectList() {
  const listContainer = document.getElementById("member-select-list");
  if (!listContainer) return;
  
  listContainer.innerHTML = "";
  listContainer.style.cssText = "display: flex; flex-direction: column; align-items: flex-start; width: 100%;";
  
  globalHouseholdMembers.forEach(member => {
    const label = document.createElement("label");
    label.style.cssText = "display: flex; align-items: center; padding: 8px 0; cursor: pointer; gap: 16px;";
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true; //defualts to all checked
    checkbox.dataset.memberId = member.uid;
    checkbox.className = "member-select-checkbox";
    checkbox.style.cssText = "margin: 0; cursor: pointer; flex-shrink: 0; width: 16px; height: 16px;";
    
    const nameSpan = document.createElement("span");
    nameSpan.textContent = member.name || member.email;
    nameSpan.style.cssText = "color: #234029 !important; font-size: 14px !important; line-height: 1.4; margin: 0; flex: 1;";
    
    label.appendChild(checkbox);
    label.appendChild(nameSpan);
    listContainer.appendChild(label);
  });
}

function setupSplitMethodDropdown() {
  const methodSelect = document.getElementById("inp-split-method");
  
  if (!methodSelect) return;
  
  methodSelect.addEventListener("change", () => {
    const customArea = document.getElementById("custom-split-container");
    
    if (methodSelect.value === "custom") {
      customArea.classList.remove("hidden");
      renderCustomPercentInputs();
    } else {
      customArea.classList.add("hidden");
    }
  });
}

function getSelectedMembers() {
  const selected = [];
  document.querySelectorAll(".member-select-checkbox:checked").forEach(checkbox => {
    const member = globalHouseholdMembers.find(m => m.uid === checkbox.dataset.memberId);
    if (member) {
      selected.push(member);
    }
  });
  return selected;
}

function renderCustomPercentInputs() {
  const listContainer = document.getElementById("custom-split-inputs-list");
  listContainer.innerHTML = "";
  
  const selectedMembers = getSelectedMembers();
  
  selectedMembers.forEach(member => {
    const row = document.createElement("div");
    row.className = "custom-split-row";
    
    const label = document.createElement("label");
    label.textContent = member.name || member.email;
    label.style.color = "#234029";
    label.style.fontWeight = "600";
    
    const percentInput = document.createElement("input");
    percentInput.type = "number";
    percentInput.placeholder = "%";
    percentInput.min = 0;
    percentInput.max = 100;
    percentInput.classList.add("pill-input", "custom-percent-input");
    percentInput.dataset.user = member.uid;
    percentInput.style.width = "80px";
    
    row.appendChild(label);
    row.appendChild(percentInput);
    listContainer.appendChild(row);
  });
}

async function loadAllExpenses() {
  if (!globalHouseholdId) return;
  
  const expenses = await getHouseholdExpenses(globalHouseholdId);
  
  const active = expenses.filter(e => e.overallStatus !== "paid");
  const completed = expenses.filter(e => e.overallStatus === "paid");
  
  renderActiveExpenses(active);
  renderPaidExpenses(completed);
  renderCompletedExpenses(completed);
  updateTotals(active);
}

function renderActiveExpenses(expenseList) {
  const container = document.getElementById("expenses-list-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (expenseList.length === 0) {
    container.innerHTML = '<p style="color: #234029; text-align: center; padding: 20px; opacity: 0.7;">No active expenses</p>';
    return;
  }
  
  expenseList.forEach(expense => {
    const card = document.createElement("div");
    card.className = "expense-card-new";
    card.style.position = "relative";
    
   
    const header = document.createElement("div");
    header.className = "expense-header";
    
    const amountDiv = document.createElement("div");
    amountDiv.className = "expense-amount-large";
    amountDiv.textContent = `$ ${expense.amount.toFixed(0)}`;
    
   
    const payer = globalHouseholdMembers.find(m => m.uid === expense.createdBy || m.email === expense.createdByEmail);
    const payerName = payer?.name || expense.createdByEmail?.split('@')[0] || "Unknown";
    const payerIcon = payer?.icon;
    
    const profilePic = document.createElement("div");
    profilePic.className = "expense-profile-pic";
    
    if (payerIcon && payerIcon !== "default.png") {
      const img = document.createElement("img");
      img.src = payerIcon;
      img.onerror = () => {
        profilePic.innerHTML = "";
        profilePic.textContent = payerName[0].toUpperCase();
      };
      profilePic.appendChild(img);
    } else {
        
      profilePic.textContent = payerName[0].toUpperCase();
    }
    
    header.appendChild(amountDiv);
    header.appendChild(profilePic);
    
   
    const payerInfo = document.createElement("div");
    payerInfo.className = "expense-payer";
    payerInfo.innerHTML = `<strong>Payer:</strong> ${payerName}`;
    
  
    const reason = document.createElement("div");
    reason.className = "expense-reason";
    reason.innerHTML = `<strong>Expense:</strong> ${expense.description}`;
    
   
    const splitType = document.createElement("div");
    splitType.className = "expense-split-type";
    splitType.innerHTML = `<strong>Split type:</strong> ${expense.splitMethod === 'even' ? 'Even split' : 'Custom split'}`;
    
   
    const date = document.createElement("div");
    date.className = "expense-date";
    const expenseDate = expense.createdAt?.toDate ? expense.createdAt.toDate() : new Date();
    date.innerHTML = `<strong>Date:</strong> ${expenseDate.toLocaleDateString()}`;
    
    const assignedMembers = document.createElement("div");
    assignedMembers.className = "expense-date";
    assignedMembers.style.paddingRight = "50px";
    assignedMembers.style.marginTop = "8px";
    assignedMembers.style.marginBottom = "8px";
    assignedMembers.style.lineHeight = "1.8";
    if (expense.splits && expense.splits.length > 0) {
      const memberNames = expense.splits.map(split => {
        const member = globalHouseholdMembers.find(m => m.uid === split.userId || m.email === split.userEmail);
        return member?.name || split.userEmail?.split('@')[0] || 'Unknown';
      });
      assignedMembers.innerHTML = `<strong>Members:</strong><br>${memberNames.map(name => `• ${name}`).join('<br>')}`;
    }
    
    card.appendChild(header);
    card.appendChild(payerInfo);
    card.appendChild(reason);
    card.appendChild(splitType);
    card.appendChild(date);
    if (expense.splits && expense.splits.length > 0) {
      card.appendChild(assignedMembers);
    }
    
    //only show if current user is the creater
    const userIsCreator = expense.createdBy === globalUser.uid || expense.createdByEmail === globalUser.email;
    if (userIsCreator) {
      const editBtn = document.createElement("button");
      editBtn.style.position = "absolute";
      editBtn.style.bottom = "28px";
      editBtn.style.right = "24px";
      editBtn.style.background = "none";
      editBtn.style.border = "none";
      editBtn.style.padding = "0";
      editBtn.style.cursor = "pointer";
      editBtn.style.boxShadow = "none";
      
      const editIcon = document.createElement("img");
      editIcon.src = "./img/edit.png";
      editIcon.style.width = "20px";
      editIcon.style.height = "auto";
      editIcon.style.display = "block";
      editBtn.appendChild(editIcon);
      
      editBtn.addEventListener("click", () => {
        openEditExpenseModal(expense);
      });
      
      card.appendChild(editBtn);
    }
    
    container.appendChild(card);
  });
}

function renderPaidExpenses(expenseList) {
  const container = document.getElementById("paid-expenses-list-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (expenseList.length === 0) {
    container.innerHTML = '<p style="color: white; text-align: center; padding: 20px; opacity: 0.8;">No paid expenses yet</p>';
    return;
  }
  
  expenseList.forEach(expense => {
    const card = document.createElement("div");
    card.className = "expense-card-new";
    card.style.position = "relative";
    
  
    const header = document.createElement("div");
    header.className = "expense-header";
    
    const amountDiv = document.createElement("div");
    amountDiv.className = "expense-amount-large";
    amountDiv.textContent = `$ ${expense.amount.toFixed(0)}`;
    
    //payer info
    const payer = globalHouseholdMembers.find(m => m.uid === expense.createdBy || m.email === expense.createdByEmail);
    const payerName = payer?.name || expense.createdByEmail?.split('@')[0] || "Unknown";
    const payerIcon = payer?.icon;
    
    const profilePic = document.createElement("div");
    profilePic.className = "expense-profile-pic";
    
    if (payerIcon && payerIcon !== "default.png") {
      const img = document.createElement("img");
      img.src = payerIcon;
      img.onerror = () => {
        profilePic.innerHTML = "";
        profilePic.textContent = payerName[0].toUpperCase();
      };
      profilePic.appendChild(img);
    } else {
      profilePic.textContent = payerName[0].toUpperCase();
    }
    
    header.appendChild(amountDiv);
    header.appendChild(profilePic);
    
   
    const payerInfo = document.createElement("div");
    payerInfo.className = "expense-payer";
    payerInfo.innerHTML = `<strong>Payer:</strong> ${payerName}`;
    
  
    const reason = document.createElement("div");
    reason.className = "expense-reason";
    reason.innerHTML = `<strong>Expense:</strong> ${expense.description}`;
    
   
    const splitType = document.createElement("div");
    splitType.className = "expense-split-type";
    splitType.innerHTML = `<strong>Split type:</strong> ${expense.splitMethod === 'even' ? 'Even split' : 'Custom split'}`;
    
  
    const date = document.createElement("div");
    date.className = "expense-date";
    const expenseDate = expense.createdAt?.toDate ? expense.createdAt.toDate() : new Date();
    date.innerHTML = `<strong>Date:</strong> ${expenseDate.toLocaleDateString()}`;
    
   
    const assignedMembersPaid = document.createElement("div");
    assignedMembersPaid.className = "expense-date";
    assignedMembersPaid.style.paddingRight = "50px";
    assignedMembersPaid.style.marginTop = "8px";
    assignedMembersPaid.style.marginBottom = "8px";
    assignedMembersPaid.style.lineHeight = "1.8";
    if (expense.splits && expense.splits.length > 0) {
      const memberNames = expense.splits.map(split => {
        const member = globalHouseholdMembers.find(m => m.uid === split.userId || m.email === split.userEmail);
        return member?.name || split.userEmail?.split('@')[0] || 'Unknown';
      });
      assignedMembersPaid.innerHTML = `<strong>Members:</strong><br>${memberNames.map(name => `• ${name}`).join('<br>')}`;
    }
    
    card.appendChild(header);
    card.appendChild(payerInfo);
    card.appendChild(reason);
    card.appendChild(splitType);
    card.appendChild(date);
    if (expense.splits && expense.splits.length > 0) {
      card.appendChild(assignedMembersPaid);
    }
    
    container.appendChild(card);
  });
}

function attachMarkPaidHandlers() {
  const buttons = document.querySelectorAll(".mark-paid-btn");
  
  buttons.forEach(button => {
    button.addEventListener("click", async () => {
      const expenseId = button.dataset.expenseId;
      const userId = button.dataset.userId;
      const currentStatus = button.dataset.hasPaid === "true";
      const newStatus = !currentStatus;
      
      await updateUserPaymentStatus(globalHouseholdId, expenseId, userId, newStatus);
      await loadAllExpenses();
    });
  });
}

function renderCompletedExpenses(list) {
  const box = document.getElementById("completed-expenses-list");
  if (!box) return;
  box.innerHTML = "";
  
  if (list.length === 0) {
    box.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No completed expenses yet</p>';
    return;
  }
  
  list.forEach(expense => {
    const entry = document.createElement("div");
    entry.className = "completed-expense";
    entry.style.background = "#f8f9fa";
    entry.style.padding = "12px";
    entry.style.marginBottom = "8px";
    entry.style.borderRadius = "8px";
    entry.style.color = "#234029";
    entry.textContent = `${expense.description} — $${expense.amount.toFixed(2)}`;
    box.appendChild(entry);
  });
  
  const historyBtn = document.getElementById("btn-expense-history");
  if (historyBtn) {
    historyBtn.onclick = () => {
      document.getElementById("expense-history-modal").classList.remove("hidden");
    };
  }
}

function updateTotals(activeExpenses) {
  let sharedTotal = 0;
  let totalIOwe = 0;
  
  activeExpenses.forEach(expense => {
    sharedTotal += expense.amount;
    
    const mySplit = expense.splits.find(s => s.userId === globalUser.email);
    if (mySplit && !mySplit.hasPaid) {
      totalIOwe += mySplit.share;
    }
  });
  
  const sharedDisplay = document.getElementById("display-total-shared");
  const owedDisplay = document.getElementById("display-total-owed");
  
  if (sharedDisplay) sharedDisplay.textContent = `$${sharedTotal.toFixed(2)}`;
  if (owedDisplay) owedDisplay.textContent = `$${totalIOwe.toFixed(2)}`;
}


function openEditExpenseModal(expense) {
  currentEditExpenseId = expense.id;
  document.getElementById("inp-edit-expense-title").value = expense.description;
  document.getElementById("inp-edit-expense-amount").value = expense.amount;
  document.getElementById("inp-edit-split-method").value = expense.method || expense.splitMethod || 'even';
  
  setupEditMemberSelectList(expense);
  
  //custom split
  const customContainer = document.getElementById("edit-custom-split-container");
  const splitMethod = expense.method || expense.splitMethod || 'even';
  if (splitMethod === "custom") {
    customContainer.classList.remove("hidden");
    setupEditCustomSplitInputs(expense);
  } else {
    customContainer.classList.add("hidden");
  }
  
  setupPaymentStatusList(expense);
  document.getElementById("edit-expense-modal").classList.remove("hidden");
}

function setupEditMemberSelectList(expense) {
  const listContainer = document.getElementById("edit-member-select-list");
  if (!listContainer) return;
  
  listContainer.innerHTML = "";
  listContainer.style.cssText = "display: flex; flex-direction: column; align-items: flex-start; width: 100%;";
  
  //list of users in the expense splits
  const expenseMemberIds = expense.splits?.map(s => s.userId) || [];
  
  globalHouseholdMembers.forEach(member => {
    const label = document.createElement("label");
    label.style.cssText = "display: flex; align-items: center; padding: 8px 0; cursor: pointer; gap: 16px;";
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = expenseMemberIds.includes(member.uid) || expenseMemberIds.includes(member.email);
    checkbox.dataset.memberId = member.uid;
    checkbox.className = "edit-member-select-checkbox";
    checkbox.style.cssText = "margin: 0; cursor: pointer; flex-shrink: 0; width: 16px; height: 16px;";
    
    const nameSpan = document.createElement("span");
    nameSpan.textContent = member.name || member.email;
    nameSpan.style.cssText = "color: #234029 !important; font-size: 14px !important; line-height: 1.4; margin: 0; flex: 1;";
    
    label.appendChild(checkbox);
    label.appendChild(nameSpan);
    listContainer.appendChild(label);
  });
}

function getEditSelectedMembers() {
  const selected = [];
  document.querySelectorAll(".edit-member-select-checkbox:checked").forEach(checkbox => {
    const member = globalHouseholdMembers.find(m => m.uid === checkbox.dataset.memberId);
    if (member) {
      selected.push(member);
    }
  });
  return selected;
}

function setupPaymentStatusList(expense) {
  const listContainer = document.getElementById("edit-payment-status-list");
  listContainer.innerHTML = "";
  
  const currentUserIsCreator = expense.createdBy === globalUser.uid || expense.createdByEmail === globalUser.email;
  
  if (!currentUserIsCreator) {
    listContainer.innerHTML = '<p style="color: #666; font-size: 14px; margin: 0;">Only the expense creator can mark payments.</p>';
    return;
  }
  
  //splits for people who owe money
  const splits = expense.splits || [];
  
  splits.forEach(split => {
    if (split.userId === expense.createdBy || split.userId === expense.createdByEmail) {
      return;
    }
    
    const member = globalHouseholdMembers.find(m => m.uid === split.userId || m.email === split.userId);
    const memberName = member?.name || split.userId?.split('@')[0] || "Unknown";
    
    const row = document.createElement("div");
    row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee;";
    
    const nameAndAmount = document.createElement("div");
    nameAndAmount.style.cssText = "color: #234029; font-weight: 600; font-size: 14px;";
    nameAndAmount.textContent = `${memberName} - $${(split.share || 0).toFixed(2)}`;
    
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.userId = split.userId;
    button.textContent = split.hasPaid ? "Paid ✓" : "Mark Paid";
    button.style.cssText = `
      padding: 6px 16px;
      border-radius: 20px;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      ${split.hasPaid 
        ? 'background: #6fa573; color: white;' 
        : 'background: #e8f5e9; color: #2e7d32; border: 2px solid #6fa573;'}
    `;
    
    button.onclick = async function() {
      const newPaidStatus = !split.hasPaid;
      split.hasPaid = newPaidStatus;
      button.textContent = newPaidStatus ? "Paid ✓" : "Mark Paid";
      button.style.cssText = `
        padding: 6px 16px;
        border-radius: 20px;
        border: none;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        ${newPaidStatus 
          ? 'background: #6fa573; color: white;' 
          : 'background: #e8f5e9; color: #2e7d32; border: 2px solid #6fa573;'}
      `;
      
     
     
      await updateUserPaymentStatus(globalHouseholdId, currentEditExpenseId, split.userId, newPaidStatus);
      await loadAllExpenses();
    };
    
    row.appendChild(nameAndAmount);
    row.appendChild(button);
    listContainer.appendChild(row);
  });
  
  if (listContainer.children.length === 0) {
    listContainer.innerHTML = '<p style="color: #666; font-size: 14px; margin: 0;">No other members owe for this expense.</p>';
  }
}

function setupEditCustomSplitInputs(expense) {
  const listContainer = document.getElementById("edit-custom-split-inputs-list");
  listContainer.innerHTML = "";
  
  globalHouseholdMembers.forEach(member => {
    const row = document.createElement("div");
    row.className = "custom-split-row";
    
    const label = document.createElement("label");
    label.textContent = member.name || member.email;
    label.style.color = "#234029";
    label.style.fontWeight = "600";
    
    const percentInput = document.createElement("input");
    percentInput.type = "number";
    percentInput.placeholder = "%";
    percentInput.min = 0;
    percentInput.max = 100;
    percentInput.classList.add("pill-input", "custom-percent-input");
    percentInput.dataset.user = member.uid;
    percentInput.style.width = "80px";
    
    const existingSplit = expense.splits?.find(s => s.userId === member.uid || s.userId === member.email);
    if (existingSplit) {
      percentInput.value = existingSplit.percent || 0;
    }
    
    row.appendChild(label);
    row.appendChild(percentInput);
    listContainer.appendChild(row);
  });
}


document.addEventListener('DOMContentLoaded', () => {
  console.log('Expenses DOMContentLoaded');
  
  const formAddExpense = document.getElementById("form-add-expense");
  if (formAddExpense) {
    formAddExpense.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const description = document.getElementById("inp-expense-title").value.trim();
      const amount = Number(document.getElementById("inp-expense-amount").value);
      const method = document.getElementById("inp-split-method").value;
      
      if (!description || !amount) {
        showCustomAlert("Please complete all fields.");
        return;
      }
      
      const selectedMembers = getSelectedMembers();
      
      if (selectedMembers.length === 0) {
        showCustomAlert("Please select at least one member to split with.");
        return;
      }
      
      let customPercents = {};
      
      if (method === "custom") {
        let totalPercent = 0;
        document.querySelectorAll(".custom-percent-input").forEach(input => {
          const percent = Number(input.value || 0);
          customPercents[input.dataset.user] = percent;
          totalPercent += percent;
        });
        
        if (totalPercent !== 100) {
          showCustomAlert("Custom percentages must add up to 100%");
          return;
        }
      }
      
      await addExpense(
        globalHouseholdId,
        globalUser.uid,
        amount,
        description,
        method,
        customPercents,
        selectedMembers
      );
      
      //clears form 
      document.getElementById("inp-expense-title").value = '';
      document.getElementById("inp-expense-amount").value = '';
      document.getElementById("inp-split-method").value = 'even';
      document.getElementById("custom-split-container").classList.add("hidden");
      
      document.getElementById("add-expense-modal").classList.add("hidden");
      await loadAllExpenses();
    });
  }
  

  const formEditExpense = document.getElementById("form-edit-expense");
  if (formEditExpense) {
    formEditExpense.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const description = document.getElementById("inp-edit-expense-title").value.trim();
      const amount = Number(document.getElementById("inp-edit-expense-amount").value);
      const method = document.getElementById("inp-edit-split-method").value;
      
      if (!description || !amount) {
        showCustomAlert("Please complete all fields.");
        return;
      }
      
      const selectedMembers = getEditSelectedMembers();
      
      if (selectedMembers.length === 0) {
        showCustomAlert("Please select at least one member to split with.");
        return;
      }
      
      let customPercents = {};
      
      if (method === "custom") {
        let totalPercent = 0;
        document.querySelectorAll("#edit-custom-split-inputs-list .custom-percent-input").forEach(input => {
          const percent = Number(input.value || 0);
          customPercents[input.dataset.user] = percent;
          totalPercent += percent;
        });
        
        if (totalPercent !== 100) {
          showCustomAlert("Custom percentages must add up to 100%");
          return;
        }
      }
     
      const paymentStatuses = {};
      document.querySelectorAll("#edit-payment-status-list input[type='checkbox']").forEach(checkbox => {
        paymentStatuses[checkbox.dataset.userId] = checkbox.checked;
      });
      await updateExpense(
        globalHouseholdId,
        currentEditExpenseId,
        amount,
        description,
        method,
        customPercents,
        paymentStatuses,
        selectedMembers
      );
      document.getElementById("edit-expense-modal").classList.add("hidden");
      await loadAllExpenses();
    });
  }
  
  const editMethodSelect = document.getElementById("inp-edit-split-method");
  if (editMethodSelect) {
    editMethodSelect.addEventListener("change", (e) => {
      const editCustomContainer = document.getElementById("edit-custom-split-container");
      if (e.target.value === "custom") {
        editCustomContainer.classList.remove("hidden");
        const listContainer = document.getElementById("edit-custom-split-inputs-list");
        listContainer.innerHTML = "";
        globalHouseholdMembers.forEach(member => {
          const row = document.createElement("div");
          row.className = "custom-split-row";
          
          const label = document.createElement("label");
          label.textContent = member.name || member.email;
          label.style.color = "#234029";
          label.style.fontWeight = "600";
          
          const percentInput = document.createElement("input");
          percentInput.type = "number";
          percentInput.placeholder = "%";
          percentInput.min = 0;
          percentInput.max = 100;
          percentInput.classList.add("pill-input", "custom-percent-input");
          percentInput.dataset.user = member.uid;
          percentInput.style.width = "80px";
          
          row.appendChild(label);
          row.appendChild(percentInput);
          listContainer.appendChild(row);
        });
      } else {
        editCustomContainer.classList.add("hidden");
      }
    });
  }
  
  //update custom split when selection changes
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("member-select-checkbox")) {
      const methodSelect = document.getElementById("inp-split-method");
      if (methodSelect && methodSelect.value === "custom") {
        renderCustomPercentInputs();
      }
    }
    
    if (e.target.classList.contains("edit-member-select-checkbox")) {
      const editMethodSelect = document.getElementById("inp-edit-split-method");
      if (editMethodSelect && editMethodSelect.value === "custom") {
        const listContainer = document.getElementById("edit-custom-split-inputs-list");
        listContainer.innerHTML = "";
        const selectedMembers = getEditSelectedMembers();
        selectedMembers.forEach(member => {
          const row = document.createElement("div");
          row.className = "custom-split-row";
          
          const label = document.createElement("label");
          label.textContent = member.name || member.email;
          label.style.color = "#234029";
          label.style.fontWeight = "600";
          
          const percentInput = document.createElement("input");
          percentInput.type = "number";
          percentInput.placeholder = "%";
          percentInput.min = 0;
          percentInput.max = 100;
          percentInput.classList.add("pill-input", "custom-percent-input");
          percentInput.dataset.user = member.uid;
          percentInput.style.width = "80px";
          
          row.appendChild(label);
          row.appendChild(percentInput);
          listContainer.appendChild(row);
        });
      }
    }
  });
  const btnDeleteExpense = document.getElementById("btn-delete-expense");
  if (btnDeleteExpense) {
    btnDeleteExpense.addEventListener("click", async () => {
      if (!currentEditExpenseId || !globalHouseholdId) return;
      
      const confirmMsg = "Are you sure you want to delete this expense? This action cannot be undone.";
      
      if (!confirm(confirmMsg)) {
        return;
      }
      
      try {
        const expRef = doc(db, "Households", globalHouseholdId, "Expenses", currentEditExpenseId);
        await updateDoc(expRef, {
          deleted: true,
          deletedAt: Timestamp.now()
        });
        
        document.getElementById("edit-expense-modal").classList.add("hidden");
        await loadAllExpenses();
        showCustomAlert("Expense deleted successfully!");
      } catch (err) {
        console.error("Error deleting expense:", err);
        showCustomAlert("Failed to delete expense: " + (err.message || err));
      }
    });
  }
  
  console.log('Expenses event listeners registered');
});
window.initExpenses = initExpenses;

console.log('Expenses.js loaded completely');
