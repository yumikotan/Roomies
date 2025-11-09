import { auth } from '../firebaseConfig.js';
import { signInWithEmailAndPassword } from 'firebase/auth';


function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function authenticateUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Log in a user and return authentication results.
 * - Validates email format
 * - Authenticates via Firebase
 * - Returns standardized success/error objects
 */
export async function loginUser(email, password) {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    if (!isValidEmail(email)) {
      throw new Error('Invalid email format.');
    }

    const user = await authenticateUser(email, password);

    console.log('User logged in successfully:', user.email);

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        lastLoginAt: new Date().toISOString(),
      },
      message: 'Login successful.',
    };
  } catch (error) {
    console.error('Login error:', error.message);

    let message = 'Login failed. Please check your credentials.';
    switch (error.code) {
      case 'auth/invalid-email':
        message = 'Invalid email address format.';
        break;
      case 'auth/user-not-found':
        message = 'No user found with this email.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password. Please try again.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
    }

    return { success: false, message };
  }
}
