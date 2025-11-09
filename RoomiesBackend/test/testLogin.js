// test/testLogin.js
import { loginUser } from '../services/loginService.js';

async function runLoginTest() {
  console.log('--- Login Test ---\n');

  try {
    // Replace with an actual registered account
    const result = await loginUser('ytanido@scu.edu', 'test1234');

    if (result.success) {
      console.log('✅ Login successful');
      console.log('User Email:', result.user.email);
      console.log('User UID:', result.user.uid);
    } else {
      console.log('❌ Login failed');
      console.log('Message:', result.message);
    }
  } catch (error) {
    console.error('Unexpected error during login test:', error.message);
  }

  console.log('\n--- Test Completed ---');
}

runLoginTest();