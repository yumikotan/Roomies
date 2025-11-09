// test/testGoogleSignIn.js
import { signInWithGoogle } from '../services/googleAuthService.js';

async function runGoogleSignInTest() {
  console.log('--- Google Sign-In Test ---\n');

  try {
    const result = await signInWithGoogle();

    if (result.success) {
      console.log('✅ Google Sign-In successful.');
      console.log('User Email:', result.user.email);
      console.log('User UID:', result.user.uid);
      console.log('Message:', result.message);
    } else {
      console.log('❌ Google Sign-In failed.');
      console.log('Error Message:', result.message);
    }
  } catch (error) {
    console.error('Unexpected error during Google Sign-In test:', error);
  }

  console.log('\n--- Test Completed ---');
}

runGoogleSignInTest();
