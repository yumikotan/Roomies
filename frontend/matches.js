// matches.js
console.log("MATCHES.JS LOADED - " + new Date().toISOString());

let loadMeetingRequestsForCurrentUser;

import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { functions } from "./firebaseClient.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-functions.js";
import { auth, db } from "./firebaseClient.js";

console.log("Imports successful");

const saveProfileFn = httpsCallable(functions, "saveProfile");
const generateMatchesFn = httpsCallable(functions, "generateMatches");
console.log("Firebase functions initialized");


function showCustomAlert(message, title = "") {
  const modal = document.getElementById("custom-alert-modal");
  const titleEl = document.getElementById("custom-alert-title");
  const messageEl = document.getElementById("custom-alert-message");
  const okBtn = document.getElementById("custom-alert-ok");
  
  titleEl.textContent = "";
  messageEl.textContent = message;
  modal.classList.remove("hidden");
  
  okBtn.onclick = () => {
    modal.classList.add("hidden");
  };
}

function updateCompatButtons(isComplete) {
  const btnTakeTest = document.getElementById("btn-dash-take-test");
  const btnMatches  = document.getElementById("btn-dash-matches");

  if (btnTakeTest) {
    const labelDiv = btnTakeTest.querySelector('.find-label');
    if (labelDiv) {
      labelDiv.innerHTML = isComplete
        ? "Retake Compatibility<br />Test"
        : "Take Compatibility<br />Test";
    }
  }

  if (btnMatches) {
    btnMatches.dataset.compatCompleted = isComplete ? "true" : "false";
  }
}
console.log("updateCompatButtons defined");

async function markCompatComplete() {
  const user = auth.currentUser;
  if (!user) return;

  const answers = JSON.parse(localStorage.getItem("compat_answers") || "{}");
  const rankings = JSON.parse(localStorage.getItem("compat_rankings") || "{}");
  

  const profile = buildProfile(answers, rankings);

  const ref = doc(db, "ProfileUsers", user.uid);
  await setDoc(
    ref,
    { 
      compat_completed: true,
      compat_profile: profile,
      compat_answers: answers,
      compat_rankings: rankings
    },
    { merge: true }
  );

  updateCompatButtons(true);
}
console.log("markCompatComplete defined");

const views = {
  login: document.getElementById("view-login"),
  verify: document.getElementById("view-verify"),
  inuse: document.getElementById("view-inuse"),
  dash: document.getElementById("view-dashboard"),
  household: document.getElementById("view-household"),
  chores: document.getElementById("view-chores"),
  addChore: document.getElementById("view-addChore"),
  editChore: document.getElementById("view-editChore"),
  matches: document.getElementById("view-matches"),
  requests: document.getElementById("view-requests"),
  expenses: document.getElementById("view-expenses"),
  ideas: document.getElementById("view-ideas"),
  settings: document.getElementById("view-settings"),
  tips: document.getElementById("view-tips"),
  roommateAgreement: document.getElementById("view-roommateAgreement"),
  createRoommateAgreement: document.getElementById("view-createRoommateAgreement"),
  compatibility1: document.getElementById("view-CompatibilitTest1"),
  compatibility3And4: document.getElementById("view-CompatibilitTest3And4"),
  compatibility5And6: document.getElementById("view-CompatibilitTest5And6"),
  compatibility7And8: document.getElementById("view-CompatibilitTest7And8"),
  compatibility9And10: document.getElementById("view-CompatibilitTest9And10"),
  compatibility11: document.getElementById("view-CompatibilitTest11"),
  compatibility12And13: document.getElementById("view-CompatibilitTest12And13"),
  compatibility14And15: document.getElementById("view-CompatibilitTest14And15"),
  compatibility16And17: document.getElementById("view-CompatibilitTest16And17"),
  compatibility18And19: document.getElementById("view-CompatibilitTest18And19"),
  compatibility20: document.getElementById("view-CompatibilitTest20"),
  compatibility21And22: document.getElementById("view-CompatibilitTest21And22"),
  compatibility23And24: document.getElementById("view-CompatibilitTest23And24"),
  compatibility25And26: document.getElementById("view-CompatibilitTest25And26"),
  compatibility27And28: document.getElementById("view-CompatibilitTest27And28"),
  compatibility29And30: document.getElementById("view-CompatibilitTest29And30"),
  compatibility31And32: document.getElementById("view-CompatibilitTest31And32"),
  compatibility33And34: document.getElementById("view-CompatibilitTest33And34"),
  compatibility35And36: document.getElementById("view-CompatibilitTest35And36"),
  compatibility37And38: document.getElementById("view-CompatibilitTest37And38"),
  compatibility39And40: document.getElementById("view-CompatibilitTest39And40"),
  compatibility41And42: document.getElementById("view-CompatibilitTest41And42"),
  compatibility43And44: document.getElementById("view-CompatibilitTest43And44"),
  compatibility45And46: document.getElementById("view-CompatibilitTest45And46"),
  compatibility47And48: document.getElementById("view-CompatibilitTest47And48"),
  compatibility49And50: document.getElementById("view-CompatibilitTest49And50"),
  compatibility51And52: document.getElementById("view-CompatibilitTest51And52"),
  compatibility53: document.getElementById("compatibility53"),
};

function show(id) {
  Object.values(views).forEach((v) => v && v.classList.add("hidden"));
  const target = views[id];
  if (target) {
    target.classList.remove("hidden");
  }

}
window.show = show; 
console.log("show() function defined and exported");


const requestsEmpty = document.getElementById("requests-empty");
const requestsList  = document.getElementById("requests-list");
const requestsBadge = document.getElementById("requests-badge");
const outgoingRequestsEmpty = document.getElementById("outgoing-requests-empty");
const outgoingRequestsList = document.getElementById("outgoing-requests-list");
console.log("Requests UI refs obtained");


function updateRequestsEmptyState(hasRequests) {
  if (!requestsEmpty || !requestsList){
    return;
  }
  if (hasRequests) {
    requestsEmpty.classList.add("hidden");
    requestsList.classList.remove("hidden");
  }else{
    requestsEmpty.classList.remove("hidden");
    requestsList.classList.add("hidden");
  }
}

function updateRequestsBadge(count) {
  if (!requestsBadge){
    return;
  }
  if (count > 0){
    requestsBadge.textContent = count;
    requestsBadge.classList.remove("hidden");
  }else{
    requestsBadge.classList.add("hidden");
  }
}


