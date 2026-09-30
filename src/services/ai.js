import { callAI } from "./aiClient.js";
import { buildFeaturePrompt } from "./aiPrompts.js";
import { coerceNotesResult, notesSchema } from "./aiSchemas.js";

const cleanText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const quizStatuses = ["Easy", "Medium", "Hard", "Mixed"];

const quizSourceLines = (text) => {
  const source = String(text || "").trim();
  if (!source) return [];
  const lines = source
    .split(/\r?\n+/)
    .map((line) => line.replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, "").trim())
    .filter((line) => line.length > 8);
  const entries = lines.length > 1 ? lines : source.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
  return [...new Set(entries)].slice(0, 20);
};

export function normalizeQuiz(quiz) {
  if (!quiz || !Array.isArray(quiz.questions)) return { topic: "", difficulty: "Mixed", questions: [] };
  const seen = new Set();
  const questions = quiz.questions.map((item, index) => {
    const id = cleanText(item?.id) || `q${index + 1}`;
    const options = Array.isArray(item?.options) ? item.options.map(cleanText).filter(Boolean).slice(0, 4) : [];
    if (seen.has(id) || !cleanText(item?.question) || options.length !== 4) return null;
    const correctAnswer = Number(item.correctAnswer);
    if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) return null;
    seen.add(id);
    return {
      id,
      question: cleanText(item.question),
      options,
      correctAnswer,
      explanation: cleanText(item.explanation),
    };
  }).filter(Boolean);
  return {
    topic: cleanText(quiz.topic),
    difficulty: quizStatuses.includes(quiz.difficulty) ? quiz.difficulty : "Mixed",
    questions,
  };
}

const callFeatureWithFallback = async (feature, formData, schema, fallbackBuilder) => {
  const result = await callAI({
    feature,
    input: formData,
    schema,
    systemInstruction: buildFeaturePrompt(feature, formData),
  });

  if (result.success) return result.data;

  const allowLocalFallback = String(import.meta.env?.VITE_ALLOW_LOCAL_AI_FALLBACK || "").toLowerCase() === "true";
  if (allowLocalFallback) return fallbackBuilder(formData);

  throw new Error(result.message || `The AI service could not generate ${feature}.`);
};

export async function generateQuiz(formData) {
  const fallback = () => {
    const topic = cleanText(formData.topic);
    const source = quizSourceLines(formData.rawMaterial);
    const requested = Math.max(5, Math.min(20, Number(formData.questionCount) || 10));
    const questions = source.slice(0, requested).map((statement, index) => {
      const distractors = source.filter((item) => item !== statement).slice(0, 3);
      while (distractors.length < 3) distractors.push(`Another point not stated in the supplied ${topic || "study"} material (${distractors.length + 1}).`);
      const correctAnswer = index % 4;
      const options = distractors.slice(0, 3);
      options.splice(correctAnswer, 0, statement);
      return {
        id: `q${index + 1}`,
        question: `According to the supplied material, which statement is correct about ${topic || "this topic"}?`,
        options,
        correctAnswer,
        explanation: `The supplied material states: ${statement}`,
      };
    });
    return normalizeQuiz({ topic, difficulty: quizStatuses.includes(formData.difficulty) ? formData.difficulty : "Mixed", questions });
  };

  const result = await callFeatureWithFallback("quiz", formData, { type: "object", properties: { topic: { type: "string" }, difficulty: { type: "string" }, questions: { type: "array", items: { type: "object" } } } }, fallback);
  return normalizeQuiz(result);
}

const normalizeList = (raw) => {
  if (!raw) return [];

  const items = String(raw)
    .split(/[\n;]+|\s*•\s*|\s*[-–]\s*/)
    .map((item) => item.replace(/^[\d*\-.\s]+/, "").trim())
    .filter(Boolean);

  return [...new Set(items)].slice(0, 18);
};

