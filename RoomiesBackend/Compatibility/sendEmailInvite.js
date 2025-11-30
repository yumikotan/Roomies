const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth)
    throw new functions.https.HttpsError("unauthenticated");

  const inviterUid = context.auth.uid;
  const { email } = data;

  if (!email)
    throw new functions.https.HttpsError("invalid-argument", "Email is required.");

  // 1. Find user by email
  const userSnap = await db
    .collection("ProfileUsers")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (userSnap.empty)
    throw new functions.https.HttpsError("not-found", "No user found with this email.");

  const invitedUid = userSnap.docs[0].id;

  // 2. Prevent inviting yourself
  if (invitedUid === inviterUid)
    throw new functions.https.HttpsError("failed-precondition", "You cannot invite yourself.");

  // 3. Create invite entry
  await db
    .collection("Compatibility")
    .doc("Invites")
    .collection("EmailInvites")
    .doc()
    .set({
      inviter_uid: inviterUid,
      invited_uid: invitedUid,
      invited_email: email,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return { success: true, invitedUid };
});
