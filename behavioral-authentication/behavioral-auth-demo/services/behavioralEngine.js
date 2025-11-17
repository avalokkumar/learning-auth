/**
 * Behavioral Authentication Engine
 * Analyzes user behavior patterns for continuous authentication
 */

// In-memory storage for demo (use database in production)
const userProfiles = new Map();
const sessionBehavior = new Map();
const behavioralHistory = new Map();

/**
 * Initialize or get user behavioral profile
 */
function getUserProfile(userId) {
  if (!userProfiles.has(userId)) {
    userProfiles.set(userId, {
      userId,
      createdAt: Date.now(),
      keystrokeDynamics: {
        avgDwellTime: null,
        avgFlightTime: null,
        typingSpeed: null,
        errorRate: null,
        samples: []
      },
      mouseDynamics: {
        avgSpeed: null,
        avgDistance: null,
        clickPattern: null,
        scrollPattern: null,
        samples: []
      },
      touchDynamics: {
        avgTapDuration: null,
        avgSwipeSpeed: null,
        pressurePattern: null,
        samples: []
      },
      confidenceHistory: [],
      totalSessions: 0,
      lastUpdated: Date.now()
    });
  }
  return userProfiles.get(userId);
}

/**
 * Analyze keystroke dynamics
 */
function analyzeKeystrokeDynamics(keystrokeData, userProfile) {
  if (!keystrokeData || keystrokeData.length === 0) {
    return { score: 50, confidence: 'UNKNOWN', factors: [] };
  }

  const factors = [];
  let score = 100;

  // Calculate dwell times (how long keys are pressed)
  const dwellTimes = keystrokeData
    .filter(k => k.duration)
    .map(k => k.duration);

  if (dwellTimes.length > 0) {
    const avgDwellTime = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
    
    if (userProfile.keystrokeDynamics.avgDwellTime) {
      const deviation = Math.abs(avgDwellTime - userProfile.keystrokeDynamics.avgDwellTime);
      const deviationPercent = (deviation / userProfile.keystrokeDynamics.avgDwellTime) * 100;
      
      if (deviationPercent > 50) {
        score -= 30;
        factors.push({
          factor: 'Dwell Time Mismatch',
          impact: -30,
          details: `${Math.round(deviationPercent)}% deviation from normal`
        });
      } else if (deviationPercent > 30) {
        score -= 15;
        factors.push({
          factor: 'Dwell Time Variation',
          impact: -15,
          details: `${Math.round(deviationPercent)}% deviation`
        });
      }
    }
  }

  // Calculate flight times (time between keystrokes)
  const flightTimes = keystrokeData
    .filter(k => k.flightTime)
    .map(k => k.flightTime);

  if (flightTimes.length > 0) {
    const avgFlightTime = flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length;
    
    if (userProfile.keystrokeDynamics.avgFlightTime) {
      const deviation = Math.abs(avgFlightTime - userProfile.keystrokeDynamics.avgFlightTime);
      const deviationPercent = (deviation / userProfile.keystrokeDynamics.avgFlightTime) * 100;
      
      if (deviationPercent > 50) {
        score -= 25;
        factors.push({
          factor: 'Flight Time Mismatch',
          impact: -25,
          details: `${Math.round(deviationPercent)}% deviation from normal`
        });
      } else if (deviationPercent > 30) {
        score -= 10;
        factors.push({
          factor: 'Flight Time Variation',
          impact: -10,
          details: `${Math.round(deviationPercent)}% deviation`
        });
      }
    }
  }

  // Calculate typing speed (characters per minute)
  if (keystrokeData.length > 1) {
    const timeSpan = keystrokeData[keystrokeData.length - 1].timestamp - keystrokeData[0].timestamp;
    const typingSpeed = (keystrokeData.length / timeSpan) * 60000; // chars per minute
    
    if (userProfile.keystrokeDynamics.typingSpeed) {
      const deviation = Math.abs(typingSpeed - userProfile.keystrokeDynamics.typingSpeed);
      const deviationPercent = (deviation / userProfile.keystrokeDynamics.typingSpeed) * 100;
      
      if (deviationPercent > 40) {
        score -= 20;
        factors.push({
          factor: 'Typing Speed Anomaly',
          impact: -20,
          details: `${Math.round(deviationPercent)}% speed difference`
        });
      }
    }
  }

  return {
    score: Math.max(0, score),
    confidence: getConfidenceLevel(score),
    factors,
    metrics: {
      avgDwellTime: dwellTimes.length > 0 ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length : null,
      avgFlightTime: flightTimes.length > 0 ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length : null,
      sampleCount: keystrokeData.length
    }
  };
}

