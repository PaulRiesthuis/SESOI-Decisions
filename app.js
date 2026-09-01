// app.js - Main Application Controller for SESOI Decisions Web Application

// --- State Variables ---
let currentTheme = 'light';
let activeMainTab = 'Intro';

// Standard Error modes for both tabs
let sfSEMode = 'se'; // 'se' or 'n_sd'
let sbSEMode = 'se'; // 'se' or 'n_sd'

let metaMethod = 'REML'; // 'REML' or 'FE'

// Default studies for meta-analysis
let metaStudies = [
  { name: "Study 1", y: 0.2, se: 0.1, n: 50, group: 1 },
  { name: "Study 2", y: 0.5, se: 0.15, n: 50, group: 1 },
  { name: "Study 3", y: 0.8, se: 0.2, n: 50, group: 2 }
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Initialize global unclipped floating tooltips
  initGlobalTooltips();

  // Populate intro table
  populateIntroTable();
  
  // Render the initial Ridgeline demo plot
  drawRidgelinePlot('IntroDemoPlot', currentTheme === 'dark');
  
  // Setup editable grid for meta-studies
  renderMetaStudiesGrid();
  
  // Add listeners to input elements for real-time recalculations
  setupEventListeners();
  
  // Run initial calculations
  updateSingleFreqCalculations();
  updateSingleBayesCalculations();

  // Handle window resizing to make Canvas plots responsive
  window.addEventListener('resize', () => {
    if (activeMainTab === 'Intro') {
      drawRidgelinePlot('IntroDemoPlot', currentTheme === 'dark');
    } else if (activeMainTab === 'SingleFreq') {
      updateSingleFreqCalculations();
    } else if (activeMainTab === 'SingleBayes') {
      updateSingleBayesCalculations();
    } else if (activeMainTab === 'Meta') {
      if (document.getElementById('meta-output-card').style.display === 'block') {
        updateMetaCalculations();
      }
    }
  });
});

// --- Tab Switching ---
function switchMainTab(tabId) {
  document.querySelectorAll('.tab-container').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  
  const activeTab = document.getElementById(`tab-${tabId}`);
  if (activeTab) activeTab.classList.add('active');
  
  const menuItem = document.getElementById(`menu-${tabId.toLowerCase()}`);
  if (menuItem) menuItem.classList.add('active');
  
  const headerTitles = {
    'Intro': 'Introduction',
    'SingleFreq': 'Single Estimates (Frequentist)',
    'SingleBayes': 'Single Estimates (Bayesian)',
    'Meta': 'Meta-Analytic Procedure'
  };
  document.getElementById('page-header-title').innerText = headerTitles[tabId] || tabId;
  
  activeMainTab = tabId;
  
  // Trigger redraw
  if (tabId === 'Intro') {
    drawRidgelinePlot('IntroDemoPlot', currentTheme === 'dark');
  } else if (tabId === 'SingleFreq') {
    updateSingleFreqCalculations();
  } else if (tabId === 'SingleBayes') {
    updateSingleBayesCalculations();
  } else if (tabId === 'Meta') {
    if (document.getElementById('meta-output-card').style.display === 'block') {
      updateMetaCalculations();
    }
  }
}

// Inner tab switching (Instructions / Inputs)
function switchInnerTab(prefix, tabId) {
  let sectionId = '';
  if (prefix === 'sf') sectionId = 'tab-SingleFreq';
  else if (prefix === 'sb') sectionId = 'tab-SingleBayes';
  else if (prefix === 'meta') sectionId = 'tab-Meta';
  
  const container = document.getElementById(sectionId);
  if (!container) return;
  
  container.querySelectorAll('.inner-tab-btn').forEach(btn => btn.classList.remove('active'));
  container.querySelector(`#${prefix}-tab-${tabId}`).classList.add('active');
  
  container.querySelectorAll('.inner-tab-content').forEach(content => content.classList.remove('active'));
  container.querySelector(`#${prefix}-content-${tabId}`).classList.add('active');
}

// --- Theme Management ---
function toggleTheme() {
  const html = document.documentElement;
  const themeText = document.getElementById('theme-text');
  const themeIcon = document.getElementById('theme-icon');
  
  if (currentTheme === 'light') {
    currentTheme = 'dark';
    html.setAttribute('data-theme', 'dark');
    themeText.innerText = 'Light Mode';
    themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
  } else {
    currentTheme = 'light';
    html.removeAttribute('data-theme');
    themeText.innerText = 'Dark Mode';
    themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
  }
  
  if (activeMainTab === 'Intro') {
    drawRidgelinePlot('IntroDemoPlot', currentTheme === 'dark');
  } else if (activeMainTab === 'SingleFreq') {
    updateSingleFreqCalculations();
  } else if (activeMainTab === 'SingleBayes') {
    updateSingleBayesCalculations();
  } else if (activeMainTab === 'Meta') {
    if (document.getElementById('meta-output-card').style.display === 'block') {
      updateMetaCalculations();
    }
  }
}

// --- Bidirectional Input Sync helper ---
function syncSharedFields(sourcePrefix, targetPrefix) {
  const sharedFields = ['observed-effect', 'se', 'n', 'sd', 'test-type', 'tail-type', 'sesoi-lower', 'sesoi-upper'];
  
  sharedFields.forEach(field => {
    const srcEl = document.getElementById(`${sourcePrefix}-${field}`);
    const targetEl = document.getElementById(`${targetPrefix}-${field}`);
    if (srcEl && targetEl) {
      targetEl.value = srcEl.value;
    }
  });
  
  // Sync the standard error modes
  if (sourcePrefix === 'sf') {
    sbSEMode = sfSEMode;
    updateSBSEModeUI();
  } else {
    sfSEMode = sbSEMode;
    updateSFSEModeUI();
  }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Frequentist tab listeners
  const sfInputs = [
    'sf-observed-effect', 'sf-se', 'sf-n', 'sf-sd', 
    'sf-test-type', 'sf-tail-type', 'sf-sesoi-lower', 
    'sf-sesoi-upper', 'sf-custom-alpha', 'sf-n-orig', 'sf-n-rep'
  ];
  sfInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const handler = () => {
        // Sync to Bayesian
        syncSharedFields('sf', 'sb');
        // Recompute both
        updateSingleFreqCalculations();
        updateSingleBayesCalculations();
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    }
  });
  
  // Bayesian tab listeners
  const sbInputs = [
    'sb-observed-effect', 'sb-se', 'sb-n', 'sb-sd', 
    'sb-test-type', 'sb-tail-type', 'sb-sesoi-lower', 
    'sb-sesoi-upper', 'sb-prior-mean', 'sb-prior-sd'
  ];
  sbInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const handler = () => {
        // Sync to Frequentist
        syncSharedFields('sb', 'sf');
        // Recompute both
        updateSingleFreqCalculations();
        updateSingleBayesCalculations();
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    }
  });
  
  // Meta inputs
  const metaInputs = [
    'm-test-type', 'm-tail-type', 'm-sesoi-lower', 'm-sesoi-upper'
  ];
  metaInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const handler = () => {
        if (document.getElementById('meta-output-card').style.display === 'block') {
          updateMetaCalculations();
        }
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    }
  });
}

