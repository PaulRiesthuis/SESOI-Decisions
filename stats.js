// stats.js - Statistical utilities for SESOI Decisions Web Application

// --- Constants ---
const SQRT_2PI = Math.sqrt(2 * Math.PI);

// --- Core Normal Distribution functions ---

/**
 * Standard Normal Probability Density Function (PDF)
 */
function dnorm(x, mean = 0, sd = 1) {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * SQRT_2PI);
}

/**
 * Standard Normal Cumulative Distribution Function (CDF)
 * Uses Abramowitz and Stegun approximation (error < 7.5e-8)
 */
function pnorm(x, mean = 0, sd = 1) {
  const z = (x - mean) / sd;
  if (z < -8) return 0;
  if (z > 8) return 1;

  // A&S formula 26.2.17
  const p = 0.2316419;
  const a1 = 0.319381530;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;

  const absZ = Math.abs(z);
  const t = 1 / (1 + p * absZ);
  const cdf = 1 - (1 / SQRT_2PI) * Math.exp(-0.5 * absZ * absZ) * (
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t
  );

  return z >= 0 ? cdf : 1 - cdf;
}

/**
 * Standard Normal Quantile Function (Inverse CDF)
 * Uses Acklam's Algorithm with one Newton-Raphson refinement step for double-precision accuracy.
 */
function qnorm(p, mean = 0, sd = 1) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  // Coefficients for central region
  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285108340047e2;
  const a4 = 1.383577518672690e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277594924e0;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;

  // Coefficients for tails
  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838e0;
  const c4 = -2.549732539343734e0;
  const c5 = 4.374664141464968e0;
  const c6 = 2.938163982698783e0;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142446e0;
  const d4 = 3.754408661907416e0;

  const p_low = 0.02425;
  const p_high = 1 - p_low;
  let x = 0;

  if (p < p_low) {
    // Rational approximation for lower tail
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= p_high) {
    // Rational approximation for central region
    const q = p - 0.5;
    const r = q * q;
    x = q * (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) /
        (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    // Rational approximation for upper tail
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
         ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }

  // Refinement step via Newton-Raphson
  const err = pnorm(x) - p;
  const pdf = dnorm(x);
  if (pdf > 0) {
    x = x - err / pdf;
  }

  return mean + x * sd;
}

// --- Frequentist CI-based computations ---

/**
 * Get critical Z score based on alpha, tail, and test type
 */
function getZ(alpha, tail, testType) {
  if (testType === "Equivalence Test") {
    // Two one-sided tests (TOST): alpha/2 per tail (overall alpha is alpha/2 in R code TOST formulation)
    return qnorm(1 - alpha / 2);
  } else {
    // Minimum-effect test
    if (tail === "two") {
      return qnorm(1 - alpha / 2);
    } else {
      // upper or lower
      return qnorm(1 - alpha);
    }
  }
}

/**
 * Calculate Confidence Interval
 */
function getCI(alpha, observedEffect, se, tail, testType) {
  const z = getZ(alpha, tail, testType);
  return {
    lower: observedEffect - z * se,
    upper: observedEffect + z * se
  };
}

/**
 * Calculate Threshold Alpha
 */
