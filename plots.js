// plots.js - Visualization routines for SESOI Decisions Web Application

/**
 * Setup a high-DPI canvas to prevent blurriness
 */
function setupCanvas(canvas, height) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  canvas.style.width = '100%';
  canvas.style.height = height + 'px';
  
  // Read true layout width of canvas stretched to 100% of card parent
  const width = canvas.clientWidth || canvas.parentElement.clientWidth || 800;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  ctx.scale(dpr, dpr);
  return { ctx, width };
}

/**
 * Renders the introductory Ridgeline Plot (DemoGraph) on a canvas with hover interactivity
 */
function drawRidgelinePlot(canvasId, isDarkTheme = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  canvas.isDarkTheme = isDarkTheme;
  
  if (!canvas.hasIntroListener) {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mX = e.clientX - rect.left;
      const mY = e.clientY - rect.top;
      
      canvas.hoverX = mX;
      canvas.hoverY = mY;
      canvas.isHovering = true;
      
      renderRidgelinePlotWithHover(canvas);
    });
    
    canvas.addEventListener('mouseleave', () => {
      canvas.isHovering = false;
      renderRidgelinePlotWithHover(canvas);
    });
    
    canvas.hasIntroListener = true;
  }
  
  renderRidgelinePlotWithHover(canvas);
}

/**
 * Perform actual rendering of the Ridgeline Plot
 */