// --- Single Freq UI Logic & Calculation ---
function toggleSFSEMode(mode) {
  sfSEMode = mode;
  updateSFSEModeUI();
  
  // Sync to Bayesian
  sbSEMode = mode;
  updateSBSEModeUI();
  
  updateSingleFreqCalculations();
  updateSingleBayesCalculations();
}

function updateSFSEModeUI() {
  document.getElementById('btn-sf-se-mode-se').classList.toggle('active', sfSEMode === 'se');
  document.getElementById('btn-sf-se-mode-nsd').classList.toggle('active', sfSEMode === 'n_sd');
  
  document.getElementById('group-sf-se').style.display = sfSEMode === 'se' ? 'flex' : 'none';
  document.getElementById('group-sf-n-sd').style.display = sfSEMode === 'n_sd' ? 'flex' : 'none';
  document.getElementById('group-sf-n-orig').style.display = sfSEMode === 'se' ? 'flex' : 'none';
}

function onSFTestTypeChange() {
  const testType = document.getElementById('sf-test-type').value;
  const tailGroup = document.getElementById('group-sf-tail-type');
  const customAlphaInput = document.getElementById('sf-custom-alpha');
  
  if (testType === 'Minimum-Effect Test') {
    tailGroup.style.display = 'flex';
    customAlphaInput.value = '0.05';
  } else {
    tailGroup.style.display = 'none';
    customAlphaInput.value = '0.10';
  }
  
  // Sync to Bayesian
  document.getElementById('sb-test-type').value = testType;
  onSBTestTypeChange();
  
  updateSingleFreqCalculations();
  updateSingleBayesCalculations();
}

