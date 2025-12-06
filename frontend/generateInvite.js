// generates a new invite code dynamically

export function generateInviteCode() {
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  console.log('New invite code generated:', inviteCode);
  
  return inviteCode;
}
