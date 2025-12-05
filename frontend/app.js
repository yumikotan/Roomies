// app.js

import { auth, db } from "./firebaseClient.js";
import { generateInviteCode } from "./generateInvite.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
// note that dashboard compatibility/requests/matches buttons are handled in matches.js



export function showView(elementId) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  const el = document.getElementById(elementId);
  if (el) el.classList.remove("hidden");
}




const cardEmpty = document.getElementById("household-empty");
const cardDetails = document.getElementById("household-details");

const householdNameEl = document.getElementById("household-name");
const householdDescEl = document.getElementById("household-description");
const householdMembersEl = document.getElementById("household-members");
const householdInviteEl = document.getElementById("household-invite");

const btnAddHousehold = document.getElementById("btn-add-household");
const btnOpenJoinHousehold = document.getElementById("btn-open-join-household");
const btnCopyInvite = document.getElementById("btn-copy-invite");


const modal = document.getElementById("household-modal");
const modalTitle = document.getElementById("household-modal-title");
const btnCloseModal = document.getElementById("btn-close-household-modal");

const formCreate = document.getElementById("form-create-household");
const formJoin = document.getElementById("form-join-household");

const inputCreateName = document.getElementById("modal-household-name");
const inputCreateDesc = document.getElementById("modal-household-description");
const inputJoinCode = document.getElementById("modal-join-code");

const statusEl = document.getElementById("household-status");

let currentHouseholdId = null;


//Helper functions
function requireUserEmail() {
  const email = auth.currentUser?.email;

  if (!email) {
    showCustomAlert("You must be logged in to manage a household.");
    show("login");
    return null;
  }

  return email;
}

function setStatus(message, kind = "muted") {
  if (!statusEl){
    return;
  } 
  statusEl.textContent = message;
  statusEl.className = `status status-${kind}`;
  statusEl.classList.remove("hidden");
}

function clearStatus() {
  if (!statusEl){return;}
  statusEl.textContent = "";
  statusEl.className = "status status-muted";

  statusEl.classList.add("hidden");
}

function showHouseholdEmpty() {
  cardEmpty?.classList.remove("hidden");
  cardDetails?.classList.add("hidden");

  setStatus("Not in a household yet.", "muted");
}

async function renderHouseholdMembers(memberEmails) {
  householdMembersEl.innerHTML = "";

  for (const email of memberEmails) {
    let displayName= email;
    let personalStatus = "available";
    let iconUrl = null;

    try{
      const q = query(
        collection(db,"ProfileUsers"),
        where("email", "==", email)
      );
      const snap = await getDocs(q);

      if (!snap.empty){
        const data = snap.docs[0].data();
        displayName = data.name || email;
        
       
        if (displayName === "Unnamed User" && email) {
          displayName=email.split('@')[0];
        }
        
        personalStatus= data.personal_status || "available";
        iconUrl = data.icon || null;

      } else {
        displayName = email.split('@')[0];
      }
    } catch (err) {
      console.error("Profile load error:", err);
     //do email 
      displayName = email.split('@')[0];
    }

    const li = document.createElement("li");
    li.classList.add("member-row");

    const avatar = document.createElement("div");
    avatar.className = "member-avatar";


    if (iconUrl && iconUrl !== "default.png") {
      const img = document.createElement("img");
      img.src = iconUrl;
      img.onerror = () => {
    
        // if image fails to load, show initial letter
        avatar.innerHTML = "";
        avatar.textContent = displayName[0].toUpperCase();
      };
      avatar.appendChild(img);
    } else {
      avatar.textContent = displayName[0].toUpperCase();
    }

    const text = document.createElement("div");
    text.className ="member-text";

    const nameDiv = document.createElement("div");
    nameDiv.className = "member-name";
    nameDiv.textContent= displayName;

    const statusDiv = document.createElement("div");
    statusDiv.className= "member-status";
    statusDiv.textContent = personalStatus;

    text.appendChild(nameDiv);
    text.appendChild(statusDiv);

    li.appendChild(avatar);
    li.appendChild(text);

    householdMembersEl.appendChild(li);
  }


}


