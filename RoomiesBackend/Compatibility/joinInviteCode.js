const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError("unauthenticated");

  const { code } = data;
  const uid = context.auth.uid;

  if (!code)
    throw new functions.https.HttpsError("invalid-argument", "Code required.");

  const snap = await db
    .collection("Compatibility")
    .doc("Invites")
    .collection("InviteCodes")
    .where("code", "==", code)
    .limit(1)
    .get();

  if (snap.empty)
    throw new functions.https.HttpsError("not-found", "Invalid code.");

  const ref = snap.docs[0].ref;
  const invite = snap.docs[0].data();

  if (invite.inviter_uid === uid)
    throw new functions.https.HttpsError("failed-precondition", "Cannot use your own code.");

  if (invite.invited_uid)
    throw new functions.https.HttpsError("already-exists", "Code already used.");

  await ref.update({
    invited_uid: uid,
    usedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    inviter_uid: invite.inviter_uid,
    message: "Invite accepted."
  };
});
