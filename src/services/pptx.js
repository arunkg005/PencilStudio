import pptxgen from "pptxgenjs";

const colors = { graphite: "171717", soft: "444444", paper: "FAF8F2", line: "B7B2A8" };

function safeText(value) {
  return String(value || "").trim();
}

function addFooter(slide, index, total) {
  slide.addText(`${String(index + 1).padStart(2, "0")} / ${total}`, { x: 11.7, y: 7.05, w: 1, h: 0.2, fontFace: "Aptos", fontSize: 9, color: colors.soft, align: "right", margin: 0 });
}

function addSlideText(slide, slideData, index, total, lineShape) {
  const isTitle = slideData.type === "title";
  slide.background = { color: colors.paper };
  slide.addShape(lineShape, { x: 0.65, y: 0.65, w: 12, h: 0, line: { color: colors.line, width: 1 } });
  slide.addText(isTitle ? "PENCILSTUDIO / PRESENTATION" : `SLIDE ${String(index + 1).padStart(2, "0")}`, { x: 0.7, y: 0.35, w: 5, h: 0.2, fontFace: "Aptos", fontSize: 10, bold: true, charSpacing: 1.4, color: colors.soft, margin: 0 });
  slide.addText(safeText(slideData.title), { x: 0.7, y: isTitle ? 2.15 : 1.35, w: 11.3, h: isTitle ? 0.8 : 0.65, fontFace: "Aptos Display", fontSize: isTitle ? 34 : 28, bold: true, color: colors.graphite, fit: "shrink", margin: 0 });
  if (slideData.subtitle) slide.addText(safeText(slideData.subtitle), { x: 0.72, y: isTitle ? 3.18 : 2.15, w: 10.7, h: 0.45, fontFace: "Aptos", fontSize: isTitle ? 18 : 14, color: colors.soft, fit: "shrink", margin: 0 });
  if (slideData.bullets?.length) slide.addText(slideData.bullets.slice(0, 6).map((bullet) => `• ${safeText(bullet)}`).join("\n"), { x: 0.85, y: 2.85, w: 10.9, h: 3.45, fontFace: "Aptos", fontSize: 20, color: colors.graphite, fit: "shrink", valign: "mid", margin: 0.08, paraSpaceAfterPt: 12 });
  addFooter(slide, index, total);
  if (slideData.notes && typeof slide.addNotes === "function") slide.addNotes(safeText(slideData.notes));
}

export async function downloadPresentation(deck) {
  if (!deck?.slides?.length) return;
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "PencilStudio";
  pptx.subject = deck.title || "Presentation";
  pptx.title = deck.title || "Presentation";
  pptx.company = "PencilStudio";
  pptx.lang = "en-US";
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos", lang: "en-US" };
  deck.slides.forEach((slideData, index) => addSlideText(pptx.addSlide(), slideData, index, deck.slides.length, pptx.ShapeType.line));
  await pptx.writeFile({ fileName: `${(deck.title || "pencilstudio-presentation").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pptx` });
}