function showHouseholdDetails({ id, name, description, members }) {
  currentHouseholdId = id;

  if (householdNameEl){ 
    householdNameEl.textContent = name || "Your Household";
  }
  if (householdDescEl){
    householdDescEl.textContent= description || "";
  }
  if (householdInviteEl) {
    householdInviteEl.textContent = id;
  }

  renderHouseholdMembers(members || []);
  cardEmpty?.classList.add("hidden");
  cardDetails?.classList.remove("hidden");


  clearStatus();
}


let householdListener = null; 


window.resetHouseholdUIForUser = async function (user) {
  console.log("resetHouseholdUIForUser called with user:", user?.email);
  
  // unsub from previous household 
  if (householdListener) {
    householdListener();
    householdListener = null;
  }
  

  showHouseholdEmpty();
  currentHouseholdId = null;

  if (!user) {
    console.log("No user provided, returning");
    return;
  }

  try {
    //look up users ProfileUsers doc
    const profileRef = doc(db, "ProfileUsers", user.uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()){
      console.log("No ProfileUsers doc for this user yet.");

      return;
    }

    const profile = profileSnap.data();
    console.log("ProfileUsers data:", profile);
    console.log("group_id value:", profile.group_id);
    
    if (!profile.group_id){
      console.log("User has no household group_id is null.");
      return;
    }

    //get househod from the group_id
    console.log("Fetching household with code:", profile.group_id);
    const hhRef = doc(db, "Households", profile.group_id);
    
    // real time listener for household changes
    householdListener = onSnapshot(hhRef, (hhSnap) => {
      if (!hhSnap.exists()) {
        console.log("Household no longer exists");
        showHouseholdEmpty();
        currentHouseholdId = null;
        return;
      }

      const hh = hhSnap.data();
      const members = hh.members || [];
      
      // vheck if current user is still a member
      if (!members.includes(user.email.toLowerCase())) {
        console.log("User has been removed from household");
        showHouseholdEmpty();
        //
        currentHouseholdId = null;
        setStatus("You have been removed from the household.","info");
        return;
      }
      
      console.log("Household updated:", hh);

     
      showHouseholdDetails({id: profile.group_id, name: hh.groupName ||"Your Household", description: hh.description || "", members,});

      clearStatus();
    }, (err) => {
      console.error("Error listening to household:", err);
      setStatus("Could not load your household.", "error");
    });
    
    console.log("Household set up ");

  } catch (err) {
    console.error("Error loading household for user:", err);
    setStatus("Could not load your household.", "error");
  }
};




function openModal(mode) {
  if (!modal) return;

  //Reset forms :)
  formCreate?.classList.add("hidden");
  formJoin?.classList.add("hidden");

  if (mode ==="create") {
    modalTitle.textContent = "Create Household";
    formCreate?.classList.remove("hidden");
  } else {
    modalTitle.textContent ="Join Household";
    formJoin?.classList.remove("hidden");
  }


  modal.classList.remove("hidden");
}


function closeModal() {
  modal?.classList.add("hidden");

  inputCreateName.value = "";
  inputCreateDesc.value = "";
  inputJoinCode.value = "";
}


btnAddHousehold?.addEventListener("click", () => {
  const email = requireUserEmail();
  if (!email){
    return;
  }
  openModal("create");
});

btnOpenJoinHousehold?.addEventListener("click", () => {
  const email = requireUserEmail();
  if (!email) {
    return;
  }

  openModal("join");
});

btnCloseModal?.addEventListener("click", () => {
  closeModal();
});