function calculateThresholdAlpha(observedEffect, se, tail, testType, sesoiLower, sesoiUpper) {
  let startAlpha = 0.0001;
  let endAlpha = 0.5;
  let step = 0.0001;
  
  if (testType === "Minimum-Effect Test") {
    if (tail === "two") {
      if (observedEffect <= sesoiUpper && observedEffect >= sesoiLower) {
        return NaN; // Point estimate inside SESOI, no practical significance claim possible
      }
      for (let alpha = startAlpha; alpha <= endAlpha; alpha += step) {
        const ci = getCI(alpha, observedEffect, se, tail, testType);
        const claimExcludes = (observedEffect > sesoiUpper && ci.lower > sesoiUpper) ||
                              (observedEffect < sesoiLower && ci.upper < sesoiLower);
        if (claimExcludes) {
          return alpha;
        }
      }
    } else if (tail === "upper") {
      if (observedEffect <= sesoiUpper) {
        return NaN; // Cannot claim upper practical significance if effect <= upper bound
      }
      for (let alpha = startAlpha; alpha <= endAlpha; alpha += step) {
        const ci = getCI(alpha, observedEffect, se, tail, testType);
        if (ci.lower > sesoiUpper) {
          return alpha;
        }
      }
    } else if (tail === "lower") {
      if (observedEffect >= sesoiLower) {
        return NaN; // Cannot claim lower practical significance if effect >= lower bound
      }
      for (let alpha = startAlpha; alpha <= endAlpha; alpha += step) {
        const ci = getCI(alpha, observedEffect, se, tail, testType);
        if (ci.upper < sesoiLower) {
          return alpha;
        }
      }
    }
  } else { // Equivalence Test
    if (sesoiLower >= sesoiUpper) return NaN;
    if (observedEffect <= sesoiLower || observedEffect >= sesoiUpper) {
      return NaN; // Point estimate outside SESOI, cannot claim equivalence
    }
    for (let alpha = startAlpha; alpha <= endAlpha; alpha += step) {
      const ci = getCI(alpha, observedEffect, se, tail, testType);
      const claimInside = (ci.lower > sesoiLower) && (ci.upper < sesoiUpper);
      if (claimInside) {
        return alpha;
      }
    }
  }
  return NaN;
}

/**
 * Compute replication probability
 */
function calculateReplicationProb(observedEffect, seCurrent, nOrig, nRep, customAlpha, tail, testType, sesoiLower, sesoiUpper, seMode, sdInput) {
  if (nRep <= 0 || nOrig <= 0) return 0;
  
  const sdOrig = seMode === "se" ? seCurrent * Math.sqrt(nOrig) : sdInput;
  const seRep = sdOrig / Math.sqrt(nRep);
  const mu = observedEffect;
  const z = getZ(customAlpha, tail, testType);
  
  if (testType === "Minimum-Effect Test") {
    if (tail === "upper" && mu <= sesoiUpper) return 0;
    if (tail === "lower" && mu >= sesoiLower) return 0;
    
    const p_upper = pnorm((mu - sesoiUpper) / seRep - z);
    const p_lower = pnorm(-(mu - sesoiLower) / seRep - z);
    const prob = 1 - (1 - p_upper) * (1 - p_lower);
    return Math.max(0, Math.min(1, prob));
  } else { // Equivalence Test
    const lower_prob = pnorm((sesoiUpper - mu) / seRep - z);
    const upper_prob = pnorm((mu - sesoiLower) / seRep - z);
    const prob = Math.min(lower_prob, upper_prob);
    return Math.max(0, Math.min(1, prob));
  }
}

/**
 * Compute Robustness Index
 */
function calculateRobustnessIndex(observedEffect, seCurrent, customAlpha, tail, testType, sesoiLower, sesoiUpper, seMode) {
  if (seCurrent <= 0) return NaN;
  const z = getZ(customAlpha, tail, testType);
  
  let claimPossible = true;
  let practicalClaim = false;
  let seRequired = NaN;
  
  const ci = getCI(customAlpha, observedEffect, seCurrent, tail, testType);
  
  if (testType === "Minimum-Effect Test") {
    if (tail === "two") {
      claimPossible = (observedEffect > sesoiUpper) || (observedEffect < sesoiLower);
      practicalClaim = (ci.lower > sesoiUpper) || (ci.upper < sesoiLower);
    } else if (tail === "upper") {
      claimPossible = observedEffect > sesoiUpper;
      practicalClaim = claimPossible && (ci.lower > sesoiUpper);
    } else { // lower
      claimPossible = observedEffect < sesoiLower;
      practicalClaim = claimPossible && (ci.upper < sesoiLower);
    }
    
    if (!claimPossible) return NaN;
    
    if (practicalClaim) {
      if (tail === "two") {
        if (observedEffect > sesoiUpper) {
          seRequired = (observedEffect - sesoiUpper) / z;
        } else {
          seRequired = (sesoiLower - observedEffect) / z;
        }
      } else if (tail === "upper") {
        seRequired = (observedEffect - sesoiUpper) / z;
      } else { // lower
        seRequired = (sesoiLower - observedEffect) / z;
      }
    } else {
      if (tail === "two") {
        seRequired = Math.min(Math.abs(observedEffect - sesoiLower), Math.abs(observedEffect - sesoiUpper)) / z;
      } else if (tail === "upper") {
        seRequired = Math.abs(observedEffect - sesoiUpper) / z;
      } else { // lower
        seRequired = Math.abs(observedEffect - sesoiLower) / z;
      }
    }
  } else { // Equivalence Test
    practicalClaim = (ci.lower > sesoiLower) && (ci.upper < sesoiUpper);
    const margin = Math.min(observedEffect - sesoiLower, sesoiUpper - observedEffect);
    seRequired = margin / z;
  }
  
  if (isNaN(seRequired) || seRequired <= 0) return NaN;
  
  let ri = 1;
  if (seMode === "se") {
    ri = seCurrent / seRequired;
  } else {
    ri = (seCurrent / seRequired) ** 2;
  }
  if (ri < 1) ri = 1 / ri;
  return ri;
}