async function loadIncomingRequestsForCurrentUser() {
  const user = auth.currentUser;
  if (!user) {
    updateRequestsEmptyState(false);
    updateRequestsBadge(0);
    return;
  }

  const userEmail = user.email.toLowerCase();


  const q = query(
    collection(db, "CompatRequests"),
    where("toEmail", "==", userEmail)
  );

  const snap = await getDocs(q);

  if (requestsList) {
    requestsList.innerHTML = "";
  }


  const pendingCount = snap.docs.filter(doc => doc.data().status === "pending").length;
  
  // ilter out denied requests
  const visibleDocs = snap.docs.filter(doc => doc.data().status !== "denied");

  if (visibleDocs.length === 0) {
    updateRequestsEmptyState(false);
    updateRequestsBadge(0);
    return;
  }

  updateRequestsEmptyState(true);
  updateRequestsBadge(pendingCount);

  for(const docSnap of visibleDocs) {
    const data = docSnap.data();
    const requestId = docSnap.id;
    
    const li = document.createElement("div");
    li.className = "request-row";
    li.style.cssText = "padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px;";

    const fromText = document.createElement("div");
    let statusBadge = "";
    if (data.status === "accepted") {
      statusBadge = ' <span style="color: #28a745;"> Accepted</span>';
    } else if(data.status === "pending") {
      statusBadge = ' <span style="color: #ffa500;"><img src="./img/wall-clock.png" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px; filter: brightness(0) saturate(100%) invert(67%) sepia(99%) saturate(1367%) hue-rotate(1deg) brightness(102%) contrast(101%);"> Pending</span>';
    }
    fromText.innerHTML = `Request from <strong style="color: #6fa573;">${data.fromEmail}</strong>${statusBadge}`;
    fromText.style.marginBottom = "10px";
    fromText.style.color = "#6fa573";

    li.appendChild(fromText);

    //different buttons based on status
    if(data.status === "pending") {
      const btnContainer = document.createElement("div");
      btnContainer.style.cssText = "display: flex; gap: 8px;";

      const btnAccept = document.createElement("button");
      btnAccept.textContent = "Accept";
      btnAccept.className = "btn small";
      btnAccept.addEventListener("click", async () => {
        await handleAcceptRequest(requestId, data);
      });

      const btnDeny = document.createElement("button");
      btnDeny.textContent = "Deny";
      btnDeny.className = "btn small ghost";
      btnDeny.style.color = "#dc3545";

      btnDeny.addEventListener("click", async () => {
        await handleDenyRequest(requestId);
      });

      btnContainer.appendChild(btnAccept);
      btnContainer.appendChild(btnDeny);
      li.appendChild(btnContainer);
    } else if(data.status === "accepted") {
      // For accepted requests, show View Results button
      const actionBtn = document.createElement("button");
      actionBtn.className = "btn small";
      actionBtn.style.marginTop = "8px";
      actionBtn.textContent = "View Results";

      actionBtn.addEventListener("click", async () => {
        await handleViewResults(data.fromEmail, userEmail);
      });

      li.appendChild(actionBtn);
    }
    requestsList.appendChild(li);
  }
}


async function loadOutgoingRequestsForCurrentUser() {
  const user = auth.currentUser;
  if (!user) {
    if(outgoingRequestsEmpty) {
      //outgoingReuestsEmpty.classList.remov("hidden");
      outgoingRequestsEmpty.classList.remove("hidden");
    }

    if (outgoingRequestsList) {
      outgoingRequestsList.classList.add("hidden");
    }
    return;
  }

  const userEmail = user.email.toLowerCase();
  const q = query(
    collection(db, "CompatRequests"),
    where("fromEmail", "==", userEmail)
  );

  const snap = await getDocs(q);

  if (outgoingRequestsList){
    outgoingRequestsList.innerHTML = "";
  }

  if (snap.empty) {
    if (outgoingRequestsEmpty) {
      outgoingRequestsEmpty.classList.remove("hidden");
    }
    if (outgoingRequestsList){
      outgoingRequestsList.classList.add("hidden");
    }

    return;
  }

  if (outgoingRequestsEmpty) outgoingRequestsEmpty.classList.add("hidden");
  if (outgoingRequestsList) outgoingRequestsList.classList.remove("hidden");

  // Deduplicate requests by recipient email, keep only the most recent
  const requestsByEmail = new Map();
  
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const toEmail = data.toEmail;
    const requestId = docSnap.id;
    
    if (!requestsByEmail.has(toEmail)) {
      requestsByEmail.set(toEmail, { id: requestId, data: data, doc: docSnap });
    } else{
      const existing = requestsByEmail.get(toEmail);
      const existingTime = existing.data.createdAt?.toMillis() || 0;
      const newTime = data.createdAt?.toMillis() || 0;
      
      if (newTime > existingTime) {
        requestsByEmail.set(toEmail, { id: requestId, data: data, doc: docSnap });
      }
    }
  }
  
 
 
  const toDelete = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const toEmail = data.toEmail;
    const requestId = docSnap.id;
    const keeper = requestsByEmail.get(toEmail);
    
    if (keeper.id !== requestId) {
      toDelete.push(deleteDoc(doc(db, "CompatRequests", requestId)));
    }
  }
  
  if (toDelete.length > 0) {
    await Promise.all(toDelete);
    console.log(`Cleaned up ${toDelete.length} duplicate outgoing compat requests`);
  }

  for (const [toEmail, { id: requestId, data }] of requestsByEmail) {
    
    const li = document.createElement("div");
    li.className = "request-row";
    li.style.cssText = "padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px;";

    const toText = document.createElement("div");
    toText.style.marginBottom = "8px";
    toText.style.color = "#6fa573";
    
    let statusText = "";
    let statusColor = "#666";
    
    if(data.status === "pending") {
      statusText = '<img src="./img/wall-clock.png" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"> Pending';
      statusColor = "#ffa500";
    }else if(data.status === "accepted") {
      statusText = '<img src="./img/check (1).png" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"> Accepted';
      statusColor = "#28a745";
    }else if(data.status === "denied") {
      statusText = '<img src="./img/x.png" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"> Denied';
      statusColor = "#dc3545";
    }
    
    toText.innerHTML = `Request to <strong style="color: #6fa573;">${data.toEmail}</strong> - <span style="color: ${statusColor};">${statusText}</span>`;

    li.appendChild(toText);

    
    if (data.status === "accepted") {
      const actionBtn = document.createElement("button");

      actionBtn.className = "btn small";
      actionBtn.style.marginTop = "8px";
      actionBtn.textContent = "View Results";

      actionBtn.addEventListener("click", async () => {
        await handleViewResults(data.fromEmail, data.toEmail);
      });



      li.appendChild(actionBtn);
    }

    outgoingRequestsList.appendChild(li);
  }
}


