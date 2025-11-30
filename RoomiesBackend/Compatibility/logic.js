// compatibility/logic.js

exports.roundToHalf = (x) => Math.round(x * 2) / 2;
exports.clamp = (x, min, max) => Math.max(min, Math.min(max, x));

function getRankBoost(rankings = {}, category) {
  const r = rankings[category];
  return r === 1 ? 1 : r === 2 ? 0.5 : r === 3 ? 0.25 : 0;
}

exports.buildProfile = (answers = {}, rankings = {}) => {
  const a = (i) => Number(answers[i] || 0);
  const clamp = exports.clamp;
  const half = exports.roundToHalf;

 //cleanliness
  const cleanliness = (() => {
    const base = Math.round(0.45 * a(1) + 0.35 * a(2) + 0.2 * a(3));
    const interp = clamp(
      half(0.7 * a(4) + 0.3 * a(5)) + getRankBoost(rankings, "cleanliness"),
      1, 5
    );
    return base * interp;
  })();

// noise
  const noise = (() => {
    const base = Math.round(0.5 * a(7) + 0.3 * a(8) + 0.2 * a(9));
    const interp = clamp(
      half(0.7 * a(10) + 0.3 * a(11)) + getRankBoost(rankings, "noise"),
      1, 5
    );
    return base * interp;
  })();

  // sleep
  const sleep_schedule = (() => {
    const base = clamp(Math.round((a(12) + a(15)) / 2), 1, 5);
    const interp = clamp(
      half(0.6 * a(13) + 0.4 * a(14)) + getRankBoost(rankings, "sleep"),
      1, 5
    );
    return base * interp;
  })();

  // study
  const study = (() => {
    const base = clamp(Math.round(0.5 * a(17) + 0.35 * a(18) + 0.15 * a(16)), 1, 5);
    const interp = clamp(
      half(0.6 * a(19) + 0.4 * a(20)) + getRankBoost(rankings, "study"),
      1, 5
    );
    return base * interp;
  })();

  // communication
  const communication = (() => {
    const base = clamp(Math.round(0.6 * a(21) + 0.4 * a(22)), 1, 5);
    const interp = clamp(
      half(a(23) + (a(24) === 1 ? 0.5 : 0)) + getRankBoost(rankings, "communication"),
      1, 5
    );
    return base * interp;
  })();

 //guests
  const guests = (() => {
    const base = clamp(Math.round(0.55 * a(26) + 0.45 * a(25)), 1, 7);
    const interp = clamp(
      half((6 - a(27)) * 0.4 + a(28) * 0.6) + getRankBoost(rankings, "guest"),
      1, 5
    );
    return base * interp;
  })();

//pets
  const pets = (() => {
    const base = clamp(Math.round(0.6 * a(30) + 0.4 * a(29)), 1, 7);
    const interp = clamp(
      half(0.7 * a(31) + 0.3 * a(32)) + getRankBoost(rankings, "pets"),
      1, 5
    );
    return base * interp;
  })();

  // substances
  const substances = (() => {
    const inv = 5 - a(34);
    const base = clamp(Math.round(0.7 * a(33) + 0.3 * inv), 1, 7);
    const interp = clamp(
      half(0.8 * a(35) + 0.2 * (5 - a(36))) + getRankBoost(rankings, "substances"),
      1, 5
    );
    return base * interp;
  })();

  // finances
  const finances = (() => {
    const base = clamp(Math.round(0.7 * a(37) + 0.3 * a(38)), 1, 5);
    const interp = clamp(
      half(0.8 * a(39) + 0.2 * a(40)) + getRankBoost(rankings, "finances"),
      1, 5
    );
    return base * interp;
  })();

//sharing
  const sharing = (() => {
    const base = clamp(Math.round(0.6 * a(41) + 0.4 * a(42)), 1, 5);
    const interp = clamp(
      half(a(43) + (a(44) === 1 ? 0.25 : 0)) + getRankBoost(rankings, "sharing"),
      1, 5
    );
    return base * interp;
  })();

  // privacy
  const privacy = (() => {
    const base = clamp(Math.round(0.55 * a(45) + 0.45 * (8 - a(46))), 1, 5);
    const interp = clamp(
      half(0.6 * a(47) + 0.4 * a(48)) + getRankBoost(rankings, "privacy"),
      1, 5
    );
    return base * interp;
  })();

  // lifestyle
  const lifestyle = (() => {
    const base = clamp(
      Math.round(0.4 * a(49) + 0.3 * a(51) + 0.3 * a(50)),
      1, 7
    );
    const interp = clamp(
      half(a(52)) + getRankBoost(rankings, "lifestyle"),
      1, 5
    );
    return base * interp;
  })();

  return {
    cleanliness,
    noise,
    sleep_schedule,
    study,
    communication,
    guests,
    pets,
    substances,
    finances,
    sharing,
    privacy,
    lifestyle
  };
};


//compatibility score

exports.computeMatch = (A, B) => {
  const categories = Object.keys(A);
  const MAX = 25;

  const similarity = (x, y) => 1 - Math.abs(x - y) / MAX;

  let sims = {};
  let total = 0;

  categories.forEach(cat => {
    const sim = similarity(A[cat], B[cat]);
    sims[cat] = sim;
    total += sim;
  });

  const finalScore = (total / categories.length) * 100;

  return {
    compatibility_score: Number(finalScore.toFixed(1)),
    factors: sims
  };
};
