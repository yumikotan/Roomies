// Expenses/splitHelper.js
export function calculateSplits(method, total, sharedWith) {
  if (!Array.isArray(sharedWith) || sharedWith.length === 0) {
    throw new Error("sharedWith must be a non-empty array of UIDs.");
  }

  if (method === "even") {
    const splitAmount = Number((total / sharedWith.length).toFixed(2));

    return sharedWith.map((uid) => ({
      userId: uid,
      amount: splitAmount,
    }));
  }

  if (method === "custom") {
    const totalShare = sharedWith.reduce((sum, user) => sum + (user.share || 0), 0);
    if (totalShare !== 100) {
      throw new Error("For custom split, total shares must equal 100%.");
    }

    return sharedWith.map((user) => ({
      userId: user.userId,
      amount: Number(((user.share / 100) * total).toFixed(2)),
    }));
  }

  throw new Error("Invalid split method");
}