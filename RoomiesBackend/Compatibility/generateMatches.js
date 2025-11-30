const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

const { buildProfile, computeMatch } = require("./logic");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError("unauthenticated");

  const uid = context.auth.uid;
  const myDoc = await db.collection("ProfileUsers").doc(uid).get();
  const myProfile = buildProfile(myDoc.data().compat_answers, myDoc.data().compat_rankings);

  const all = await db.collection("ProfileUsers").get();
  const batch = db.batch();

  // remove old matches
  const old = await db.collection("Compatibility").where("user_id", "==", uid).get();
  old.forEach(doc => batch.delete(doc.ref));

  // compute and store new matches
  all.forEach(docSnap => {
    if (docSnap.id === uid) return;

    const other = docSnap.data();
    if (!other.compat_answers) return;

    const otherProfile = buildProfile(other.compat_answers, other.compat_rankings);
    const result = computeMatch(myProfile, otherProfile);

    batch.set(db.collection("Compatibility").doc(), {
      user_id: uid,
      match_user_id: docSnap.id,
      compatibility_score: result.compatibility_score,
      matching_factors: result.factors,
      generated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { success: true };
});