const splitEntries = (raw) => {
  if (!raw) return [];

  const direct = String(raw)
    .split(/\r?\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (direct.length > 1) {
    return direct.slice(0, 8);
  }

  const fallback = String(raw)
    .split(/(?=\b[A-Z][A-Za-z0-9&/.'"-]+\s*\b)|(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.length > 2);

  return [...new Set(fallback)].slice(0, 8);
};

export async function generateResume(formData) {
  const fallback = () => {
    const values = {
      ...formData,
      fullName: cleanText(formData.fullName),
      email: cleanText(formData.email),
      phone: cleanText(formData.phone),
      location: cleanText(formData.location),
      linkedin: cleanText(formData.linkedin),
      github: cleanText(formData.github),
      objective: cleanText(formData.objective),
      education: cleanText(formData.education),
      skills: cleanText(formData.skills),
      experience: cleanText(formData.experience),
      projects: cleanText(formData.projects),
      certifications: cleanText(formData.certifications),
      achievements: cleanText(formData.achievements),
    };

    const skillItems = normalizeList(values.skills);
    const educationItems = splitEntries(values.education);
    const experienceItems = splitEntries(values.experience);
    const projectItems = splitEntries(values.projects);
    const certificationItems = splitEntries(values.certifications);
    const achievementItems = splitEntries(values.achievements);

    const summarySource =
      values.objective ||
      [
        skillItems.slice(0, 5).join(", "),
        experienceItems[0],
        projectItems[0],
      ]
        .filter(Boolean)
        .join(" ");

    const summary =
      summarySource.length > 180
        ? summarySource.slice(0, 220).trim() + "..."
        : summarySource || "Motivated professional preparing to contribute practical experience and structured, dependable work to a team.";

    return {
      name: values.fullName || "Candidate",
      contact: {
        email: values.email ? `${values.email}` : "",
        phone: values.phone ? `${values.phone}` : "",
        location: values.location ? `${values.location}` : "",
        linkedin: values.linkedin ? `${values.linkedin}` : "",
        github: values.github ? `${values.github}` : "",
      },
      summary,
      education: educationItems,
      skills: skillItems,
      experience: experienceItems,
      projects: projectItems,
      certifications: certificationItems,
      achievements: achievementItems,
    };
  };

  return callFeatureWithFallback("resume", formData, { type: "object", properties: { name: { type: "string" }, contact: { type: "object" }, summary: { type: "string" }, education: { type: "array" }, skills: { type: "array" }, experience: { type: "array" }, projects: { type: "array" }, certifications: { type: "array" }, achievements: { type: "array" } } }, fallback);
}

const sentenceList = (text, limit = 8) => {
  const source = String(text || "").trim();
  if (!source) return [];
  const lines = source.split(/\r?\n+/).map((line) => line.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean);
  if (lines.length > 1) return [...new Set(lines)].slice(0, limit);
  return source.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean).slice(0, limit);
};

const extractDefinitions = (text) => sentenceList(text).filter((line) => /\b(is|are|means|refers to|defined as)\b/i.test(line));
const extractExamples = (text) => sentenceList(text).filter((line) => /\b(example|for instance|such as|e\.g\.?|including)\b/i.test(line));

const generateNotesFallback = async (formData) => {
  const topic = cleanText(formData.topic);
  const material = String(formData.rawMaterial || "").replace(/\s+/g, " ").trim();
  const sentences = sentenceList(material, 12);
  const requested = formData.sections || {};
  const concepts = sentences.slice(0, formData.style === "detailed" ? 8 : 5);
  const definitions = extractDefinitions(material);
  const examples = extractExamples(material);
  const importantPoints = sentences.filter((line) => /\b(important|key|must|remember|note|therefore|because)\b/i.test(line)).slice(0, 8);
  const summary = sentences.slice(0, formData.style === "concise" ? 2 : 4).join(" ");
  const examQuestions = concepts.slice(0, 5).map((item, index) => `${index + 1}. Explain or recall: ${item}`);
  const title = `${topic || "Study"} — ${formData.style === "exam" ? "Exam Review" : "Study Notes"}`;
  const output = {
    topic,
    title,
    overview: sentences.slice(0, formData.style === "detailed" ? 3 : 2).join(" "),
    keyConcepts: requested.keyConcepts ? concepts : [],
    definitions: requested.definitions ? definitions : [],
    examples: requested.examples ? examples : [],
    importantPoints: requested.importantPoints ? importantPoints : [],
    examQuestions: requested.examQuestions ? examQuestions : [],
    summary: requested.summary ? summary : "",
    style: formData.style === "exam" ? "Exam Focused" : formData.style[0].toUpperCase() + formData.style.slice(1),
    difficulty: formData.difficulty,
  };

  output.markdown = [
    `# ${output.title}`,
    `Topic: ${output.topic}`,
    output.overview && `## Overview\n${output.overview}`,
    output.keyConcepts.length && `## Key Concepts\n${output.keyConcepts.map((item) => `- ${item}`).join("\n")}`,
    output.definitions.length && `## Definitions\n${output.definitions.map((item) => `- ${item}`).join("\n")}`,
    output.examples.length && `## Examples\n${output.examples.map((item) => `- ${item}`).join("\n")}`,
    output.importantPoints.length && `## Important Points\n${output.importantPoints.map((item) => `- ${item}`).join("\n")}`,
    output.examQuestions.length && `## Exam Questions\n${output.examQuestions.join("\n")}`,
    output.summary && `## Quick Summary\n${output.summary}`,
  ].filter(Boolean).join("\n\n");

  return output;
};

export async function generateNotes(formData) {
  const result = await callAI({
    feature: "notes",
    input: formData,
    schema: notesSchema,
    systemInstruction: buildFeaturePrompt("notes", formData),
  });

  if (result.success) return coerceNotesResult(result.data);

  const allowLocalFallback = String(import.meta.env?.VITE_ALLOW_LOCAL_AI_FALLBACK || "").toLowerCase() === "true";
  if (allowLocalFallback) return generateNotesFallback(formData);

  throw new Error(result.message || "The AI service could not generate notes.");
}

const presentationSentences = (text) => {
  const source = String(text || "").trim();
  if (!source) return [];
  const lines = source.split(/\r?\n+/).map((line) => line.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean);
  if (lines.length > 1) return [...new Set(lines)];
  return source.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
};

const chunkItems = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
};

export async function generatePresentation(formData) {
  const fallback = () => {
    const topic = cleanText(formData.topic);
    const source = String(formData.sourceMaterial || "").replace(/\s+/g, " ").trim();
    const sentences = presentationSentences(source);
    const requestedCount = Number(formData.slideCount) || 10;
    const include = {
      ...(formData.include || {}),
      subtopics: formData.detail === "compact" ? false : formData.include?.subtopics !== false,
    };
    const slides = [];
    const addSlide = (slide) => slides.push({ ...slide, notes: slide.notes || "" });

    if (include.title !== false) addSlide({ type: "title", title: topic || "Untitled presentation", subtitle: `${formData.style || "Academic"} / ${formData.audience || "Undergraduate"}` });
    if (include.objectives) addSlide({ type: "objectives", title: "Learning objectives", bullets: sentences.slice(0, 3).map((item) => `Understand: ${item}`), notes: "Introduce the scope using the supplied material." });

    const sourceChunks = chunkItems(sentences, formData.style === "Detailed" ? 3 : 4);
    if (include.concepts !== false || include.examples !== false) {
      sourceChunks.forEach((chunk, index) => {
        if (slides.length >= requestedCount - 1) return;
        addSlide({ type: index % 2 === 1 && include.examples ? "example" : "content", title: index === 0 ? "The central idea" : `${topic} / source point ${index + 1}`, bullets: chunk.slice(0, 4), notes: `Source-derived slide ${index + 1}. Keep the explanation anchored to the supplied material.` });
      });
    }

    if (include.conclusion && slides.length < requestedCount) addSlide({ type: "conclusion", title: "Conclusion", bullets: sentences.slice(-3), notes: "Close by returning to the main source-derived ideas." });
    if (include.references && slides.length < requestedCount) addSlide({ type: "references", title: "References / source material", bullets: [source.slice(0, 420)], notes: "References are limited to the material supplied by the student." });
    if (slides.length === 0) addSlide({ type: "content", title: topic || "Source material", bullets: sentences.slice(0, 4), notes: "Source-derived content." });

    const fallbackBullets = sentences.length ? sentences.slice(0, 4) : ["No source material was provided."];
    while (slides.length < requestedCount) addSlide({ type: "content", title: `${topic || "Presentation"} / continued`, bullets: fallbackBullets, notes: "This slide preserves the requested deck length using source material only." });

    return {
      title: topic || "Untitled presentation",
      subtitle: `${formData.style || "Academic"} presentation for ${formData.audience || "Undergraduate"} audience`,
      style: formData.style || "Academic",
      audience: formData.audience || "Undergraduate",
      slides: slides.slice(0, requestedCount),
    };
  };

  return callFeatureWithFallback("presentation", formData, { type: "object", properties: { title: { type: "string" }, subtitle: { type: "string" }, style: { type: "string" }, audience: { type: "string" }, slides: { type: "array" } } }, fallback);
}

const mindMapUnitPattern = /^(unit|module|chapter)\s*([ivx\d]+)?\s*[:.)\-]?\s*(.*)$/i;
const mindMapNumberPattern = /^(\d+(?:\.\d+)*|[A-Z])\s*[.)\-:]\s*(.+)$/;

