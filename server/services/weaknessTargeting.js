import { SubtopicProgressService } from './subtopicProgressService.js';
import { MBE_TOPICS, getRandomSubtopic } from './mbeTopics.js';

const subtopicProgressService = new SubtopicProgressService();

/**
 * Get targeted questions for a match based on player's weakest subtopics
 * Per North Star: 3 of 5 questions must hit weakest subtopics
 * @param {string} userId - Player's user ID
 * @param {string} subject - Subject for the match (or 'Mixed')
 * @param {number} totalQuestions - Total questions needed (5)
 * @returns {Array} Array of subtopic targets for each question
 */
export function getWeaknessTargetedQuestions(userId, subject, totalQuestions = 5) {
  const targets = [];
  
  // Get player's study recommendations (weakest areas)
  const recommendations = subtopicProgressService.getStudyRecommendations(userId);
  
  // Get player's overall mastery to determine adaptive difficulty
  const progress = subtopicProgressService.getDetailedProgress(userId);
  const overallMastery = calculateOverallMastery(progress);
  
  // Filter recommendations by subject if not mixed
  let weakAreas = recommendations;
  if (subject !== 'Mixed') {
    weakAreas = recommendations.filter(rec => 
      rec.subject === (MBE_TOPICS[subject]?.name || subject)
    );
  }
  
  // Sort by proficiency (lowest first)
  weakAreas.sort((a, b) => a.proficiencyScore - b.proficiencyScore);
  
  // First 3 questions target weakest subtopics
  const weaknessQuestions = Math.ceil(totalQuestions * 0.6); // 3 of 5
  
  for (let i = 0; i < weaknessQuestions && i < totalQuestions; i++) {
    if (weakAreas.length > 0) {
      // Pick from top 3 weakest areas, cycling through them
      const weakIndex = i % Math.min(3, weakAreas.length);
      const weakness = weakAreas[weakIndex];
      
      // Find the subject key for this weakness
      let subjectKey = subject;
      if (subject === 'Mixed') {
        subjectKey = Object.keys(MBE_TOPICS).find(key => 
          MBE_TOPICS[key].name === weakness.subject
        ) || 'Contracts';
      }
      
      // Adaptive difficulty based on overall mastery
      const adaptiveDifficulty = getAdaptiveDifficulty(overallMastery, weakness.proficiencyScore);
      
      targets.push({
        subject: subjectKey,
        subtopic: weakness.subtopic,
        targetType: 'weakness',
        proficiency: weakness.proficiencyScore,
        difficulty: adaptiveDifficulty
      });
    } else {
      // No weakness data, use random
      const targetSubject = subject === 'Mixed' 
        ? Object.keys(MBE_TOPICS)[Math.floor(Math.random() * Object.keys(MBE_TOPICS).length)]
        : subject;
      
      const randomSubtopic = getRandomSubtopic(targetSubject);
      targets.push({
        subject: targetSubject,
        subtopic: randomSubtopic?.name || 'General',
        targetType: 'random',
        proficiency: 50
      });
    }
  }
  
  // Remaining questions are medium/hard mix
  for (let i = weaknessQuestions; i < totalQuestions; i++) {
    const targetSubject = subject === 'Mixed' 
      ? Object.keys(MBE_TOPICS)[Math.floor(Math.random() * Object.keys(MBE_TOPICS).length)]
      : subject;
    
    const randomSubtopic = getRandomSubtopic(targetSubject);
    const mediumProficiency = 70 + Math.random() * 30;
    
    // Harder questions for remaining slots based on mastery
    const adaptiveDifficulty = getAdaptiveDifficulty(overallMastery, mediumProficiency);
    
    targets.push({
      subject: targetSubject,
      subtopic: randomSubtopic?.name || 'General',
      targetType: 'medium',
      proficiency: mediumProficiency,
      difficulty: Math.min(adaptiveDifficulty + 1, 10) // Slightly harder for non-weakness questions
    });
  }
  
  return targets;
}

/**
 * Calculate overall mastery from detailed progress
 */
function calculateOverallMastery(progress) {
  if (!progress.subjects || progress.subjects.length === 0) return 30;
  
  let totalProficiency = 0;
  let count = 0;
  
  progress.subjects.forEach(subject => {
    subject.subtopics.forEach(subtopic => {
      totalProficiency += subtopic.proficiencyScore;
      count++;
    });
  });
  
  return count > 0 ? totalProficiency / count : 30;
}

/**
 * Get adaptive difficulty based on user's mastery level
 * Per spec: Questions get progressively harder as players improve
 */
function getAdaptiveDifficulty(overallMastery, subtopicMastery) {
  // Average the overall and specific mastery
  const effectiveMastery = (overallMastery + subtopicMastery) / 2;
  
  // Map mastery to difficulty (1-10 scale)
  if (effectiveMastery < 20) return 1;  // Beginner
  if (effectiveMastery < 30) return 2;  // Novice
  if (effectiveMastery < 40) return 3;  // Intermediate 
  if (effectiveMastery < 50) return 4;  // Competent
  if (effectiveMastery < 60) return 5;  // Bar exam level
  if (effectiveMastery < 70) return 6;  // Advanced
  if (effectiveMastery < 80) return 7;  // Expert
  if (effectiveMastery < 90) return 8;  // Professional
  if (effectiveMastery < 95) return 9;  // Master
  return 10; // Grandmaster
}

/**
 * Log targeted questions for debugging
 */
export function logTargeting(userId, targets) {
  console.log(`🎯 Weakness Targeting for ${userId}:`);
  targets.forEach((target, i) => {
    console.log(`  Q${i+1}: ${target.subject}/${target.subtopic} (${target.targetType}, ${target.proficiency.toFixed(1)}%)`);
  });
  
  const weaknessCount = targets.filter(t => t.targetType === 'weakness').length;
  console.log(`  ✓ ${weaknessCount}/${targets.length} questions targeting weaknesses`);
}