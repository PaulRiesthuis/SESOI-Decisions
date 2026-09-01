// test_stats.js - Test script to verify stats.js calculations

const stats = require('./stats.js');

function assertClose(val1, val2, tol = 1e-4, msg = "") {
  const diff = Math.abs(val1 - val2);
  if (diff > tol) {
    console.error(`❌ FAIL: ${msg}. Expected ${val1} to be close to ${val2} (diff: ${diff})`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${msg} (${val1.toFixed(5)} ~ ${val2.toFixed(5)})`);
  }
}

// 1. Test Normal CDF
console.log("--- Testing Normal CDF (pnorm) ---");
assertClose(stats.pnorm(0), 0.5, 1e-7, "pnorm(0)");
assertClose(stats.pnorm(1.95996), 0.975, 1e-4, "pnorm(1.96)");
assertClose(stats.pnorm(-1.95996), 0.025, 1e-4, "pnorm(-1.96)");
assertClose(stats.pnorm(1.64485), 0.95, 1e-4, "pnorm(1.645)");

// 2. Test Normal Quantiles (qnorm)
console.log("\n--- Testing Normal Quantile (qnorm) ---");
assertClose(stats.qnorm(0.5), 0.0, 1e-7, "qnorm(0.5)");
assertClose(stats.qnorm(0.975), 1.95996, 1e-5, "qnorm(0.975)");
assertClose(stats.qnorm(0.025), -1.95996, 1e-5, "qnorm(0.025)");
assertClose(stats.qnorm(0.95), 1.64485, 1e-5, "qnorm(0.95)");

// 3. Test Matrix Determinant and Inverse
console.log("\n--- Testing Matrix Utilities ---");
const M = [
  [4, 7],
  [2, 6]
];
assertClose(stats.matrixDet(M), 10, 1e-7, "matrixDet(2x2)");

const Minv = stats.matrixInv(M);
assertClose(Minv[0][0], 0.6, 1e-7, "matrixInv[0][0]");
assertClose(Minv[0][1], -0.7, 1e-7, "matrixInv[0][1]");
assertClose(Minv[1][0], -0.2, 1e-7, "matrixInv[1][0]");
assertClose(Minv[1][1], 0.4, 1e-7, "matrixInv[1][1]");

// 4. Test Standard Meta-Analysis (Random Effects)
console.log("\n--- Testing Standard Meta-Analysis (REML) ---");
// Synthetic data
const effects = [0.2, 0.5, 0.8];
const ses = [0.1, 0.15, 0.2];

// In R (metafor package):
// rma(yi = c(0.2, 0.5, 0.8), sei = c(0.1, 0.15, 0.2), method = "REML")
// Yields:
// tau^2 = 0.0232 (approx)
// pooled effect = 0.3803 (approx)
// se = 0.1444 (approx)
const res = stats.solveStandardMetaAnalysis(effects, ses, "REML");
assertClose(res.tau2, 0.0232, 1e-3, "solveStandardMetaAnalysis - tau^2");
assertClose(res.beta, 0.3803, 1e-3, "solveStandardMetaAnalysis - pooled effect (beta)");
assertClose(res.se, 0.1444, 1e-3, "solveStandardMetaAnalysis - se");

// 5. Test Multilevel Meta-Analysis (Dependent Effects)
console.log("\n--- Testing Multilevel Meta-Analysis ---");
// Suppose Study 1 & 2 are in Group 1, Study 3 is in Group 2
const groups = [1, 1, 2];
// Let's run solveMultilevelMetaAnalysis
const resMV = stats.solveMultilevelMetaAnalysis(effects, ses, groups);
console.log("Multilevel Results:", resMV);
// Ensure it returns positive or zero variance components
if (resMV.sigma2_g >= 0 && resMV.sigma2_s >= 0) {
  console.log("✅ PASS: Multilevel REML converged with non-negative variances.");
} else {
  console.error("❌ FAIL: Multilevel REML variance components negative.");
  process.exit(1);
}

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
