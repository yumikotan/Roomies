import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { auth } from "./firebaseClient.js";

const ALLOWED_DOMAINS = null; 

function get(id) { 
  return document.getElementById(id);
}

function isAllowedSchoolEmail(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (ALLOWED_DOMAINS && !ALLOWED_DOMAINS.includes(domain)) return false;
  return domain.endsWith(".edu");
} 

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
} 

function show(id) {
  Object.values(views).forEach(v => v.classList.add("hidden"));
  views[id].classList.remove("hidden");
}


const views = {
  login: get("view-login"),
  verify: get("view-verify"),
  inuse: get("view-inuse"),
  dash: get("view-dashboard"),
};




get("btn-create-account").addEventListener("click", () => show("verify"));
get("btn-go-back-from-verify").addEventListener("click", () => show("login"));
get("btn-go-back-from-inuse").addEventListener("click", () => show("login")); 
get("btn-inuse-verify").addEventListener("click", () => show("verify"));


get("btn-login").addEventListener("click", async () => {
  const email = get("login-email").value.trim();
  const password = get("login-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    show("dash");
  } catch (e) {
    alert(e.message || "Login failed");
  }
});

get("btn-forgot").addEventListener("click", async () => {
  const email = get("login-email").value.trim();
  if (!email) return alert("Enter your email above first.");
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset link sent.");
  } catch (e) {
    alert(e.message || "Could not send reset email.");
  }
});

get("btn-verify").addEventListener("click", async () => {
  const email = get("verify-email").value.trim();
  const password = get("verify-password").value || "changeme123";
  try {
    if (!isAllowedSchoolEmail(email)) return alert("Please use your school .edu email.");
    await createUserWithEmailAndPassword(auth, email, password);
    try {
      await sendEmailVerification(auth.currentUser);
    } catch {}
    show("dash");
  } catch (e) {
    if (e.code === "auth/email-already-in-use") {
      setText("inuse-email", email);
      show("inuse");
    } else {
      alert(e.message || "Sign up failed");
    }
  }
});


get("btn-logout").addEventListener("click", async () => {
  await signOut(auth);
  show("login");
});

onAuthStateChanged(auth, (user) => {
  const current = [...document.querySelectorAll(".view")].find(v => !v.classList.contains("hidden"))?.id;
  if (!user && current === "view-dashboard") show("login");
});
