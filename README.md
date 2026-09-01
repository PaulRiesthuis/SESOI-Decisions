# Decisions under Uncertainty: SESOI Decisions Web Application

[![OSF Preprints](https://img.shields.io/badge/OSF-Preprint%20%26%20Materials-blue.svg)](https://osf.io/tsjgh_v1)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An interactive web application implementing the statistical framework from **Riesthuis et al. (2026)**: *“Decisions under Uncertainty: A Statistical Framework for Evaluating Practical Relevance in Interval-Based Hypothesis Testing”*.

This application provides researchers with intuitive, rigorous tools to evaluate practical relevance, quantify uncertainty, calculate robustness indices, and simulate hypothetical future studies within both **Frequentist** and **Bayesian** interval-based testing paradigms.

---

## 🌟 Key Features

### 1. Interactive Introduction & Concept Explorer
- **Interactive Ridgeline Visualization**: Explore simulated raw effect estimates in real time against user-defined Smallest Effect Size of Interest (SESOI) boundaries.
- **Dynamic Decision Rules**: Demonstrates interval-based outcomes (Practically Meaningful, Practically Equivalent, or Inconclusive) under both one-tailed ($90\%$ CI) and two-tailed ($95\%$ CI / TOST) criteria.
- **Citation Generator**: 1-click citation export formatted in APA (7th), Chicago, Harvard, MLA, and Vancouver styles.

### 2. Single Study Estimates (Frequentist)
- **Flexible Data Entry**: Supply sample uncertainty directly as Standard Error ($\text{SE}$) or as Sample Size ($N$) and Standard Deviation ($\text{SD}$).
- **Interval Test Types**: Minimum-Effect Tests (Two-Tailed, One-Tailed Upper, One-Tailed Lower) and Equivalence Tests (TOST).
- **Threshold Alpha ($\alpha_{\text{threshold}}$)**: Computes the exact maximum Type I error rate required to conclude practical relevance or equivalence.
- **Robustness Index ($\text{RI}$)**: Evaluates how many times the standard error (or sample size) would need to change to alter the practical conclusion.
- **Replication Probability**: Estimates the probability that a future replication study will successfully demonstrate practical relevance.

### 3. Single Study Estimates (Bayesian)
- **Conjugate Normal Updating**: Combines sample likelihood with a normal prior $\mathcal{N}(\mu_0, \sigma_0^2)$ to compute the posterior distribution $\mathcal{N}(\mu_{\text{post}}, \sigma_{\text{post}}^2)$.
- **Posterior Quantities**: Displays the Posterior Mean, Posterior SD, $90\%$ & $95\%$ Bayesian Credible Intervals.
- **Posterior Probability**: Quantifies the posterior probability mass falling inside or outside the SESOI interval ($P(\theta \text{ outside SESOI})$, $P(\theta > \text{SESOI}_{\text{upper}})$, or $P(\theta < \text{SESOI}_{\text{lower}})$).
- **Interval Bayes Factor ($\text{BF}_{10} / \text{BF}_{01}$)**: Computes the relative evidence ratio for practical relevance versus equivalence via Savage–Dickey density and odds ratios.

### 4. Meta-Analytic Sensitivity & Future Studies
- **Interactive Studies Spreadsheet**: Add, edit, or remove published studies with real-time effect size ($y$), $\text{SE}$, and sample size ($N$).
- **Fixed-Effects & Random-Effects (REML)**: Pooled effect estimation using Restricted Maximum Likelihood.
- **Multilevel / Dependent Effects**: Built-in support for clustered effect sizes from the same paper/lab.
- **Forest Plot Visualization**: High-DPI canvas forest plot featuring $95\%$ Confidence Intervals, $95\%$ Prediction Intervals ($\text{PI}$), and edge-clamped interactive hover tooltips.
- **Future Study Simulations**: Add one or more planned replication studies to test if future data can overturn an inconclusive meta-analytic result.

---

## 🚀 Quick Start (Running Locally)

This project is built using pure vanilla web technologies (HTML5, CSS3, and modern ES6+ JavaScript) with **zero build steps or external dependencies** required.

### Option A: Open directly in your browser
Simply double-click [`index.html`](index.html) or right-click and choose **Open with > Chrome / Firefox / Edge / Safari**.

### Option B: Run with a local HTTP server
Using Python:
```bash
# Python 3
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.

Using Node.js:
```bash
npx serve .
```

## 📁 Repository Structure

```
.
├── index.html        # Main application structure, layouts, and modals
├── styles.css        # Modern design system (light/dark mode, responsive grid, tooltips)
├── app.js            # UI controllers, event bindings, sync logic, and citation formats
├── plots.js          # High-DPI Canvas routines (Ridgeline, Forest Plot, Chart.js configs)
├── stats.js          # Core statistical calculations (CI, Alpha Threshold, RI, Bayesian, REML)
├── test_stats.js     # Verification and regression test suite
└── README.md         # Documentation & setup guide
```

---

## 📖 Citation

If you use this framework, statistical methods, or web application in your research, please cite:

```text
Riesthuis, P., Cribbie, R. A., Celio, V., & Beribisky, N. (2026). Decisions under Uncertainty: A Statistical Framework for Evaluating Practical Relevance in Interval-Based Hypothesis Testing. OSF Preprints. https://osf.io/tsjgh_v1
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
