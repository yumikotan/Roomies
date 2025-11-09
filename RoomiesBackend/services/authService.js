import { auth, db } from '../firebaseConfig.js';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const allowedDomains = ['scu.edu'];

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isAllowedDomain(email) {
  const domain = email.split('@')[1];
  return allowedDomains.includes(domain);
}

/**
 * Create a new user account in Firebase Authentication.
 */
async function createFirebaseUser(email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Update the user's display name in Firebase Authentication.
 */
async function updateUserProfile(user, name) {
  if (name) {
    await updateProfile(user, { displayName: name });
  }
}

async function saveUserToFirestore(user, name, icon) {
  const userRef = doc(db, 'ProfileUsers', user.uid);

  const userData = {
    uid: user.uid,
    name: name || 'Unnamed User',
    email: user.email,
    icon: icon || 'default.png',
    group_id: null,
    personal_status: 'active',
    age: null,
    createdAt: new Date().toISOString(),
  };

  await setDoc(userRef, userData);
}

/**
 * Register a new user and save their information.
 */
export async function registerUser(email, password, name, icon) {
  try {
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format.');
    }

    if (!isAllowedDomain(email)) {
      throw new Error('Email must be from a registered university domain.');
    }

    const user = await createFirebaseUser(email, password);
    await updateUserProfile(user, name);
    await saveUserToFirestore(user, name, icon);

    console.log('User created successfully:', user.email);
    return { success: true, user };
  } catch (error) {
    console.error('Registration error:', error.message);
    return { success: false, message: error.message };
  }
}