function updateSingleFreqCalculations() {
  const errBox = document.getElementById('error-message-sf');
  if (!errBox) return;
  errBox.style.display = 'none';
  errBox.innerHTML = '';
  
  const observedEffect = parseFloat(document.getElementById('sf-observed-effect').value);
  const seValInput = parseFloat(document.getElementById('sf-se').value);
  const nVal = parseInt(document.getElementById('sf-n').value);
  const sdVal = parseFloat(document.getElementById('sf-sd').value);
  const testType = document.getElementById('sf-test-type').value;
  const tail = document.getElementById('sf-tail-type').value;
  const sesoiLower = parseFloat(document.getElementById('sf-sesoi-lower').value);
  const sesoiUpper = parseFloat(document.getElementById('sf-sesoi-upper').value);
  const customAlpha = parseFloat(document.getElementById('sf-custom-alpha').value);
  const nOrig = parseInt(document.getElementById('sf-n-orig').value);
  const nRep = parseInt(document.getElementById('sf-n-rep').value);
  
  const errors = [];
  if (isNaN(observedEffect)) errors.push("Please input Observed Effect.");
  
  let seVal = 0;
  if (sfSEMode === 'se') {
    if (isNaN(seValInput)) errors.push("Please input Standard Error.");
    else if (seValInput < 0) errors.push("Standard Error must be greater than or equal to 0.");
    seVal = seValInput;
  } else {
    if (isNaN(nVal) || isNaN(sdVal)) errors.push("Please input Sample Size and SD.");
    else {
      if (nVal <= 1) errors.push("Sample Size must be greater than 1.");
      if (sdVal < 0) errors.push("Standard Deviation must be greater than or equal to 0.");
    }
    seVal = sdVal / Math.sqrt(nVal);
  }
  
  if (isNaN(sesoiLower) || isNaN(sesoiUpper)) errors.push("Please input SESOI Lower and Upper Bounds.");
  else if (sesoiLower >= sesoiUpper) errors.push("SESOI Lower Bound must be less than Upper Bound.");
  
  if (isNaN(customAlpha) || customAlpha <= 0 || customAlpha >= 1) errors.push("Alpha must be between 0 and 1.");
  if (sfSEMode === 'se' && (isNaN(nOrig) || nOrig <= 1)) errors.push("Original Sample Size must be greater than 1.");
  if (isNaN(nRep) || nRep <= 1) errors.push("Replication Sample Size must be greater than 1.");
  
  if (errors.length > 0) {
    errBox.style.display = 'block';
    errBox.innerHTML = `⚠️ <b>Please input valid values:</b><br>${errors.join('<br>')}`;
    document.getElementById('single-ci-table-body').innerHTML = '';
    document.getElementById('single-ci-explanation').innerHTML = '';
    return;
  }
  
  const currentCI = getCI(customAlpha, observedEffect, seVal, tail, testType);
  const thresholdAlpha = calculateThresholdAlpha(observedEffect, seVal, tail, testType, sesoiLower, sesoiUpper);
  
  let claimPossible = true;
  if (testType === 'Minimum-Effect Test') {
    if (tail === 'upper' && observedEffect <= sesoiUpper) claimPossible = false;
    else if (tail === 'lower' && observedEffect >= sesoiLower) claimPossible = false;
    else if (tail === 'two' && observedEffect >= sesoiLower && observedEffect <= sesoiUpper) claimPossible = false;
  }
  
  const activeNOrig = sfSEMode === 'se' ? nOrig : nVal;
  const repProb = calculateReplicationProb(observedEffect, seVal, activeNOrig, nRep, customAlpha, tail, testType, sesoiLower, sesoiUpper, sfSEMode, sdVal);
  const riVal = calculateRobustnessIndex(observedEffect, seVal, customAlpha, tail, testType, sesoiLower, sesoiUpper, sfSEMode);
  
  let requiredSEText = "-";
  if (claimPossible) {
    const z = getZ(customAlpha, tail, testType);
    let seReq = NaN;
    
    const isMinTest = testType === 'Minimum-Effect Test';
    const practicalClaim = isMinTest 
      ? (currentCI.lower > sesoiUpper || currentCI.upper < sesoiLower)
      : (currentCI.lower > sesoiLower && currentCI.upper < sesoiUpper);
      
    if (isMinTest) {
      if (practicalClaim) {
        if (tail === 'two') {
          seReq = (observedEffect > sesoiUpper) ? (observedEffect - sesoiUpper) / z : (sesoiLower - observedEffect) / z;
        } else if (tail === 'upper') {
          seReq = (observedEffect - sesoiUpper) / z;
        } else {
          seReq = (sesoiLower - observedEffect) / z;
        }
      } else {
        if (tail === 'two') {
          seReq = Math.min(Math.abs(observedEffect - sesoiLower), Math.abs(observedEffect - sesoiUpper)) / z;
        } else if (tail === 'upper') {
          seReq = Math.abs(observedEffect - sesoiUpper) / z;
        } else {
          seReq = Math.abs(observedEffect - sesoiLower) / z;
        }
      }
    } else {
      const margin = Math.min(observedEffect - sesoiLower, sesoiUpper - observedEffect);
      seReq = margin / z;
    }
    requiredSEText = isNaN(seReq) ? "-" : seReq.toFixed(4);
  }
  
  let tbodyCI = `
    <tr>
      <td><span class="has-tooltip"><b>${customAlpha.toFixed(3)}</b> (Custom)<span class="info-icon">i</span><span class="tooltip-text">The nominal Type I error rate (significance level) used for evaluating the confidence interval.</span></span></td>
      <td>${currentCI.lower.toFixed(4)}</td>
      <td>${currentCI.upper.toFixed(4)}</td>
      <td>${requiredSEText}</td>
      <td>${!claimPossible ? "No claim possible" : (isNaN(riVal) ? "No claim possible" : riVal.toFixed(3))}</td>
      <td>${!claimPossible ? "0.000" : repProb.toFixed(3)}</td>
    </tr>
  `;
  
  if (!isNaN(thresholdAlpha)) {
    const threshCI = getCI(thresholdAlpha, observedEffect, seVal, tail, testType);
    tbodyCI += `
      <tr>
        <td><span class="has-tooltip"><b>${thresholdAlpha.toFixed(4)}</b> (Threshold)<span class="info-icon">i</span><span class="tooltip-text">Quantifies the maximum nominal Type I error rate required to conclude a practically meaningful or practically negligible effect based on the observed data.</span></span></td>
        <td>${threshCI.lower.toFixed(4)}</td>
        <td>${threshCI.upper.toFixed(4)}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
  } else {
    tbodyCI += `
      <tr>
        <td><span class="has-tooltip"><b>No Claim Possible</b> (Threshold)<span class="info-icon">i</span><span class="tooltip-text">A threshold alpha cannot be calculated because the point estimate lies inside the SESOI or contradicts the directional hypothesis.</span></span></td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
  }
  document.getElementById('single-ci-table-body').innerHTML = tbodyCI;
  
  renderCIPlot('ciPlotCanvas', observedEffect, seVal, sesoiLower, sesoiUpper, testType, tail, customAlpha, thresholdAlpha, currentTheme === 'dark');
  
  let statSigText = (currentCI.lower > 0 || currentCI.upper < 0)
    ? `<b>At Alpha = ${customAlpha}:</b> The effect is <b>statistically significant</b> (CI excludes 0).`
    : `<b>At Alpha = ${customAlpha}:</b> The effect is <b>not statistically significant</b> (CI includes 0).`;
    
  let practicalConclusion = "";
  let practicalClaim = false;
  
  if (testType === "Minimum-Effect Test") {
    if (tail === "upper") {
      practicalClaim = claimPossible && (currentCI.lower > sesoiUpper);
      if (!claimPossible) {
        practicalConclusion = `The observed effect (${observedEffect}) is less than or equal to the Upper SESOI bound (${sesoiUpper}), so an upper practical effect <b>cannot be claimed</b>.`;
      } else if (practicalClaim) {
        practicalConclusion = "The effect is <b>practically meaningful</b> (lower CI bound strictly exceeds Upper SESOI).";
      } else {
        practicalConclusion = `The CI does not strictly exceed the Upper SESOI bound (${sesoiUpper}), so the practical conclusion is <b>inconclusive</b>.`;
      }
    } else if (tail === "lower") {
      practicalClaim = claimPossible && (currentCI.upper < sesoiLower);
      if (!claimPossible) {
        practicalConclusion = `The observed effect (${observedEffect}) is greater than or equal to the Lower SESOI bound (${sesoiLower}), so a lower practical effect <b>cannot be claimed</b>.`;
      } else if (practicalClaim) {
        practicalConclusion = "The effect is <b>practically meaningful</b> (upper CI bound strictly falls below Lower SESOI).";
      } else {
        practicalConclusion = `The CI does not strictly fall below the Lower SESOI bound (${sesoiLower}), so the practical conclusion is <b>inconclusive</b>.`;
      }
    } else { // two-tailed
      practicalClaim = claimPossible && (currentCI.lower > sesoiUpper || currentCI.upper < sesoiLower);
      if (!claimPossible) {
        practicalConclusion = `The observed effect (${observedEffect}) lies inside the SESOI bounds (${sesoiLower} to ${sesoiUpper}), so practical relevance <b>cannot be claimed</b>.`;
      } else if (practicalClaim) {
        practicalConclusion = "The effect is <b>practically meaningful</b> (CI excludes SESOI).";
      } else {
        practicalConclusion = `The CI overlaps the SESOI bounds (${sesoiLower} to ${sesoiUpper}), so the practical conclusion is <b>inconclusive</b>.`;
      }
    }
  } else { // Equivalence Test
    practicalClaim = claimPossible && (currentCI.lower > sesoiLower && currentCI.upper < sesoiUpper);
    if (!claimPossible) {
      practicalConclusion = `The observed effect (${observedEffect}) lies outside the SESOI bounds (${sesoiLower} to ${sesoiUpper}), so equivalence <b>cannot be claimed</b>.`;
    } else if (practicalClaim) {
      practicalConclusion = "The effect is <b>practically equivalent to zero</b> (CI falls fully within SESOI).";
    } else {
      practicalConclusion = `The CI overlaps the SESOI bounds (${sesoiLower} to ${sesoiUpper}), so the practical conclusion is <b>inconclusive</b>.`;
    }
  }
  
  let thresholdConclusion = "";
  if (!claimPossible) {
    thresholdConclusion = "No claim possible: observed estimate lies inside bounds or contradicts the directional hypothesis.";
  } else {
    if (testType === "Minimum-Effect Test") {
      thresholdConclusion = isNaN(thresholdAlpha)
        ? "The CI overlaps the SESOI bounds; practical significance cannot be claimed at any alpha up to 0.5."
        : `The SESOI is excluded at alpha = <b>${thresholdAlpha.toFixed(4)}</b>. This is the maximum Type I error rate at which a practically meaningful effect can be claimed.`;
    } else {
      thresholdConclusion = isNaN(thresholdAlpha)
        ? "The CI does not fall fully within SESOI; equivalence cannot be claimed at any alpha up to 0.5."
        : `The CI falls fully within SESOI at alpha = <b>${thresholdAlpha.toFixed(4)}</b>. This is the maximum Type I error rate at which a practically equivalent effect can be claimed.`;
    }
  }
  
  let robustnessText = "No claim possible.";
  if (claimPossible && !isNaN(riVal)) {
    const isMinTest = testType === 'Minimum-Effect Test';
    const practicalClaim = isMinTest 
      ? (currentCI.lower > sesoiUpper || currentCI.upper < sesoiLower)
      : (currentCI.lower > sesoiLower && currentCI.upper < sesoiUpper);
      
    let fromState = "", toState = "";
    if (isMinTest) {
      fromState = practicalClaim ? "practically meaningful" : "inconclusive";
      toState = practicalClaim ? "inconclusive" : "practically meaningful";
    } else {
      fromState = practicalClaim ? "practically equivalent" : "inconclusive";
      toState = practicalClaim ? "inconclusive" : "practically equivalent";
    }
    
    const z = getZ(customAlpha, tail, testType);
    let seReq = NaN;
    if (isMinTest) {
      if (practicalClaim) {
        seReq = (observedEffect > sesoiUpper) ? (observedEffect - sesoiUpper) / z : (sesoiLower - observedEffect) / z;
      } else {
        seReq = Math.min(Math.abs(observedEffect - sesoiLower), Math.abs(observedEffect - sesoiUpper)) / z;
      }
    } else {
      const margin = Math.min(observedEffect - sesoiLower, sesoiUpper - observedEffect);
      seReq = margin / z;
    }
    
    if (sfSEMode === "se") {
      if (seReq > seVal) {
        const mult = (seReq / seVal).toFixed(3);
        robustnessText = `To change the practical conclusion (${fromState} → ${toState}), the standard error would need to be increased by multiplying it by ${mult} (i.e. SE × ${mult}).`;
      } else {
        const div = (seVal / seReq).toFixed(3);
        robustnessText = `To change the practical conclusion (${fromState} → ${toState}), the standard error would need to be reduced by dividing it by ${div} (i.e. SE ÷ ${div}).`;
      }
    } else {
      const nRatio = (seVal / seReq) ** 2;
      if (seReq > seVal) {
        const inv = (1 / nRatio).toFixed(3);
        robustnessText = `To change the practical conclusion (${fromState} → ${toState}), the sample size would need to be reduced by dividing it by ${inv} (i.e. n ÷ ${inv}).`;
      } else {
        const fac = nRatio.toFixed(3);
        robustnessText = `To change the practical conclusion (${fromState} → ${toState}), the sample size would need to be increased by multiplying it by ${fac} (i.e. n × ${fac}).`;
      }
    }
  }
  
  let repText = "";
  if (!claimPossible) {
    repText = "No claim possible for the current tail hypothesis direction.";
  } else {
    repText = `${repProb.toFixed(3)} (probability that a replication with N = ${nRep} and effect size = ${observedEffect.toFixed(2)} finds ${testType === "Minimum-Effect Test" ? "a practically meaningful effect" : "equivalence"}).`;
  }
  
  document.getElementById('single-ci-explanation').innerHTML = `
    <p>${statSigText}</p>
    <p>${practicalConclusion}</p>
    <p><b><span class="has-tooltip">Threshold Alpha:<span class="info-icon">i</span><span class="tooltip-text">Quantifies the maximum nominal Type I error rate required to conclude a practically meaningful or practically negligible effect based on the observed data.</span></span></b> ${thresholdConclusion}</p>
    <p><b><span class="has-tooltip">Standard Error:<span class="info-icon">i</span><span class="tooltip-text">The standard error of the observed estimate reflecting sampling uncertainty.</span></span></b> ${seVal.toFixed(4)}</p>
    <p><b><span class="has-tooltip">Robustness Index:<span class="info-icon">i</span><span class="tooltip-text">Assesses how sensitive the practical conclusion (meaningful, negligible) is to changes in the standard error or sample size.</span></span></b> ${robustnessText}</p>
    <p><b><span class="has-tooltip">Replication Probability:<span class="info-icon">i</span><span class="tooltip-text">Estimates the probability that a replication study will yield a practically meaningful, practically negligible, or inconclusive outcome.</span></span></b> ${repText}</p>
  `;
}

