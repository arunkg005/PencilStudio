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

export function downloadFlashcardsPDF({ topic, difficulty, cards }) {
  if (!Array.isArray(cards) || cards.length === 0) return false;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  let y = MARGIN;
  y = writeWrapped(doc, `${topic || "Study"} / FLASHCARDS`, y, 22, true);
  y = writeWrapped(doc, `Difficulty: ${difficulty || "Mixed"} | ${cards.length} cards`, y, 10);
  y += 8;
  cards.forEach((card, index) => {
    y = ensureSpace(doc, y, 78);
    doc.setDrawColor(110, 110, 110);
    doc.line(MARGIN, y - 5, PAGE_WIDTH - MARGIN, y - 5);
    y = writeWrapped(doc, `CARD ${String(index + 1).padStart(2, "0")}`, y + 8, 9, true);
    y = writeWrapped(doc, `FRONT: ${card.front}`, y, 11, true);
    y = writeWrapped(doc, `BACK: ${card.back}`, y, 10);
    if (card.hint) y = writeWrapped(doc, `HINT: ${card.hint}`, y, 10);
    if (card.category) y = writeWrapped(doc, `CATEGORY: ${card.category}`, y, 9);
    y += 4;
  });
  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${page} / ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 24, { align: "right" });
  }
  doc.save("pencilstudio-flashcards.pdf");
  return true;
}