//Create household
formCreate?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = requireUserEmail();
  if (!email) {
    return;
  }

  const name=inputCreateName.value.trim();
  const description=inputCreateDesc.value.trim();
  if (!name) {
    showCustomAlert("Please enter a household name.");
    return;
  }

  try {
    setStatus("Creating household...", "info");

    const inviteCode = generateInviteCode();
    const docRef = doc(db, "Households", inviteCode);

    await setDoc(docRef, {
      groupName: name,
      description,
      adminEmail: email,
      members: [email],
      createdAt: serverTimestamp(),
    });


    //link household to currently loged in user in ProfileUsers
    if (auth.currentUser) {
      console.log("updating ProfileUsers for uid:", auth.currentUser.uid, "with group_id:", inviteCode);
      const profileRef = doc(db, "ProfileUsers", auth.currentUser.uid);
      await setDoc(
        profileRef,
        { group_id: inviteCode },     
        { merge: true }               
      );
      console.log("ProfileUsers updated successfully");
      
     
      const verifySnap = await getDoc(profileRef);
      const verifyData = verifySnap.data();
      console.log("Verification read group_id is now:", verifyData?.group_id);
    } else {
      console.error("no currentUser cannot update ProfileUsers!");
    }


    showHouseholdDetails({id: inviteCode,name,description,members: [email],});

    setStatus("Household created! Invite code is below.", "success");
    console.log("Household created with code:", inviteCode);

    closeModal();
  } catch (err) {
    console.error("Error creating household:", err);
    setStatus(err.message || "Failed to create household.", "error");
  }
});

//join household
formJoin?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email =requireUserEmail();
  if (!email) {
    return;
  }

  const inviteCode = inputJoinCode.value.trim().toUpperCase();
  if (!inviteCode) {
    showCustomAlert("Please enter an invite code.");
    return;
  }

  try {
    setStatus("Joining household...", "info");

    const docRef = doc(db, "Households", inviteCode);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      setStatus("No household found with that invite code.", "error");
      return;
    }

    const data = snap.data();

    await updateDoc(docRef, {
      members: arrayUnion(email),
    });
    //link this household to the current logged in user profile
    if (auth.currentUser) {
      console.log("updating ProfileUsers for uid:", auth.currentUser.uid, "with group_id:", inviteCode);
      const profileRef = doc(db, "ProfileUsers", auth.currentUser.uid);
      await setDoc(
        profileRef,
        { group_id: inviteCode },
        { merge: true }
      );
      console.log("ProfileUsers updated successfully");
      
      
      const verifySnap = await getDoc(profileRef);
      const verifyData = verifySnap.data();
      console.log("verifiation read group_id is now:", verifyData?.group_id);
    } else {
      console.error("no currentUser cannot update ProfileUsers!");
    }


    const updatedMembers = Array.from(
      new Set([...(data.members || []), email])
    );

    showHouseholdDetails({id: inviteCode,name: data.groupName,description: data.description || "", members: updatedMembers,});
    setStatus("Joined household successfully! Details updated below.", "success");

    closeModal();
  } catch (err) {
    console.error("Error joining household:", err);
    setStatus(err.message || "Failed to join household.", "error");
  }
});

//copy invite code
btnCopyInvite?.addEventListener("click", async () => {
  if (!currentHouseholdId){
    showCustomAlert("No household invite code yet.");
    return;
  }


  try {
    await navigator.clipboard.writeText(currentHouseholdId);
    showCustomAlert(`Invite code ${currentHouseholdId} copied to clipboard.`);

  } catch (err) {
    console.error("Clipboard error:",err);
    showCustomAlert("Could not copy invite code.");
  }
});




document.addEventListener("DOMContentLoaded", () => {
  const btnTakeTest = document.getElementById("btn-dash-take-test");
  const btnRequests = document.getElementById("btn-dash-requests");
  const btnMatches  = document.getElementById("btn-dash-matches");

  
  if (btnTakeTest){
    btnTakeTest.addEventListener("click", () => {
      showView("view-CompatibilitTest1");
    });
  }


  // Sends this to view-matches
  if (btnRequests) {
    btnRequests.addEventListener("click", async () => {
      console.log("Requests button clicked");

      showView("view-requests");
      
  
      if(window.loadIncomingRequestsForCurrentUser){
        await window.loadIncomingRequestsForCurrentUser();
      }
      if (window.loadMeetingRequestsForCurrentUser){
        await window.loadMeetingRequestsForCurrentUser();
      }
      if(window.loadOutgoingRequestsForCurrentUser){
        await window.loadOutgoingRequestsForCurrentUser();
      }
      
    });
  }


  if (btnMatches) {
    btnMatches.addEventListener("click", async () => {
      // load and display matches when clicking the matches button
      showView("view-matches");
      if (window.loadAndDisplayMatches) {
        await window.loadAndDisplayMatches();
      }
    });
  }
});