// --- Single Bayes UI Logic & Calculation ---
function toggleSBSEMode(mode) {
  sbSEMode = mode;
  updateSBSEModeUI();
  
  // Sync to Frequentist
  sfSEMode = mode;
  updateSFSEModeUI();
  
  updateSingleFreqCalculations();
  updateSingleBayesCalculations();
}

function updateSBSEModeUI() {
  document.getElementById('btn-sb-se-mode-se').classList.toggle('active', sbSEMode === 'se');
  document.getElementById('btn-sb-se-mode-nsd').classList.toggle('active', sbSEMode === 'n_sd');
  
  document.getElementById('group-sb-se').style.display = sbSEMode === 'se' ? 'flex' : 'none';
  document.getElementById('group-sb-n-sd').style.display = sbSEMode === 'n_sd' ? 'flex' : 'none';
}

function onSBTestTypeChange() {
  const testType = document.getElementById('sb-test-type').value;
  const tailGroup = document.getElementById('group-sb-tail-type');
  
  if (testType === 'Minimum-Effect Test') {
    tailGroup.style.display = 'flex';
  } else {
    tailGroup.style.display = 'none';
  }
  
  // Sync to Frequentist
  document.getElementById('sf-test-type').value = testType;
  onSFTestTypeChange();
  
  updateSingleFreqCalculations();
  updateSingleBayesCalculations();
}