/**
 * Analyze mouse movement dynamics
 */
function analyzeMouseDynamics(mouseData, userProfile) {
  if (!mouseData || mouseData.length < 2) {
    return { score: 50, confidence: 'UNKNOWN', factors: [] };
  }

  const factors = [];
  let score = 100;

  // Calculate mouse movement speed
  let totalDistance = 0;
  let totalTime = 0;

  for (let i = 1; i < mouseData.length; i++) {
    const prev = mouseData[i - 1];
    const curr = mouseData[i];
    
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const time = curr.timestamp - prev.timestamp;
    
    totalDistance += distance;
    totalTime += time;
  }

  const avgSpeed = totalTime > 0 ? totalDistance / totalTime : 0;

  if (userProfile.mouseDynamics.avgSpeed && avgSpeed > 0) {
    const deviation = Math.abs(avgSpeed - userProfile.mouseDynamics.avgSpeed);
    const deviationPercent = (deviation / userProfile.mouseDynamics.avgSpeed) * 100;
    
    if (deviationPercent > 60) {
      score -= 25;
      factors.push({
        factor: 'Mouse Speed Anomaly',
        impact: -25,
        details: `${Math.round(deviationPercent)}% speed deviation`
      });
    } else if (deviationPercent > 40) {
      score -= 15;
      factors.push({
        factor: 'Mouse Speed Variation',
        impact: -15,
        details: `${Math.round(deviationPercent)}% deviation`
      });
    }
  }

  // Analyze click patterns
  const clicks = mouseData.filter(m => m.type === 'click');
  if (clicks.length > 1) {
    const clickIntervals = [];
    for (let i = 1; i < clicks.length; i++) {
      clickIntervals.push(clicks[i].timestamp - clicks[i - 1].timestamp);
    }
    
    const avgClickInterval = clickIntervals.reduce((a, b) => a + b, 0) / clickIntervals.length;
    
    if (userProfile.mouseDynamics.clickPattern) {
      const deviation = Math.abs(avgClickInterval - userProfile.mouseDynamics.clickPattern);
      const deviationPercent = (deviation / userProfile.mouseDynamics.clickPattern) * 100;
      
      if (deviationPercent > 50) {
        score -= 20;
        factors.push({
          factor: 'Click Pattern Mismatch',
          impact: -20,
          details: `Unusual click timing pattern`
        });
      }
    }
  }

  return {
    score: Math.max(0, score),
    confidence: getConfidenceLevel(score),
    factors,
    metrics: {
      avgSpeed,
      totalDistance,
      clickCount: clicks.length,
      sampleCount: mouseData.length
    }
  };
}

/**
 * Analyze touch gestures (mobile)
 */