const cleanMindMapLine = (line) => String(line || "").replace(/^[-*•\s]+/, "").trim();

export async function generateMindMap(formData) {
  const fallback = () => {
    const subject = cleanText(formData.subject);
    const rawLines = String(formData.syllabus || "")
      .split(/\r?\n/)
      .map((line) => ({ raw: line, text: cleanMindMapLine(line), indent: line.search(/\S|$/) }))
      .filter((line) => line.text);
    const include = formData.include || {};
    const units = [];
    let currentUnit = null;
    let currentTopic = null;
    let unitCounter = 0;
    let topicCounter = 0;
    let subtopicCounter = 0;

    const createUnit = (label) => ({ id: `unit-${++unitCounter}`, label: label || `Unit ${unitCounter}`, type: "unit", children: [] });
    const createTopic = (label) => ({ id: `topic-${++topicCounter}`, label, type: "topic", children: [] });
    const createSubtopic = (label) => ({ id: `subtopic-${++subtopicCounter}`, label, type: "subtopic", children: [] });

    rawLines.forEach(({ text, indent }) => {
      const unitMatch = text.match(mindMapUnitPattern);
      if (unitMatch) {
        currentUnit = createUnit((unitMatch[3] || `Unit ${unitMatch[2] || unitCounter}`).trim());
        units.push(currentUnit);
        currentTopic = null;
        return;
      }

      const numbered = text.match(mindMapNumberPattern);
      const isSubtopic = Boolean(currentTopic && (indent > 1 || /^[-*•]/.test(String(text))));
      if (isSubtopic && include.subtopics !== false) {
        currentTopic.children.push(createSubtopic(text.replace(mindMapNumberPattern, "$2")));
        return;
      }

      const label = numbered ? numbered[2].trim() : text.replace(/[:：]\s*$/, "").trim();
      if (!currentUnit) {
        currentUnit = createUnit("Course topics");
        units.push(currentUnit);
      }
      if (include.topics !== false) {
        currentTopic = createTopic(label);
        currentUnit.children.push(currentTopic);
      } else if (include.subtopics !== false) {
        currentUnit.children.push(createSubtopic(label));
      }
    });

    if (units.length === 0) units.push(createUnit("Course topics"));
    const rootChildren = include.units === false ? units.flatMap((unit) => unit.children) : units;

    if (include.keyTerms) {
      units.forEach((unit) => {
        unit.children.forEach((topic) => {
          if (topic.type !== "topic") return;
          const terms = topic.label.split(/\s+(?:and|&|,|\/)+\s+/i).filter((term) => term.length > 2).slice(0, 3);
          terms.forEach((term) => topic.children.push(createSubtopic(`Key term: ${term.trim()}`)));
        });
      });
    }

    const root = { id: "root", label: subject || "Syllabus map", type: "root", children: rootChildren };
    return {
      subject,
      description: `A structured map of the supplied ${subject || "course"} syllabus.`,
      root,
    };
  };

  return callFeatureWithFallback("mindmap", formData, { type: "object", properties: { subject: { type: "string" }, description: { type: "string" }, root: { type: "object" } } }, fallback);
}

