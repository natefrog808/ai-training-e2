import { PATTERN_TYPES } from './types';

class MLSystem {
  constructor() {
    this.memory = {
      patterns: [],
      weights: Object.fromEntries(Object.values(PATTERN_TYPES).map(type => [type, 1.0])),
      recentResults: [],
      confidenceHistory: [],
    };
    this.computationCache = new Map();

    setInterval(() => {
      const now = Date.now();
      for (const [key, { timestamp }] of this.computationCache) {
        if (now - timestamp > 300000) { // 5 minutes
          this.computationCache.delete(key);
        }
      }
    }, 60000);
  }

  extractFeatures(sequence) {
    if (!Array.isArray(sequence) || sequence.length < 3) {
      throw new Error('Sequence must contain at least 3 numbers');
    }
    if (!sequence.every(n => typeof n === 'number' && Number.isFinite(n))) {
      throw new Error('Sequence must contain only valid numbers');
    }

    const cacheKey = sequence.join(',');
    const cached = this.computationCache.get(cacheKey);
    if (cached) return cached.features;

    const features = {};
    try {
      features.mean = sequence.reduce((a, b) => a + b, 0) / sequence.length;
      features.variance = sequence.reduce((a, b) => a + Math.pow(b - features.mean, 2), 0) / sequence.length;

      const differences = sequence.slice(1).map((n, i) => n - sequence[i]);
      features.diffMean = differences.reduce((a, b) => a + b, 0) / differences.length;

      const tolerance = 0.0001;
      features.isArithmetic = differences.every(d => Math.abs(d - differences[0]) < tolerance);
      features.isGeometric = sequence.slice(1).every((n, i) => Math.abs(n / sequence[i] - sequence[1] / sequence[0]) < tolerance);

      const diffOfDiffs = differences.slice(1).map((d, i) => d - differences[i]);
      features.isQuadratic = diffOfDiffs.every(dd => Math.abs(dd - diffOfDiffs[0]) < tolerance);

      const ratios = sequence.slice(1).map((n, i) => n / sequence[i]);
      const ratiosOfRatios = ratios.slice(1).map((r, i) => r / ratios[i]);
      features.isExponential = ratiosOfRatios.every(rr => Math.abs(rr - ratiosOfRatios[0]) < tolerance);

      this.computationCache.set(cacheKey, { features, timestamp: Date.now() });
      return features;
    } catch (error) {
      console.error("Feature extraction error:", error); // More specific error message
      throw new Error(`Feature extraction failed: ${error.message}`);
    }
  }


  predict(sequence) {
    try {
      const features = this.extractFeatures(sequence);
      const scores = {};
      for (const type in this.memory.weights) {  // Use for...in for iterating keys
        let baseConfidence = 0.5;
        if (features.isArithmetic && type === PATTERN_TYPES.ARITHMETIC) {
          baseConfidence = 0.9;
        } else if (features.isGeometric && type === PATTERN_TYPES.GEOMETRIC) {
          baseConfidence = 0.9;
        } else if (features.isQuadratic && type === PATTERN_TYPES.QUADRATIC) {
          baseConfidence = 0.9;
        } else if (features.isExponential && type === PATTERN_TYPES.EXPONENTIAL) {
          baseConfidence = 0.9;
        }
        const successRate = this.getSuccessRate(type);
        scores[type] = {
          confidence: Math.min(1, baseConfidence * this.memory.weights[type] * (0.7 + 0.3 * successRate)), // Access weight directly
          weight: this.memory.weights[type], // Access weight directly
        };
      }

      let bestPrediction = { type: 'unknown', confidence: 0 };
      for (const type in scores) {   // Iterate over scores
        if (scores[type].confidence > bestPrediction.confidence) {
          bestPrediction = { type, confidence: scores[type].confidence };
        }
      }


      this.updateConfidenceHistory(bestPrediction.confidence);
      return bestPrediction;
    } catch (error) {
      console.error('Prediction error:', error);
      throw error;
    }
  }

  learn(sequence, pattern, success) {
    try {
      const features = this.extractFeatures(sequence);
      this.memory.patterns.push({
        features,
        pattern,
        success,
        timestamp: Date.now(),
      });
      const recentSuccess = this.memory.recentResults.slice(-5).filter(Boolean).length / 5;
      const learningRate = 0.1 * (1 + (1 - recentSuccess));

      this.memory.weights[pattern.type] += success ? learningRate : -learningRate * 0.5; // Simplified update

      if (success) {
        if (features.isArithmetic) this.memory.weights[PATTERN_TYPES.ARITHMETIC] += learningRate * 0.5;
        if (features.isGeometric) this.memory.weights[PATTERN_TYPES.GEOMETRIC] += learningRate * 0.5;
        if (features.isQuadratic) this.memory.weights[PATTERN_TYPES.QUADRATIC] += learningRate * 0.5;
        if (features.isExponential) this.memory.weights[PATTERN_TYPES.EXPONENTIAL] += learningRate * 0.5;
      }

      this.memory.weights[pattern.type] = Math.max(0.1, this.memory.weights[pattern.type]); // Ensure weight doesn't go below 0.1

      this.normalizeWeights();
      this.updateHistory(success);
    } catch (error) {
      console.error('Learning error:', error);
      throw error;
    }
  }

  getSuccessRate(patternType) {
    const patterns = this.memory.patterns.filter(p => p.pattern.type === patternType);
    return patterns.length === 0 ? 0.5 : patterns.filter(p => p.success).length / patterns.length; // Simplified
  }

  updateConfidenceHistory(confidence) {
    this.memory.confidenceHistory.push({ confidence, timestamp: Date.now() });
    if (this.memory.confidenceHistory.length > 20) this.memory.confidenceHistory.shift();
  }

  updateHistory(success) {
    this.memory.recentResults.push(success);
    if (this.memory.recentResults.length > 10) this.memory.recentResults.shift();
  }

  normalizeWeights() {
    const total = Object.values(this.memory.weights).reduce((a, b) => a + b, 0);
    for (const key in this.memory.weights) { // Use for...in
      this.memory.weights[key] /= total;
    }
  }

  cleanup() {
    this.computationCache.clear();
  }
}

export default MLSystem;


**5. `src/LearningPath.js`:**

```javascript
import { PATTERN_TYPES } from './types';

class LearningPath {
  // ... (Constructor and updateProgress remain the same)

  generateChallenge() {
    const sequence = Array.from({ length: 5 }, (_, i) => Math.floor(Math.random() * 10) + i * 2); // More varied sequence
    const patternType = Object.values(PATTERN_TYPES)[Math.floor(Math.random() * Object.values(PATTERN_TYPES).length)]; // Random pattern

    let nextNumber;
    switch (patternType) {
      case PATTERN_TYPES.ARITHMETIC:
        nextNumber = sequence[sequence.length - 1] + (sequence[1] - sequence[0]);
        break;
      case PATTERN_TYPES.GEOMETRIC:
        nextNumber = sequence[sequence.length - 1] * (sequence[1] / sequence[0]);
