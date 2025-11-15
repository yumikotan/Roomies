import { db } from '../firebaseConfig.js';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

const inviteMap = new Map();

export function addInviteCode(inviteCode, groupId) {
  inviteMap.set(inviteCode, groupId);
}

export async function joinGroup(inviteCode, userEmail) {
  try {
    if (!inviteCode || !userEmail) {
      throw new Error('Invite code and user email are required.');
    }

    const groupId = inviteMap.get(inviteCode);
    if (!groupId) throw new Error('Invalid or expired invite code.');

    const groupRef = doc(db, 'Households', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new Error('Group not found.');

    await updateDoc(groupRef, { members: arrayUnion(userEmail) });

    console.log(`${userEmail} joined ${groupSnap.data().groupName}`);
    return { success: true, groupId, message: 'Joined successfully.' };
  } catch (error) {
    console.error('Error joining group:', error.message);
    return { success: false, message: error.message };
  }
}