const tutorKnowledge = [
  {
    terms: ["stack and queue", "stack and a queue", "queue and stack", "queue and a stack", "stack vs queue", "stack queue"],
    answer: "A stack and a queue both store ordered items, but they remove items in different orders: a stack uses last in, first out (LIFO), while a queue uses first in, first out (FIFO).",
    keyPoints: ["Stack: push and pop happen at the top.", "Queue: enqueue happens at the rear and dequeue happens at the front.", "Choose a stack for newest-first work and a queue for arrival-order work."],
    example: "Browser Back history is stack-like, while documents waiting for a printer are queue-like.",
    takeaway: "The removal order is the key difference: LIFO versus FIFO.",
  },
  {
    terms: ["normalization", "1nf", "2nf", "3nf"],
    answer: "Database normalization organizes data so each fact has a clear home and unnecessary duplication is reduced.",
    keyPoints: ["1NF removes repeating groups.", "2NF removes partial dependency on a composite key.", "3NF removes transitive dependency."],
    example: "A student record and a course record can be kept in separate tables, connected through an enrollment table.",
    takeaway: "Normalize when duplicated data could become inconsistent after an update.",
  },
  {
    terms: ["stack"],
    answer: "A stack is a linear data structure that follows last in, first out (LIFO). The most recently added item is removed first.",
    keyPoints: ["push adds an item.", "pop removes the top item.", "peek reads the top item without removing it."],
    example: "Browser history can behave like a stack: pressing Back visits the most recently opened page first.",
    takeaway: "Use a stack when the newest item should be handled first.",
  },
  {
    terms: ["queue"],
    answer: "A queue is a linear data structure that follows first in, first out (FIFO). The earliest item added is handled first.",
    keyPoints: ["enqueue adds an item at the rear.", "dequeue removes an item from the front.", "The order preserves arrival sequence."],
    example: "A print queue sends the first submitted document to the printer before later documents.",
    takeaway: "Use a queue when fairness and arrival order matter.",
  },
  {
    terms: ["array"],
    answer: "An array stores a sequence of values in indexed positions, making direct access by position straightforward.",
    keyPoints: ["Indexes identify positions.", "Access by index is usually constant time.", "Inserting in the middle may require shifting later values."],
    example: "Scores[2] refers to the value stored at the third position when indexing starts at zero.",
    takeaway: "Arrays are useful when ordered, index-based access is important.",
  },
  {
    terms: ["linked list", "linked lists"],
    answer: "A linked list stores values in nodes, where each node points to the next node rather than relying on adjacent memory positions.",
    keyPoints: ["A node contains data and a link.", "Traversal follows links from a starting node.", "Insertion can avoid shifting a large block of values when a position is known."],
    example: "To insert a node after the current node, redirect the current link to the new node and the new node to the former next node.",
    takeaway: "Linked lists trade direct indexing for flexible links between nodes.",
  },
  {
    terms: ["recursion", "recursive"],
    answer: "Recursion solves a problem by having a function call itself on a smaller version of the same problem.",
    keyPoints: ["A base case stops the calls.", "The recursive case reduces the problem.", "Without progress toward the base case, calls may never stop."],
    example: "A directory traversal can process one folder, then recursively process each child folder.",
    takeaway: "Always identify the base case and the step that makes the next call smaller.",
  },
  {
    terms: ["time complexity", "big o", "complexity"],
    answer: "Time complexity describes how an algorithm's work grows as the input size grows. Big O gives an upper-growth description such as O(n) or O(log n).",
    keyPoints: ["It focuses on growth rather than exact seconds.", "O(1) does not grow with input size.", "O(n) grows proportionally with the number of items."],
    example: "Scanning every item in a list for a match is commonly O(n) because the scan may touch each item.",
    takeaway: "Compare algorithms by how their work scales with input size.",
  },
  {
    terms: ["primary key"],
    answer: "A primary key is a column, or combination of columns, that uniquely identifies each row in a table.",
    keyPoints: ["Each row should have a distinct key value.", "A primary key should not be used for two different rows.", "Other tables can refer to it with a foreign key."],
    example: "A student_id can uniquely identify one student even when two students share a name.",
    takeaway: "Use a primary key to give every row a stable identity.",
  },
  {
    terms: ["foreign key"],
    answer: "A foreign key is a column whose values refer to a key in another table, creating a relationship between rows.",
    keyPoints: ["It points to a related row.", "It helps preserve referential integrity.", "It avoids repeating the full related record."],
    example: "An enrollment table can store student_id as a foreign key that refers to the Students table.",
    takeaway: "Foreign keys connect tables while keeping related data structured.",
  },
  {
    terms: ["sql"],
    answer: "SQL is a language for working with structured relational data: selecting, inserting, updating, and deleting rows.",
    keyPoints: ["SELECT reads data.", "INSERT adds rows.", "UPDATE changes rows and DELETE removes them."],
    example: "SELECT name FROM Students WHERE subject = 'DBMS'; asks a database for matching student names.",
    takeaway: "SQL expresses operations on related tables and their rows.",
  },
  {
    terms: ["machine learning", "ml"],
    answer: "Machine learning uses examples and a learning procedure to find patterns that can support predictions or decisions.",
    keyPoints: ["Data provides examples.", "A model represents learned patterns.", "Evaluation checks how well the model works on appropriate data."],
    example: "A model can learn from labeled house records to estimate prices for new records.",
    takeaway: "The quality and suitability of the data strongly influence the learned model.",
  },
  {
    terms: ["linear regression", "regression"],
    answer: "Linear regression models a numerical outcome as a weighted combination of input features, often represented by a line or hyperplane.",
    keyPoints: ["The target is numerical.", "Weights describe each feature's contribution.", "Training chooses weights that reduce prediction error on the training data."],
    example: "Study hours can be used as an input to estimate a numerical exam score.",
    takeaway: "Use regression when the outcome you want to estimate is a number.",
  },
  {
    terms: ["classification"],
    answer: "Classification assigns an input to one of a set of categories rather than predicting a continuous number.",
    keyPoints: ["The output is a class label.", "Training examples usually include known labels.", "Evaluation can use measures such as accuracy or a confusion matrix."],
    example: "An email classifier can assign a message to spam or not spam.",
    takeaway: "Use classification when the result belongs to defined categories.",
  },
  {
    terms: ["gradient descent"],
    answer: "Gradient descent is an optimization method that repeatedly adjusts model parameters in the direction that reduces a loss function.",
    keyPoints: ["The gradient indicates how the loss changes.", "The learning rate controls step size.", "Repeated updates aim for a lower-loss parameter setting."],
    example: "A model can take a small step downhill on its error surface after each batch of training examples.",
    takeaway: "Gradient descent turns an error signal into incremental parameter updates.",
  },
  {
    terms: ["overfitting"],
    answer: "Overfitting happens when a model learns the training examples too specifically and performs poorly on new examples.",
    keyPoints: ["Training performance can look strong.", "Unseen-data performance reveals the problem.", "More suitable data or regularization can help."],
    example: "A model that memorizes individual training images may fail when the same objects appear in new lighting.",
    takeaway: "A useful model should generalize beyond the examples it saw during training.",
  },
  {
    terms: ["train test split", "train/test split", "training test split"],
    answer: "A train/test split separates data used to fit a model from data reserved for evaluating it on unseen examples.",
    keyPoints: ["Training data fits the model.", "Test data estimates generalization.", "The test set should not guide repeated tuning decisions."],
    example: "A student can train a classifier on one portion of labeled records and evaluate it on the held-out portion.",
    takeaway: "Keep evaluation data separate so performance is not measured on memorized examples.",
  },
];

