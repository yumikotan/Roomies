export function calculateOverallExpenseStatus(splits_result) {
  if (!Array.isArray(splits_result) || splits_result.length === 0) return "unpaid";

  const allPaid = splits_result.every(s => s.overallStatus === "paid");
  const allUnpaid = splits_result.every(s => s.overallStatus === "unpaid");

  if (allPaid) return "paid";
  if (allUnpaid) return "unpaid";
  return "partial";
}
