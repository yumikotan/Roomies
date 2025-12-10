import { 
    getFirestore,
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
  import { db } from "./firebaseClient.js";
  
  // create or replace a roommate agreement for a household
  export async function createOrUpdateAgreement(householdId, sections) {
    try {
      if (!householdId || !sections) throw new Error('Missing parameters.');
  
      const agreementRef = doc(db, 'Households', householdId, 'Customization', 'RoommateAgreement');
      const agreementData = {
        sections,
        updatedAt: new Date().toISOString(),
      };
  
      // setDoc will create or overwrite
      await setDoc(agreementRef, agreementData);
      console.log('Agreement created/updated for', householdId);
      return { success: true };
    } catch (error) {
      console.error('Error creating/updating agreement:', error.message);
      return { success: false, message: error.message };
    }
  }
  
  // get the agreement doc
  export async function getAgreement(householdId) {
    try {
      if (!householdId) throw new Error('Missing householdId.');
  
      const agreementRef = doc(db, 'Households', householdId, 'Customization', 'RoommateAgreement');
      const agreementDoc = await getDoc(agreementRef);
  
      if (!agreementDoc.exists()) return { success: true, agreement: null };
  
      return { success: true, agreement: agreementDoc.data() };
    } catch (error) {
      console.error('Error fetching agreement:', error.message);
      return { success: false, message: error.message };
    }
  }
  
  // update a single user's response for a section
  export async function updateSectionResponse(householdId, sectionKey, userEmail, responseText) {
    try {
      if (!householdId || !sectionKey || !userEmail) throw new Error('Missing parameters.');
  
      const agreementRef = doc(db, 'Households', householdId, 'Customization', 'RoommateAgreement');
      const docSnap = await getDoc(agreementRef);
  
      const existing = docSnap.exists() ? docSnap.data() : { sections: {} };
      const section = existing.sections && existing.sections[sectionKey] ? { ...existing.sections[sectionKey] } : {};
  
      section[userEmail] = responseText;
  
      const updatedSections = { ...(existing.sections || {}), [sectionKey]: section };
  
      await setDoc(agreementRef, { sections: updatedSections, updatedAt: new Date().toISOString() });
      console.log(`Updated response for ${userEmail} in section ${sectionKey}`);
      return { success: true };
    } catch (err) {
      console.error('Error updating section response:', err.message);
      return { success: false, message: err.message };
    }
  }
  