const findTutorConcept = (question) => {
  const normalized = cleanText(question).toLowerCase();
  return tutorKnowledge.find((concept) => concept.terms.some((term) => normalized.includes(term))) || null;
};

export async function generateTutorResponse(formData) {
  const fallback = async () => {
    const question = cleanText(formData.question);
    if (!question) throw new Error("A question is required.");
    await new Promise((resolve) => setTimeout(resolve, 180));
    const concept = findTutorConcept(question);
    if (!concept) {
      return {
        answer: "I can structure and explain common study concepts in demo mode, but this question needs the live AI service.",
        keyPoints: [],
        example: "",
        takeaway: "Try a concept such as arrays, recursion, normalization, SQL, or gradient descent.",
        limitation: true,
      };
    }
    const level = cleanText(formData.level) || "Intermediate";
    const style = cleanText(formData.explanationStyle) || "Simple";
    const requestedStyle = /simpl(er|ly)/i.test(question) ? "Simple" : /exam/i.test(question) ? "Exam Focused" : style;
    const lead = requestedStyle === "Exam Focused" ? `For an exam answer at ${level} level: ${concept.answer}` : requestedStyle === "Detailed" ? `${concept.answer} At ${level} level, focus on how the parts relate rather than memorizing the label alone.` : requestedStyle === "Step-by-Step" ? `Step 1: identify the core idea. Step 2: connect it to the operation or example. ${concept.answer}` : `${concept.answer} This is framed for a ${level.toLowerCase()} learner.`;
    const example = /example/i.test(question) ? `Here is the practical example: ${concept.example}` : concept.example;
    return { answer: lead, keyPoints: concept.keyPoints, example, takeaway: concept.takeaway, limitation: false };
  };

  return callFeatureWithFallback("tutor", formData, { type: "object", properties: { answer: { type: "string" }, keyPoints: { type: "array" }, example: { type: "string" }, takeaway: { type: "string" } } }, fallback);
}

