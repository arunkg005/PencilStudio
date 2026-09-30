const compactInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  return JSON.stringify(value, null, 2).slice(0, 4000);
};

export function buildFeaturePrompt(feature, input = {}) {
  const topic = String(input.topic || input.subject || 'the requested study topic').trim();
  const material = compactInput(input.rawMaterial || input.sourceMaterial || input.material || input.content || '');

  const general = `You are the AI reasoning engine for PencilStudio. Use the user's source material as the primary evidence and keep the output practical, structured, and suitable for student use.`;

  switch (feature) {
    case 'notes':
      return `${general}\n\nGoal: Turn the provided source material into concise, useful study notes.\n\nUSER SOURCE MATERIAL\n${material || 'No source material was provided. Use a general summary for the requested topic.'}\n\nUSER INSTRUCTIONS\nCreate a study note set for the topic: ${topic}. Return valid JSON with the fields topic, title, overview, keyConcepts, definitions, examples, importantPoints, examQuestions, summary, style, and difficulty. Keep the output academically useful and easy to study.`;
    case 'quiz':
      return `${general}\n\nGoal: Generate a quiz based on the source material.\n\nUSER SOURCE MATERIAL\n${material || 'No source material was provided.'}\n\nUSER INSTRUCTIONS\nBuild a quiz on: ${topic}. Return valid JSON with topic, difficulty, and a questions array. Each question should include id, question, options, correctAnswer, and explanation.`;
    case 'flashcards':
      return `${general}\n\nGoal: Generate flashcards from the source material.\n\nUSER SOURCE MATERIAL\n${material || 'No source material was provided.'}\n\nUSER INSTRUCTIONS\nCreate flashcards on: ${topic}. Return valid JSON with topic, difficulty, and cards array, where each card has id, front, back, hint, and category.`;
    case 'presentation':
      return `${general}\n\nGoal: Generate a presentation outline.\n\nUSER SOURCE MATERIAL\n${material || 'No source material was provided.'}\n\nUSER INSTRUCTIONS\nCreate a presentation on: ${topic}. Return valid JSON with title, subtitle, style, audience, and slides. Each slide should include type, title, bullets, notes, and a brief structure.`;
    case 'mindmap':
      return `${general}\n\nGoal: Generate a structured syllabus or concept map.\n\nUSER SOURCE MATERIAL\n${material || 'No source material was provided.'}\n\nUSER INSTRUCTIONS\nCreate a mind map for: ${topic}. Return valid JSON with subject, description, and a root node containing children.`;
    case 'resume':
      return `${general}\n\nGoal: Draft a resume summary and structured sections.\n\nUSER SOURCE MATERIAL\n${material || 'No source material was provided.'}\n\nUSER INSTRUCTIONS\nUse the supplied candidate details and generate a valid resume object with name, contact, summary, education, skills, experience, projects, certifications, and achievements.`;
    case 'studyplan':
      return `${general}\n\nGoal: Create a realistic study schedule.\n\nUSER SOURCE MATERIAL\n${material || 'No source material was provided.'}\n\nUSER INSTRUCTIONS\nDesign a study plan for: ${topic}. Return valid JSON with period, subjects, schedule, summary, and warnings. Respect time windows and realistic study lengths.`;
    case 'tutor':
      return `${general}\n\nGoal: Answer a student question clearly.\n\nUSER SOURCE MATERIAL\n${material || 'No source material was provided.'}\n\nUSER INSTRUCTIONS\nAnswer the question about: ${topic}. Return valid JSON with answer, keyPoints, example, and takeaway.`;
    case 'ocrnotes':
      return `${general}\n\nGoal: Convert extracted text into clean study notes.\n\nUSER SOURCE MATERIAL\n${material || 'No source material was provided.'}\n\nUSER INSTRUCTIONS\nTurn the extracted OCR content into notes for: ${topic}. Return valid JSON with title, overview, keyPoints, definitions, importantDetails, summary, and warning.`;
    default:
      return `${general}\n\nGoal: Generate an answer for the feature: ${feature}.\n\nUSER SOURCE MATERIAL\n${material}\n\nUSER INSTRUCTIONS\nReturn valid JSON and keep the output suitable for a student productivity app.`;
  }
}

export function buildSystemInstruction() {
  return 'You are the AI reasoning engine for PencilStudio. Produce valid JSON only. Keep the output structured, concise, and grounded in the user-supplied material. Do not invent facts outside the source content.';
}
