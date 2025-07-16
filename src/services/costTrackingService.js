const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');

// Whisper API pricing constants
const WHISPER_PRICING = {
  COST_PER_MINUTE: 0.006, // $0.006 per minute
  COST_PER_SECOND: 0.0001, // $0.0001 per second (0.006/60)
  CURRENCY: 'USD'
};

// Budget configuration
const BUDGET_CONFIG = {
  DAILY_BUDGET_DEFAULT: parseFloat(process.env.WHISPER_DAILY_BUDGET) || 10.0,   // $10/day default
  MONTHLY_BUDGET_DEFAULT: parseFloat(process.env.WHISPER_MONTHLY_BUDGET) || 200.0, // $200/month default
  ALERT_THRESHOLDS: {
    WARNING: parseFloat(process.env.BUDGET_WARNING_THRESHOLD) || 0.8,  // 80%
    CRITICAL: parseFloat(process.env.BUDGET_CRITICAL_THRESHOLD) || 0.95 // 95%
  }
};

// In-memory cost tracking store (in production, this would be database-backed)
const costStore = {
  dailyUsage: new Map(),    // date -> { cost, minutes, requests }
  monthlyUsage: new Map(),  // year-month -> { cost, minutes, requests }
  totalUsage: { cost: 0, minutes: 0, requests: 0 }
};

// Get current date strings for tracking
function getDateStrings() {
  const now = new Date();
  const daily = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const monthly = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
  return { daily, monthly };
}

// Calculate cost from audio duration
function calculateCostFromDuration(durationSeconds) {
  if (!durationSeconds || durationSeconds <= 0) {
    return 0;
  }
  
  const durationMinutes = durationSeconds / 60;
  const cost = durationMinutes * WHISPER_PRICING.COST_PER_MINUTE;
  
  return Math.round(cost * 10000) / 10000; // Round to 4 decimal places
}

// Calculate cost from file size (estimation)
function estimateCostFromFileSize(fileSizeBytes, audioCodec = 'unknown') {
  // Rough estimation based on common audio bitrates
  // This is less accurate than duration-based calculation
  const estimatedBitrates = {
    'mp3': 128000,      // 128 kbps
    'aac': 128000,      // 128 kbps  
    'wav': 1411200,     // 1411.2 kbps (CD quality)
    'flac': 1000000,    // ~1000 kbps (lossless, variable)
    'ogg': 128000,      // 128 kbps
    'webm': 128000,     // 128 kbps
    'unknown': 128000   // Default assumption
  };
  
  const codec = audioCodec.toLowerCase();
  const bitrate = estimatedBitrates[codec] || estimatedBitrates.unknown;
  
  // Calculate estimated duration: (fileSize * 8) / bitrate
  const estimatedDurationSeconds = (fileSizeBytes * 8) / bitrate;
  
  return {
    estimatedCost: calculateCostFromDuration(estimatedDurationSeconds),
    estimatedDuration: estimatedDurationSeconds,
    note: 'Estimated from file size - actual cost may vary'
  };
}

// Get or create usage record
function getUsageRecord(store, key) {
  if (!store.has(key)) {
    store.set(key, { cost: 0, minutes: 0, requests: 0 });
  }
  return store.get(key);
}

// Update usage tracking
function updateUsageTracking(cost, durationSeconds = 0) {
  const { daily, monthly } = getDateStrings();
  const minutes = durationSeconds / 60;
  
  // Update daily usage
  const dailyRecord = getUsageRecord(costStore.dailyUsage, daily);
  dailyRecord.cost += cost;
  dailyRecord.minutes += minutes;
  dailyRecord.requests += 1;
  
  // Update monthly usage
  const monthlyRecord = getUsageRecord(costStore.monthlyUsage, monthly);
  monthlyRecord.cost += cost;
  monthlyRecord.minutes += minutes;
  monthlyRecord.requests += 1;
  
  // Update total usage
  costStore.totalUsage.cost += cost;
  costStore.totalUsage.minutes += minutes;
  costStore.totalUsage.requests += 1;
  
  return {
    daily: dailyRecord,
    monthly: monthlyRecord,
    total: costStore.totalUsage
  };
}

