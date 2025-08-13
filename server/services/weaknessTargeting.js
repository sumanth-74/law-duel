// Weakness targeting service - ensures 3/5 questions target weak areas
import { progressService } from '../progress.js';
import { normalizeLabel, getSubtopicsForSubject, SUBJECTS } from '../taxonomy.js';

// Get questions targeting player's weaknesses
export async function getWeaknessTargetedQuestions(userId, subject, count = 5) {
  console.log(`🎯 Generating weakness-targeted questions for user ${userId}, subject: ${subject}`);
  
  // Get player's weakest subtopics
  const weakestSubtopics = progressService.getWeakestSubtopics(userId, 10);
  
  // Filter to requested subject if specified (not Mixed)
  let targetSubtopics = weakestSubtopics;
  if (subject && subject !== 'Mixed Questions') {
    const normalizedSubject = normalizeLabel(subject);
    targetSubtopics = weakestSubtopics.filter(st => 
      st.subject === normalizedSubject || 
      normalizeLabel(st.subject) === normalizedSubject
    );
  }
  
  // If no weak areas in this subject, use all subtopics
  if (targetSubtopics.length === 0 && subject && subject !== 'Mixed Questions') {
    const normalizedSubject = normalizeLabel(subject);
    const subtopics = getSubtopicsForSubject(normalizedSubject);
    targetSubtopics = subtopics.map(st => ({
      subject: normalizedSubject,
      subtopic: st,
      mastery: 50,
      priority: 50
    }));
  }
  
  // Calculate how many weakness questions (at least 3/5)
  const weaknessCount = Math.max(3, Math.ceil(count * 0.6));
  const regularCount = count - weaknessCount;
  
  const questions = [];
  const usedSubtopics = new Set();
  
  // Generate weakness-targeted questions
  for (let i = 0; i < weaknessCount && i < targetSubtopics.length; i++) {
    const target = targetSubtopics[i % targetSubtopics.length];
    
    // Calculate difficulty based on mastery (lower mastery = lower difficulty to help learning)
    const difficulty = calculateAdaptiveDifficulty(target.mastery);
    
    questions.push({
      type: 'weakness',
      subject: target.subject,
      subtopic: target.subtopic,
      difficulty,
      reason: `Targeting weak area: ${target.subject}/${target.subtopic} (Mastery: ${Math.round(target.mastery)}%)`
    });
    
    usedSubtopics.add(`${target.subject}:${target.subtopic}`);
  }
  
  // Fill remaining with regular questions (slightly harder)
  for (let i = 0; i < regularCount; i++) {
    // Pick a random subject/subtopic not already used
    let selectedSubject = subject;
    let selectedSubtopic = null;
    
    if (subject === 'Mixed Questions' || !subject) {
      const subjects = Object.keys(SUBJECTS);
      selectedSubject = subjects[Math.floor(Math.random() * subjects.length)];
    }
    
    const normalizedSubject = normalizeLabel(selectedSubject);
    const subtopics = getSubtopicsForSubject(normalizedSubject);
    
    // Try to pick an unused subtopic
    const availableSubtopics = subtopics.filter(st => 
      !usedSubtopics.has(`${normalizedSubject}:${st}`)
    );
    
    if (availableSubtopics.length > 0) {
      selectedSubtopic = availableSubtopics[Math.floor(Math.random() * availableSubtopics.length)];
    } else {
      // All subtopics used, pick any
      selectedSubtopic = subtopics[Math.floor(Math.random() * subtopics.length)];
    }
    
    // Regular questions get slightly higher difficulty
    const userProgress = progressService.getUserProgress(userId);
    const subjectMastery = userProgress[normalizedSubject]?.overall?.mastery || 50;
    const difficulty = calculateAdaptiveDifficulty(subjectMastery) + 1;
    
    questions.push({
      type: 'regular',
      subject: normalizedSubject,
      subtopic: selectedSubtopic,
      difficulty: Math.min(10, difficulty),
      reason: `Regular practice: ${normalizedSubject}/${selectedSubtopic}`
    });
  }
  
  console.log(`📊 Question distribution for ${userId}:`);
  questions.forEach((q, i) => {
    console.log(`  Q${i+1}: ${q.type} - ${q.subject}/${q.subtopic} (D${q.difficulty})`);
  });
  
  return questions;
}

// Calculate adaptive difficulty based on mastery level
function calculateAdaptiveDifficulty(mastery) {
  // Map mastery (0-100) to difficulty (1-10)
  // Lower mastery = lower difficulty to help learning
  // Higher mastery = higher difficulty for challenge
  
  if (mastery < 20) return 1;
  if (mastery < 30) return 2;
  if (mastery < 40) return 3;
  if (mastery < 50) return 4;
  if (mastery < 60) return 5;
  if (mastery < 70) return 6;
  if (mastery < 80) return 7;
  if (mastery < 90) return 8;
  if (mastery < 95) return 9;
  return 10;
}

// Log targeting decision for monitoring
export function logTargeting(userId, questions) {
  const weaknessCount = questions.filter(q => q.type === 'weakness').length;
  const regularCount = questions.filter(q => q.type === 'regular').length;
  
  console.log(`🎯 Weakness targeting for ${userId}:`);
  console.log(`   Weakness questions: ${weaknessCount}/${questions.length}`);
  console.log(`   Regular questions: ${regularCount}/${questions.length}`);
  console.log(`   Target met: ${weaknessCount >= 3 ? '✅' : '❌'} (≥3 weakness questions)`);
  
  return {
    total: questions.length,
    weakness: weaknessCount,
    regular: regularCount,
    targetMet: weaknessCount >= 3
  };
}