// --- Bayesian Posterior Computations ---

/**
 * Calculates Posterior parameters (mean, sd)
 */
function calculatePosteriorParams(observedEffect, seCurrent, priorMean, priorSD, seMode, sdInput, nInput) {
  const seObs = seMode === "se" ? seCurrent : sdInput / Math.sqrt(nInput);
  
  const priorVar = priorSD * priorSD;
  const obsVar = seObs * seObs;
  
  const sigmaPost2 = 1 / (1 / priorVar + 1 / obsVar);
  const sigmaPost = Math.sqrt(sigmaPost2);
  const muPost = sigmaPost2 * (priorMean / priorVar + observedEffect / obsVar);
  
  return { muPost, sigmaPost, seObs };
}

/**
 * Calculate Bayesian Posterior Probabilities and Bayes Factors
 */
function calculateBayesianPosterior(observedEffect, seCurrent, priorMean, priorSD, sesoiLower, sesoiUpper, testType, tail, seMode, sdInput, nInput) {
  const params = calculatePosteriorParams(observedEffect, seCurrent, priorMean, priorSD, seMode, sdInput, nInput);
  const { muPost, sigmaPost } = params;
  
  let priorProb = 0;
  let postProb = 0;
  let quantityLabel = "";
  let bfLabel = "";
  
  if (testType === "Minimum-Effect Test") {
    if (tail === "two") {
      priorProb = pnorm(sesoiLower, priorMean, priorSD) + (1 - pnorm(sesoiUpper, priorMean, priorSD));
      postProb = pnorm(sesoiLower, muPost, sigmaPost) + (1 - pnorm(sesoiUpper, muPost, sigmaPost));
      quantityLabel = "P(theta outside SESOI)";
    } else if (tail === "upper") {
      priorProb = 1 - pnorm(sesoiUpper, priorMean, priorSD);
      postProb = 1 - pnorm(sesoiUpper, muPost, sigmaPost);
      quantityLabel = `P(theta > ${sesoiUpper})`;
    } else { // lower
      priorProb = pnorm(sesoiLower, priorMean, priorSD);
      postProb = pnorm(sesoiLower, muPost, sigmaPost);
      quantityLabel = `P(theta < ${sesoiLower})`;
    }
    
    const priorOdds = priorProb / (1 - priorProb);
    const postOdds = postProb / (1 - postProb);
    const bf = postOdds / priorOdds;
    bfLabel = "Interval Bayes Factor (BF10)";
    
    return {
      muPost,
      sigmaPost,
      quantityLabel,
      postProb,
      bf,
      bfLabel
    };
  } else { // Equivalence Test
    priorProb = pnorm(sesoiUpper, priorMean, priorSD) - pnorm(sesoiLower, priorMean, priorSD);
    postProb = pnorm(sesoiUpper, muPost, sigmaPost) - pnorm(sesoiLower, muPost, sigmaPost);
    quantityLabel = `P(${sesoiLower} < theta < ${sesoiUpper})`;
    
    const priorOdds = priorProb / (1 - priorProb);
    const postOdds = postProb / (1 - postProb);
    const bf = postOdds / priorOdds;
    bfLabel = "Interval Bayes Factor (BF01)";
    
    return {
      muPost,
      sigmaPost,
      quantityLabel,
      postProb,
      bf,
      bfLabel
    };
  }
}