const flashcardDifficulties = ["Basic", "Intermediate", "Advanced", "Mixed"];
const flashcardStyles = ["Definitions", "Concepts", "Exam Revision", "Mixed"];

const flashcardSourceLines = (text) => {
  const source = String(text || "").trim();
  if (!source) return [];
  const lines = source.split(/\r?\n+/).map((line) => line.replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, "").trim()).filter((line) => line.length > 8);
  const entries = lines.length > 1 ? lines : source.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
  return [...new Set(entries)].slice(0, 30);
};

export function normalizeFlashcards(data) {
  const source = Array.isArray(data) ? { cards: data } : data || {};
  if (!Array.isArray(source.cards)) return { topic: cleanText(source.topic), difficulty: "Mixed", cards: [] };
  const seen = new Set();
  const cards = source.cards.map((card, index) => {
    const id = cleanText(card?.id) || `card-${index + 1}`;
    const front = cleanText(card?.front);
    const back = cleanText(card?.back);
    if (seen.has(id) || !front || !back) return null;
    seen.add(id);
    return { id, front, back, hint: cleanText(card?.hint), category: cleanText(card?.category) };
  }).filter(Boolean);
  return {
    topic: cleanText(source.topic),
    difficulty: flashcardDifficulties.includes(source.difficulty) ? source.difficulty : "Mixed",
    cards,
  };
}