// home, chores, dollar, tips buttons inside compat views
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".home-logo").forEach(btn => {
    btn.addEventListener("click", () => showView("view-dashboard"));
  });

  document.querySelectorAll(".chore-logo").forEach(btn => {
    btn.addEventListener("click", () => showView("view-chores"));
  });

  document.querySelectorAll(".dollar-logo").forEach(btn => {
    btn.addEventListener("click", () => showView("view-expenses"));
  });

  document.querySelectorAll(".tips-logo").forEach(btn => {
    btn.addEventListener("click", () => showView("view-tips"));
  });
});



showHouseholdEmpty();


// edit Household
const btnEditHousehold = document.getElementById("btn-edit-household");
const editModal = document.getElementById("edit-household-modal");
const btnCloseEditModal = document.getElementById("btn-close-edit-modal");
const formEditHousehold = document.getElementById("form-edit-household");

btnCloseEditModal?.addEventListener("click", () => {
  editModal.classList.add("hidden");
});

const editHouseholdName = document.getElementById("edit-household-name");
const editHouseholdDesc = document.getElementById("edit-household-description");
const editMembersList = document.getElementById("edit-members-list");
const btnDeleteHousehold = document.getElementById("btn-delete-household-modal");

let currentEditHouseholdId = null;
let currentEditMembers = [];

btnEditHousehold?.addEventListener("click", async () => {
  if (!currentHouseholdId){return;}
  
  try {
    const hhRef = doc(db, "Households", currentHouseholdId);
    const hhSnap = await getDoc(hhRef);
    
    if (!hhSnap.exists()) {
      showCustomAlert("Household not found");
      return;
    }
    
    const hh = hhSnap.data();
    currentEditHouseholdId= currentHouseholdId;
    currentEditMembers = [...(hh.members || [])];
    
    editHouseholdName.value=hh.groupName || "";
    editHouseholdDesc.value=hh.description || "";
    
    renderEditMembersList();
    editModal?.classList.remove("hidden");
  } catch (err) {
    console.error("Error loading household for edit:", err);
    showCustomAlert("Could not load household data");
  }
});


btnCloseEditModal?.addEventListener("click", () => {
  editModal?.classList.add("hidden");
});


function renderEditMembersList() {
  if (!editMembersList) {return;}
  editMembersList.innerHTML = "";
  
  const currentUserEmail =auth.currentUser?.email?.toLowerCase();
  
  currentEditMembers.forEach((email) => {
    const li = document.createElement("li");
    li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;";
    
    const emailSpan = document.createElement("span");
    emailSpan.textContent = email;
    
    const removeBtn = document.createElement("button");
    const isCurrentUser = email.toLowerCase() === currentUserEmail;

    removeBtn.textContent = isCurrentUser ? "Leave" : "Remove";
    removeBtn.className = "btn btn-text small";
    removeBtn.style.cssText = "color: #dc3545; padding: 4px 8px; min-width: auto; width: auto; box-shadow: none;";
    removeBtn.type = "button";

    removeBtn.addEventListener("click", () => {
      if(currentEditMembers.length === 1){
        showCustomAlert("Cannot remove the last member. Delete the household instead.");
        return;
      }

      const actionText = isCurrentUser ? "leave this" : `remove ${email} from`;
      if(confirm(`Are you sure you want to ${actionText} household?`)){
        currentEditMembers= currentEditMembers.filter(e => e !== email);
        renderEditMembersList();
      }
    });
    
    li.appendChild(emailSpan);
    li.appendChild(removeBtn);

    editMembersList.appendChild(li);
  });
}


