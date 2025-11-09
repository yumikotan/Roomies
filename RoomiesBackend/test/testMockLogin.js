// test/testMockLogin.js

import { auth } from "../firebaseConfig.js";
import { signInWithEmailAndPassword } from "firebase/auth";

async function testMockLogin() {
  console.log("--- Mock Login Test ---\n");

  try {
    // Replace this email/password with one that actually exists in your Firebase Auth users
    const userCredential = await signInWithEmailAndPassword(
      auth,
      "ytanido@scu.edu",
      "test1234"
    );

    console.log("✅ Mock login success.");
    console.log("User Email:", userCredential.user.email);
    console.log("User UID:", userCredential.user.uid);
  } catch (error) {
    console.error("❌ Mock login failed:", error.message);
  }

  console.log("\n--- Test Completed ---");
}

testMockLogin();
