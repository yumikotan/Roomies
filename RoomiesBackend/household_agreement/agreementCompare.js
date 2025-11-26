import { db } from '../firebaseConfig.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// saves or updates the whole agreement
export async function saveAgreement(householdId, sections) {
  try {
    if (!householdId || !sections) {
      throw new Error('Missing household ID or sections data.');
    }

    const agreementRef = doc(db, 'Households', householdId, 'Customization', 'RoommateAgreement');

    const newAgreement = {
      sections,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(agreementRef, newAgreement);

    console.log('Agreement saved for household:', householdId);
    return { success: true };
  } catch (err) {
    console.error('Error saving agreement:', err.message);
    return { success: false, message: err.message };
  }
}

// gets the household agreement
export async function getAgreement(householdId) {
  try {
    const agreementRef = doc(db, 'Households', householdId, 'Customization', 'RoommateAgreement');
    const snap = await getDoc(agreementRef);

    if (!snap.exists()) {
      return { success: true, agreement: null };
    }

    return { success: true, agreement: snap.data() };
  } catch (err) {
    console.error('Error getting agreement:', err.message);
    return { success: false, message: err.message };
  }
}

// updates one section for one user
export async function updateUserResponse(householdId, sectionName, userEmail, responseText) {
  try {
    if (!householdId || !sectionName || !userEmail) {
      throw new Error('Missing required information.');
    }

    const agreementRef = doc(db, 'Households', householdId, 'Customization', 'RoommateAgreement');
    const snap = await getDoc(agreementRef);

    let allSections = {};

    if (snap.exists()) {
      allSections = snap.data().sections || {};
    }

    const sectionResponses = allSections[sectionName] || {};
    sectionResponses[userEmail] = responseText;

    allSections[sectionName] = sectionResponses;

    await setDoc(agreementRef, {
      sections: allSections,
      updatedAt: new Date().toISOString(),
    });

    console.log('Updated response for', userEmail, 'in', sectionName);
    return { success: true };
  } catch (err) {
    console.error('Error updating section:', err.message);
    return { success: false, message: err.message };
  }
}