// Check budget alerts
function checkBudgetAlerts(currentUsage) {
  const alerts = [];
  const { daily, monthly } = getDateStrings();
  
  // Check daily budget
  const dailyUsage = costStore.dailyUsage.get(daily);
  if (dailyUsage) {
    const dailyPercentage = dailyUsage.cost / BUDGET_CONFIG.DAILY_BUDGET_DEFAULT;
    
    if (dailyPercentage >= BUDGET_CONFIG.ALERT_THRESHOLDS.CRITICAL) {
      alerts.push({
        type: 'CRITICAL',
        scope: 'daily',
        percentage: Math.round(dailyPercentage * 100),
        currentCost: dailyUsage.cost,
        budgetLimit: BUDGET_CONFIG.DAILY_BUDGET_DEFAULT,
        message: `Critical: Daily budget ${Math.round(dailyPercentage * 100)}% used ($${dailyUsage.cost.toFixed(4)}/$${BUDGET_CONFIG.DAILY_BUDGET_DEFAULT})`
      });
    } else if (dailyPercentage >= BUDGET_CONFIG.ALERT_THRESHOLDS.WARNING) {
      alerts.push({
        type: 'WARNING',
        scope: 'daily',
        percentage: Math.round(dailyPercentage * 100),
        currentCost: dailyUsage.cost,
        budgetLimit: BUDGET_CONFIG.DAILY_BUDGET_DEFAULT,
        message: `Warning: Daily budget ${Math.round(dailyPercentage * 100)}% used ($${dailyUsage.cost.toFixed(4)}/$${BUDGET_CONFIG.DAILY_BUDGET_DEFAULT})`
      });
    }
  }
  
  // Check monthly budget
  const monthlyUsage = costStore.monthlyUsage.get(monthly);
  if (monthlyUsage) {
    const monthlyPercentage = monthlyUsage.cost / BUDGET_CONFIG.MONTHLY_BUDGET_DEFAULT;
    
    if (monthlyPercentage >= BUDGET_CONFIG.ALERT_THRESHOLDS.CRITICAL) {
      alerts.push({
        type: 'CRITICAL',
        scope: 'monthly',
        percentage: Math.round(monthlyPercentage * 100),
        currentCost: monthlyUsage.cost,
        budgetLimit: BUDGET_CONFIG.MONTHLY_BUDGET_DEFAULT,
        message: `Critical: Monthly budget ${Math.round(monthlyPercentage * 100)}% used ($${monthlyUsage.cost.toFixed(4)}/$${BUDGET_CONFIG.MONTHLY_BUDGET_DEFAULT})`
      });
    } else if (monthlyPercentage >= BUDGET_CONFIG.ALERT_THRESHOLDS.WARNING) {
      alerts.push({
        type: 'WARNING',
        scope: 'monthly',
        percentage: Math.round(monthlyPercentage * 100),
        currentCost: monthlyUsage.cost,
        budgetLimit: BUDGET_CONFIG.MONTHLY_BUDGET_DEFAULT,
        message: `Warning: Monthly budget ${Math.round(monthlyPercentage * 100)}% used ($${monthlyUsage.cost.toFixed(4)}/$${BUDGET_CONFIG.MONTHLY_BUDGET_DEFAULT})`
      });
    }
  }
  
  return alerts;
}

// Log budget alerts
function logBudgetAlerts(alerts, requestId = null) {
  alerts.forEach(alert => {
    const logData = {
      requestId: requestId || 'system',
      timestamp: new Date().toISOString(),
      type: 'BUDGET_ALERT',
      alertLevel: alert.type,
      scope: alert.scope,
      percentage: alert.percentage,
      currentCost: alert.currentCost,
      budgetLimit: alert.budgetLimit,
      message: alert.message
    };
    
    if (alert.type === 'CRITICAL') {
      console.error('Budget Alert:', JSON.stringify(logData, null, 2));
    } else {
      console.warn('Budget Alert:', JSON.stringify(logData, null, 2));
    }
  });
}