function analyzeTouchDynamics(touchData, userProfile) {
  if (!touchData || touchData.length === 0) {
    return { score: 50, confidence: 'UNKNOWN', factors: [] };
  }

  const factors = [];
  let score = 100;

  // Calculate tap durations
  const tapDurations = touchData
    .filter(t => t.type === 'tap' && t.duration)
    .map(t => t.duration);

  if (tapDurations.length > 0) {
    const avgTapDuration = tapDurations.reduce((a, b) => a + b, 0) / tapDurations.length;
    
    if (userProfile.touchDynamics.avgTapDuration) {
      const deviation = Math.abs(avgTapDuration - userProfile.touchDynamics.avgTapDuration);
      const deviationPercent = (deviation / userProfile.touchDynamics.avgTapDuration) * 100;
      
      if (deviationPercent > 50) {
        score -= 25;
        factors.push({
          factor: 'Tap Duration Mismatch',
          impact: -25,
          details: `${Math.round(deviationPercent)}% deviation from normal`
        });
      }
    }
  }

  // Analyze swipe patterns
  const swipes = touchData.filter(t => t.type === 'swipe');
  if (swipes.length > 0) {
    const avgSwipeSpeed = swipes.reduce((sum, s) => sum + (s.speed || 0), 0) / swipes.length;
    
    if (userProfile.touchDynamics.avgSwipeSpeed) {
      const deviation = Math.abs(avgSwipeSpeed - userProfile.touchDynamics.avgSwipeSpeed);
      const deviationPercent = (deviation / userProfile.touchDynamics.avgSwipeSpeed) * 100;
      
      if (deviationPercent > 60) {
        score -= 20;
        factors.push({
          factor: 'Swipe Speed Anomaly',
          impact: -20,
          details: `Unusual swipe speed detected`
        });
      }
    }
  }

  return {
    score: Math.max(0, score),
    confidence: getConfidenceLevel(score),
    factors,
    metrics: {
      avgTapDuration: tapDurations.length > 0 ? tapDurations.reduce((a, b) => a + b, 0) / tapDurations.length : null,
      tapCount: tapDurations.length,
      swipeCount: swipes.length
    }
  };
}

/**
 * Calculate overall confidence score
 */
async function calculateConfidenceScore(behavioralData, userId) {
  const userProfile = getUserProfile(userId);
  
  // Analyze each behavioral component
  const keystrokeAnalysis = analyzeKeystrokeDynamics(
    behavioralData.keystrokeData || [],
    userProfile
  );
  
  const mouseAnalysis = analyzeMouseDynamics(
    behavioralData.mouseData || [],
    userProfile
  );
  
  const touchAnalysis = analyzeTouchDynamics(
    behavioralData.touchData || [],
    userProfile
  );

  // Weight the scores
  const weights = {
    keystroke: 0.40,
    mouse: 0.35,
    touch: 0.25
  };

  let totalScore = 0;
  let totalWeight = 0;
  const allFactors = [];

  if (keystrokeAnalysis.score > 0) {
    totalScore += keystrokeAnalysis.score * weights.keystroke;
    totalWeight += weights.keystroke;
    allFactors.push(...keystrokeAnalysis.factors.map(f => ({ ...f, category: 'Keystroke' })));
  }

  if (mouseAnalysis.score > 0) {
    totalScore += mouseAnalysis.score * weights.mouse;
    totalWeight += weights.mouse;
    allFactors.push(...mouseAnalysis.factors.map(f => ({ ...f, category: 'Mouse' })));
  }

  if (touchAnalysis.score > 0) {
    totalScore += touchAnalysis.score * weights.touch;
    totalWeight += weights.touch;
    allFactors.push(...touchAnalysis.factors.map(f => ({ ...f, category: 'Touch' })));
  }

  // Calculate final score
  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
  const confidenceLevel = getConfidenceLevel(finalScore);

  // Store in history
  const historyEntry = {
    timestamp: Date.now(),
    score: finalScore,
    confidence: confidenceLevel,
    keystrokeScore: keystrokeAnalysis.score,
    mouseScore: mouseAnalysis.score,
    touchScore: touchAnalysis.score
  };

  if (!behavioralHistory.has(userId)) {
    behavioralHistory.set(userId, []);
  }
  behavioralHistory.get(userId).push(historyEntry);

  // Keep only last 50 entries
  if (behavioralHistory.get(userId).length > 50) {
    behavioralHistory.get(userId).shift();
  }

  return {
    score: finalScore,
    confidence: confidenceLevel,
    level: getConfidenceDescription(confidenceLevel),
    factors: allFactors,
    breakdown: {
      keystroke: keystrokeAnalysis,
      mouse: mouseAnalysis,
      touch: touchAnalysis
    },
    recommendation: getRecommendation(finalScore),
    timestamp: Date.now()
  };
}

/**
 * Update user behavioral profile with new data
 */