export async function generateFlashcards(formData) {
  const fallback = () => {
    const topic = cleanText(formData.topic);
    const source = flashcardSourceLines(formData.rawMaterial);
    const requested = Math.max(5, Math.min(30, Number(formData.cardCount) || 10));
    const style = flashcardStyles.includes(formData.cardStyle) ? formData.cardStyle : "Mixed";
    const cards = source.slice(0, requested).map((statement, index) => {
      const definitionMatch = statement.match(/^(.{2,80}?)\s+(?:is|are|means|refers to|describes)\s+(.+)$/i);
      const front = style === "Definitions" && definitionMatch ? `What is ${definitionMatch[1].replace(/[.:]$/, "")}?` : `What should you remember about ${topic || "this study topic"}?`;
      return {
        id: `card-${index + 1}`,
        front,
        back: statement,
        hint: formData.includeHints ? `Recall the source point about ${topic || "this concept"}.` : "",
        category: style === "Mixed" ? "Source recall" : style,
      };
    });
    return normalizeFlashcards({ topic, difficulty: flashcardDifficulties.includes(formData.difficulty) ? formData.difficulty : "Mixed", cards });
  };

  const result = await callFeatureWithFallback("flashcards", formData, { type: "object", properties: { topic: { type: "string" }, difficulty: { type: "string" }, cards: { type: "array" } } }, fallback);
  return normalizeFlashcards(result);
}