// --- Matrix Utilities for Nested Meta-Analysis ---

/**
 * Compute the determinant of a square matrix
 */
function matrixDet(matrix) {
  const n = matrix.length;
  if (n === 0) return 1;
  if (n === 1) return matrix[0][0];
  if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  
  const A = matrix.map(row => [...row]);
  let det = 1;
  for (let i = 0; i < n; i++) {
    let pivotRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(A[r][i]) > Math.abs(A[pivotRow][i])) {
        pivotRow = r;
      }
    }
    if (Math.abs(A[pivotRow][i]) < 1e-12) return 0;
    
    if (pivotRow !== i) {
      const temp = A[i];
      A[i] = A[pivotRow];
      A[pivotRow] = temp;
      det *= -1;
    }
    det *= A[i][i];
    
    for (let r = i + 1; r < n; r++) {
      const factor = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) {
        A[r][c] -= factor * A[i][c];
      }
    }
  }
  return det;
}

/**
 * Compute the inverse of a square matrix using Gaussian elimination with partial pivoting
 */
function matrixInv(matrix) {
  const n = matrix.length;
  if (n === 0) return [];
  if (n === 1) {
    if (Math.abs(matrix[0][0]) < 1e-12) return [[0]];
    return [[1 / matrix[0][0]]];
  }
  
  const M = matrix.map((row, i) => {
    const aug = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) {
      aug[j] = row[j];
    }
    aug[n + i] = 1;
    return aug;
  });
  
  for (let i = 0; i < n; i++) {
    let pivotRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[pivotRow][i])) {
        pivotRow = r;
      }
    }
    if (Math.abs(M[pivotRow][i]) < 1e-12) {
      return null;
    }
    
    if (pivotRow !== i) {
      const temp = M[i];
      M[i] = M[pivotRow];
      M[pivotRow] = temp;
    }
    
    const div = M[i][i];
    for (let c = i; c < 2 * n; c++) {
      M[i][c] /= div;
    }
    
    for (let r = 0; r < n; r++) {
      if (r !== i) {
        const factor = M[r][i];
        for (let c = i; c < 2 * n; c++) {
          M[r][c] -= factor * M[i][c];
        }
      }
    }
  }
  
  const inv = [];
  for (let i = 0; i < n; i++) {
    inv.push(M[i].slice(n));
  }
  return inv;
}

// --- Meta-Analysis Solvers ---

/**
 * Solves standard Fixed-Effects and Random-Effects (REML) Meta-Analysis
 */