function updateUserProfile(userId, behavioralData) {
  const profile = getUserProfile(userId);

  // Update keystroke profile
  if (behavioralData.keystrokeData && behavioralData.keystrokeData.length > 0) {
    const dwellTimes = behavioralData.keystrokeData.filter(k => k.duration).map(k => k.duration);
    const flightTimes = behavioralData.keystrokeData.filter(k => k.flightTime).map(k => k.flightTime);
    
    if (dwellTimes.length > 0) {
      const avgDwell = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
      profile.keystrokeDynamics.avgDwellTime = profile.keystrokeDynamics.avgDwellTime
        ? (profile.keystrokeDynamics.avgDwellTime * 0.7 + avgDwell * 0.3)
        : avgDwell;
    }
    
    if (flightTimes.length > 0) {
      const avgFlight = flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length;
      profile.keystrokeDynamics.avgFlightTime = profile.keystrokeDynamics.avgFlightTime
        ? (profile.keystrokeDynamics.avgFlightTime * 0.7 + avgFlight * 0.3)
        : avgFlight;
    }

    profile.keystrokeDynamics.samples.push({
      timestamp: Date.now(),
      dwellTimes: dwellTimes.slice(0, 10),
      flightTimes: flightTimes.slice(0, 10)
    });

    // Keep only last 20 samples
    if (profile.keystrokeDynamics.samples.length > 20) {
      profile.keystrokeDynamics.samples.shift();
    }
  }

  // Update mouse profile
  if (behavioralData.mouseData && behavioralData.mouseData.length > 1) {
    let totalDistance = 0;
    let totalTime = 0;

    for (let i = 1; i < behavioralData.mouseData.length; i++) {
      const prev = behavioralData.mouseData[i - 1];
      const curr = behavioralData.mouseData[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const time = curr.timestamp - prev.timestamp;
      
      totalDistance += distance;
      totalTime += time;
    }

    const avgSpeed = totalTime > 0 ? totalDistance / totalTime : 0;
    
    if (avgSpeed > 0) {
      profile.mouseDynamics.avgSpeed = profile.mouseDynamics.avgSpeed
        ? (profile.mouseDynamics.avgSpeed * 0.7 + avgSpeed * 0.3)
        : avgSpeed;
    }

    profile.mouseDynamics.samples.push({
      timestamp: Date.now(),
      avgSpeed,
      distance: totalDistance
    });

    if (profile.mouseDynamics.samples.length > 20) {
      profile.mouseDynamics.samples.shift();
    }
  }

  profile.totalSessions++;
  profile.lastUpdated = Date.now();

  return profile;
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score) {
  if (score >= 90) return 'VERY_HIGH';
  if (score >= 75) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'LOW';
  return 'VERY_LOW';
}

/**
 * Get confidence description
 */
function getConfidenceDescription(level) {
  const descriptions = {
    'VERY_HIGH': 'Very High Confidence',
    'HIGH': 'High Confidence',
    'MEDIUM': 'Medium Confidence',
    'LOW': 'Low Confidence',
    'VERY_LOW': 'Very Low Confidence'
  };
  return descriptions[level] || 'Unknown';
}

/**
 * Get recommendation based on score
 */
function getRecommendation(score) {
  if (score >= 90) {
    return {
      action: 'ALLOW',
      message: 'Behavior matches user profile. Full access granted.',
      requiresAuth: false
    };
  } else if (score >= 75) {
    return {
      action: 'ALLOW',
      message: 'Behavior mostly matches. Continue with enhanced monitoring.',
      requiresAuth: false
    };
  } else if (score >= 60) {
    return {
      action: 'MONITOR',
      message: 'Some behavioral deviations detected. Monitoring closely.',
      requiresAuth: false
    };
  } else if (score >= 40) {
    return {
      action: 'CHALLENGE',
      message: 'Significant behavioral anomalies. Re-authentication recommended.',
      requiresAuth: true
    };
  } else {
    return {
      action: 'BLOCK',
      message: 'Behavior does not match user profile. Access restricted.',
      requiresAuth: true
    };
  }
}

/**
 * Get behavioral history for user
 */
function getBehavioralHistory(userId) {
  return behavioralHistory.get(userId) || [];
}

/**
 * Check if user is in learning phase
 */
function isLearningPhase(userId) {
  const profile = getUserProfile(userId);
  return profile.totalSessions < 3; // First 3 sessions are learning
}

module.exports = {
  calculateConfidenceScore,
  updateUserProfile,
  getUserProfile,
  getBehavioralHistory,
  isLearningPhase
};