const plannerPeriods = { "1 Day": 1, "3 Days": 3, "1 Week": 7, "2 Weeks": 14 };
const plannerPriorities = { Low: 1, Medium: 2, High: 3 };
const plannerDifficulties = { Easy: 1, Medium: 1.15, Hard: 1.3 };
const plannerWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const plannerDate = (value) => {
  const date = new Date(`${String(value || "").slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const plannerDateKey = (date) => date.toISOString().slice(0, 10);
const plannerMinutes = (value) => { const [hours, minutes] = String(value || "").split(":").map(Number); return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 ? hours * 60 + minutes : null; };
const plannerTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function normalizeStudyPlan(plan) {
  const source = plan || {};
  const schedule = Array.isArray(source.schedule) ? source.schedule.map((block, index) => {
    const start = plannerMinutes(block?.startTime);
    const end = plannerMinutes(block?.endTime);
    if (!block?.date || start === null || end === null || end <= start || !String(block.subjectName || block.subjectId || "").trim()) return null;
    return { id: String(block.id || `block-${index + 1}`), date: String(block.date).slice(0, 10), startTime: plannerTime(start), endTime: plannerTime(end), subjectId: String(block.subjectId || ""), subjectName: cleanText(block.subjectName), type: block.type === "break" ? "break" : "study", title: cleanText(block.title) || `Study ${cleanText(block.subjectName)}`, completed: Boolean(block.completed) };
  }).filter(Boolean) : [];
  return { period: { startDate: String(source.period?.startDate || ""), endDate: String(source.period?.endDate || "") }, subjects: Array.isArray(source.subjects) ? source.subjects : [], schedule, summary: source.summary || { totalStudyMinutes: 0, sessions: 0 }, warnings: Array.isArray(source.warnings) ? source.warnings.map(cleanText).filter(Boolean) : [] };
}

export async function generateStudyPlan(formData) {
  const fallback = () => {
    const startDate = plannerDate(formData.startDate) || new Date();
    const periodName = plannerPeriods[formData.period] ? formData.period : "1 Week";
    const dayCount = plannerPeriods[periodName];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + dayCount - 1);
    const subjects = (Array.isArray(formData.subjects) ? formData.subjects : []).map((subject, index) => ({ id: String(subject.id || `subject-${index + 1}`), name: cleanText(subject.name), priority: plannerPriorities[subject.priority] ? subject.priority : "Medium", difficulty: plannerDifficulties[subject.difficulty] ? subject.difficulty : "Medium", targetHours: Math.max(0, Number(subject.targetHours) || 0) })).filter((subject) => subject.name && subject.targetHours > 0);
    const sessionLength = Math.max(25, Number(formData.sessionLength) || 60);
    const breakLength = Math.max(0, Number(formData.breakLength) || 10);
    const deadline = plannerDate(formData.deadline);
    const availability = formData.availability || {};
    const windows = [];
    for (let offset = 0; offset < dayCount; offset += 1) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + offset);
      const dayName = plannerWeekdays[date.getDay()];
      const day = availability[dayName] || {};
      const start = plannerMinutes(day.startTime);
      const end = plannerMinutes(day.endTime);
      if (day.available !== false && start !== null && end !== null && end > start) windows.push({ date: plannerDateKey(date), dayName, start, end });
    }
    const preference = formData.preferredStudyTime || "Any";
    const preferredStart = preference === "Morning" ? 5 * 60 : preference === "Afternoon" ? 12 * 60 : preference === "Evening" ? 17 * 60 : 0;
    const orderedWindows = [...windows].sort((left, right) => { if (preference === "Any") return left.date.localeCompare(right.date); const leftDistance = Math.abs(left.start - preferredStart); const rightDistance = Math.abs(right.start - preferredStart); return leftDistance - rightDistance || left.date.localeCompare(right.date); });
    const slots = [];
    orderedWindows.forEach((window) => { let cursor = window.start; while (cursor + sessionLength <= window.end) { slots.push({ ...window, start: cursor, end: cursor + sessionLength }); cursor += sessionLength + breakLength; } });
    const remaining = new Map(subjects.map((subject) => [subject.id, subject.targetHours * 60]));
    const schedule = [];
    let previousSubjectId = "";
    slots.forEach((slot) => {
      const candidates = subjects.filter((subject) => remaining.get(subject.id) > 0).sort((left, right) => {
        const urgency = (subject) => { const days = deadline ? Math.ceil((deadline - plannerDate(slot.date)) / 86400000) : 30; return 1 + Math.max(0, 14 - days) / 14; };
        const score = (subject) => remaining.get(subject.id) * plannerPriorities[subject.priority] * plannerDifficulties[subject.difficulty] * urgency(subject);
        const leftScore = score(left) + (left.id === previousSubjectId && subjects.length > 1 ? -left.targetHours * 20 : 0);
        const rightScore = score(right) + (right.id === previousSubjectId && subjects.length > 1 ? -right.targetHours * 20 : 0);
        return rightScore - leftScore;
      });
      const chosen = candidates[0];
      if (!chosen) return;
      schedule.push({ id: `block-${schedule.length + 1}`, date: slot.date, startTime: plannerTime(slot.start), endTime: plannerTime(slot.end), subjectId: chosen.id, subjectName: chosen.name, type: "study", title: `Study ${chosen.name}`, completed: false });
      remaining.set(chosen.id, Math.max(0, remaining.get(chosen.id) - sessionLength));
      previousSubjectId = chosen.id;
    });
    const warnings = [];
    const unmet = [...remaining.values()].reduce((total, value) => total + value, 0);
    if (unmet > 0) warnings.push(`${Math.ceil(unmet / 60 * 10) / 10} hours of requested study time could not fit into the available schedule.`);
    if (deadline && deadline < endDate) warnings.push("The deadline falls before the end of the selected planning period.");
    if (deadline && Math.ceil((deadline - startDate) / 86400000) < 3 && unmet > 0) warnings.push("The deadline is close relative to the remaining available study time.");
    return normalizeStudyPlan({ period: { startDate: plannerDateKey(startDate), endDate: plannerDateKey(endDate) }, subjects, schedule, summary: { totalStudyMinutes: schedule.length * sessionLength, sessions: schedule.length }, warnings });
  };

  return callFeatureWithFallback("studyplan", formData, { type: "object", properties: { period: { type: "object" }, subjects: { type: "array" }, schedule: { type: "array" }, summary: { type: "object" }, warnings: { type: "array" } } }, fallback);
}

export async function generateOCRNotes(formData) {
  const fallback = () => {
    const title = cleanText(formData.title) || "Photo Study Notes";
    const text = String(formData.extractedText || "").replace(/\s+/g, " ").trim();
    const style = ["Concise", "Detailed", "Exam Focused"].includes(formData.noteStyle) ? formData.noteStyle : "Concise";
    const sentences = sentenceList(text, style === "Detailed" ? 16 : 10);
    const definitions = sentences.filter((sentence) => /\b(is|are|means|refers to|defined as|allows|maps)\b/i.test(sentence)).slice(0, style === "Detailed" ? 8 : 4);
    const keyPoints = sentences.filter((sentence) => !definitions.includes(sentence)).slice(0, style === "Concise" ? 4 : 8);
    const importantDetails = sentences.filter((sentence) => /\b(important|key|must|therefore|because|first|second|third|1nf|2nf|3nf)\b/i.test(sentence)).slice(0, 8);
    return {
      title: `${title} / ${style}`,
      overview: sentences.slice(0, style === "Detailed" ? 3 : 2).join(" "),
      keyPoints,
      definitions,
      importantDetails: importantDetails.length ? importantDetails : sentences.slice(0, style === "Exam Focused" ? 6 : 3),
      summary: sentences.slice(0, style === "Concise" ? 3 : 6).join(" "),
      warning: sentences.length < 2 ? "The extracted text is short; verify the source image before relying on these notes." : "",
    };
  };

  return callFeatureWithFallback("ocrnotes", formData, { type: "object", properties: { title: { type: "string" }, overview: { type: "string" }, keyPoints: { type: "array" }, definitions: { type: "array" }, importantDetails: { type: "array" }, summary: { type: "string" }, warning: { type: "string" } } }, fallback);
}
