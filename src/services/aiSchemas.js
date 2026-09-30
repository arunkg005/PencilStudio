const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const toStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => cleanText(entry)).filter(Boolean);
};

export const notesSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    title: { type: 'string' },
    overview: { type: 'string' },
    keyConcepts: { type: 'array', items: { type: 'string' } },
    definitions: { type: 'array', items: { type: 'string' } },
    examples: { type: 'array', items: { type: 'string' } },
    importantPoints: { type: 'array', items: { type: 'string' } },
    examQuestions: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    style: { type: 'string' },
    difficulty: { type: 'string' },
    markdown: { type: 'string' },
  },
  required: ['topic', 'title', 'overview', 'summary'],
};

export const quizSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    difficulty: { type: 'string' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correctAnswer: { type: 'integer' },
          explanation: { type: 'string' },
        },
        required: ['id', 'question', 'options', 'correctAnswer', 'explanation'],
      },
    },
  },
  required: ['topic', 'questions'],
};

export const flashcardsSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    difficulty: { type: 'string' },
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          front: { type: 'string' },
          back: { type: 'string' },
          hint: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['id', 'front', 'back'],
      },
    },
  },
  required: ['topic', 'cards'],
};

export const tutorSchema = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    keyPoints: { type: 'array', items: { type: 'string' } },
    example: { type: 'string' },
    takeaway: { type: 'string' },
  },
  required: ['answer', 'keyPoints', 'takeaway'],
};

export const mindMapSchema = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    description: { type: 'string' },
    root: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        type: { type: 'string' },
        children: { type: 'array', items: { type: 'object' } },
      },
      required: ['id', 'label', 'type'],
    },
  },
  required: ['subject', 'root'],
};

export const presentationSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    style: { type: 'string' },
    audience: { type: 'string' },
    slides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
          subtitle: { type: 'string' },
        },
        required: ['type', 'title'],
      },
    },
  },
  required: ['title', 'slides'],
};

export const studyPlanSchema = {
  type: 'object',
  properties: {
    period: {
      type: 'object',
      properties: {
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
    },
    subjects: { type: 'array', items: { type: 'object' } },
    schedule: { type: 'array', items: { type: 'object' } },
    summary: { type: 'object' },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['period', 'subjects', 'schedule'],
};

export const resumeSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    contact: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        location: { type: 'string' },
        linkedin: { type: 'string' },
        github: { type: 'string' },
      },
    },
    summary: { type: 'string' },
    education: { type: 'array', items: { type: 'string' } },
    skills: { type: 'array', items: { type: 'string' } },
    experience: { type: 'array', items: { type: 'string' } },
    projects: { type: 'array', items: { type: 'string' } },
    certifications: { type: 'array', items: { type: 'string' } },
    achievements: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'summary'],
};

export const ocrNotesSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    overview: { type: 'string' },
    keyPoints: { type: 'array', items: { type: 'string' } },
    definitions: { type: 'array', items: { type: 'string' } },
    importantDetails: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    warning: { type: 'string' },
  },
  required: ['title', 'overview', 'summary'],
};

export function coerceNotesResult(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const topic = cleanText(source.topic || source.subject || 'Study topic');
  const title = cleanText(source.title || `${topic} Notes`);
  const overview = cleanText(source.overview || (Array.isArray(source.keyConcepts) ? source.keyConcepts.join(' ') : ''));
  const summary = cleanText(source.summary || overview);

  return {
    topic,
    title,
    overview,
    keyConcepts: toStringArray(source.keyConcepts),
    definitions: toStringArray(source.definitions),
    examples: toStringArray(source.examples),
    importantPoints: toStringArray(source.importantPoints),
    examQuestions: toStringArray(source.examQuestions),
    summary,
    style: cleanText(source.style || 'Concise'),
    difficulty: cleanText(source.difficulty || 'Intermediate'),
    markdown: cleanText(source.markdown || `${title}\n\n${summary}`),
  };
}
