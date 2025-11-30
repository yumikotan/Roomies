const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError("unauthenticated");

  const uid = context.auth.uid;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  await db
    .collection("Compatibility")
    .doc("Invites")
    .collection("InviteCodes")
    .doc()
    .set({
      code,
      inviter_uid: uid,
      invited_uid: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      usedAt: null,
    });

  return { inviteCode: code };
});
