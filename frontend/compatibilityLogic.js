// functions/compatibilityLogic.js
exports.roundToHalf = (x) => Math.round(x * 2) / 2;
exports.clamp = (x, min, max) => Math.max(min, Math.min(max, x));

function getRankBoost(rankings, category) {
  const r = rankings?.[category];
  if (r === 1) return 1.0;
  if (r === 2) return 0.5;
  if (r === 3) return 0.25;
  return 0;
}

exports.buildProfile = (answers = {}, rankings = {}) => {
  const a = (n) => Number(answers[n] || 0);

  // Cleanliness
  const B_Clean = Math.round(0.45 * a(1) + 0.35 * a(2) + 0.20 * a(3));
  const I_Clean = exports.clamp(exports.roundToHalf(0.7 * a(4) + 0.3 * a(5))+getRankBoost(rankings, "cleanliness"),1, 5);
  const cleanliness = B_Clean * I_Clean;

  // Noise
  const B_Noise = Math.round(0.5 * a(7) + 0.3 * a(8) + 0.2 * a(9));
  const I_Noise = exports.clamp(exports.roundToHalf(0.7 * a(10) + 0.3 * a(11)) +getRankBoost(rankings, "noise"),1,5);
  const noise = B_Noise * I_Noise;

  // Sleep
  const B_Sleep = exports.clamp(Math.round((a(12) + a(15)) / 2), 1, 5);
  const I_Sleep = exports.clamp(exports.roundToHalf(0.6 * a(13) + 0.4 * a(14))+getRankBoost(rankings, "sleep"),1,5);
  const sleep_schedule = B_Sleep * I_Sleep;

  return { cleanliness, noise, sleep_schedule };
};

exports.computeMatch = (pA, pB) => {
  const maxScore = 25;

  const sim = (x, y) => {
    const d = Math.abs(x - y);
    return 1 - d / maxScore;
  };

  const cleanSim = sim(pA.cleanliness, pB.cleanliness);
  const noiseSim = sim(pA.noise, pB.noise);
  const sleepSim = sim(pA.sleep_schedule, pB.sleep_schedule);

  const finalScore = ((cleanSim + noiseSim + sleepSim) / 3) * 100;

  return {
    compatibility_score: Number(finalScore.toFixed(1)),
    factors: {cleanliness: cleanSim,noise: noiseSim,sleep_schedule: sleepSim}
  };
};
