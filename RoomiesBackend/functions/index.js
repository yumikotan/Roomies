// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const {
  buildProfile,
  computeMatch
} = require("./compatibilityLogic");

exports.saveProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated");

  const uid = context.auth.uid;
  const { answers, rankings } = data;

  await db.collection("ProfileUsers").doc(uid).set({
    compat_answers: answers,
    compat_rankings: rankings,
    compatUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true };
});

exports.generateMatches = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated");

  const uid = context.auth.uid;

  // Get my profile
  const myDoc = await db.collection("ProfileUsers").doc(uid).get();
  const myData = myDoc.data();
  const myProfile = buildProfile(myData.compat_answers, myData.compat_rankings);

  // Get all users
  const allUsers = await db.collection("ProfileUsers").get();

  const batch = db.batch();

  // Clear old matches for this user
  const oldMatches = await db.collection("Compatibility")
    .where("user_id", "==", uid)
    .get();

  oldMatches.forEach(doc => batch.delete(doc.ref));

  // Create new matches
  allUsers.forEach(doc => {
    if (doc.id === uid) return;

    const other = doc.data();
    if (!other.compat_answers) return;

    const otherProfile = buildProfile(
      other.compat_answers,
      other.compat_rankings
    );

    const result = computeMatch(myProfile, otherProfile);

    const ref = db.collection("Compatibility").doc();
    batch.set(ref, {
      user_id: uid,
      match_user_id: doc.id,
      compatibility_score: result.compatibility_score,
      matching_factors: result.factors,
      generated_at: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();

  return { success: true };
});