function renderRidgelinePlotWithHover(canvas) {
  const isDarkTheme = canvas.isDarkTheme;
  const height = 450; 
  const { ctx, width } = setupCanvas(canvas, height);
  
  // Modern Palette
  const textCol = isDarkTheme ? '#f1f5f9' : '#1e293b';
  const textMuted = isDarkTheme ? '#64748b' : '#94a3b8';
  const bgCol = isDarkTheme ? '#0f172a' : '#ffffff';
  
  const colorGreen = isDarkTheme ? 'rgba(16, 185, 129, 0.7)' : 'rgba(52, 211, 153, 0.85)';
  const colorRed = isDarkTheme ? 'rgba(239, 68, 68, 0.6)' : 'rgba(248, 113, 113, 0.75)';
  const colorGray = isDarkTheme ? 'rgba(71, 85, 105, 0.55)' : 'rgba(203, 213, 225, 0.65)';
  
  ctx.fillStyle = bgCol;
  ctx.fillRect(0, 0, width, height);
  
  const margin = { top: 60, right: 60, bottom: 75, left: 190 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  
  const xMin = -10, xMax = 15;
  const getX = (val) => margin.left + ((val - xMin) / (xMax - xMin)) * plotWidth;
  
  // Spaced out ridge base lines
  const yRidge2 = margin.top + plotHeight * 0.28; // Ridge 2 (top)
  const yRidge1 = margin.top + plotHeight * 0.70; // Ridge 1 (bottom)
  
  const sesoiLower = -5;
  const sesoiUpper = 5;
  const nullEffect = 0;
  
  const drawVerticalDashed = (val, color, isDashed = true) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    if (isDashed) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(getX(val), margin.top - 20);
    ctx.lineTo(getX(val), margin.top + plotHeight + 15);
    ctx.stroke();
    ctx.restore();
  };
  
  // Reference dashed lines
  drawVerticalDashed(nullEffect, isDarkTheme ? '#475569' : '#cbd5e1', true);
  drawVerticalDashed(sesoiLower, 'rgba(239, 68, 68, 0.55)', true);
  drawVerticalDashed(sesoiUpper, 'rgba(239, 68, 68, 0.55)', true);
  
  const normalPDF = (x, mean, sd) => Math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
  
  const drawRidge = (mean, sd, yBase, label) => {
    const scaleY = 180;
    const steps = 300;
    const q025 = mean - 1.96 * sd;
    const q05 = mean - 1.645 * sd;
    const q95 = mean + 1.645 * sd;
    const q975 = mean + 1.96 * sd;
    
    const fillRegions = [
      { start: xMin, end: q025, color: colorGray },
      { start: q025, end: q05, color: colorRed },
      { start: q05, end: q95, color: colorGreen },
      { start: q95, end: q975, color: colorRed },
      { start: q975, end: xMax, color: colorGray }
    ];
    
    fillRegions.forEach(reg => {
      ctx.fillStyle = reg.color;
      ctx.beginPath();
      ctx.moveTo(getX(reg.start), yBase);
      
      const segmentSteps = Math.ceil(((reg.end - reg.start) / (xMax - xMin)) * steps);
      for (let i = 0; i <= segmentSteps; i++) {
        const xVal = reg.start + (i / segmentSteps) * (reg.end - reg.start);
        const yVal = yBase - normalPDF(xVal, mean, sd) * scaleY;
        ctx.lineTo(getX(xVal), yVal);
      }
      ctx.lineTo(getX(reg.end), yBase);
      ctx.closePath();
      ctx.fill();
    });
    
    ctx.strokeStyle = isDarkTheme ? '#818cf8' : '#4f46e5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const xVal = xMin + (i / steps) * (xMax - xMin);
      const yVal = yBase - normalPDF(xVal, mean, sd) * scaleY;
      if (i === 0) ctx.moveTo(getX(xVal), yVal);
      else ctx.lineTo(getX(xVal), yVal);
    }
    ctx.stroke();
    
    ctx.strokeStyle = textCol;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(getX(xMin), yBase);
    ctx.lineTo(getX(xMax), yBase);
    ctx.stroke();
    
    ctx.fillStyle = textCol;
    ctx.font = `700 14px var(--font-title)`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, margin.left - 20, yBase - 15);
  };
  
  drawRidge(5.5, 0.75, yRidge2, "Inconclusive Outcome 1");
  drawRidge(4.5, 0.75, yRidge1, "Inconclusive Outcome 2");
  
  const drawArrowAndText = (text, xTarget, xText, y) => {
    ctx.save();
    
    ctx.strokeStyle = textCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(getX(xText), y);
    ctx.lineTo(getX(xTarget), y);
    ctx.stroke();
    
    const headLen = 6;
    const angle = xTarget > xText ? 0 : Math.PI;
    ctx.fillStyle = textCol;
    ctx.beginPath();
    ctx.moveTo(getX(xTarget), y);
    ctx.lineTo(getX(xTarget) - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(getX(xTarget) - headLen * Math.cos(angle + Math.PI / 6), y + headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    
    const lines = text.split('\n');
    ctx.font = `600 12px var(--font-body)`;
    const textWidth = Math.max(ctx.measureText(lines[0]).width, ctx.measureText(lines[1]).width);
    
    ctx.fillStyle = isDarkTheme ? '#0f172a' : '#ffffff';
    ctx.fillRect(getX(xText) - textWidth / 2 - 6, y - 22, textWidth + 12, 34);
    
    ctx.fillStyle = textCol;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lines[0], getX(xText), y - 12);
    ctx.fillText(lines[1], getX(xText), y + 4);
    
    ctx.restore();
  };
  
  drawArrowAndText("Lower bound\nSESOI (-5)", sesoiLower, -2.5, yRidge2 - 40);
  drawArrowAndText("Upper bound\nSESOI (5)", sesoiUpper, 2.5, yRidge2 - 40);
  
  ctx.fillStyle = isDarkTheme ? '#34d399' : '#10b981';
  ctx.font = `bold 12px var(--font-body)`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText("90% CI", getX(7.5), yRidge2 - 25);

  ctx.fillStyle = isDarkTheme ? '#f87171' : '#ef4444';
  ctx.font = `bold 12px var(--font-body)`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText("95% CI", getX(7.5), yRidge2 - 10);
  
  // Interactive Hover guide overlay
  if (canvas.isHovering && canvas.hoverX >= margin.left && canvas.hoverX <= margin.left + plotWidth) {
    const mX = canvas.hoverX;
    const mY = canvas.hoverY;
    
    const xHover = xMin + ((mX - margin.left) / plotWidth) * (xMax - xMin);
    
    const lb90 = xHover - 1.645 * 0.75;
    const ub90 = xHover + 1.645 * 0.75;
    const lb95 = xHover - 1.96 * 0.75;
    const ub95 = xHover + 1.96 * 0.75;
    
    // Evaluate Decision Rules:
    // Two-Tailed Minimum-Effect Test (alpha = 0.05) uses 95% CI:
    const isMeaningful2T = (lb95 > 5.0 || ub95 < -5.0);
    // One-Tailed Minimum-Effect Test (alpha = 0.05) uses 90% CI:
    const isMeaningful1T = (lb90 > 5.0 || ub90 < -5.0);
    // Equivalence Test (TOST, alpha = 0.05) uses 90% CI:
    const isEquivalent = (lb90 > -5.0 && ub90 < 5.0);
    
    let statusHeader = "";
    let outcomeColor = "";
    if (isMeaningful2T) {
      statusHeader = "Practically Meaningful (1-T & 2-T)";
      outcomeColor = isDarkTheme ? '#34d399' : '#10b981'; // Green
    } else if (isMeaningful1T) {
      statusHeader = "Meaningful (1-Tailed Only)";
      outcomeColor = isDarkTheme ? '#34d399' : '#059669'; // Emerald
    } else if (isEquivalent) {
      statusHeader = "Practically Equivalent";
      outcomeColor = isDarkTheme ? '#60a5fa' : '#2563eb'; // Blue
    } else {
      statusHeader = "Inconclusive Result";
      outcomeColor = isDarkTheme ? '#fb923c' : '#ea580c'; // Orange
    }
    
    // Dotted guide line
    ctx.save();
    ctx.strokeStyle = outcomeColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(mX, margin.top - 15);
    ctx.lineTo(mX, margin.top + plotHeight + 20);
    ctx.stroke();
    ctx.restore();
    
    // Draw horizontal simulated CIs
    const yCI = yRidge1 + 35;
    ctx.save();
    
    // 95% CI (Red)
    ctx.strokeStyle = isDarkTheme ? '#f87171' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(getX(lb95), yCI + 4);
    ctx.lineTo(getX(ub95), yCI + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(getX(lb95), yCI + 1); ctx.lineTo(getX(lb95), yCI + 7);
    ctx.moveTo(getX(ub95), yCI + 1); ctx.lineTo(getX(ub95), yCI + 7);
    ctx.stroke();
    
    // 90% CI (Green)
    ctx.strokeStyle = isDarkTheme ? '#34d399' : '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(getX(lb90), yCI - 4);
    ctx.lineTo(getX(ub90), yCI - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(getX(lb90), yCI - 8); ctx.lineTo(getX(lb90), yCI);
    ctx.moveTo(getX(ub90), yCI - 8); ctx.lineTo(getX(ub90), yCI);
    ctx.stroke();
    
    // Observed Mean circle node
    ctx.fillStyle = outcomeColor;
    ctx.beginPath();
    ctx.arc(mX, yCI, 4.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = textMuted;
    ctx.font = 'bold 9px var(--font-body)';
    ctx.textAlign = 'right';
    ctx.fillText("Simulated 95% CI", getX(lb95) - 8, yCI + 7);
    ctx.fillText("Simulated 90% CI", getX(lb90) - 8, yCI - 2);
    
    ctx.restore();
    
    // Tooltip window
    const lines = [
      `Simulated Effect: ${xHover.toFixed(2)}`,
      `90% CI: [${lb90.toFixed(2)}, ${ub90.toFixed(2)}]`,
      `95% CI: [${lb95.toFixed(2)}, ${ub95.toFixed(2)}]`,
      `2-Tailed (95% CI): ${isMeaningful2T ? "Meaningful" : "Inconclusive"}`,
      `1-Tailed (90% CI): ${isMeaningful1T ? "Meaningful" : "Inconclusive"}`,
      `Equivalence (90% CI): ${isEquivalent ? "Equivalent" : "Inconclusive"}`
    ];
    
    const tooltipWidth = 245;
    const tooltipHeight = 125;
    const tooltipX = mX + 15 + tooltipWidth > width ? mX - tooltipWidth - 15 : mX + 15;
    const tooltipY = mY - 30 < 15 ? 15 : (mY - 30 > height - tooltipHeight - 15 ? height - tooltipHeight - 15 : mY - 30);
    
    drawTooltipWithStatus(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, lines, outcomeColor, isDarkTheme);
  }
  
  // Draw X Axis
  ctx.strokeStyle = textCol;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  ctx.stroke();
  
  const ticks = [-10, -5, 0, 5, 10, 15];
  ctx.fillStyle = textCol;
  ctx.font = `500 12px var(--font-body)`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  ticks.forEach(tick => {
    const x = getX(tick);
    ctx.beginPath();
    ctx.moveTo(x, margin.top + plotHeight);
    ctx.lineTo(x, margin.top + plotHeight + 6);
    ctx.stroke();
    ctx.fillText(tick.toString(), x, margin.top + plotHeight + 10);
  });
  
  ctx.font = `700 14px var(--font-title)`;
  ctx.fillText("Raw Mean Difference", margin.left + plotWidth / 2, margin.top + plotHeight + 38);
}

/**
 * Draw interactive status tooltip overlay
 */
function drawTooltipWithStatus(ctx, x, y, width, height, lines, statusColor, isDarkTheme) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  
  ctx.fillStyle = isDarkTheme ? 'rgba(30, 41, 59, 0.96)' : 'rgba(255, 255, 255, 0.96)';
  ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 1;
  
  const r = 8;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.shadowColor = 'transparent';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  lines.forEach((line, i) => {
    if (i === 0) {
      ctx.fillStyle = statusColor;
      ctx.font = '700 12px var(--font-title)';
    } else if (i === lines.length - 1) {
      ctx.fillStyle = statusColor;
      ctx.font = 'bold 11px var(--font-body)';
    } else {
      ctx.fillStyle = isDarkTheme ? '#cbd5e1' : '#475569';
      ctx.font = '500 11px var(--font-body)';
    }
    ctx.fillText(line, x + 12, y + 10 + i * 18);
  });
  ctx.restore();
}

/**
 * Global cache of active Forest plot data for hover support
 */
let lastForestPlotCache = null;

/**
 * Draws the Meta-Analysis Forest Plot on a canvas with hover support
 */
function drawForestPlot(canvasId, studies, pooledResult, sesoiLower, sesoiUpper, isDarkTheme = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const k = studies.length;
  const rowHeight = 40; 
  const height = 140 + k * rowHeight; 
  
  const { ctx, width } = setupCanvas(canvas, height);
  
  const textCol = isDarkTheme ? '#f1f5f9' : '#1e293b';
  const textMuted = isDarkTheme ? '#64748b' : '#94a3b8';
  const gridCol = isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const bgCol = isDarkTheme ? '#0f172a' : '#ffffff';
  
  const leftMargin = Math.max(190, Math.min(250, Math.round(width * 0.23)));
  const rightMargin = Math.max(210, Math.min(270, Math.round(width * 0.25)));
  const margin = { top: 70, right: rightMargin, bottom: 65, left: leftMargin }; 
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  
  let allVals = [0, sesoiLower, sesoiUpper];
  studies.forEach(s => {
    allVals.push(s.y);
    allVals.push(s.y - 1.96 * s.se);
    allVals.push(s.y + 1.96 * s.se);
  });
  if (pooledResult) {
    allVals.push(pooledResult.beta);
    allVals.push(pooledResult.ci95Lower);
    allVals.push(pooledResult.ci95Upper);
    if (!isNaN(pooledResult.piLower)) {
      allVals.push(pooledResult.piLower);
      allVals.push(pooledResult.piUpper);
    }
  }
  
  let xMin = Math.min(...allVals);
  let xMax = Math.max(...allVals);
  
  // Enforce minimum X range of 3.0 to prevent extreme zooming
  let range = xMax - xMin;
  if (range < 3.0) {
    const pad = (3.0 - range) / 2;
    xMin -= pad;
    xMax += pad;
  } else {
    xMin -= range * 0.15;
    xMax += range * 0.15;
  }
  
  const getX = (val) => margin.left + ((val - xMin) / (xMax - xMin)) * plotWidth;
  
  const cache = {
    canvasId,
    studies: JSON.parse(JSON.stringify(studies)),
    pooledResult: pooledResult ? JSON.parse(JSON.stringify(pooledResult)) : null,
    sesoiLower,
    sesoiUpper,
    isDarkTheme,
    width,
    height,
    margin,
    rowHeight,
    plotWidth,
    plotHeight,
    xMin,
    xMax,
    getX,
    hoveredIndex: -1,
    mouseX: 0,
    mouseY: 0
  };
  
  lastForestPlotCache = cache;
  
  if (!canvas.hasForestListener) {
    canvas.addEventListener('mousemove', (e) => {
      if (!lastForestPlotCache) return;
      
      const rect = canvas.getBoundingClientRect();
      const mX = (e.clientX - rect.left);
      const mY = (e.clientY - rect.top);
      
      let hoveredIdx = -1;
      const kStudies = lastForestPlotCache.studies.length;
      
      for (let i = 0; i < kStudies; i++) {
        const rowY = lastForestPlotCache.margin.top + i * lastForestPlotCache.rowHeight + 15;
        if (Math.abs(mY - rowY) < lastForestPlotCache.rowHeight / 2) {
          hoveredIdx = i;
          break;
        }
      }
      
      const pooledRowY = lastForestPlotCache.margin.top + kStudies * lastForestPlotCache.rowHeight + 25;
      if (Math.abs(mY - pooledRowY) < lastForestPlotCache.rowHeight / 2) {
        hoveredIdx = -2;
      }
      
      lastForestPlotCache.hoveredIndex = hoveredIdx;
      lastForestPlotCache.mouseX = mX;
      lastForestPlotCache.mouseY = mY;
      
      renderForestPlotFromCache(lastForestPlotCache);
    });
    
    canvas.addEventListener('mouseleave', () => {
      if (!lastForestPlotCache) return;
      lastForestPlotCache.hoveredIndex = -1;
      renderForestPlotFromCache(lastForestPlotCache);
    });
    
    canvas.hasForestListener = true;
  }
  
  renderForestPlotFromCache(cache);
}

/**
 * Redraws the forest plot using caching parameters
 */
function renderForestPlotFromCache(cache) {
  const canvas = document.getElementById(cache.canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const { studies, pooledResult, sesoiLower, sesoiUpper, isDarkTheme, width, height, margin, rowHeight, plotWidth, plotHeight, xMin, xMax, getX } = cache;
  
  const textCol = isDarkTheme ? '#f1f5f9' : '#1e293b';
  const textMuted = isDarkTheme ? '#64748b' : '#94a3b8';
  const gridCol = isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const bgCol = isDarkTheme ? '#0f172a' : '#ffffff';
  
  ctx.fillStyle = bgCol;
  ctx.fillRect(0, 0, width, height);
  
  // Nice round ticks
  const ticks = [];
  const span = xMax - xMin;
  const tickStep = span > 6 ? 1.0 : 0.5;
  const startTick = Math.ceil(xMin / tickStep) * tickStep;
  for (let t = startTick; t <= xMax; t += tickStep) {
    ticks.push(t);
  }
  
  // Grid lines
  ctx.strokeStyle = gridCol;
  ctx.lineWidth = 1;
  ticks.forEach(val => {
    ctx.beginPath();
    ctx.moveTo(getX(val), margin.top - 10);
    ctx.lineTo(getX(val), margin.top + plotHeight);
    ctx.stroke();
  });
  
  // Hover highlight
  if (cache.hoveredIndex >= 0) {
    const yRow = margin.top + cache.hoveredIndex * rowHeight + 15;
    ctx.fillStyle = isDarkTheme ? 'rgba(99, 102, 241, 0.08)' : 'rgba(59, 130, 246, 0.05)';
    ctx.fillRect(0, yRow - rowHeight / 2, width, rowHeight);
  } else if (cache.hoveredIndex === -2 && pooledResult) {
    const yRow = margin.top + studies.length * rowHeight + 25;
    ctx.fillStyle = isDarkTheme ? 'rgba(99, 102, 241, 0.08)' : 'rgba(59, 130, 246, 0.05)';
    ctx.fillRect(0, yRow - rowHeight / 2, width, rowHeight + 25);
  }
  
  // Column dividers
  ctx.strokeStyle = isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 1.2;
  
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top - 25);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(width - margin.right, margin.top - 25);
  ctx.lineTo(width - margin.right, margin.top + plotHeight);
  ctx.stroke();
  
  // Vertical reference lines
  const drawVLine = (val, color, widthSize = 1, isDashed = true, label = "") => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = widthSize;
    if (isDashed) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(getX(val), margin.top - 10);
    ctx.lineTo(getX(val), margin.top + plotHeight + 5);
    ctx.stroke();
    
    if (label) {
      ctx.setLineDash([]);
      ctx.fillStyle = isDarkTheme ? '#f87171' : '#dc2626';
      ctx.font = 'bold 9px var(--font-body)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, getX(val), margin.top - 12);
    }
    ctx.restore();
  };
  
  drawVLine(0, textMuted, 1, false);
  if (!isNaN(sesoiLower)) drawVLine(sesoiLower, 'rgba(239, 68, 68, 0.65)', 1.2, true, "SESOI Lower");
  if (!isNaN(sesoiUpper)) drawVLine(sesoiUpper, 'rgba(239, 68, 68, 0.65)', 1.2, true, "SESOI Upper");
  
  // Column Headers
  ctx.fillStyle = textMuted;
  ctx.font = `700 11px var(--font-title)`;
  ctx.textBaseline = 'bottom';
  
  ctx.textAlign = 'left';
  ctx.fillText("Study / Model", 25, margin.top - 15);
  
  ctx.textAlign = 'right';
  ctx.fillText("Effect Size [95% CI]", width - 25, margin.top - 15);
  
  // Study rows
  ctx.fillStyle = textCol;
  
  studies.forEach((s, idx) => {
    const y = margin.top + idx * rowHeight + 15;
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 13px var(--font-title)`;
    ctx.fillStyle = cache.hoveredIndex === idx ? '#3b82f6' : textCol;
    ctx.fillText(s.name, 25, y, margin.left - 45);
    
    const ciLb = s.y - 1.96 * s.se;
    const ciUb = s.y + 1.96 * s.se;
    
    ctx.strokeStyle = cache.hoveredIndex === idx ? '#3b82f6' : textCol;
    ctx.lineWidth = cache.hoveredIndex === idx ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(getX(ciLb), y);
    ctx.lineTo(getX(ciUb), y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(getX(ciLb), y, 2.5, 0, 2 * Math.PI);
    ctx.arc(getX(ciUb), y, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    const sqSize = s.n ? Math.max(7, Math.min(14, Math.sqrt(s.n) * 1.15)) : 8;
    ctx.fillStyle = cache.hoveredIndex === idx ? '#6366f1' : '#3b82f6';
    ctx.beginPath();
    ctx.arc(getX(s.y), y, sqSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    
    ctx.fillStyle = textCol;
    ctx.font = `500 13px var(--font-body)`;
    ctx.textAlign = 'right';
    ctx.fillText(`${s.y.toFixed(2)} [${ciLb.toFixed(2)}, ${ciUb.toFixed(2)}]`, width - 25, y);
  });
  
  // Pooled estimate
  if (pooledResult) {
    const y = margin.top + studies.length * rowHeight + 25;
    
    ctx.fillStyle = cache.hoveredIndex === -2 ? '#6366f1' : textCol;
    ctx.font = `bold 13px var(--font-title)`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(pooledResult.method === "FE" ? "Fixed-Effects Model" : "Random-Effects Model", 25, y, margin.left - 45);
    
    const mean = pooledResult.beta;
    const lb = pooledResult.ci95Lower;
    const ub = pooledResult.ci95Upper;
    
    ctx.save();
    ctx.fillStyle = cache.hoveredIndex === -2 ? '#8b5cf6' : '#6366f1';
    ctx.beginPath();
    ctx.moveTo(getX(lb), y);
    ctx.lineTo(getX(mean), y - 6);
    ctx.lineTo(getX(ub), y);
    ctx.lineTo(getX(mean), y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = textCol;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    
    if (!isNaN(pooledResult.piLower)) {
      const yPI = y + 18;
      ctx.fillStyle = textMuted;
      ctx.font = `bold 11px var(--font-body)`;
      ctx.fillText("95% Prediction Interval", 25, yPI, margin.left - 45);
      
      ctx.strokeStyle = isDarkTheme ? '#818cf8' : '#4f46e5';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(getX(pooledResult.piLower), yPI);
      ctx.lineTo(getX(pooledResult.piUpper), yPI);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(getX(pooledResult.piLower), yPI - 3); ctx.lineTo(getX(pooledResult.piLower), yPI + 3);
      ctx.moveTo(getX(pooledResult.piUpper), yPI - 3); ctx.lineTo(getX(pooledResult.piUpper), yPI + 3);
      ctx.stroke();
    }
    
    ctx.fillStyle = textCol;
    ctx.font = `bold 13px var(--font-body)`;
    ctx.textAlign = 'right';
    ctx.fillText(`${mean.toFixed(2)} [${lb.toFixed(2)}, ${ub.toFixed(2)}]`, width - 25, y);
  }
  
  // Bottom Axis
  const yAxis = margin.top + plotHeight;
  ctx.strokeStyle = textCol;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, yAxis);
  ctx.lineTo(margin.left + plotWidth, yAxis);
  ctx.stroke();
  
  ctx.font = `500 12px var(--font-body)`;
  ctx.fillStyle = textCol;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  ticks.forEach(val => {
    const x = getX(val);
    ctx.beginPath();
    ctx.moveTo(x, yAxis);
    ctx.lineTo(x, yAxis + 5);
    ctx.stroke();
    ctx.fillText(val.toFixed(1), x, yAxis + 9);
  });
  
  ctx.font = `700 14px var(--font-title)`;
  ctx.fillText("Effect Size", margin.left + plotWidth / 2, yAxis + 28);
  
  // Tooltips with 4-way edge clamping
  if (cache.hoveredIndex >= 0) {
    const idx = cache.hoveredIndex;
    const study = studies[idx];
    const ciLb = study.y - 1.96 * study.se;
    const ciUb = study.y + 1.96 * study.se;
    
    const lines = [
      study.name,
      `Observed Effect (y): ${study.y.toFixed(3)}`,
      `Standard Error (SE): ${study.se.toFixed(3)}`,
      `95% Confidence Int.: [${ciLb.toFixed(3)}, ${ciUb.toFixed(3)}]`,
      `Sample Size (N): ${study.n}`
    ];
    if (study.group !== undefined) {
      lines.push(`Cluster (Group): ${study.group}`);
    }
    
    const tipW = 230;
    const tipH = lines.length * 18 + 16;
    let tipX = cache.mouseX + 15;
    if (tipX + tipW > width - 15) {
      tipX = cache.mouseX - tipW - 15;
    }
    if (tipX < 15) tipX = 15;
    
    let tipY = cache.mouseY - tipH / 2;
    if (tipY < 15) tipY = 15;
    if (tipY + tipH > height - 15) tipY = height - tipH - 15;
    
    drawTooltip(ctx, tipX, tipY, tipW, tipH, lines, isDarkTheme);
  } else if (cache.hoveredIndex === -2 && pooledResult) {
    const lines = [
      pooledResult.method === "FE" ? "Fixed-Effects Meta" : "Random-Effects Meta",
      `Pooled Effect (beta): ${pooledResult.beta.toFixed(3)}`,
      `Standard Error (SE): ${pooledResult.se.toFixed(3)}`,
      `95% Confidence Int.: [${pooledResult.ci95Lower.toFixed(3)}, ${pooledResult.ci95Upper.toFixed(3)}]`,
      `90% Confidence Int.: [${pooledResult.ci90Lower.toFixed(3)}, ${pooledResult.ci90Upper.toFixed(3)}]`
    ];
    if (pooledResult.method !== "FE" && !isNaN(pooledResult.piLower)) {
      lines.push(`95% Prediction Int.: [${pooledResult.piLower.toFixed(3)}, ${pooledResult.piUpper.toFixed(3)}]`);
      lines.push(`Between-Study Var (Tau²): ${pooledResult.tau2.toFixed(4)}`);
    } else if (pooledResult.sigma2_g !== undefined) {
      lines.push(`Between-Group Var (sigma²_g): ${pooledResult.sigma2_g.toFixed(4)}`);
      lines.push(`Within-Group Var (sigma²_s): ${pooledResult.sigma2_s.toFixed(4)}`);
    }
    
    const tipW = 250;
    const tipH = lines.length * 18 + 16;
    let tipX = cache.mouseX + 15;
    if (tipX + tipW > width - 15) {
      tipX = cache.mouseX - tipW - 15;
    }
    if (tipX < 15) tipX = 15;
    
    let tipY = cache.mouseY - tipH / 2;
    if (tipY < 15) tipY = 15;
    if (tipY + tipH > height - 15) tipY = height - tipH - 15;
    
    drawTooltip(ctx, tipX, tipY, tipW, tipH, lines, isDarkTheme);
  }
}

/**
 * Draw custom statistics tooltip overlay on Canvas
 */
function drawTooltip(ctx, x, y, width, height, lines, isDarkTheme) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  
  ctx.fillStyle = isDarkTheme ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 1;
  
  const r = 8;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.shadowColor = 'transparent';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  lines.forEach((line, i) => {
    if (i === 0) {
      ctx.fillStyle = isDarkTheme ? '#818cf8' : '#4f46e5';
      ctx.font = '700 12px var(--font-title)';
    } else {
      ctx.fillStyle = isDarkTheme ? '#cbd5e1' : '#475569';
      ctx.font = '500 11px var(--font-body)';
    }
    ctx.fillText(line, x + 12, y + 10 + i * 18);
  });
  ctx.restore();
}

// --- Chart.js Wrappers ---

let ciChartInstance = null;
let posteriorChartInstance = null;

/**
 * Renders the CI Bounds vs Alpha Line Plot (using Chart.js)
 */
function renderCIPlot(canvasId, observedEffect, seVal, sesoiLower, sesoiUpper, testType, tail, selectedAlpha, thresholdAlpha, isDarkTheme = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (ciChartInstance) {
    ciChartInstance.destroy();
  }
  
  const lowerBounds = [];
  const upperBounds = [];
  
  for (let alpha = 0.001; alpha <= 0.5; alpha += 0.002) {
    const ci = getCI(alpha, observedEffect, seVal, tail, testType);
    lowerBounds.push({ x: alpha, y: ci.lower });
    upperBounds.push({ x: alpha, y: ci.upper });
  }
  
  const textCol = isDarkTheme ? '#f1f5f9' : '#1e293b';
  const gridCol = isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  
  const selCI = getCI(selectedAlpha, observedEffect, seVal, tail, testType);
  const selLowerDataset = [{ x: selectedAlpha, y: selCI.lower }];
  const selUpperDataset = [{ x: selectedAlpha, y: selCI.upper }];
  
  ciChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Lower CI Bound',
          data: lowerBounds,
          borderColor: '#4f46e5',
          borderWidth: 3, 
          pointRadius: 0,
          fill: false,
          tension: 0.3
        },
        {
          label: 'Upper CI Bound',
          data: upperBounds,
          borderColor: '#4f46e5',
          borderWidth: 3, 
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.3
        },
        {
          label: 'Selected Lower Bound',
          data: selLowerDataset,
          borderColor: '#ef4444',
          backgroundColor: '#ef4444',
          pointRadius: 7,
          pointHoverRadius: 9,
          showLine: false
        },
        {
          label: 'Selected Upper Bound',
          data: selUpperDataset,
          borderColor: '#ef4444',
          backgroundColor: '#ef4444',
          pointRadius: 7,
          pointHoverRadius: 9,
          pointStyle: 'triangle',
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      plugins: {
        legend: {
          labels: { color: textCol, font: { family: 'Inter', size: 12, weight: 600 } }
        },
        tooltip: {
          backgroundColor: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDarkTheme ? '#818cf8' : '#4f46e5',
          bodyColor: textCol,
          borderColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 11 },
          callbacks: {
            title: (items) => items.length ? `Alpha Level: ${items[0].parsed.x.toFixed(3)}` : '',
            label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(4)}`
          }
        },
        annotation: {
          annotations: {
            sesoiLowerLine: {
              type: 'line',
              scaleID: 'y',
              value: sesoiLower,
              borderColor: 'rgba(239, 68, 68, 0.85)',
              borderWidth: 1.5,
              borderDash: [4, 4],
              label: {
                content: `SESOI Lower (${sesoiLower})`,
                enabled: true,
                position: 'start',
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                color: '#fff',
                font: { size: 9, family: 'Inter', weight: 'bold' }
              }
            },
            sesoiUpperLine: {
              type: 'line',
              scaleID: 'y',
              value: sesoiUpper,
              borderColor: 'rgba(239, 68, 68, 0.85)',
              borderWidth: 1.5,
              borderDash: [4, 4],
              label: {
                content: `SESOI Upper (${sesoiUpper})`,
                enabled: true,
                position: 'start',
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                color: '#fff',
                font: { size: 9, family: 'Inter', weight: 'bold' }
              }
            },
            ...( !isNaN(thresholdAlpha) && thresholdAlpha >= 0 && thresholdAlpha <= 0.5 ? {
              thresholdLine: {
                type: 'line',
                scaleID: 'x',
                value: thresholdAlpha,
                borderColor: '#f59e0b',
                borderWidth: 1.5,
                borderDash: [6, 3],
                label: {
                  content: `Threshold Alpha (${thresholdAlpha.toFixed(3)})`,
                  enabled: true,
                  position: 'end',
                  backgroundColor: 'rgba(245, 158, 11, 0.85)',
                  color: '#fff',
                  font: { size: 9, family: 'Inter', weight: 'bold' }
                }
              }
            } : {})
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 0.5,
          title: { display: true, text: 'Alpha Level (Type I error rate)', color: textCol, font: { family: 'Outfit', size: 13, weight: 700 } },
          grid: { color: gridCol },
          ticks: { color: textCol, font: { family: 'Inter', size: 11 } }
        },
        y: {
          type: 'linear',
          title: { display: true, text: 'Confidence Interval Bounds', color: textCol, font: { family: 'Outfit', size: 13, weight: 700 } },
          grid: { color: gridCol },
          ticks: { color: textCol, font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });
}

/**
 * Renders the Prior vs Posterior normal distribution density plots (using Chart.js)
 */
function renderPosteriorPlot(canvasId, observedEffect, seCurrent, priorMean, priorSD, sesoiLower, sesoiUpper, testType, tail, seMode, sdInput, nInput, isDarkTheme = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (posteriorChartInstance) {
    posteriorChartInstance.destroy();
  }
  
  const params = calculatePosteriorParams(observedEffect, seCurrent, priorMean, priorSD, seMode, sdInput, nInput);
  const { muPost, sigmaPost } = params;
  
  const xMin = Math.min(muPost - 4 * sigmaPost, priorMean - 4 * priorSD, sesoiLower - 0.5);
  const xMax = Math.max(muPost + 4 * sigmaPost, priorMean + 4 * priorSD, sesoiUpper + 0.5);
  
  const priorData = [];
  const postData = [];
  const shadedData = [];
  
  const steps = 300;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    const dPrior = dnorm(x, priorMean, priorSD);
    const dPost = dnorm(x, muPost, sigmaPost);
    
    priorData.push({ x: x, y: dPrior });
    postData.push({ x: x, y: dPost });
    
    let isShaded = false;
    if (testType === "Equivalence Test") {
      isShaded = (x >= sesoiLower && x <= sesoiUpper);
    } else {
      if (tail === "two") {
        isShaded = (x < sesoiLower || x > sesoiUpper);
      } else if (tail === "upper") {
        isShaded = (x > sesoiUpper);
      } else {
        isShaded = (x < sesoiLower);
      }
    }
    
    shadedData.push({ x: x, y: isShaded ? dPost : 0 });
  }
  
  const textCol = isDarkTheme ? '#f1f5f9' : '#1e293b';
  const gridCol = isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  
  posteriorChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Prior Distribution',
          data: priorData,
          borderColor: '#94a3b8',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.3
        },
        {
          label: 'Posterior Distribution',
          data: postData,
          borderColor: '#4f46e5',
          borderWidth: 3, 
          pointRadius: 0,
          fill: false,
          tension: 0.3
        },
        {
          label: testType === "Equivalence Test" ? 'Equivalent Region' : 'Meaningful Region',
          data: shadedData,
          backgroundColor: isDarkTheme ? 'rgba(244, 63, 94, 0.22)' : 'rgba(244, 63, 94, 0.16)', 
          borderColor: 'transparent',
          pointRadius: 0,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      plugins: {
        legend: {
          labels: { color: textCol, font: { family: 'Inter', size: 12, weight: 600 } }
        },
        tooltip: {
          backgroundColor: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDarkTheme ? '#818cf8' : '#4f46e5',
          bodyColor: textCol,
          borderColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 11 },
          callbacks: {
            title: (items) => items.length ? `Effect Size (\u03b8): ${items[0].parsed.x.toFixed(3)}` : '',
            label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(4)}`
          }
        },
        annotation: {
          annotations: {
            sesoiLowerLine: {
              type: 'line',
              scaleID: 'x',
              value: sesoiLower,
              borderColor: 'rgba(239, 68, 68, 0.85)',
              borderWidth: 1.5,
              borderDash: [4, 4],
              label: {
                content: `SESOI Lower (${sesoiLower})`,
                enabled: true,
                position: 'start',
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                color: '#fff',
                font: { size: 9, family: 'Inter', weight: 'bold' }
              }
            },
            sesoiUpperLine: {
              type: 'line',
              scaleID: 'x',
              value: sesoiUpper,
              borderColor: 'rgba(239, 68, 68, 0.85)',
              borderWidth: 1.5,
              borderDash: [4, 4],
              label: {
                content: `SESOI Upper (${sesoiUpper})`,
                enabled: true,
                position: 'start',
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                color: '#fff',
                font: { size: 9, family: 'Inter', weight: 'bold' }
              }
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: xMin,
          max: xMax,
          title: { display: true, text: 'Effect Size (\u03b8)', color: textCol, font: { family: 'Outfit', size: 13, weight: 700 } },
          grid: { color: gridCol },
          ticks: { color: textCol, font: { family: 'Inter', size: 11 } }
        },
        y: {
          type: 'linear',
          min: 0,
          title: { display: true, text: 'Density', color: textCol, font: { family: 'Outfit', size: 13, weight: 700 } },
          grid: { color: gridCol },
          ticks: { color: textCol, font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });
}
