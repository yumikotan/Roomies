import { db } from '../firebaseConfig.js';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

//add a member to a group
export async function addMember(groupId, adminEmail, newMemberEmail) {
  try {
    if (!groupId || !adminEmail || !newMemberEmail) {
      throw new Error('All parameters are required.');
    }

    const groupRef = doc(db, 'Households', groupId);
    const groupData = await getDoc(groupRef);

    if (!groupData.exists()) throw new Error('Group not found.');

    const group = groupData.data();
    if (group.adminEmail !== adminEmail) throw new Error('Only the admin can add members.');

    await updateDoc(groupRef, { members: arrayUnion(newMemberEmail) });
    console.log(`${newMemberEmail} added to ${group.groupName}`);
    return { success: true };
  } catch (error) {
    console.error('Error adding member:', error.message);
    return { success: false, message: error.message };
  }
}

//remove member
export async function removeMember(groupId, adminEmail, memberEmail) {
  try {
    if (!groupId || !adminEmail || !memberEmail) {
      throw new Error('All parameters are required.');
    }

    const groupRef = doc(db, 'Households', groupId);
    const groupData = await getDoc(groupRef);

    if (!groupData.exists()) throw new Error('Group not found.');

    const group = groupData.data();
    if (group.adminEmail !== adminEmail) throw new Error('Only the admin can remove members.');

    const updatedMembers = group.members.filter((m) => m !== memberEmail);
    await updateDoc(groupRef, { members: updatedMembers });

    console.log(`${memberEmail} removed from ${group.groupName}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing member:', error.message);
    return { success: false, message: error.message };
  }
}
