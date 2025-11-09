import { auth, db } from '../firebaseConfig.js';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Initialize and return a GoogleAuthProvider restricted to university accounts.
 */
function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: 'scu.edu' });
  return provider;
}

/**
 * Attempt to sign in a user using Google Sign-In.
 */
async function signInWithGooglePopup(provider) {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Check whether a user document already exists in Firestore.
 * @returns {Promise<boolean>}
 */
async function userExistsInFirestore(uid) {
  const userRef = doc(db, 'ProfileUsers', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists();
}

/**
 * Create a new Firestore document for a Google-authenticated user.
 */
async function createGoogleUserInFirestore(user) {
  const userRef = doc(db, 'ProfileUsers', user.uid);
  const userData = {
    uid: user.uid,
    name: user.displayName || 'Unnamed User',
    email: user.email,
    icon: 'default.png',
    group_id: null,
    personal_status: 'active',
    createdAt: new Date().toISOString(),
  };

  await setDoc(userRef, userData);
  console.log('New Google user saved to Firestore:', user.email);
}

/**
 * Handle Google Sign-In for university users.
 * - Authenticates with Google
 * - Saves new users to Firestore if not already present
 * @returns {Promise<object>}
 */
export async function signInWithGoogle() {
  try {
    const provider = getGoogleProvider();
    const user = await signInWithGooglePopup(provider);

    console.log('Google Sign-In successful:', user.email);

    const exists = await userExistsInFirestore(user.uid);
    if (!exists) {
      await createGoogleUserInFirestore(user);
    } else {
      console.log('User already exists in Firestore:', user.email);
    }

    return {
      success: true,
      user,
      message: 'Signed in successfully with Google.',
    };
  } catch (error) {
    console.error('Google Sign-In error:', error.message);
    return {
      success: false,
      message: error.message,
    };
  }
}
