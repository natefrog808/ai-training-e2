import { PATTERN_TYPES } from './types';

class LearningPath {
  constructor(track) {
    this.track = track;
    this.level = 1;
    this.experience = 0;
    this.challenges = [];
    this.completedChallenges = [];
    this.patternPerformance = {};
  }

  updateProgress(result) {
    this.experience += result.score;
    this.completedChallenges.push({ ...result, timestamp: Date.now() });

    if (result.pattern?.type) {
      this.patternPerformance[result.pattern.type] = this.patternPerformance[result.pattern.type] || { success: 0, total: 0 };
      this.patternPerformance[result.pattern.type].total++;
      if (result.success) {
        this.patternPerformance[result.pattern.type].success++;
      }
    }

    const levelThreshold = this.level * 1000;
    if (this.experience >= levelThreshold) {
      this.level++;
      this.experience -= levelThreshold;
    }
  }

  generateChallenge() {
    const sequence = Array.from({ length: 5 }, (_, i) => Math.floor(Math.random() * 10) + i * 2);
    const patternType = Object.values(PATTERN_TYPES)[Math.floor(Math.random() * Object.values(PATTERN_TYPES).length)];

    let nextNumber;
    switch (patternType) {
      case PATTERN_TYPES.ARITHMETIC:
        nextNumber = sequence[sequence.length - 1] + (sequence[1] - sequence[0]);
        break;
      case PATTERN_TYPES.GEOMETRIC:
        nextNumber = sequence[sequence.length - 1] * (sequence[1] / sequence[0]);
        break;
      case PATTERN_TYPES.QUADRATIC:
        nextNumber = (sequence.length + 1)**2 + 2 * (sequence.length + 1) + 1; // Example
        break;
      case PATTERN_TYPES.EXPONENTIAL:
        nextNumber = sequence[sequence.length - 1] * 2; // Example
        break;
      default:
        nextNumber = sequence[sequence.length - 1] * 2;
    }

    return {
      type: 'pattern',
      data: {
        sequence,
        nextNumber: Math.round(nextNumber),
        pattern: { type: patternType },
      },
      startTime: Date.now(),
    };
  }

  getProgressReport() {
    const successRate = this.completedChallenges.filter(c => c.success).length / Math.max(1, this.completedChallenges.length);

    return {
      currentLevel: `Level ${this.level}`,
      experiencePoints: this.experience,
      levelProgress: this.experience / (this.level * 1000),
      successRate,
      challengesCompleted: this.completedChallenges.length,
      recentHistory: this.completedChallenges.slice(-5),
      patternPerformance: this.patternPerformance,
      recommendations: this.getRecommendations(),
    };
  }

  getRecommendations() {
    const weakPatterns = Object.entries(this.patternPerformance)
      .filter(([, stats]) => stats.success / stats.total < 0.7)
      .map(([pattern]) => `Practice ${pattern} patterns to improve performance`);

    if (this.level < 2 && this.completedChallenges.length < 5) {
      weakPatterns.push('Complete more challenges to establish your baseline');
    }

    return weakPatterns;
  }
}

export default LearningPath;
