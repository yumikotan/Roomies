// auth.js 

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import { auth, db } from "./firebaseClient.js";


const PROFILE_PICTURES = ['./img/28.png', './img/29.png', './img/30.png', './img/31.png'];

function getRandomProfilePicture() {
  return PROFILE_PICTURES[Math.floor(Math.random() * PROFILE_PICTURES.length)];
}



// null = allow any .edu domain
const ALLOWED_DOMAINS = null;

function isAllowedSchoolEmail(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (ALLOWED_DOMAINS && !ALLOWED_DOMAINS.includes(domain)) return false;
  return domain.endsWith(".edu");
}



async function saveUserToProfileUsers(user, overrides = {}) {
  if (!user) return;

  const userRef = doc(db, "ProfileUsers", user.uid);

 
  const defaultName = user.email ? user.email.split('@')[0] : "Unnamed User";


  const existingDoc = await getDoc(userRef);
  const existingIcon = existingDoc.exists() ? existingDoc.data().icon : null;
  
  
  let finalIcon = overrides.icon;
  if (!finalIcon) {
    if (!existingIcon || existingIcon === "default.png") {
      finalIcon = getRandomProfilePicture();

    } else {
      finalIcon = existingIcon;
    }
  }

  const baseData = {
    uid: user.uid,
    email: user.email,
    name: overrides.name ?? defaultName,
    icon: finalIcon,
    personal_status: overrides.personal_status ?? "active",
    age: overrides.age ?? null,
    updatedAt: serverTimestamp(),
  };
  
 

  console.log("Saving user then ProfileUsers:", baseData);

  await setDoc(userRef, baseData, { merge: true });
}


async function saveUserStatusFromSettings() {
  const user = auth.currentUser;
  if (!user) return showCustomAlert("Not logged in.");

  const dropdown = document.getElementById("settings-status-dropdown");
  const customInput = document.getElementById("settings-status-custom");

  let status = dropdown.value;
  if (status === "custom") {
    status = customInput.value.trim() || "available";
  }

  const payload = {
    personal_status: status,
  };

  const ref = doc(db, "ProfileUsers", user.uid);
  await setDoc(ref, payload, { merge: true });

  showCustomAlert("Status updated.");
  

  if (typeof window.resetHouseholdUIForUser === "function") {
    window.resetHouseholdUIForUser(user);
  }
}


async function loadSettingsForUser(user){
  if (!user){
    return;
  }

  const ref = doc(db, "ProfileUsers", user.uid);
  const snap =await getDoc(ref);
  if (!snap.exists()){
    return;
  }

  const data = snap.data();

  const dropdown = document.getElementById("settings-status-dropdown");
  const customInput = document.getElementById("settings-status-custom");
  const customLabel = document.getElementById("settings-custom-label");


  const status = data.personal_status || "available";

  if (status ==="available" || status === "dnd") {
    dropdown.value = status;
    customLabel.style.display= "none";
    customInput.value= "";

  }else{
    dropdown.value= "custom";
    //
    customLabel.style.display= "block";
    customInput.value= ""; 
  }

 
  window.currentUserIcon = data.icon;
}


function updateProfilePicSelector() {
  const options = document.querySelectorAll('.profile-pic-option');

  options.forEach(opt => {
    opt.classList.remove('selected');

    if(opt.dataset.icon === window.currentUserIcon) {
      opt.classList.add('selected');
    }
  });
}




const views = {
  login: document.getElementById("view-login"),
  verify: document.getElementById("view-verify"),
  inuse: document.getElementById("view-inuse"),
  dash: document.getElementById("view-dashboard"),
  chores: document.getElementById("view-chores"),
  addChore: document.getElementById("view-addChore"),
  editChore: document.getElementById("view-editChore"),
  matches: document.getElementById("view-matches"),
  requests: document.getElementById("view-requests"),
  expenses: document.getElementById("view-expenses"),
  ideas: document.getElementById("view-ideas"),
  settings: document.getElementById("view-settings"),
  household: document.getElementById("view-household"),
  tips:  document.getElementById("view-tips"),

  roommateAgreement: document.getElementById("view-roommateAgreement"),
  createRoommateAgreement: document.getElementById("view-createRoommateAgreement"),
};

const containerEl = document.querySelector(".container");
const bodyEl = document.body;

function show(id) {
  console.log('show() called with id:', id);

  Object.values(views).forEach((v) => v?.classList.add("hidden"));
  const target = views[id];

  console.log('target view found:', !!target, 'for id:', id);

  if (target) {
    target.classList.remove("hidden");
    console.log('Removed hidden class from:', id);
  }else{
    console.warn('View not found in views object:', id);
  }
  
  
  const viewsWithBottomNav = ["dash", "chores", "expenses", "tips", "settings"];
  if (viewsWithBottomNav.includes(id)) {
    showBottomNav(true);
  }
  
  
  if (id === "matches" && typeof window.loadAndDisplayMatches === "function") {
    window.loadAndDisplayMatches();
  }
  
  
  if (id === "chores" && typeof window.initChoresView === "function") {
    window.initChoresView();
  }
  if (id === "expenses" && typeof window.initExpenses === "function") {
    window.initExpenses();
  }

}


