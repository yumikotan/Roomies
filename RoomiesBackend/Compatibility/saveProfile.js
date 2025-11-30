const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError("unauthenticated");

  const { answers, rankings } = data;
  const uid = context.auth.uid;

  await db.collection("ProfileUsers").doc(uid).set({
    compat_answers: answers,
    compat_rankings: rankings,
    compatUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true };
});