loadMeetingRequestsForCurrentUser = async function() {
  console.log("loadMeetingRequestsForCurrentUser called");
  const user = auth.currentUser;
  
  const meetingRequestsEmpty = document.getElementById("meeting-requests-empty");
  const meetingRequestsList = document.getElementById("meeting-requests-list");
  
  if (!user) {
    if (meetingRequestsEmpty) {
      meetingRequestsEmpty.classList.remove("hidden");
    }

    if (meetingRequestsList) {
      meetingRequestsList.classList.add("hidden");
    }
    return;
  }

  const userEmail = user.email.toLowerCase();

  //incoming meeting requests
  const q = query(
    collection(db, "MeetingRequests"),
    where("toEmail", "==", userEmail)
  );

  const snap = await getDocs(q);

  console.log(`total meeting requests found: ${snap.docs.length}`);
  snap.docs.forEach(docSnap => {
    const data = docSnap.data();
    console.log(`request ID: ${docSnap.id}, From: ${data.fromEmail}, Status: ${data.status}, CreatedAt: ${data.createdAt?.toDate()}`);
  });

  if (meetingRequestsList) {
    meetingRequestsList.innerHTML = ""; 
  }

  if (snap.empty) {//xome back and make into one line spacing
    if (meetingRequestsEmpty) {meetingRequestsEmpty.classList.remove("hidden");}
    if (meetingRequestsList) {meetingRequestsList.classList.add("hidden");}
    return;
  }

  if (meetingRequestsEmpty) {
    meetingRequestsEmpty.classList.add("hidden");
  }

  if (meetingRequestsList) {
    meetingRequestsList.classList.remove("hidden");
  }
  const requestsByEmail = new Map();
  
  // identify which requests to keep
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const fromEmail = data.fromEmail;
    const requestId = docSnap.id;
    
    //keep only the most recent request from each sender
    if (!requestsByEmail.has(fromEmail)) {
      requestsByEmail.set(fromEmail, { id: requestId, data: data, doc: docSnap });
    } else {
      const existing = requestsByEmail.get(fromEmail);
      const existingTime = existing.data.createdAt?.toMillis() || 0;
      const newTime = data.createdAt?.toMillis() || 0;
      
      if (newTime > existingTime) {
        
        requestsByEmail.set(fromEmail, { id: requestId, data: data, doc: docSnap });
      }
    }
  }
  
  //delete duplicates
  const toDelete = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const fromEmail = data.fromEmail;
    const requestId = docSnap.id;
    const keeper = requestsByEmail.get(fromEmail);
    
   
    if (keeper.id !== requestId) {
      toDelete.push(deleteDoc(doc(db, "MeetingRequests", requestId)));
    }
  }
  

  if (toDelete.length > 0) {
    console.log(`About to delete ${toDelete.length} duplicate meeting requests`);
    await Promise.all(toDelete);
    console.log(`Sucessfully deleted ${toDelete.length} duplicate meeting requests`);
  } else {
    console.log("No duplicate meeting requets to clean up");
  }

  // Refresh the list after cleanup
  if (toDelete.length > 0) {
    const refreshSnap = await getDocs(q);
    requestsByEmail.clear();
    for (const docSnap of refreshSnap.docs) {
      const data = docSnap.data();
      const fromEmail = data.fromEmail;
      const requestId = docSnap.id;
      
      if (!requestsByEmail.has(fromEmail)) {
        requestsByEmail.set(fromEmail, { id: requestId, data: data, doc: docSnap });
      }
    }
  }

  for (const [fromEmail, { id: requestId, data }] of requestsByEmail) {
    
    const li = document.createElement("div");
    li.className = "request-row";
    li.style.cssText = "padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px;";

    const fromText = document.createElement("div");
    let statusBadge = "";
    if (data.status === "accepted") {
      statusBadge = ' <span style="color: #28a745;">Accepted</span>';
    } else if (data.status === "pending") {
      statusBadge = ' <span style="color: #ffa500;"><img src="./img/wall-clock.png" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px; filter: brightness(0) saturate(100%) invert(67%) sepia(99%) saturate(1367%) hue-rotate(1deg) brightness(102%) contrast(101%);"> Pending</span>';
    }
    fromText.innerHTML = `Meeting request from <strong style="color: #6fa573;">${data.fromEmail}</strong>${statusBadge}`;
    fromText.style.marginBottom = "10px";
    fromText.style.color = "#6fa573";

    li.appendChild(fromText);
    
    //if request is accepted and requester shared it show number 
    if (data.status === "accepted" && data.fromPhone) {
      const phoneInfo = document.createElement("div");
      phoneInfo.style.cssText = "background: #f8f9fa; padding: 10px; border-radius: 6px; margin-top: 8px; margin-bottom: 8px;";
      phoneInfo.innerHTML = `
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">Their phone number:</p>
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #295e2b;">${data.fromPhone}</p>
      `;


      li.appendChild(phoneInfo);
    }

 
    if (data.status === "pending") {
      const btnContainer = document.createElement("div");
      btnContainer.style.cssText = "display: flex; gap: 8px;";

      const btnAccept = document.createElement("button");
      btnAccept.textContent = "Accept";
      btnAccept.className = "btn small";
      btnAccept.addEventListener("click", async () => {
        await handleAcceptMeetingRequest(requestId);
      });

      const btnDeny = document.createElement("button");
      btnDeny.textContent = "Deny";
      btnDeny.className = "btn small ghost";
      btnDeny.style.color = "#dc3545";

      btnDeny.addEventListener("click", async () => {
        await handleDenyMeetingRequest(requestId);
      });

      btnContainer.appendChild(btnAccept);
      btnContainer.appendChild(btnDeny);
      li.appendChild(btnContainer);
    }

    meetingRequestsList.appendChild(li);
  }
}


window.loadMeetingRequestsForCurrentUser = loadMeetingRequestsForCurrentUser;
console.log("loadMeetingRequestsForCurrentUser :", typeof window.loadMeetingRequestsForCurrentUser);

async function handleAcceptMeetingRequest(requestId) {
  const user = auth.currentUser;
  if (!user) {
    showCustomAlert("You must be logged in.");
    return;
  }

  try {
    //check for phone number
    const requestDoc = await getDoc(doc(db, "MeetingRequests", requestId));
    if (!requestDoc.exists()) {
      showCustomAlert("Request not found.");
      return;
    }
    
    const requestData = requestDoc.data();
    const requesterPhone = requestData.fromPhone;
    const requesterEmail = requestData.fromEmail;
    

    const phoneModal = document.getElementById("phone-accept-modal");
    const phoneInput = document.getElementById("phone-accept-input");
    const messageEl = document.getElementById("phone-accept-message");
    const theirNumberDiv = document.getElementById("phone-accept-their-number");
    const phoneDisplayEl = document.getElementById("phone-display-number");
    const btnAccept = document.getElementById("btn-phone-accept-confirm");
    const btnCancel = document.getElementById("btn-phone-accept-cancel");
    const btnClose = document.getElementById("btn-close-phone-accept");
    
    if (!phoneModal) {
      showCustomAlert("Error: Phone modal not found");
      return;
    }
    
    phoneInput.value = "";
    
 
    if (requesterPhone) {
      messageEl.textContent = `${requesterEmail.split('@')[0]} has shared their phone number with you. Would you like to share yours back?`;
      theirNumberDiv.style.display = "block";
      phoneDisplayEl.textContent = requesterPhone;
    }else{
      messageEl.textContent = `Accept this match request from ${requesterEmail.split('@')[0]}. You can optionally share your phone number.`;
      theirNumberDiv.style.display = "none";
    }
    
    phoneModal.classList.remove("hidden");
    
 
    return new Promise((resolve) => {
      const handleAccept = async () => {
        const phoneNumber = phoneInput.value.trim();
        
      
        await updateDoc(doc(db, "MeetingRequests", requestId), {
          status: "accepted",
          toPhone: phoneNumber || null,
          acceptedAt: serverTimestamp()
        });
        
        phoneModal.classList.add("hidden");
        showCustomAlert("Meeting request accepted!");
        await loadMeetingRequestsForCurrentUser();
        cleanup();
        resolve();
      };
      
      const handleCancel = () => {
        phoneModal.classList.add("hidden");
        cleanup();
        resolve();
      };
      
      const cleanup = () => {
        btnAccept.removeEventListener("click", handleAccept);
        btnCancel.removeEventListener("click", handleCancel);
        btnClose.removeEventListener("click", handleCancel);
      };
      
      btnAccept.addEventListener("click", handleAccept);
      btnCancel.addEventListener("click", handleCancel);
      btnClose.addEventListener("click", handleCancel);
    });
    
  } catch (err) {
    console.error("Error accepting meeting request:", err);
    showCustomAlert("Failed to accept request.");
  }
}

async function handleDenyMeetingRequest(requestId) {
  try {
    await updateDoc(doc(db, "MeetingRequests", requestId), {
      status: "denied"
    });
    showCustomAlert("Meeting request denied.");
    await loadMeetingRequestsForCurrentUser();
  } catch (err) {
    console.error("Error denying meeting request:", err);
    showCustomAlert("Failed to deny request.");
  }
}



async function handleAcceptRequest(requestId, data) {
  const user = auth.currentUser;
  if (!user) {
    //console.
    return;
  }

  try {
    const requestRef = doc(db, "CompatRequests", requestId);
    await updateDoc(requestRef, { status: "accepted" });
    const profileRef = doc(db, "ProfileUsers", user.uid);
    const profileSnap = await getDoc(profileRef);
    const hasCompletedTest = profileSnap.exists() && profileSnap.data().compat_completed;

    if (!hasCompletedTest) {
      if (confirm("You've accepted the request! Take the compatibility test now to see your results?")) {
        show("compatibility1");
      } else{
        showCustomAlert("Request accepted. Complete your test to see the results!");
      }
    }else{
      await handleViewResults(data.fromEmail, user.email.toLowerCase());
    }
    
    //need to reload both lists to update UI
    await loadIncomingRequestsForCurrentUser();
    await loadOutgoingRequestsForCurrentUser();
  } catch (err) {
    console.error("Error accepting request:", err);
    showCustomAlert("Failed to accept request");
  }
}