function updateSingleBayesCalculations() {
  const errBox = document.getElementById('error-message-sb');
  if (!errBox) return;
  errBox.style.display = 'none';
  errBox.innerHTML = '';
  
  const observedEffect = parseFloat(document.getElementById('sb-observed-effect').value);
  const seValInput = parseFloat(document.getElementById('sb-se').value);
  const nVal = parseInt(document.getElementById('sb-n').value);
  const sdVal = parseFloat(document.getElementById('sb-sd').value);
  const testType = document.getElementById('sb-test-type').value;
  const tail = document.getElementById('sb-tail-type').value;
  const sesoiLower = parseFloat(document.getElementById('sb-sesoi-lower').value);
  const sesoiUpper = parseFloat(document.getElementById('sb-sesoi-upper').value);
  const priorMean = parseFloat(document.getElementById('sb-prior-mean').value);
  const priorSD = parseFloat(document.getElementById('sb-prior-sd').value);
  
  const errors = [];
  if (isNaN(observedEffect)) errors.push("Please input Observed Effect.");
  
  let seVal = 0;
  if (sbSEMode === 'se') {
    if (isNaN(seValInput)) errors.push("Please input Standard Error.");
    else if (seValInput < 0) errors.push("Standard Error must be greater than or equal to 0.");
    seVal = seValInput;
  } else {
    if (isNaN(nVal) || isNaN(sdVal)) errors.push("Please input Sample Size and SD.");
    else {
      if (nVal <= 1) errors.push("Sample Size must be greater than 1.");
      if (sdVal < 0) errors.push("Standard Deviation must be greater than or equal to 0.");
    }
    seVal = sdVal / Math.sqrt(nVal);
  }
  
  if (isNaN(sesoiLower) || isNaN(sesoiUpper)) errors.push("Please input SESOI Lower and Upper Bounds.");
  else if (sesoiLower >= sesoiUpper) errors.push("SESOI Lower Bound must be less than Upper Bound.");
  
  if (isNaN(priorMean) || isNaN(priorSD) || priorSD <= 0) errors.push("Please enter prior mean and valid positive prior SD.");
  
  if (errors.length > 0) {
    errBox.style.display = 'block';
    errBox.innerHTML = `⚠️ <b>Please input valid values:</b><br>${errors.join('<br>')}`;
    document.getElementById('single-bayes-table-body').innerHTML = '';
    document.getElementById('single-bayes-explanation').innerHTML = '';
    return;
  }
  
  const bayesResult = calculateBayesianPosterior(observedEffect, seVal, priorMean, priorSD, sesoiLower, sesoiUpper, testType, tail, sbSEMode, sdVal, nVal);
  
  const ci95Lower = bayesResult.muPost - 1.96 * bayesResult.sigmaPost;
  const ci95Upper = bayesResult.muPost + 1.96 * bayesResult.sigmaPost;
  const ci90Lower = bayesResult.muPost - 1.645 * bayesResult.sigmaPost;
  const ci90Upper = bayesResult.muPost + 1.645 * bayesResult.sigmaPost;
  
  let tbodyBayes = `
    <tr>
      <td><span class="has-tooltip"><b>Posterior Mean</b> <span class="info-icon">i</span><span class="tooltip-text">The expected value (center) of the posterior effect size distribution after combining the prior distribution with the sample data.</span></span></td>
      <td><b>${bayesResult.muPost.toFixed(4)}</b></td>
    </tr>
    <tr>
      <td><span class="has-tooltip"><b>Posterior SD</b> <span class="info-icon">i</span><span class="tooltip-text">The standard deviation of the posterior distribution, quantifying remaining estimation uncertainty after observing data.</span></span></td>
      <td><b>${bayesResult.sigmaPost.toFixed(4)}</b></td>
    </tr>
    <tr>
      <td><span class="has-tooltip"><b>95% Credible Interval</b> <span class="info-icon">i</span><span class="tooltip-text">The central 95% Bayesian credible interval [Lower, Upper] for the true effect size.</span></span></td>
      <td>[${ci95Lower.toFixed(4)}, ${ci95Upper.toFixed(4)}]</td>
    </tr>
    <tr>
      <td><span class="has-tooltip"><b>90% Credible Interval</b> <span class="info-icon">i</span><span class="tooltip-text">The central 90% Bayesian credible interval [Lower, Upper] for the true effect size.</span></span></td>
      <td>[${ci90Lower.toFixed(4)}, ${ci90Upper.toFixed(4)}]</td>
    </tr>
    <tr>
      <td><span class="has-tooltip"><b>${bayesResult.quantityLabel}</b> <span class="info-icon">i</span><span class="tooltip-text">Quantifies the posterior probability that the true effect is practically meaningful or practically negligible, given the data and prior assumptions.</span></span></td>
      <td><b>${bayesResult.postProb.toFixed(4)}</b> (${(bayesResult.postProb * 100).toFixed(1)}%)</td>
    </tr>
    <tr>
      <td><span class="has-tooltip"><b>${bayesResult.bfLabel}</b> <span class="info-icon">i</span><span class="tooltip-text">Quantifies the relative evidence for the hypothesis that the effect is practically meaningful or equivalent compared to the alternative hypothesis, based on the ratio of posterior to prior odds.</span></span></td>
      <td><b>${bayesResult.bf.toFixed(3)}</b></td>
    </tr>
  `;
  document.getElementById('single-bayes-table-body').innerHTML = tbodyBayes;
  
  renderPosteriorPlot('posteriorPlotCanvas', observedEffect, seVal, priorMean, priorSD, sesoiLower, sesoiUpper, testType, tail, sbSEMode, sdVal, nVal, currentTheme === 'dark');
  
  let bayesTestText = "";
  const bfValStr = bayesResult.bf.toFixed(3);
  const probStr = bayesResult.postProb.toFixed(3);
  
  if (testType === "Minimum-Effect Test") {
    let boundsText = "";
    if (tail === "two") boundsText = `outside the SESOI (${sesoiLower} to ${sesoiUpper})`;
    else if (tail === "upper") boundsText = `greater than the upper SESOI bound (${sesoiUpper})`;
    else boundsText = `less than the lower SESOI bound (${sesoiLower})`;
    
    bayesTestText = `
      In the Bayesian minimum-effect test, the posterior distribution of the effect size (θ) combines your prior belief (gray dashed line) with the observed data (likelihood) to produce the posterior (blue line). The shaded area represents the probability that θ falls ${boundsText}. This probability is <b>${probStr}</b>, quantifying the evidence that the effect is practically meaningful in the tested direction.
      <br><br>
      <b><span class="has-tooltip">Interval Bayes Factor (BF10):<span class="info-icon">i</span><span class="tooltip-text">Quantifies the relative evidence that the true effect is practically meaningful compared to the alternative hypothesis, based on the ratio of posterior to prior odds.</span></span></b> The data are <b>${bfValStr} times more likely</b> under the hypothesis that the effect is practically meaningful (${boundsText}) compared to the hypothesis that it is not.
    `;
  } else {
    bayesTestText = `
      In the Bayesian equivalence test, the posterior distribution of the effect size (θ) combines your prior belief (gray dashed line) with the observed data (likelihood) to produce the posterior (blue line). The shaded area represents the probability that θ falls within the SESOI (${sesoiLower} to ${sesoiUpper}). This probability is <b>${probStr}</b>, quantifying the evidence that the effect is practically equivalent to zero.
      <br><br>
      <b><span class="has-tooltip">Interval Bayes Factor (BF01):<span class="info-icon">i</span><span class="tooltip-text">Quantifies the relative evidence that the true effect is practically equivalent (inside the SESOI) compared to the alternative hypothesis, based on the ratio of posterior to prior odds.</span></span></b> The data are <b>${bfValStr} times more likely</b> under the hypothesis that the effect is practically equivalent (inside the SESOI) compared to the hypothesis that it is not.
    `;
  }
  
  document.getElementById('single-bayes-explanation').innerHTML = `
    <p><b><span class="has-tooltip">Posterior Mean:<span class="info-icon">i</span><span class="tooltip-text">The expected value (center) of the posterior distribution.</span></span></b> ${bayesResult.muPost.toFixed(3)}</p>
    <p><b><span class="has-tooltip">Posterior SD:<span class="info-icon">i</span><span class="tooltip-text">The standard deviation of the posterior distribution.</span></span></b> ${bayesResult.sigmaPost.toFixed(3)}</p>
    <br>
    <p>${bayesTestText}</p>
  `;
}

