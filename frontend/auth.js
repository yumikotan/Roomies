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

function isAllowedSchoolEmail(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (ALLOWED_DOMAINS && !ALLOWED_DOMAINS.includes(domain)) return false;
  return domain.endsWith(".edu");
}

const views = {
  login: document.getElementById("view-login"),
  verify: document.getElementById("view-verify"),
  inuse: document.getElementById("view-inuse"),
  dash: document.getElementById("view-dashboard"),
};
function show(id) {
  Object.values(views).forEach(v => v.classList.add("hidden"));
  views[id].classList.remove("hidden");
}
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

document.getElementById("btn-create-account").addEventListener("click", () => show("verify"));
document.getElementById("btn-go-back-from-verify").addEventListener("click", () => show("login"));
document.getElementById("btn-go-back-from-inuse").addEventListener("click", () => show("login"));

document.getElementById("btn-login").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    show("dash");
  } catch (e) {
    alert(e.message || "Login failed");
  }
});

document.getElementById("btn-forgot").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  if (!email) return alert("Enter your email above first.");
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset link sent.");
  } catch (e) {
    alert(e.message || "Could not send reset email.");
  }
});

document.getElementById("btn-verify").addEventListener("click", async () => {
  const email = document.getElementById("verify-email").value.trim();
  const password = document.getElementById("verify-password").value || "changeme123";
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

document.getElementById("btn-inuse-verify").addEventListener("click", () => show("verify"));

document.getElementById("btn-logout").addEventListener("click", async () => {
  await signOut(auth);
  show("login");
});

onAuthStateChanged(auth, (user) => {
  const current = [...document.querySelectorAll(".view")].find(v => !v.classList.contains("hidden"))?.id;
  if (!user && current === "view-dashboard") show("login");
});