window.show = show; 

function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  const target = document.getElementById(viewId);

  if (target) {target.classList.remove("hidden");}
  
  
  if (viewId === "view-matches" && typeof window.loadAndDisplayMatches === "function") {
    window.loadAndDisplayMatches();
  }
}




function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}


//Handle bottom nav
const bottomNav = document.getElementById("bottom-nav");

function showBottomNav(visible) {
  if (!bottomNav) {
    console.warn('bottomNav element not found');
    return;
  }

  console.log('showBottomNav called with visible:', visible);
  if (visible) {
    bottomNav.classList.remove("hidden");
    console.log('Bottom nav should now be visible');
  }else {
    bottomNav.classList.add("hidden");
    console.log('Bottom nav hidden');
  }
}

function disableBottomNav() {
  if (!bottomNav) {return;}

  navItems.forEach((btn) => {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.5';
  });
}

function enableBottomNav() {
  if (!bottomNav) {return;}

  navItems.forEach((btn) => {
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
  });
}


window.disableBottomNav = disableBottomNav;
window.enableBottomNav = enableBottomNav;

showBottomNav(false);

const navItems = document.querySelectorAll(".bottom-nav .nav-item");

navItems.forEach((btn) => {
  const viewKey = btn.dataset.view; 
  if (!viewKey) return;

  btn.addEventListener("click", () => {
    show(viewKey);
    navItems.forEach((b) => {
      b.classList.remove("active");

      const bViewKey = b.dataset.view;
      const img = b.querySelector('.nav-icon-img');
      
      // reset icons to inactive state
      if (img) {
        if (bViewKey === "dash"){
          img.src = './img/home (3).png';
        }else if (bViewKey === "chores") {
          img.src = './img/broomstick.png';
        }else if(bViewKey === "expenses"){
          img.src = './img/dollar (1).png';
        }else if (bViewKey === "tips"){
          img.src = './img/bulb.png';
        }else if (bViewKey === "settings") {
          img.src = './img/cogwheel.png';
        }
      }
    });
    btn.classList.add("active");
    
    // Change icon to active state
    const activeImg = btn.querySelector('.nav-icon-img');
    if (activeImg) {
      if (viewKey === "dash") {
        activeImg.src = './img/home (4).png';
      }else if (viewKey === "chores"){
        activeImg.src = './img/broomstick (1).png';
      }else if (viewKey === "expenses") {
        activeImg.src = './img/dollar (2).png';
      }else if (viewKey === "tips") {
        activeImg.src = './img/bulb (1).png';
      }else if(viewKey === "settings") {
        activeImg.src = './img/cogwheel (1).png';
      }
    }
  });
});



document.getElementById("btn-create-account")?.addEventListener("click", () => show("verify"));
document.getElementById("btn-go-back-from-verify")?.addEventListener("click", () => show("login"));
document.getElementById("btn-go-back-from-inuse")?.addEventListener("click", () => show("login"));
document.getElementById("btn-inuse-verify")?.addEventListener("click", () => show("verify"));
document.getElementById("nav-home")?.addEventListener("click", () => show("dash"));


document.getElementById("btn-save-status")?.addEventListener("click", async () => {
    await saveUserStatusFromSettings();
});


document.getElementById("btn-change-profile-pic")?.addEventListener("click", () => {
  updateProfilePicSelector();
  const modal = document.getElementById("profile-pic-modal");

  if (modal){
    modal.classList.remove("hidden");
  }
});


document.getElementById("btn-save-profile-pic")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    return showCustomAlert("Not logged in.");
  }

  const selectedIcon = document.querySelector('.profile-pic-option.selected');
  if (!selectedIcon) {
    return showCustomAlert("Please select a profile picture.");
  }

  const ref = doc(db, "ProfileUsers", user.uid);
  await setDoc(ref, { icon: selectedIcon.dataset.icon }, { merge: true });
  
  showCustomAlert("Profile picture updated!");
  document.getElementById("profile-pic-modal").classList.add("hidden");
  
  
  if (typeof window.resetHouseholdUIForUser === "function") {
    window.resetHouseholdUIForUser(user);
  }
});


document.addEventListener('DOMContentLoaded', () => {
  const profilePicOptions = document.querySelectorAll('.profile-pic-option');
  profilePicOptions.forEach(option => {
    option.addEventListener('click', () => {
      profilePicOptions.forEach(opt => opt.classList.remove('selected'));
      
      option.classList.add('selected');
    });
  });
});