formEditHousehold?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!currentEditHouseholdId) {
    return;
  }
  
  const newName = editHouseholdName.value.trim();
  const newDesc =editHouseholdDesc.value.trim();
  
  if (!newName) {
    showCustomAlert("Household name is required");
    return;
  }
  
  try {
    const hhRef = doc(db, "Households", currentEditHouseholdId);
    
    await updateDoc(hhRef, {
      groupName: newName,
      description: newDesc,
      members: currentEditMembers,
    });
    
    // Update ProfileUsers for removed members
    const hhSnap = await getDoc(hhRef);
    const oldMembers = hhSnap.data()?.members || [];
    const removedMembers = oldMembers.filter(e => !currentEditMembers.includes(e));
    
    for (const email of removedMembers) {
      const q = query(collection(db, "ProfileUsers"), where("email", "==", email));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const userRef = snap.docs[0].ref;
        //await up
        await updateDoc(userRef, {group_id: null});
      }
    }
    
    editModal?.classList.add("hidden");
    
  
    if (auth.currentUser && typeof window.resetHouseholdUIForUser === "function") {
      await window.resetHouseholdUIForUser(auth.currentUser);
    }
    
    showCustomAlert("Household updated successfully!");
  } catch (err) {
    console.error("Error updating household:", err);
    showCustomAlert("Failed to update household: " + (err.message || err));
  }
});


btnDeleteHousehold?.addEventListener("click", async () => {
  if (!currentHouseholdId) return;
  
  const confirmMsg = "Are you sure you want to delete this household? This action cannot be undone and will remove all members from the household.";
  
  if (!confirm(confirmMsg)) {
    return;
  }
  
  try {
    const hhRef = doc(db, "Households", currentHouseholdId);
    const hhSnap = await getDoc(hhRef);
    
    if (!hhSnap.exists()) {
      showCustomAlert("Household not found");
      return;
    }
    
    const hh = hhSnap.data();
    const members = hh.members || [];
    
    // remove group_id from all members ProfileUsers
    for (const email of members) {
      try {
        const q = query(collection(db, "ProfileUsers"), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userRef =snap.docs[0].ref;

          await updateDoc(userRef,{group_id: null});
        }
      } catch (err) {
        console.error(`Error updating ProfileUsers for ${email}:`,err);
      }
    }
    

    await updateDoc(hhRef, {
      members: [],
      deleted: true,
      deletedAt: serverTimestamp()
    });
    
 
    editModal?.classList.add("hidden");
    

    showHouseholdEmpty();
    currentHouseholdId = null;
    

    showCustomAlert("Household deleted successfully!");
    
    if (auth.currentUser && typeof window.resetHouseholdUIForUser === "function") {
      await window.resetHouseholdUIForUser(auth.currentUser);
    }
  } catch (err) {
    console.error("Error deleting household:",err);
    showCustomAlert("Failed to delete household: " +(err.message || err));
  }
});


const btnInviteRoommates = document.getElementById("btn-invite-roommates");
const inviteCodeModal = document.getElementById("invite-code-modal");
const btnCloseInviteModal= document.getElementById("btn-close-invite-modal");
const inviteCodeDisplay=document.getElementById("invite-code-display");
const btnCopyInviteCode=document.getElementById("btn-copy-invite-code");


btnInviteRoommates?.addEventListener("click", () => {
  if (!currentHouseholdId) {
    showCustomAlert("No household found");
    return;
  }
  
  inviteCodeDisplay.textContent = currentHouseholdId;
  inviteCodeModal?.classList.remove("hidden");
});


btnCloseInviteModal?.addEventListener("click", () => {
  inviteCodeModal?.classList.add("hidden");
});


btnCopyInviteCode?.addEventListener("click", async () => {
  const code = inviteCodeDisplay.textContent;
  
  try {
    await navigator.clipboard.writeText(code);
    btnCopyInviteCode.textContent="Copied!";

    setTimeout(() => {btnCopyInviteCode.textContent = "Copy";}, 2000);

  } catch (err) {
    console.error("Failed to copy:", err);
    showCustomAlert("Failed to copy invite code");
  }
});