function solveStandardMetaAnalysis(effects, ses, method = "REML") {
  const k = effects.length;
  if (k === 0) return null;
  
  const vars = ses.map(se => se * se);
  const wFE = vars.map(v => 1 / v);
  const sumWFE = wFE.reduce((a, b) => a + b, 0);
  const betaFE = effects.reduce((sum, y, i) => sum + wFE[i] * y, 0) / sumWFE;
  const seFE = Math.sqrt(1 / sumWFE);
  
  if (method === "FE") {
    return {
      beta: betaFE,
      se: seFE,
      tau2: 0,
      method: "FE",
      ci95Lower: betaFE - 1.96 * seFE,
      ci95Upper: betaFE + 1.96 * seFE,
      ci90Lower: betaFE - 1.645 * seFE,
      ci90Upper: betaFE + 1.645 * seFE,
      piLower: NaN,
      piUpper: NaN
    };
  }
  
  const remlLogLik = (tau2) => {
    let sumLog = 0;
    let sumW = 0;
    let sumWY = 0;
    for (let i = 0; i < k; i++) {
      const vTotal = vars[i] + tau2;
      const w = 1 / vTotal;
      sumLog += Math.log(vTotal);
      sumW += w;
      sumWY += w * effects[i];
    }
    const beta = sumWY / sumW;
    let sumWeightedSqErr = 0;
    for (let i = 0; i < k; i++) {
      sumWeightedSqErr += ((effects[i] - beta) ** 2) / (vars[i] + tau2);
    }
    return -0.5 * (sumLog + Math.log(sumW) + sumWeightedSqErr);
  };
  
  let meanY = effects.reduce((a, b) => a + b, 0) / k;
  let varY = effects.reduce((sum, y) => sum + (y - meanY) ** 2, 0) / Math.max(1, k - 1);
  const maxTau2 = Math.max(0, 10 * varY + 0.1);
  
  let bestTau2 = 0;
  let maxLL = -Infinity;
  const gridSteps = 500;
  for (let i = 0; i <= gridSteps; i++) {
    const t2 = (i / gridSteps) * maxTau2;
    const ll = remlLogLik(t2);
    if (ll > maxLL) {
      maxLL = ll;
      bestTau2 = t2;
    }
  }
  
  let a = Math.max(0, bestTau2 - maxTau2 / gridSteps);
  let b = Math.min(maxTau2, bestTau2 + maxTau2 / gridSteps);
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a);
  let d = a + gr * (b - a);
  
  while (b - a > 1e-7) {
    if (remlLogLik(c) > remlLogLik(d)) {
      b = d;
      d = c;
      c = b - gr * (b - a);
    } else {
      a = c;
      c = d;
      d = a + gr * (b - a);
    }
  }
  const tau2 = (a + b) / 2;
  
  let sumW = 0;
  let sumWY = 0;
  for (let i = 0; i < k; i++) {
    const w = 1 / (vars[i] + tau2);
    sumW += w;
    sumWY += w * effects[i];
  }
  const betaRE = sumWY / sumW;
  const seRE = Math.sqrt(1 / sumW);
  const sePred = Math.sqrt(seRE * seRE + tau2);
  
  return {
    beta: betaRE,
    se: seRE,
    tau2: tau2,
    method: "REML",
    ci95Lower: betaRE - 1.96 * seRE,
    ci95Upper: betaRE + 1.96 * seRE,
    ci90Lower: betaRE - 1.645 * seRE,
    ci90Upper: betaRE + 1.645 * seRE,
    piLower: betaRE - 1.96 * sePred,
    piUpper: betaRE + 1.96 * sePred
  };
}

/**
 * Solves multilevel nested Random-Effects Meta-Analysis (rma.mv equivalent)
 */