// Track transcription cost
function trackTranscriptionCost(requestId, filePath, durationSeconds = null, metadata = {}) {
  try {
    let cost = 0;
    let costCalculationMethod = 'unknown';
    let estimatedDuration = null;
    
    // Calculate cost from duration if available
    if (durationSeconds && durationSeconds > 0) {
      cost = calculateCostFromDuration(durationSeconds);
      costCalculationMethod = 'duration';
    } else if (metadata.fileSize) {
      // Fallback to file size estimation
      const estimation = estimateCostFromFileSize(metadata.fileSize, metadata.format);
      cost = estimation.estimatedCost;
      estimatedDuration = estimation.estimatedDuration;
      costCalculationMethod = 'filesize_estimation';
    }
    
    // Update usage tracking
    const usage = updateUsageTracking(cost, durationSeconds || estimatedDuration || 0);
    
    // Check for budget alerts
    const alerts = checkBudgetAlerts(usage);
    if (alerts.length > 0) {
      logBudgetAlerts(alerts, requestId);
    }
    
    // Log cost information
    const costLogData = {
      requestId,
      timestamp: new Date().toISOString(),
      type: 'WHISPER_COST_TRACKING',
      file: path.basename(filePath),
      cost: cost,
      costCalculationMethod,
      durationSeconds: durationSeconds || estimatedDuration,
      fileSize: metadata.fileSize,
      format: metadata.format,
      usage: {
        daily: usage.daily,
        monthly: usage.monthly
      },
      alerts: alerts.map(a => ({ type: a.type, scope: a.scope, percentage: a.percentage }))
    };
    
    console.log('Cost Tracking:', JSON.stringify(costLogData, null, 2));
    
    return {
      cost,
      costCalculationMethod,
      durationSeconds: durationSeconds || estimatedDuration,
      usage,
      alerts
    };
    
  } catch (error) {
    console.error('Error tracking transcription cost:', error);
    return {
      cost: 0,
      error: error.message
    };
  }
}

// Get current usage summary
function getUsageSummary() {
  const { daily, monthly } = getDateStrings();
  
  return {
    today: costStore.dailyUsage.get(daily) || { cost: 0, minutes: 0, requests: 0 },
    thisMonth: costStore.monthlyUsage.get(monthly) || { cost: 0, minutes: 0, requests: 0 },
    total: costStore.totalUsage,
    budgets: {
      daily: BUDGET_CONFIG.DAILY_BUDGET_DEFAULT,
      monthly: BUDGET_CONFIG.MONTHLY_BUDGET_DEFAULT
    },
    currency: WHISPER_PRICING.CURRENCY
  };
}

// Get usage for specific period
function getUsageForPeriod(period = 'daily', limit = 30) {
  const store = period === 'daily' ? costStore.dailyUsage : costStore.monthlyUsage;
  const entries = Array.from(store.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // Sort descending (newest first)
    .slice(0, limit)
    .map(([date, usage]) => ({ date, ...usage }));
    
  return entries;
}

// Export cost information for job responses
function getCostInfoForJob(costTracking) {
  if (!costTracking) {
    return null;
  }
  
  return {
    cost: costTracking.cost,
    currency: WHISPER_PRICING.CURRENCY,
    calculationMethod: costTracking.costCalculationMethod,
    durationSeconds: costTracking.durationSeconds
  };
}

// Initialize cost tracking (load historical data if available)
async function initializeCostTracking() {
  try {
    console.log('Cost tracking initialized');
    console.log(`Daily budget: $${BUDGET_CONFIG.DAILY_BUDGET_DEFAULT}`);
    console.log(`Monthly budget: $${BUDGET_CONFIG.MONTHLY_BUDGET_DEFAULT}`);
    console.log(`Warning threshold: ${BUDGET_CONFIG.ALERT_THRESHOLDS.WARNING * 100}%`);
    console.log(`Critical threshold: ${BUDGET_CONFIG.ALERT_THRESHOLDS.CRITICAL * 100}%`);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize cost tracking:', error);
    return false;
  }
}

module.exports = {
  // Core functions
  calculateCostFromDuration,
  estimateCostFromFileSize,
  trackTranscriptionCost,
  
  // Usage tracking
  getUsageSummary,
  getUsageForPeriod,
  getCostInfoForJob,
  
  // Budget monitoring
  checkBudgetAlerts,
  logBudgetAlerts,
  
  // Initialization
  initializeCostTracking,
  
  // Constants
  WHISPER_PRICING,
  BUDGET_CONFIG
};