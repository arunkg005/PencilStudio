import { createWorker } from "tesseract.js";

const LANGUAGE_MAP = { English: "eng" };

export async function preprocessImage(file) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function extractTextFromImage(file, onProgress = () => {}, language = "English") {
  if (!file) throw new Error("No image was supplied.");
  const languageCode = LANGUAGE_MAP[language] || LANGUAGE_MAP.English;
  let worker;
  try {
    const imageSource = await preprocessImage(file);
    worker = await createWorker(languageCode, 1, {
      logger: (event) => {
        if (typeof event?.progress === "number") onProgress({ progress: Math.round(event.progress * 100), status: event.status || "reading" });
      },
    });
    const result = await worker.recognize(imageSource);
    return String(result?.data?.text || "").trim();
  } catch {
    throw new Error("The image could not be read locally.");
  } finally {
    if (worker) await worker.terminate();
  }
}
