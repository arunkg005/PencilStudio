import { jsPDF } from "jspdf";

const pageHeight = 792;
const leftMargin = 52;
const rightMargin = 52;
const contentWidth = 595 - leftMargin - rightMargin;

function ensureSpace(doc, y) {
  if (y > pageHeight - 72) {
    doc.addPage();
    return 52;
  }

  return y;
}

function drawSection(doc, title, items, y) {
  if (!items || items.length === 0) {
    return y;
  }

  y = ensureSpace(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, leftMargin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  items.forEach((item) => {
    const text = String(item).trim();
    if (!text) return;

    const bulletText = `• ${text}`;
    const lines = doc.splitTextToSize(bulletText, contentWidth);

    y = ensureSpace(doc, y);
    if (y + lines.length * 11 > pageHeight - 30) {
      doc.addPage();
      y = 52;
    }

    doc.text(lines, leftMargin, y);
    y += lines.length * 11 + 6;
  });

  return y + 4;
}

export function downloadResumePDF(resumeData) {
  if (!resumeData) {
    return;
  }

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  let y = 52;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(resumeData.name || "Candidate", leftMargin, y);
  y += 24;

  const contactParts = [
    resumeData.contact?.email,
    resumeData.contact?.phone,
    resumeData.contact?.location,
  ].filter(Boolean);

  const socialParts = [
    resumeData.contact?.github,
    resumeData.contact?.linkedin,
  ].filter(Boolean);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);

  if (contactParts.length > 0) {
    y = ensureSpace(doc, y);
    doc.text(contactParts.join(" | "), leftMargin, y);
    y += 16;
  }

  if (socialParts.length > 0) {
    y = ensureSpace(doc, y);
    doc.text(socialParts.join(" | "), leftMargin, y);
    y += 16;
  }

  if (resumeData.summary) {
    y = ensureSpace(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PROFESSIONAL SUMMARY", leftMargin, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(resumeData.summary, contentWidth);

    y = ensureSpace(doc, y);
    doc.text(summaryLines, leftMargin, y);
    y += summaryLines.length * 12 + 12;
  }

  const sections = [
    ["EDUCATION", resumeData.education],
    ["SKILLS", resumeData.skills],
    ["EXPERIENCE", resumeData.experience],
    ["PROJECTS", resumeData.projects],
    ["CERTIFICATIONS", resumeData.certifications],
    ["ACHIEVEMENTS", resumeData.achievements],
  ];

  sections.forEach(([title, items]) => {
    if (!items || items.length === 0) {
      return;
    }

    y = drawSection(doc, title, items, y);
  });

  doc.save("pencilstudio-resume.pdf");
}