// --- Meta-Analytic Spreadsheet Grid Logic ---
function renderMetaStudiesGrid() {
  const tbody = document.getElementById('grid-body');
  tbody.innerHTML = '';
  
  const dependent = document.getElementById('m-dependent-effects').checked;
  
  const headerRow = document.getElementById('grid-header-row');
  headerRow.innerHTML = `
    <th>Study Name</th>
    <th>Effect Size (y)</th>
    <th>Standard Error (SE)</th>
    <th>Sample Size (N)</th>
    ${dependent ? '<th>Group</th>' : ''}
  `;
  
  metaStudies.forEach((study, idx) => {
    const tr = document.createElement('tr');
    
    // Study name cell
    const tdName = document.createElement('td');
    const inputName = document.createElement('input');
    inputName.type = 'text';
    inputName.value = study.name;
    inputName.oninput = (e) => { 
      metaStudies[idx].name = e.target.value; 
      if (document.getElementById('meta-output-card').style.display === 'block') {
        updateMetaCalculations(); 
      }
    };
    tdName.appendChild(inputName);
    tr.appendChild(tdName);
    
    // Effect size cell
    const tdY = document.createElement('td');
    const inputY = document.createElement('input');
    inputY.type = 'number';
    inputY.step = '0.01';
    inputY.value = isNaN(study.y) ? '' : study.y;
    inputY.oninput = (e) => { 
      metaStudies[idx].y = parseFloat(e.target.value); 
      if (document.getElementById('meta-output-card').style.display === 'block') {
        updateMetaCalculations(); 
      }
    };
    tdY.appendChild(inputY);
    tr.appendChild(tdY);
    
    // SE cell
    const tdSE = document.createElement('td');
    const inputSE = document.createElement('input');
    inputSE.type = 'number';
    inputSE.step = '0.01';
    inputSE.min = '0';
    inputSE.value = isNaN(study.se) ? '' : study.se;
    inputSE.oninput = (e) => { 
      metaStudies[idx].se = parseFloat(e.target.value); 
      if (document.getElementById('meta-output-card').style.display === 'block') {
        updateMetaCalculations(); 
      }
    };
    tdSE.appendChild(inputSE);
    tr.appendChild(tdSE);
    
    // N cell
    const tdN = document.createElement('td');
    const inputN = document.createElement('input');
    inputN.type = 'number';
    inputN.step = '1';
    inputN.min = '2';
    inputN.value = isNaN(study.n) ? '' : study.n;
    inputN.oninput = (e) => { 
      metaStudies[idx].n = parseInt(e.target.value); 
      if (document.getElementById('meta-output-card').style.display === 'block') {
        updateMetaCalculations(); 
      }
    };
    tdN.appendChild(inputN);
    tr.appendChild(tdN);
    
    // Group cell
    if (dependent) {
      const tdG = document.createElement('td');
      const inputG = document.createElement('input');
      inputG.type = 'number';
      inputG.step = '1';
      inputG.value = isNaN(study.group) ? '' : study.group;
      inputG.oninput = (e) => { 
        metaStudies[idx].group = parseInt(e.target.value); 
        if (document.getElementById('meta-output-card').style.display === 'block') {
          updateMetaCalculations(); 
        }
      };
      tdG.appendChild(inputG);
      tr.appendChild(tdG);
    }
    
    tbody.appendChild(tr);
  });
}

function addMetaStudyRow() {
  const dependent = document.getElementById('m-dependent-effects').checked;
  const newRow = {
    name: `Study ${metaStudies.length + 1}`,
    y: NaN,
    se: NaN,
    n: NaN,
    group: dependent ? 1 : undefined
  };
  metaStudies.push(newRow);
  renderMetaStudiesGrid();
  
  if (document.getElementById('meta-output-card').style.display === 'block') {
    updateMetaCalculations();
  }
}

function removeLastMetaStudyRow() {
  if (metaStudies.length > 1) {
    metaStudies.pop();
    renderMetaStudiesGrid();
    
    if (document.getElementById('meta-output-card').style.display === 'block') {
      updateMetaCalculations();
    }
  }
}

function toggleDependentEffects() {
  const dependent = document.getElementById('m-dependent-effects').checked;
  
  metaStudies.forEach((study, idx) => {
    if (dependent) {
      if (study.group === undefined) {
        study.group = idx === 0 ? 1 : (idx === 1 ? 1 : 2);
      }
    } else {
      delete study.group;
    }
  });
  
  renderMetaStudiesGrid();
  
  if (document.getElementById('meta-output-card').style.display === 'block') {
    updateMetaCalculations();
  }
}

