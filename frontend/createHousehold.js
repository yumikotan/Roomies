import { db } from '../firebaseConfig.js';
import { collection, addDoc } from 'firebase/firestore';
import { generateInviteCode } from '../utils/generateInvite.js';
import { addInviteCode } from './joinHousehold.js';

/*
create a new household
requirements: group name, description, email.
it will auto gen invite codes and initialize members
*/

export async function createGroup(groupName, description, adminEmail) {
  try {
    if (!groupName || !description || !adminEmail) {
      throw new Error('Group name, description, and email are required.');
    }

    const inviteCode = generateInviteCode();
    console.log('Temp invite code for joining:', inviteCode);

    const newGroup = {
      groupName,
      description,
      adminEmail,
      members: [adminEmail],
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'Households'), newGroup);
    console.log('Group created:', docRef.id);

    addInviteCode(inviteCode, docRef.id);

    return { success: true, id: docRef.id, inviteCode, ...newGroup };
  } catch (error) {
    console.error('Error creating group:', error.message);
    return { success: false, message: error.message };
  }
}
