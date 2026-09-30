import { jsPDF } from "jspdf";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function ensureSpace(doc, y, needed = 20) {
  if (y + needed > PAGE_HEIGHT - 46) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function writeWrapped(doc, text, y, size = 10, bold = false) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(String(text || ""), CONTENT_WIDTH);
  y = ensureSpace(doc, y, Math.max(18, lines.length * (size + 3)));
  doc.text(lines, MARGIN, y);
  return y + lines.length * (size + 3) + 6;
}

export function downloadQuizPDF({ quiz, answers = {}, checked = {} }) {
  if (!quiz?.questions?.length) return false;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  let y = MARGIN;
  y = writeWrapped(doc, `${quiz.topic || "Practice Quiz"} / RESULTS`, y, 22, true);
  y = writeWrapped(doc, `Difficulty: ${quiz.difficulty || "Mixed"}`, y, 10);
  y += 8;

  const correct = quiz.questions.filter((question) => checked[question.id] && answers[question.id] === question.correctAnswer).length;
  const answered = Object.keys(answers).filter((id) => answers[id] !== undefined).length;
  y = writeWrapped(doc, `Score: ${correct} / ${quiz.questions.length} | Percentage: ${Math.round((correct / quiz.questions.length) * 100)}% | Answered: ${answered}`, y, 11, true);

  quiz.questions.forEach((question, index) => {
    y = ensureSpace(doc, y, 70);
    doc.setDrawColor(110, 110, 110);
    doc.line(MARGIN, y - 5, PAGE_WIDTH - MARGIN, y - 5);
    y = writeWrapped(doc, `QUESTION ${String(index + 1).padStart(2, "0")}`, y + 8, 9, true);
    y = writeWrapped(doc, question.question, y, 11, true);
    const selected = answers[question.id] === undefined ? "Unanswered" : question.options[answers[question.id]];
    const correctAnswer = question.options[question.correctAnswer];
    y = writeWrapped(doc, `Your answer: ${selected || "Unanswered"}`, y, 10);
    y = writeWrapped(doc, `Correct answer: ${correctAnswer}`, y, 10);
    if (question.explanation) y = writeWrapped(doc, `Explanation: ${question.explanation}`, y, 10);
    y += 4;
  });

  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${page} / ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 24, { align: "right" });
  }
  doc.save("pencilstudio-quiz-results.pdf");
  return true;
}
