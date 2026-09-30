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

function writeList(doc, items, y) {
  items.forEach((item) => {
    const lines = doc.splitTextToSize(`- ${String(item)}`, CONTENT_WIDTH - 10);
    y = ensureSpace(doc, y, lines.length * 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(lines, MARGIN + 8, y);
    y += lines.length * 13 + 4;
  });
  return y + 3;
}

export function downloadOCRNotesPDF(notes) {
  if (!notes) return false;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  let y = MARGIN;
  y = writeWrapped(doc, notes.title || "Photo Study Notes", y, 24, true);
  y += 8;
  const sections = [
    ["OVERVIEW", notes.overview, true],
    ["KEY POINTS", notes.keyPoints],
    ["DEFINITIONS", notes.definitions],
    ["IMPORTANT DETAILS", notes.importantDetails],
    ["QUICK SUMMARY", notes.summary, true],
  ];
  sections.forEach(([heading, content, prose]) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return;
    y = ensureSpace(doc, y, 32);
    doc.setDrawColor(110, 110, 110);
    doc.line(MARGIN, y - 8, PAGE_WIDTH - MARGIN, y - 8);
    y = writeWrapped(doc, heading, y, 12, true);
    y = prose ? writeWrapped(doc, content, y, 10) : writeList(doc, content, y);
  });
  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${page} / ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 24, { align: "right" });
  }
  doc.save("pencilstudio-ocr-notes.pdf");
  return true;
}