// LOGIN TIME!!!!! :)
document.getElementById("btn-login")?.addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showCustomAlert("Please enter both email and password.");
    return;
  }

  try {
    console.log("Trying to sign in:", email);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    await saveUserToProfileUsers(user);

    if (user) {
      setText("settings-user-label", `Signed in as ${user.email}`);
    }

    show("dash");
    showBottomNav(true);

  } catch (e) {
    console.error("Login error:", e);
    showCustomAlert(e.message || "Login failed");
  }
});




document.getElementById("btn-forgot")?.addEventListener("click", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  if (!email) {
    showCustomAlert("Enter your email above first.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    showCustomAlert("Password reset link sent.");
  }catch (e) {
    console.error("Reset error:", e);
    showCustomAlert(e.message || "Could not send reset email.");
  }
});



document.getElementById("btn-verify")?.addEventListener("click", async () => {
  const email = document.getElementById("verify-email").value.trim();
  const password =document.getElementById("verify-password").value || "changeme123";

  if (!email || !password) {
    showCustomAlert("Please enter your school email and a password.");
    return;
  }

  if (!isAllowedSchoolEmail(email)) {
    showCustomAlert("Please use your school .edu email.");
    return;
  }

  try {
    console.log("Creating account for:", email);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    const name =email.split("@")[0];

    
    await saveUserToProfileUsers(user,{name,icon: getRandomProfilePicture(),});

    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn("Verification email failed:", e);
    }


    setText("settings-user-label", `Signed in as ${user.email}`);
    show("dash");
    showBottomNav(true);
  } catch (e) {
    console.error("Sign up error:", e);

    if (e.code === "auth/email-already-in-use") {
      setText("inuse-email", email);
      show("inuse");

    } else{
      showCustomAlert(e.message || "Sign up failed");
    }
  }
});





const btnLogoutSettings = document.getElementById("btn-logout-settings");
btnLogoutSettings?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (e){
    console.error(e);
  }

  show("login");
  showBottomNav(false);
  navItems.forEach((b) => b.classList.remove("active"));
  //setText("settings-userlabel", "");
  setText("settings-user-label", "");
});


async function updateCompatButtonsFromProfile(user) {
  const btnTakeTest = document.getElementById("btn-dash-take-test");
  const btnMatches =document.getElementById("btn-dash-matches");

  if (!btnTakeTest || !btnMatches) return;

  if (!user){
    const labelDiv = btnTakeTest.querySelector('.find-label');
    if (labelDiv){
      labelDiv.innerHTML = "Take Compatibility<br />Test";
    }
    btnMatches.dataset.compatCompleted = "false";
    return;
  }

  const ref = doc(db, "ProfileUsers", user.uid);
  const snap= await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const isComplete= !!data.compat_completed;

  const labelDiv = btnTakeTest.querySelector('.find-label');
  if (labelDiv) {
    labelDiv.innerHTML = isComplete
      ? "Retake Compatibility<br />Test"
      : "Take Compatibility<br />Test";
  }

  btnMatches.dataset.compatCompleted = isComplete ? "true" : "false";
}



onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed:", user?.email || "null");

  if (!user){
    show("login");

    showBottomNav(false);
    setText("settings-user-label", "");
    if (typeof window.resetHouseholdUIForUser === "function") {
      window.resetHouseholdUIForUser(null);
    }


    await loadSettingsForUser(null);
    return;
  }

  

 
  await updateCompatButtonsFromProfile(user);


  if (typeof window.initDashboardButtons=== "function") {
    window.initDashboardButtons();
  }


  setText("settings-user-label", `Signed in as ${user.email}`);
  const statusBlock = document.getElementById("settings-status-block");
  if (statusBlock) {
    statusBlock.classList.remove("hidden");  
  }


  await loadSettingsForUser(user);

  const currentViewId = [...document.querySelectorAll(".view")]
    .find((v) => !v.classList.contains("hidden"))
    ?.id;

  if (!currentViewId || currentViewId === "view-login" ||currentViewId === "view-verify" ||currentViewId === "view-inuse"){
    show("dash");
  }

  showBottomNav(true);

  if (typeof window.resetHouseholdUIForUser === "function") {
    window.resetHouseholdUIForUser(user);
  }
});


const statusDropdown = document.getElementById("settings-status-dropdown");
const customLabel=document.getElementById("settings-custom-label");
const customInput = document.getElementById("settings-status-custom");

statusDropdown?.addEventListener("change", () => {
  if (statusDropdown.value ==="custom") {
    customLabel.style.display = "block";
  }else {
    customLabel.style.display = "none";
    customInput.value= "";
  }
});

