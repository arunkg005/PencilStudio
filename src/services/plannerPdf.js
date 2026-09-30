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

export function downloadPlannerPDF(plan) {
  if (!plan?.schedule?.length) return false;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  let y = MARGIN;
  y = writeWrapped(doc, "PencilStudio / STUDY PLAN", y, 22, true);
  y = writeWrapped(doc, `Planning period: ${plan.period?.startDate || ""} to ${plan.period?.endDate || ""}`, y, 10);
  y = writeWrapped(doc, `Total study time: ${Math.floor((plan.summary?.totalStudyMinutes || 0) / 60)}h ${(plan.summary?.totalStudyMinutes || 0) % 60}m | Sessions: ${plan.summary?.sessions || 0}`, y, 10, true);
  y += 8;
  plan.schedule.slice().sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)).forEach((block, index) => {
    y = ensureSpace(doc, y, 42);
    doc.setDrawColor(110, 110, 110);
    doc.line(MARGIN, y - 5, PAGE_WIDTH - MARGIN, y - 5);
    y = writeWrapped(doc, `${index + 1}. ${block.date} | ${block.startTime}–${block.endTime}`, y + 8, 10, true);
    y = writeWrapped(doc, `${block.subjectName} — ${block.title}${block.completed ? " [COMPLETED]" : ""}`, y, 10);
  });
  if (plan.warnings?.length) {
    y = ensureSpace(doc, y, 40);
    y = writeWrapped(doc, "CONSTRAINT WARNINGS", y, 11, true);
    plan.warnings.forEach((warning) => { y = writeWrapped(doc, `- ${warning}`, y, 10); });
  }
  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${page} / ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 24, { align: "right" });
  }
  doc.save("pencilstudio-study-plan.pdf");
  return true;
}