async function handleDenyRequest(requestId) {
  if (!confirm("Are you sure you want to deny this request?")) {return;}

  try{
    const requestRef = doc(db, "CompatRequests", requestId);
    await updateDoc(requestRef, { status: "denied" });
    
    showCustomAlert("Request denied");
    await loadIncomingRequestsForCurrentUser();
  } catch (err) {
    console.error("Error denying request:", err);
    showCustomAlert("Failed to deny request");
  }
}

async function handleViewResults(email1, email2) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  
  const currentUserEmail = currentUser.email.toLowerCase();
  
  try {
    //get both users profiles
    const q1 = query(collection(db, "ProfileUsers"), where("email", "==", email1.toLowerCase()));
    const q2 = query(collection(db, "ProfileUsers"), where("email", "==", email2.toLowerCase()));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    if (snap1.empty || snap2.empty) {
      showCustomAlert("Could not find user profiles");
      return;
    }
    
    const user1Data = snap1.docs[0].data();
    const user2Data = snap2.docs[0].data();
    
    //Chck if current user has completed test
    const currentUserData = currentUserEmail === email1.toLowerCase() ? user1Data : user2Data;
    const otherUserData = currentUserEmail === email1.toLowerCase() ? user2Data : user1Data;
    const otherUserEmail = currentUserEmail === email1.toLowerCase() ? email2 : email1;
    
    if (!currentUserData.compat_completed) {
      if (confirm("You need to complete your compatibility test first. Take it now?")) {
        show("compatibility1");
      }
      return;
    }
    
    if (!otherUserData.compat_completed) {
      showCustomAlert(`Waiting for ${otherUserEmail.split('@')[0]} to complete their compatibility test.`);
      return;
    }
    //stop here, i go sleep now :)
    // Both completed,calculate and display compatibility
    const profile1 = currentUserData.compat_profile;
    const profile2 = otherUserData.compat_profile;
    
    if (!profile1 || !profile2) {
      showCustomAlert("Compatibility profiles not found. Please retake the test.");
      return;
    }
    
    // Calculate match score and differenceses
    const matchResult = computeMatch(profile1, profile2);
    const score = matchResult.compatibility_score;
    
    // find top 3 differences
    const categories = ['cleanliness', 'noise', 'sleep_schedule'];
    const categoryNames = {
      'cleanliness': 'Cleanliness',
      'noise': 'Noise Tolerance',
      'sleep_schedule': 'Sleep Schedule'
    };
    
    const differences = categories.map(cat => ({
      category: categoryNames[cat],
      diff: Math.abs(profile1[cat] - profile2[cat]),
      you: profile1[cat],
      them: profile2[cat]
    })).sort((a, b) => b.diff - a.diff);
    
   
    const modal = document.getElementById("compatibility-results-modal");
    const scoreEl = document.getElementById("results-score");
    const diffListEl = document.getElementById("differences-list");
    const btnOk = document.getElementById("btn-results-ok");
    const btnClose = document.getElementById("btn-close-results");
    
    if (!modal) {
      showCustomAlert(`Compatibility Score: ${score}%`);
      return;
    }
    
    
    scoreEl.textContent = `${score}%`;
    
    // Display top 3 differenceses or message if all similar
    const topDifferences = differences.slice(0, 3).filter(d => d.diff > 5);
    
    if (topDifferences.length === 0) {
      diffListEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <img src="./img/check (1).png" style="width: 48px; height: 48px; margin-bottom: 12px; filter: brightness(0) invert(1);" alt="Check" />
          <p style="margin: 0; color: #ffffff; font-weight: 700; font-size: 16px;">
            No major differences found!
          </p>
          <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; line-height: 1.5; opacity: 0.9;">
            You have very similar preferences in all key areas.
          </p>
        </div>
      `;
    } else {
      diffListEl.innerHTML = topDifferences.map(d => `
        <div style="margin-bottom: 14px; padding: 14px; background: rgba(255, 255, 255, 0.2); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.3);">
          <p style="margin: 0 0 10px 0; font-weight: 700; color: #ffffff; font-size: 15px; text-align: center;">${d.category}</p>
          <div style="display: flex; justify-content: space-around; font-size: 14px;">
            <div style="text-align: center;">
              <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 12px; opacity: 0.8;">You</p>
              <p style="margin: 0; font-weight: 600; color: #ffffff; font-size: 16px;">${d.you.toFixed(0)}%</p>
            </div>
            <div style="text-align: center;">
              <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 12px; opacity: 0.8;">Them</p>
              <p style="margin: 0; font-weight: 600; color: #ffffff; font-size: 16px;">${d.them.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      `).join('');
    }
    
    modal.classList.remove("hidden");
    
    const closeModal = () => {
      modal.classList.add("hidden");
    };
    
    btnOk.onclick = closeModal;
    btnClose.onclick = closeModal;
    
  } catch (err) {
    console.error("Error viewing results:", err);
    showCustomAlert("Failed to load compatibility results");
  }
}


window.loadIncomingRequestsForCurrentUser = loadIncomingRequestsForCurrentUser;
window.loadOutgoingRequestsForCurrentUser = loadOutgoingRequestsForCurrentUser;


const btnRequestsBack = document.getElementById("btn-requests-back");
if (btnRequestsBack && !btnRequestsBack.dataset.listenerAdded) {
  btnRequestsBack.dataset.listenerAdded = "true";
  btnRequestsBack.addEventListener("click", () => {
    show("dash");
  });
}


const btnMakeRequest = document.getElementById("btn-make-request");
if (btnMakeRequest && !btnMakeRequest.dataset.listenerAdded) {
  btnMakeRequest.dataset.listenerAdded = "true";
  btnMakeRequest.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user){
      showCustomAlert("You must be logged in to send a request.");
      return;
    }

    const input = document.getElementById("request-email-input");
    if(!input) {
      console.error("request-email-input not found in DOM");
      return;
    }

    const toEmail = input.value.trim().toLowerCase();

    if (!toEmail) {
      showCustomAlert("Please enter your roommate's .edu email.");
      return;
    }

    if (toEmail === user.email.toLowerCase()) {
      showCustomAlert("You can't send a request to yourself.");
      return;
    }

    try{
      // Check if request already exists
      const existingQ = query(
        collection(db, "CompatRequests"),
        where("fromEmail", "==", user.email.toLowerCase()),
        where("toEmail", "==", toEmail)
      );
      const existingSnap = await getDocs(existingQ);
      
      if (!existingSnap.empty) {
        showCustomAlert("You've already sent a request to this user.");
        return;
      }

      await addDoc(collection(db, "CompatRequests"), {
        fromUid: user.uid,
        fromEmail: user.email.toLowerCase(),
        toEmail,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      showCustomAlert("Request sent!");
      input.value = "";
      
      // Reload outgoing requests to show the new one
      await loadOutgoingRequestsForCurrentUser();
    } catch (err){
      console.error("Error sending request:", err);
      showCustomAlert("Could not send request: " + (err.message || err));
    }
  });
}



// Wrap in a function and call it when dashboard is shown
console.log("About to define initDashboardButtons");
function initDashboardButtons() {
  console.log("initDashboardButtons called");
  // take Compatibility Test
  const btnDashTakeTest = document.getElementById("btn-dash-take-test");
  if(btnDashTakeTest && !btnDashTakeTest.dataset.listenerAdded) {
    btnDashTakeTest.dataset.listenerAdded = "true";
    btnDashTakeTest.addEventListener("click", () => {
      show("compatibility1");
      // disable bottom nav when test starts
      if(typeof window.disableBottomNav === "function") {
        window.disableBottomNav();
      }
    });
  }

  // requests open the "Compatibility Requests" view
  const btnDashRequests = document.getElementById("btn-dash-requests");
  if (btnDashRequests && !btnDashRequests.dataset.listenerAdded) {
    btnDashRequests.dataset.listenerAdded = "true";
    btnDashRequests.addEventListener("click", async () => {
      console.log("DASHBOARD REQUESTS TILE CLICKED - Loading all requests...");
      // await loadIncomingRequestsForCurrentuser();
      await loadIncomingRequestsForCurrentUser();
      await loadMeetingRequestsForCurrentUser();
      await loadOutgoingRequestsForCurrentUser();
      // loadOutgoingMeetingRequests 
      show("requests");
    });
  }

  // matche sbuttons
  const btnDashMatches = document.getElementById("btn-dash-matches");
  console.log("btnDashMatches element:", btnDashMatches);
  if (btnDashMatches && !btnDashMatches.dataset.listenerAdded) {
    btnDashMatches.dataset.listenerAdded = "true";
    btnDashMatches.addEventListener("click", () => {
      console.log("Matches button clicked!");
      console.log("compatCompleted:", btnDashMatches.dataset.compatCompleted);
      

      if (btnDashMatches.dataset.compatCompleted !== "true") {
        // Show modal instead of alart
        const modal = document.getElementById("compat-reminder-modal");
        if (modal) modal.classList.remove("hidden");
        return;
      }
      console.log("Showing matches view");
      show("matches");
    });
  } else if (!btnDashMatches) {
    console.error("btn-dash-matches not found!");

  }
  console.log("initDashboardButtons finished");
}

console.log("Function defined, about to call it");


try{
  initDashboardButtons();
  console.log("Initial call succeeded");
} catch(e){
  console.error("Error calling initDashboardButtons:", e);
}


console.log("Exporting initDashboardButtons and loadMeetingRequestsForCurrentUser");
window.initDashboardButtons = initDashboardButtons;
window.loadMeetingRequestsForCurrentUser = loadMeetingRequestsForCurrentUser;
// window.loadOutgoingMeetingRequests = loadOutgoingMeetingRequests; 
console.log("window.initDashboardButtons =", typeof window.initDashboardButtons);
console.log("window.loadMeetingRequestsForCurrentUser =", typeof window.loadMeetingRequestsForCurrentUser);

// Close compat reminder modal
const btnCloseCompatModal = document.getElementById("btn-close-compat-modal");
const compatModal = document.getElementById("compat-reminder-modal");

if (btnCloseCompatModal) {
  btnCloseCompatModal.addEventListener("click", () => {
    if (compatModal) {compatModal.classList.add("hidden");}

  });
}

// Close modal when clicking outside
if (compatModal) {
  compatModal.addEventListener("click", (e) => {
    if (e.target === compatModal) {
      compatModal.classList.add("hidden");
    }
  });
}

// Go to test from modal
const btnGoToTest = document.getElementById("btn-go-to-test");
if (btnGoToTest) {
  btnGoToTest.addEventListener("click", () => {
    if (compatModal) compatModal.classList.add("hidden");
    show("compatibility1");
  });
}


async function sendMeetingRequest(targetEmail) {
  const user = auth.currentUser;
  if (!user) {
    showCustomAlert("You must be logged in to send a meeting request.");
    return;
  }

  try {
    //get ALL requests between these users
    const allRequestsQuery = query(
      collection(db, "MeetingRequests"),
      where("fromEmail", "==", user.email.toLowerCase()),
      where("toEmail", "==", targetEmail.toLowerCase())
    );
    const allRequestsSnap = await getDocs(allRequestsQuery);
    
    // Check if theres an active request pending or accepted
    const hasActiveRequest = allRequestsSnap.docs.some(doc => {
      const status = doc.data().status;
      return status === "pending" || status === "accepted";
    });
    
    if (hasActiveRequest) {
      showCustomAlert("You've already sent a meeting request to this user.");
      return;
    }
    
    // Delete all old requests 
    if (!allRequestsSnap.empty) {
      const deletePromises = allRequestsSnap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }

    // Show phone number modal
    const phoneModal = document.getElementById("phone-request-modal");
    const phoneInput = document.getElementById("phone-request-input");
    const btnSend = document.getElementById("btn-phone-send");
    const btnCancel = document.getElementById("btn-phone-cancel");
    const btnClose = document.getElementById("btn-close-phone-request");
    

    
    if (!phoneModal) {
      showCustomAlert("Error: Phone modal not found");
      return;
    }
    
    phoneInput.value = "";
    phoneModal.classList.remove("hidden");
    
    // return a promise that resolves when user clicks send or cansels
    return new Promise((resolve) => {
      const handleSend = async () => {
        const phoneNumber = phoneInput.value.trim();
        
        // create meeting request with optional phone number
        await addDoc(collection(db, "MeetingRequests"), {
          fromUid: user.uid,
          fromEmail: user.email.toLowerCase(),
          toEmail: targetEmail.toLowerCase(),
          status: "pending",
          type: "meeting",
          fromPhone: phoneNumber || null,
          createdAt: serverTimestamp(),
        });

        phoneModal.classList.add("hidden");
        showCustomAlert("Meeting request sent!");
        await loadAndDisplayMatches();
        cleanup();
        resolve();
      };
      
      const handleCancel = () => {
        phoneModal.classList.add("hidden");
        cleanup();
        resolve();
      };
      
      const cleanup = () => {
        btnSend.removeEventListener("click", handleSend);
        btnCancel.removeEventListener("click", handleCancel);
        btnClose.removeEventListener("click", handleCancel);
      };
      
      btnSend.addEventListener("click", handleSend);
      btnCancel.addEventListener("click", handleCancel);
      btnClose.addEventListener("click", handleCancel);
    });

  } catch (err) {
    console.error("Error sending meeting request:", err);
    showCustomAlert("Failed to send meeting request. Please try again.");
  }
}


async function unrequestMeeting(requestId) {
  if (!confirm("Cancel this meeting request?")) {
    return;
  }

  try {
    await deleteDoc(doc(db, "MeetingRequests", requestId));
    
    showCustomAlert("Meeting request cancelled.");
    await loadAndDisplayMatches();
    await loadMeetingRequestsForCurrentUser();
    await loadOutgoingRequestsForCurrentUser();
  } catch (err) {
    console.error("Error cancelling meeting request:", err);
    showCustomAlert("Failed to cancel request. Please try again.");
  }
}




// "See matches" card if it there
const cardMatches = document.getElementById("card-matches");
if (cardMatches) {
  cardMatches.addEventListener("click", () => show("matches"));
}



async function loadAndDisplayMatches() {
  //console.log("loadAndDisplayMatches called");

  const user = auth.currentUser;
  if (!user) {
    console.log("No user logged in");
    return;
  }

  const matchesEmpty = document.getElementById("matches-empty");
  const matchesList = document.getElementById("matches-list");

  if (!matchesEmpty || !matchesList) {
    console.log("DOM elements not found");
    return;
  }

  try {
    // Check if current user has completed test
    const currentUserDoc = await getDoc(doc(db, "ProfileUsers", user.uid));
    console.log("User doc exists:", currentUserDoc.exists());
    console.log("User doc data:", currentUserDoc.data());
    
    if(!currentUserDoc.exists() || !currentUserDoc.data()?.compat_completed) {
      console.log("User has not completed test");

      matchesEmpty.classList.remove("hidden");
      matchesList.classList.add("hidden");
      return;
    }

    console.log("User has completed test, loading matches...");

    // Get current users profile from Firestore 
    const currentUserData = currentUserDoc.data();
    const currentUserProfile = currentUserData.compat_profile;
    
    if (!currentUserProfile){
      console.log("User profile not found in Firestore, please retake test");
      matchesEmpty.innerHTML = `
        <p class="subtitle">Profile data not found.</p>
        <p style="font-size: 14px; color: #666; margin-top: 8px;">
          Please retake your compatibility test to update your profile.
        </p>
      `;


      matchesEmpty.classList.remove("hidden");
      matchesList.classList.add("hidden");
      return;
    }
    
    console.log("Current user profile:", currentUserProfile);

    // Get all other users who have completed the test
    const usersQuery = query(
      collection(db, "ProfileUsers"),
      where("compat_completed", "==", true)
    );
    const usersSnapshot = await getDocs(usersQuery);
    console.log("Found", usersSnapshot.docs.length, "users who completed test");

    const matches = [];
    for (const userDoc of usersSnapshot.docs) {
      const otherUserData = userDoc.data();
      
      // Skip current user
      if (otherUserData.uid === user.uid) continue;

      // Get other users profile from their ProfileUsers document
      let otherUserProfile = otherUserData.compat_profile;
      
      // If profile doesn't exist but they have answers/rankings, build it
      if(!otherUserProfile && otherUserData.compat_answers && otherUserData.compat_rankings) {
        console.log("Building profile for", otherUserData.email, "from saved answers");
        otherUserProfile = buildProfile(otherUserData.compat_answers, otherUserData.compat_rankings);
      }
      
      if(otherUserProfile && otherUserProfile.cleanliness !== undefined) {
        const matchResult = computeMatch(currentUserProfile, otherUserProfile);
        console.log("Match with", otherUserData.email, "=", matchResult.compatibility_score + "%");
        matches.push({
          name: otherUserData.name || otherUserData.email.split("@")[0],
          email: otherUserData.email,
          score: matchResult.compatibility_score,
          iconPath: otherUserData.icon || "./img/otter.png"
        });
      } else{
        console.log("User", otherUserData.email, "marked as complete but has no profile data - they may need to retake test");
      }
    }

    console.log("Total matches:", matches.length);

    // Check existing meeting requests to update button states
    const meetingRequestsQuery = query(
      collection(db, "MeetingRequests"),
      where("fromEmail", "==", user.email.toLowerCase())
    );
    const meetingRequestsSnapshot = await getDocs(meetingRequestsQuery);
    const requestedEmails = new Map();
    
    meetingRequestsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status !== "denied") {
        requestedEmails.set(data.toEmail, doc.id);
      }
    });

    // Display results
    if (matches.length === 0) {
      matchesEmpty.innerHTML = `
        <p class="subtitle">No matches available yet.</p>
        <p style="font-size: 14px; color: #666; margin-top: 8px;">
          Other users may need to retake their compatibility test to update their profiles.
        </p>
      `;
      matchesEmpty.classList.remove("hidden");
      matchesList.classList.add("hidden");
    } else {
      // Sort by score descending
      matches.sort((a, b) => b.score - a.score);

      matchesList.innerHTML = matches.map(match => {
        const hasRequested = requestedEmails.has(match.email.toLowerCase());
        const requestId = hasRequested ? requestedEmails.get(match.email.toLowerCase()) : null;
        
        return `
        <div style="background: white; padding: 10px 12px; margin: 6px 0; border-radius: 10px; display: flex; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.12); width: 100%;">
          <img src="${match.iconPath}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%; flex-shrink: 0; margin-right: 8px;" alt="Profile" />
          <div style="flex: 1; min-width: 0; margin-right: 12px;">
            <div style="font-weight: 600; color: #295e2b; font-size: 13px; text-align: left;">${match.name}</div>
            <div style="font-size: 10px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left;">${match.email}</div>
          </div>
          <div style="text-align: center; min-width: 50px; margin-right: 12px; flex-shrink: 0;">
            <div style="font-size: 18px; font-weight: 700; color: #295e2b;">${match.score}%</div>
            <div style="font-size: 9px; color: #999;">Match</div>
          </div>
          ${hasRequested 
            ? `<button 
                class="btn-unrequest-meeting" 
                data-request-id="${requestId}"
                style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 10px; cursor: pointer; white-space: nowrap; flex-shrink: 0;">
                Unrequest
              </button>`
            : `<button 
                class="btn-send-meeting-request" 
                data-email="${match.email}"
                style="background: #295e2b; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 10px; cursor: pointer; white-space: nowrap; flex-shrink: 0;">
                Request
              </button>`
          }
        </div>
      `;
      }).join("");

      matchesEmpty.classList.add("hidden");
      matchesList.classList.remove("hidden");
      
      // Use event delegation for dynamically created buttons
      matchesList.removeEventListener("click", handleMatchesListClick);
      matchesList.addEventListener("click", handleMatchesListClick);
    }
  } catch (err) {
    console.error("Error loading matches:", err);
    matchesEmpty.innerHTML = `<p class="subtitle">Error loading matches. Please try again.</p>`;
    matchesEmpty.classList.remove("hidden");
    matchesList.classList.add("hidden");
  }
}

// Event delegation handler for matches list
async function handleMatchesListClick(e) {
  // Handle send meeting request
  if(e.target.classList.contains("btn-send-meeting-request")){
    e.preventDefault();
    e.stopPropagation();
    const targetEmail = e.target.getAttribute("data-email");
    await sendMeetingRequest(targetEmail);
  }
  
  // Handle unrequest meeting
  if(e.target.classList.contains("btn-unrequest-meeting")){
    e.preventDefault();
    e.stopPropagation();

    const requestId = e.target.getAttribute("data-request-id");
    await unrequestMeeting(requestId);
  }
}

// Boxes on the matches screen
const btnCompatTest = document.getElementById("btn-compatibleTest-box");
if (btnCompatTest) {
  btnCompatTest.addEventListener("click", () => {
    show("compatibility1");  
  });
}


const btnSeeCompatible = document.getElementById("btn-seeCompatible-box");
if (btnSeeCompatible) {
  btnSeeCompatible.addEventListener("click", async () => {
    await loadIncomingRequestsForCurrentUser(); // fill the list
    show("requests");                            // show view-requests
  });
}


const btnMatchRoommate = document.getElementById("btn-matchRoomate-box");
if (btnMatchRoommate) {
  btnMatchRoommate.addEventListener("click", () => {
    show("matches");   // stay on the matches dashboard for now
    // later you can plug in generateMatchesFn and show scores here
  });
}


class Stack {
  constructor() {
    this.items = [];
  }
  push(element) {
    this.items.push(element);
  }
  pop() {
    if (this.isEmpty()) return -1;
    return this.items.pop();
  }
  peek() {
    if (this.isEmpty()) return -1;
    return this.items[this.items.length - 1];
  }
  isEmpty() {
    return this.items.length === 0;
  }
}

const myStack = new Stack();
let currentView = "compatibility1";

// global state
let BehavioralPts = 0;

window.RoomiesState = window.RoomiesState || {};
RoomiesState.answers = RoomiesState.answers || {}; 

function saveAnswer(qid, val) {
  RoomiesState.answers[qid] = val;
  localStorage.setItem("compat_answers", JSON.stringify(RoomiesState.answers));
}

// show2 uses stack for back 
function show2(id, { push = true } = {}) {
  if (push && currentView !== id) {
    myStack.push(currentView);
  }
  Object.values(views).forEach((v) => v && v.classList.add("hidden"));
  const target = views[id];
  if (target) target.classList.remove("hidden");
  currentView = id;

  // Initialize drag and drop when showing question 53
  if (id === "compatibility53") {
    setTimeout(() => initDragAndDrop(), 100);
  }
}

function goBack() {
  if (myStack.isEmpty()) {
    showCustomAlert("stack empty");
    return;
  }
  const previous = myStack.pop();
  show2(previous, { push: false });
}


document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-backQ")) {
    goBack();
  }
});



// Extract questionId from the buttons classes
function getQuestionIdFromButton(btn) {
  for (const cls of btn.classList) {
    if (cls === "tick-circle") {
      return 1; // Question 1
    }
    const match = cls.match(/^Q(\d+)-tick-circle$/);
    if (match) {
      return Number(match[1]); // Question N
    }
  }
  return null;
}

document.addEventListener("click", (e) => {
  // matches .tick-circle or any class that contains "-tick-circle"
  const btn = e.target.closest('.tick-circle, [class*="-tick-circle"]');
  if (!btn) return;

  const questionId = getQuestionIdFromButton(btn);
  if (!questionId) {
    console.warn("Could not determine question ID from button:", btn);
    return;
  }

  const value = Number(btn.value);
  console.log(`Tick button clicked: Question ${questionId}, Value: ${value}`);

  const selector =
    questionId === 1 ? ".tick-circle" : `.Q${questionId}-tick-circle`;

  // Remove active class and reset styles for all buttons
  document.querySelectorAll(selector).forEach((b) => {
    b.classList.remove("active");
    if (!b.closest('.option-row')) {
      // Circle buttons: reset background
      b.style.backgroundColor = 'transparent';
    } else {const circle = b.querySelector('.circle-indicator');
      if (circle) {
        circle.style.backgroundColor = 'transparent';
      }
    }
  });

  btn.classList.add("active");
  if (!btn.closest('.option-row')) {
    //fill with green
    btn.style.backgroundColor = '#6fa573';
  } else{
    const circle = btn.querySelector('.circle-indicator');
    if(circle) {
      circle.style.backgroundColor = '#6fa573';
    }
  }
  saveAnswer(questionId, value);
  console.log(`Answer saved: Q${questionId} = ${value}`);
});



function NextButton(buttonId, q1, q2, nextViewId) {
  const btn = document.getElementById(buttonId);
  if (!btn) {
    console.warn(`NextButton: Button with id "${buttonId}" not found in DOM`);
    return;
  }

  console.log(`NextButton: Attached listener to "${buttonId}"`);
  btn.addEventListener("click", async () => {
    console.log(`NextButton clicked: "${buttonId}", checking questions ${q1} and ${q2}`);
    try {
      const val1 = RoomiesState.answers[q1];
      const val2 = RoomiesState.answers[q2];

      const isSingleQuestion = q1 === q2;

      // Check if answer exists
      if(val1 === undefined || val1 === null || (!isSingleQuestion && (val2 === undefined || val2 === null))) {
        console.log("Answers missing:", { q1, val1, q2, val2 });
        showCustomAlert("Please select an answer first.");
        return;
      }

      console.log(`Answers validated, navigating to: ${nextViewId}`);
      show2(nextViewId);
    } catch (err) {
      console.error("Error in NextButton:", err);
      showCustomAlert("Could not save your answer.");
    }
  });
}

function initCompatibilityButtons() {
  console.log("initCompatibilityButtons called, readyState:", document.readyState);
  NextButton("btn-nextQuestion", 1, 2, "compatibility3And4");
  NextButton("btn-nextQuestion5_6", 3, 4, "compatibility5And6");
  NextButton("btn-nextQuestion7_8", 5, 6, "compatibility7And8");
  NextButton("btn-nextQuestion9_10", 7, 8, "compatibility9And10");
  NextButton("btn-nextQuestion11_12", 9, 10, "compatibility11");

  NextButton("btn-nextQuestion12_13", 11, 11, "compatibility12And13");
  NextButton("btn-nextQuestion14_15", 12, 13, "compatibility14And15");
  NextButton("btn-nextQuestion16_17", 14, 15, "compatibility16And17");
  NextButton("btn-nextQuestion18_19", 16, 17, "compatibility18And19");
  NextButton("btn-nextQuestion20", 18, 19, "compatibility20");

  NextButton("btn-nextQuestion21_22", 20, 20, "compatibility21And22");
  NextButton("btn-nextQuestion23_24", 21, 22, "compatibility23And24");
  NextButton("btn-nextQuestion25_26", 23, 24, "compatibility25And26");
  NextButton("btn-nextQuestion27_28", 25, 26, "compatibility27And28");
  NextButton("btn-nextQuestion29_30", 27, 28, "compatibility29And30");

  NextButton("btn-nextQuestion31_32", 29, 30, "compatibility31And32");
  NextButton("btn-nextQuestion33_34", 31, 32, "compatibility33And34");
  NextButton("btn-nextQuestion35_36", 33, 34, "compatibility35And36");
  NextButton("btn-nextQuestion37_38", 35, 36, "compatibility37And38");
  NextButton("btn-nextQuestion39_40", 37, 38, "compatibility39And40");

  NextButton("btn-nextQuestion41_42", 39, 40, "compatibility41And42");
  NextButton("btn-nextQuestion43_44", 41, 42, "compatibility43And44");
  NextButton("btn-nextQuestion45_46", 43, 44, "compatibility45And46");
  NextButton("btn-nextQuestion47_48", 45, 46, "compatibility47And48");
  NextButton("btn-nextQuestion49_50", 47, 48, "compatibility49And50");

  NextButton("btn-nextQuestion51_52", 49, 50, "compatibility51And52");
  NextButton("btn-nextQuestion53", 51, 52, "compatibility53");
  
  console.log("All compatibility test Next buttons initialized");
}

console.log("matches.js: Checking readyState:", document.readyState);
if (document.readyState === 'loading') {
  console.log("matches.js: DOM still loading, adding DOMContentLoaded listener");
  document.addEventListener('DOMContentLoaded', initCompatibilityButtons);
} else {
  console.log("matches.js: DOM already ready, calling initCompatibilityButtons immediately");
  initCompatibilityButtons();
}


function roundToHalf(x) {
  return Math.round(x * 2) / 2;
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}


function buildProfile(answers = {}, rankings = {}) {
  const a = (n) => Number(answers[n] || 0);

  // Cleanliness
  const B_Clean = Math.round(0.45 * a(1) + 0.35 * a(2) + 0.20 * a(3));
  const I_Clean = clamp(roundToHalf(0.7 * a(4) + 0.3 * a(5)) +getRankBoostForBuild(rankings, "cleanliness"),1, 5);
  const cleanliness = B_Clean * I_Clean;

  // Noise
  const B_Noise = Math.round(0.5 * a(7) + 0.3 * a(8) + 0.2 * a(9));
  const I_Noise = clamp(roundToHalf(0.7 * a(10) + 0.3 * a(11))+ getRankBoostForBuild(rankings, "quietness"),1, 5);
  const noise = B_Noise * I_Noise;

  // Sleep
  const B_Sleep = clamp(Math.round((a(12) + a(15)) / 2), 1, 5);
  const I_Sleep = clamp(roundToHalf(0.6 * a(13) + 0.4 * a(14)) +getRankBoostForBuild(rankings, "schedule"),1, 5);
  const sleep_schedule = B_Sleep * I_Sleep;

  return { cleanliness, noise, sleep_schedule };
}

function getRankBoostForBuild(rankings, category) {
  const r = rankings?.[category];
  if (r === 1) return 1.0;
  if (r === 2) return 0.5;
  if (r === 3) return 0.25;
  return 0;
}

function computeMatch(pA, pB) {
  const maxScore = 25;

  const sim = (x, y) => {
    const d = Math.abs(x - y);
    return 1 - d / maxScore;
  };

  const cleanSim = sim(pA.cleanliness, pB.cleanliness);
  const noiseSim = sim(pA.noise, pB.noise);
  const sleepSim = sim(pA.sleep_schedule, pB.sleep_schedule);

  const finalScore = ((cleanSim + noiseSim + sleepSim) / 3) * 100;

  return {
    compatibility_score: Number(finalScore.toFixed(1)),
    factors: {cleanliness: cleanSim,noise: noiseSim,sleep_schedule: sleepSim}
  };
}

function getRankBoost(category) {
  const rankings = RoomiesState.rankings || {};
  const rank = rankings[category];
  if (rank ===1) return 1.0;
  if (rank === 2) return 0.5;
  if (rank === 3) return 0.25;
  return 0;
}


let draggedElement = null;

function initDragAndDrop() {
  const draggableItems = document.querySelectorAll(".drag-item");
  const rankSlots = document.querySelectorAll(".rank-slot");

  // Reset all items to be draggable
  draggableItems.forEach((item) => {
    item.style.opacity= "1";
    item.style.pointerEvents = "auto";

    item.addEventListener("dragstart", (e) => {
      draggedElement = e.target;
      e.target.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", e.target.innerHTML);
    });

    item.addEventListener("dragend", (e) => {
      e.target.classList.remove("dragging");
    });
  });

  // Clear any existing slot content
  rankSlots.forEach((slot) => {
    const rankLabel = slot.querySelector("strong")?.textContent || "";
    slot.innerHTML= `<strong>${rankLabel}</strong> <span class="rank-placeholder"></span>`;
    slot.removeAttribute("data-value");

    slot.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      slot.classList.add("drag-over");
    });

    slot.addEventListener("dragleave", (e) => {
      slot.classList.remove("drag-over");
    });

    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("drag-over");

      if (draggedElement) {
        const value= draggedElement.getAttribute("data-value");
        const text = draggedElement.textContent.trim();
        const color =draggedElement.style.backgroundColor;

        // Check if this value is already used in another slot
        const allSlots = document.querySelectorAll(".rank-slot");
        let alreadyUsed = false;
        allSlots.forEach((s) => {
          if(s !== slot && s.getAttribute("data-value") === value) {
            alreadyUsed = true;
          }
        });

        if (alreadyUsed) {
          showCustomAlert("This option is already ranked. Please choose a different one.");
          return;
        }

        // Clear any previous selection in this slot
        const previousValue = slot.getAttribute("data-value");
        if (previousValue) {
          // Restore the previous item
          const previousItem = document.querySelector(`.drag-item[data-value="${previousValue}"]`);
          if (previousItem) {
            previousItem.style.opacity = "1";
            previousItem.style.pointerEvents = "auto";
          }
        }

        // Update slot content with the rank label preserved
        const rankLabel = slot.getAttribute("data-rank");
        const labels = { "1": "1st Most Important:", "2": "2nd Most Important:", "3": "3rd Most Important:" };
        slot.innerHTML = `<strong>${labels[rankLabel]}</strong> <span style="background-color: ${color}; padding: 8px 16px; border-radius: 8px; color: white; font-weight: 500; margin-left: 8px;">${text}</span>`;
        slot.setAttribute("data-value", value);

        // Hide the dragged item from the options
        draggedElement.style.opacity = "0.3";
        draggedElement.style.pointerEvents = "none";
      }
    });

    // Click on slot to clear it
    slot.addEventListener("click", (e) => {
      const currentValue = slot.getAttribute("data-value");
      if (currentValue) {
        // Restore the item
        const item = document.querySelector(`.drag-item[data-value="${currentValue}"]`);
        if (item){
          item.style.opacity = "1";
          item.style.pointerEvents = "auto";
        }
        // Clear thy slot
        const rankLabel = slot.getAttribute("data-rank");
        const labels = { "1": "1st Most Important:", "2": "2nd Most Important:", "3": "3rd Most Important:" };
        slot.innerHTML = `<strong>${labels[rankLabel]}</strong> <span class="rank-placeholder"></span>`;
        slot.removeAttribute("data-value");
      }
    });
  });
}

function saveRankingDropdowns() {
  const rank1Slot=document.getElementById("rank-slot-1");
  const rank2Slot= document.getElementById("rank-slot-2");
  const rank3Slot= document.getElementById("rank-slot-3");

  const rank1 =rank1Slot?.getAttribute("data-value");
  const rank2= rank2Slot?.getAttribute("data-value");
  const rank3= rank3Slot?.getAttribute("data-value");

  if (!rank1 || !rank2 || !rank3) {
    showCustomAlert("Please drag and drop your top 3 preferences in order.");
    return false;
  }

  if (new Set([rank1, rank2, rank3]).size !== 3) {
    showCustomAlert("Each ranking must be different.");
    return false;
  }

  RoomiesState.rankings = { [rank1]: 1, [rank2]: 2, [rank3]: 3 };
  localStorage.setItem("compat_rankings", JSON.stringify(RoomiesState.rankings));
  return true;
}


// Calculate button
const btnCalculate = document.getElementById("btn-Calculate");
if (btnCalculate) {
  btnCalculate.addEventListener("click", async () => {
    if (!saveRankingDropdowns()) return;
    await markCompatComplete();


    if (typeof window.enableBottomNav === "function") {
      window.enableBottomNav();
    }

    show("dash");
  });
}


window.initDashboardButtons = initDashboardButtons;
window.loadAndDisplayMatches = loadAndDisplayMatches;
window.loadMeetingRequestsForCurrentUser = loadMeetingRequestsForCurrentUser;
console.log("initDashboardButtons, loadAndDisplayMatches, and loadMeetingRequestsForCurrentUser exported to window");
console.log("loadMeetingRequestsForCurrentUser type:", typeof loadMeetingRequestsForCurrentUser);
console.log("window.loadMeetingRequestsForCurrentUser type:", typeof window.loadMeetingRequestsForCurrentUser);


// Close compat reminder modal with X button
const compatReminderModal = document.getElementById("compat-reminder-modal");
const closeCompatReminder = document.getElementById("close-compat-reminder");

if (closeCompatReminder && compatReminderModal) {
  closeCompatReminder.addEventListener("click", () => {
    compatReminderModal.classList.add("hidden");
  });
}

// Close compat reminder modal by clicking outside
if (compatReminderModal) {
  compatReminderModal.addEventListener("click", (e) => {
    if (e.target === compatReminderModal) {
      compatReminderModal.classList.add("hidden");
    }
  });
}

console.log("Modal close handlers registered");


const quitCompatModal = document.getElementById("quit-compat-modal");
const btnCloseQuitModal = document.getElementById("btn-close-quit-modal");
const btnCancelQuit = document.getElementById("btn-cancel-quit");
const btnConfirmQuit = document.getElementById("btn-confirm-quit");

// Show confirmation modal when any quit button is clicked 
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-quit-compat") || e.target.id === "btn-quit-compat") {
    if (quitCompatModal) {
      quitCompatModal.classList.remove("hidden");
    }
  }
});

// Close/quit modal with X button
if (btnCloseQuitModal && quitCompatModal) {
  btnCloseQuitModal.addEventListener("click", () => {
    quitCompatModal.classList.add("hidden");
  });
}

// Cancel/quit close modal and stay on test
if (btnCancelQuit && quitCompatModal) {
  btnCancelQuit.addEventListener("click", () => {
    quitCompatModal.classList.add("hidden");
    //
  });
}

// Confirm quit go back to dashboard
if (btnConfirmQuit && quitCompatModal) {
  btnConfirmQuit.addEventListener("click", () => {
    quitCompatModal.classList.add("hidden");
    show("dash");
    // Re anable bottom nav when test is quit
    if (typeof window.enableBottomNav === "function") {
      window.enableBottomNav();
    }
  });
}

// Close quit modal by clicking outside
if (quitCompatModal) {
  quitCompatModal.addEventListener("click", (e) => {
    if (e.target ===quitCompatModal) {
      quitCompatModal.classList.add("hidden");
    }
  });
}

console.log("Quit compatibility test handlers registered");


if (btnMakeRequest) {
  btnMakeRequest.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      showCustomAlert("You must be logged in to send a request.");
      return;
    }

    const input = document.getElementById("request-email-input");
    const toEmailRaw = input.value.trim();

    if (!toEmailRaw) {
      showCustomAlert("Please enter your roommateâ€™s .edu email first.");
      return;
    }

    const toEmail = toEmailRaw.toLowerCase();

    if (toEmail === user.email.toLowerCase()) {
      showCustomAlert("You canâ€™t send a request to yourself.");
      return;
    }

    try {
      await addDoc(collection(db, "CompatRequests"), {
        fromUid: user.uid,
        fromEmail: user.email,
        toEmail,             
        status: "pending",
        createdAt: serverTimestamp(),
      });

      input.value= "";
      showCustomAlert("Request sent!");
    } catch (err) {
      console.error("Error sending request", err);
      showCustomAlert("Could not send request. Check the console for details.");
    }
  });
}