function toggleMetaMethod(method) {
  metaMethod = method;
  document.getElementById('btn-meta-reml').classList.toggle('active', method === 'REML');
  document.getElementById('btn-meta-fe').classList.toggle('active', method === 'FE');
  
  if (document.getElementById('meta-output-card').style.display === 'block') {
    updateMetaCalculations();
  }
}

function onMetaTestTypeChange() {
  const testType = document.getElementById('m-test-type').value;
  const tailGroup = document.getElementById('m-group-tail-type');
  if (testType === 'Minimum-Effect Test') {
    tailGroup.style.display = 'flex';
  } else {
    tailGroup.style.display = 'none';
  }
  
  if (document.getElementById('meta-output-card').style.display === 'block') {
    updateMetaCalculations();
  }
}

// Manual execute wrapper
function runMetaAnalysisAndShow() {
  const errBox = document.getElementById('error-message-meta');
  errBox.style.display = 'none';
  
  updateMetaCalculations();
  
  if (errBox.style.display === 'none') {
    const outputCard = document.getElementById('meta-output-card');
    outputCard.style.display = 'block';
    
    // Allow a short duration for the browser to reflow the layout and establish actual width
    setTimeout(() => {
      updateMetaCalculations();
      outputCard.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  }
}

// --- Meta tab calculations and visual outputs ---
function updateMetaCalculations() {
  const errBox = document.getElementById('error-message-meta');
  errBox.style.display = 'none';
  errBox.innerHTML = '';
  
  const testType = document.getElementById('m-test-type').value;
  const sesoiLower = parseFloat(document.getElementById('m-sesoi-lower').value);
  const sesoiUpper = parseFloat(document.getElementById('m-sesoi-upper').value);
  const dependent = document.getElementById('m-dependent-effects').checked;
  
  const errors = [];
  if (isNaN(sesoiLower) || isNaN(sesoiUpper)) errors.push("Please input SESOI Lower and Upper bounds.");
  else if (sesoiLower >= sesoiUpper) errors.push("SESOI Lower bound must be less than Upper bound.");
  
  const cleanStudies = [];
  metaStudies.forEach((s, idx) => {
    const studyNum = idx + 1;
    if (!s.name) errors.push(`Study ${studyNum}: Name is required.`);
    if (isNaN(s.y)) errors.push(`Study ${studyNum}: Enter valid Effect Size.`);
    if (isNaN(s.se) || s.se < 0) errors.push(`Study ${studyNum}: Enter valid non-negative Standard Error.`);
    if (isNaN(s.n) || s.n <= 1) errors.push(`Study ${studyNum}: Enter valid Sample Size > 1.`);
    if (dependent && isNaN(s.group)) errors.push(`Study ${studyNum}: Enter group number for dependent effects.`);
    
    if (errors.length === 0) {
      cleanStudies.push({
        name: s.name,
        y: s.y,
        se: s.se,
        n: s.n,
        group: s.group
      });
    }
  });
  
  if (errors.length > 0) {
    errBox.style.display = 'block';
    errBox.innerHTML = `⚠️ <b>Invalid Inputs:</b><br>${errors.join('<br>')}`;
    document.getElementById('meta-results-body').innerHTML = '';
    document.getElementById('meta-explanation').innerHTML = '';
    
    const canvas = document.getElementById('forestPlotCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    return;
  }
  
  const effects = cleanStudies.map(s => s.y);
  const ses = cleanStudies.map(s => s.se);
  const groups = cleanStudies.map(s => s.group);
  
  let result = null;
  const headerCol = document.getElementById('header-tau2-or-g');
  
  if (dependent) {
    result = solveMultilevelMetaAnalysis(effects, ses, groups);
    headerCol.innerHTML = "Sigma² (Group / Study)";
  } else {
    result = solveStandardMetaAnalysis(effects, ses, metaMethod);
    headerCol.innerHTML = "Tau²";
  }
  
  if (!result) return;
  
  const piLwrText = isNaN(result.piLower) ? "-" : result.piLower.toFixed(3);
  const piUprText = isNaN(result.piUpper) ? "-" : result.piUpper.toFixed(3);
  
  let varianceCellText = "-";
  if (dependent) {
    varianceCellText = `g: ${result.sigma2_g.toFixed(3)}<br>s: ${result.sigma2_s.toFixed(3)}`;
  } else {
    varianceCellText = result.tau2.toFixed(3);
  }
  
  document.getElementById('meta-results-body').innerHTML = `
    <tr>
      <td>${result.beta.toFixed(3)}</td>
      <td>${result.ci95Lower.toFixed(3)}</td>
      <td>${result.ci95Upper.toFixed(3)}</td>
      <td>${result.ci90Lower.toFixed(3)}</td>
      <td>${result.ci90Upper.toFixed(3)}</td>
      <td>${piLwrText}</td>
      <td>${piUprText}</td>
      <td>${result.se.toFixed(3)}</td>
      <td>${varianceCellText}</td>
    </tr>
  `;
  
  let practicalText = "";
  if (testType === "Minimum-Effect Test") {
    if (result.ci95Lower > sesoiUpper || result.ci95Upper < sesoiLower) {
      practicalText = "The pooled effect is practically meaningful.";
    } else if (result.ci90Lower >= sesoiLower && result.ci90Upper <= sesoiUpper) {
      practicalText = "The pooled effect is practically not relevant (equivalent).";
    } else {
      practicalText = "The practical conclusion for the pooled effect is inconclusive.";
    }
  } else {
    if (result.ci90Lower >= sesoiLower && result.ci90Upper <= sesoiUpper) {
      practicalText = "The pooled effect is practically equivalent / not relevant.";
    } else if (result.ci95Lower > sesoiUpper || result.ci95Upper < sesoiLower) {
      practicalText = "The pooled effect is practically meaningful.";
    } else {
      practicalText = "The practical conclusion for the pooled effect is inconclusive.";
    }
  }
  
  document.getElementById('meta-explanation').innerHTML = `
    <p><b>Meta-analytic Summary:</b></p>
    <p>Pooled Effect: <b>${result.beta.toFixed(3)}</b></p>
    <p>SE: <b>${result.se.toFixed(3)}</b></p>
    <p>SESOI Lower Bound: <b>${sesoiLower}</b></p>
    <p>SESOI Upper Bound: <b>${sesoiUpper}</b></p>
    <br>
    <p><b>Practical Conclusion:</b> ${practicalText}</p>
  `;
  
  drawForestPlot('forestPlotCanvas', cleanStudies, result, sesoiLower, sesoiUpper, currentTheme === 'dark');
}

// --- Introduction Tab helpers ---
function populateIntroTable() {
  const infoData = [
    { tool: "Threshold alpha", aim: "Quantifies the maximum nominal Type I error rate required to conclude a practically meaningful or practically negligible effect based on the observed data" },
    { tool: "Robustness index", aim: "Assesses how sensitive the practical conclusion (meaningful, negligible) is to changes in the standard error or sample size" },
    { tool: "Practical Relevance Replication Probability", aim: "Estimates the probability that a replication study will yield a practically meaningful, practically negligible, or inconclusive outcome" },
    { tool: "Bayesian posterior", aim: "Quantifies the posterior probability that the true effect is practically meaningful or practically negligible, given the data and prior assumptions" },
    { tool: "Interval Bayes Factor (BF)", aim: "Quantifies the relative evidence for the hypothesis that the effect is practically meaningful or practically equivalent compared to the alternative hypothesis, based on the ratio of posterior to prior odds" },
    { tool: "Meta-analytic procedure", aim: "Evaluates how adding future studies (with specified effect sizes, SEs, or sample sizes) would alter the meta-analytic conclusion regarding a practically meaningful or practically negligible effect" }
  ];
  
  const tbody = document.getElementById('intro-info-table-body');
  tbody.innerHTML = '';
  infoData.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td class="nowrap"><b>${item.tool}</b></td>
        <td>${item.aim}</td>
      </tr>
    `;
  });
}

// --- Global Floating Tooltip Helper (unclipped, viewport-clamped) ---
function initGlobalTooltips() {
  let tooltipEl = document.getElementById('global-app-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'global-app-tooltip';
    tooltipEl.className = 'global-floating-tooltip';
    document.body.appendChild(tooltipEl);
  }

  document.addEventListener('mouseover', (e) => {
    const trigger = e.target.closest('.has-tooltip');
    if (!trigger) return;

    let text = trigger.getAttribute('data-tooltip');
    if (!text) {
      const child = trigger.querySelector('.tooltip-text');
      if (child) text = child.innerText || child.textContent;
    }
    if (!text || !text.trim()) return;

    tooltipEl.textContent = text.trim();
    tooltipEl.style.display = 'block';
    tooltipEl.style.opacity = '1';

    const rect = trigger.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    // Position above target by default
    let top = rect.top - tooltipRect.height - 8;
    // If too close to top of viewport, position below target
    if (top < 10) {
      top = rect.bottom + 8;
    }

    // Center horizontally on target
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    // Clamp to viewport edges with padding
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;
  });

  document.addEventListener('mouseout', (e) => {
    const trigger = e.target.closest('.has-tooltip');
    if (!trigger) return;
    if (tooltipEl) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.display = 'none';
    }
  });
}

// --- Citation Dropdown & Copy Helpers ---
const citationFormats = {
  apa: `Riesthuis, P., Cribbie, R. A., Celio, V., & Beribisky, N. (2026). Decisions under Uncertainty: A Statistical Framework for Evaluating Practical Relevance in Interval-Based Hypothesis Testing. <i>OSF Preprints</i>. https://osf.io/tsjgh_v1`,
  chicago: `Riesthuis, Paul, Robert A. Cribbie, Victoria Celio, and Nataly Beribisky. 2026. “Decisions under Uncertainty: A Statistical Framework for Evaluating Practical Relevance in Interval-Based Hypothesis Testing.” <i>OSF Preprints</i>. https://osf.io/tsjgh_v1.`,
  harvard: `Riesthuis, P., Cribbie, R.A., Celio, V. and Beribisky, N. (2026) ‘Decisions under Uncertainty: A Statistical Framework for Evaluating Practical Relevance in Interval-Based Hypothesis Testing’, <i>OSF Preprints</i>. Available at: https://osf.io/tsjgh_v1.`,
  mla: `Riesthuis, Paul, Robert A. Cribbie, Victoria Celio, and Nataly Beribisky. “Decisions under Uncertainty: A Statistical Framework for Evaluating Practical Relevance in Interval-Based Hypothesis Testing.” <i>OSF Preprints</i>, 2026, osf.io/tsjgh_v1.`,
  vancouver: `Riesthuis P, Cribbie RA, Celio V, Beribisky N. Decisions under Uncertainty: A Statistical Framework for Evaluating Practical Relevance in Interval-Based Hypothesis Testing. OSF Preprints; 2026. Available from: https://osf.io/tsjgh_v1.`
};

function onCitationStyleChange() {
  const select = document.getElementById('citation-style-select');
  const display = document.getElementById('citation-text-display');
  if (!select || !display) return;
  const style = select.value;
  display.innerHTML = citationFormats[style] || citationFormats.apa;
}

function copyActiveCitation(btn) {
  const display = document.getElementById('citation-text-display');
  if (!display) return;
  const text = display.innerText || display.textContent;
  navigator.clipboard.writeText(text.trim()).then(() => {
    const span = btn.querySelector('span');
    if (span) {
      const orig = span.textContent;
      span.textContent = 'Copied!';
      btn.style.borderColor = 'var(--primary)';
      btn.style.color = 'var(--primary)';
      setTimeout(() => {
        span.textContent = orig;
        btn.style.borderColor = 'var(--border-color)';
        btn.style.color = 'var(--text-main)';
      }, 2000);
    }
  }).catch(() => {
    // Fallback for non-HTTPS or permission blocked
    const textarea = document.createElement('textarea');
    textarea.value = text.trim();
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    const span = btn.querySelector('span');
    if (span) {
      const orig = span.textContent;
      span.textContent = 'Copied!';
      setTimeout(() => { span.textContent = orig; }, 2000);
    }
  });
}

/**
 * Toggle Collapsible Guide Cards (Accordion Style)
 */
function toggleCollapsible(headerEl) {
  const card = headerEl.closest('.collapsible-card');
  if (!card) return;
  const body = card.querySelector('.collapsible-body');
  const badge = card.querySelector('.collapsible-badge');
  const chevron = card.querySelector('.chevron-icon');
  
  const isHidden = !body.style.display || body.style.display === 'none';
  if (isHidden) {
    body.style.display = 'block';
    if (badge) badge.textContent = 'Hide Instructions';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  } else {
    body.style.display = 'none';
    if (badge) badge.textContent = 'Show Instructions';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
}

