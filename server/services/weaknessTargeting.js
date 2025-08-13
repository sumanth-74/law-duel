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
      
      targets.push({
        subject: subjectKey,
        subtopic: weakness.subtopic,
        targetType: 'weakness',
        proficiency: weakness.proficiencyScore
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
    targets.push({
      subject: targetSubject,
      subtopic: randomSubtopic?.name || 'General',
      targetType: 'medium',
      proficiency: 70 + Math.random() * 30
    });
  }
  
  return targets;
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