function solveMultilevelMetaAnalysis(effects, ses, groups) {
  const k = effects.length;
  if (k === 0) return null;
  
  const groupMap = {};
  for (let i = 0; i < k; i++) {
    const g = groups[i];
    if (!groupMap[g]) {
      groupMap[g] = [];
    }
    groupMap[g].push({
      y: effects[i],
      v: ses[i] * ses[i],
      idx: i
    });
  }
  
  const groupKeys = Object.keys(groupMap);
  
  const remlLogLik = (sg2, ss2) => {
    let sumLogDet = 0;
    let sumW = 0;
    let sumWY = 0;
    const invSigmaBlocks = [];
    
    for (let g of groupKeys) {
      const studies = groupMap[g];
      const ng = studies.length;
      
      const Sigma_g = [];
      for (let r = 0; r < ng; r++) {
        const row = new Array(ng).fill(0);
        for (let c = 0; c < ng; c++) {
          if (r === c) {
            row[c] = studies[r].v + ss2 + sg2;
          } else {
            row[c] = sg2;
          }
        }
        Sigma_g.push(row);
      }
      
      const det = matrixDet(Sigma_g);
      if (det <= 0) return -Infinity;
      sumLogDet += Math.log(det);
      
      const inv = matrixInv(Sigma_g);
      if (!inv) return -Infinity;
      invSigmaBlocks.push(inv);
      
      let blockW = 0;
      let blockWY = 0;
      for (let r = 0; r < ng; r++) {
        for (let c = 0; c < ng; c++) {
          blockW += inv[r][c];
          blockWY += inv[r][c] * studies[c].y;
        }
      }
      sumW += blockW;
      sumWY += blockWY;
    }
    
    if (sumW <= 0) return -Infinity;
    const beta = sumWY / sumW;
    
    let quadTerm = 0;
    let idx = 0;
    for (let g of groupKeys) {
      const studies = groupMap[g];
      const ng = studies.length;
      const inv = invSigmaBlocks[idx++];
      
      const dev = studies.map(s => s.y - beta);
      let blockQuad = 0;
      for (let r = 0; r < ng; r++) {
        for (let c = 0; c < ng; c++) {
          blockQuad += dev[r] * inv[r][c] * dev[c];
        }
      }
      quadTerm += blockQuad;
    }
    
    return -0.5 * (sumLogDet + Math.log(sumW) + quadTerm);
  };
  
  let meanY = effects.reduce((a, b) => a + b, 0) / k;
  let varY = effects.reduce((sum, y) => sum + (y - meanY) ** 2, 0) / Math.max(1, k - 1);
  const maxVar = Math.max(0, 5 * varY + 0.1);
  
  let bestSg = 0;
  let bestSs = 0;
  let maxLL = -Infinity;
  const gridSteps = 40;
  for (let i = 0; i <= gridSteps; i++) {
    const sg = (i / gridSteps) * maxVar;
    for (let j = 0; j <= gridSteps; j++) {
      const ss = (j / gridSteps) * maxVar;
      const ll = remlLogLik(sg, ss);
      if (ll > maxLL) {
        maxLL = ll;
        bestSg = sg;
        bestSs = ss;
      }
    }
  }
  
  let sg2 = bestSg;
  let ss2 = bestSs;
  const gr = (Math.sqrt(5) - 1) / 2;
  const refinementSteps = 4;
  
  for (let step = 0; step < refinementSteps; step++) {
    let a = Math.max(0, sg2 - maxVar / gridSteps);
    let b = Math.min(maxVar, sg2 + maxVar / gridSteps);
    let c = b - gr * (b - a);
    let d = a + gr * (b - a);
    while (b - a > 1e-6) {
      if (remlLogLik(c, ss2) > remlLogLik(d, ss2)) {
        b = d;
        d = c;
        c = b - gr * (b - a);
      } else {
        a = c;
        c = d;
        d = a + gr * (b - a);
      }
    }
    sg2 = (a + b) / 2;
    
    a = Math.max(0, ss2 - maxVar / gridSteps);
    b = Math.min(maxVar, ss2 + maxVar / gridSteps);
    c = b - gr * (b - a);
    d = a + gr * (b - a);
    while (b - a > 1e-6) {
      if (remlLogLik(sg2, c) > remlLogLik(sg2, d)) {
        b = d;
        d = c;
        c = b - gr * (b - a);
      } else {
        a = c;
        c = d;
        d = a + gr * (b - a);
      }
    }
    ss2 = (a + b) / 2;
  }
  
  let sumW = 0;
  let sumWY = 0;
  for (let g of groupKeys) {
    const studies = groupMap[g];
    const ng = studies.length;
    const Sigma_g = [];
    for (let r = 0; r < ng; r++) {
      const row = new Array(ng).fill(0);
      for (let c = 0; c < ng; c++) {
        if (r === c) {
          row[c] = studies[r].v + ss2 + sg2;
        } else {
          row[c] = sg2;
        }
      }
      Sigma_g.push(row);
    }
    const inv = matrixInv(Sigma_g);
    if (!inv) continue;
    
    let blockW = 0;
    let blockWY = 0;
    for (let r = 0; r < ng; r++) {
      for (let c = 0; c < ng; c++) {
        blockW += inv[r][c];
        blockWY += inv[r][c] * studies[c].y;
      }
    }
    sumW += blockW;
    sumWY += blockWY;
  }
  
  const beta = sumWY / sumW;
  const se = Math.sqrt(1 / sumW);
  
  return {
    beta: beta,
    se: se,
    sigma2_g: sg2,
    sigma2_s: ss2,
    method: "Multilevel REML",
    ci95Lower: beta - 1.96 * se,
    ci95Upper: beta + 1.96 * se,
    ci90Lower: beta - 1.645 * se,
    ci90Upper: beta + 1.645 * se,
    piLower: NaN,
    piUpper: NaN
  };
}

// Export functions for browser / node environments
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = {
    dnorm, pnorm, qnorm, getZ, getCI,
    calculateThresholdAlpha,
    calculateReplicationProb,
    calculateRobustnessIndex,
    calculatePosteriorParams,
    calculateBayesianPosterior,
    matrixDet,
    matrixInv,
    solveStandardMetaAnalysis,
    solveMultilevelMetaAnalysis
  };
}
