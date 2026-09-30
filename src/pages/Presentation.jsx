import { useEffect, useRef, useState } from "react";

import { generatePresentation } from "../services/ai";
import { downloadPresentation } from "../services/pptx";

const initialForm = {
  topic: "",
  sourceMaterial: "",
  slideCount: "10",
  style: "Academic",
  audience: "Undergraduate",
  include: { title: true, objectives: true, concepts: true, examples: true, conclusion: true, references: false },
};

const includeOptions = [["title", "Title Slide"], ["objectives", "Learning Objectives"], ["concepts", "Key Concepts"], ["examples", "Examples"], ["conclusion", "Conclusion"], ["references", "References"]];

function validate(form) {
  return {
    ...(form.topic.trim() ? {} : { topic: "name the presentation first" }),
    ...(form.sourceMaterial.trim() ? {} : { sourceMaterial: "paste some source material first" }),
  };
}

function Status({ status, message }) {
  const label = status === "sketching" ? "SKETCHING" : status === "generated" ? "GENERATED" : status === "error" ? "ERROR" : "READY";
  return <div className={`presentation-status presentation-status-${status}`} aria-live="polite"><span className="presentation-status-mark" aria-hidden="true" /><span>DECK STATUS:</span><strong>{label}</strong>{message && <span className="presentation-status-message">{message}</span>}</div>;
}

function SlideSheet({ slide, index, total }) {
  return <article className={`slide-sheet slide-sheet-${slide.type}`} aria-label={`Slide ${index + 1}: ${slide.title}`}>
    <div className="slide-sheet-topline"><span>{slide.type === "title" ? "PENCILSTUDIO / DECK" : `SLIDE ${String(index + 1).padStart(2, "0")}`}</span><span>{String(index + 1).padStart(2, "0")} / {total}</span></div>
    <div className="slide-sheet-content"><h2>{slide.title}</h2>{slide.subtitle && <p className="slide-sheet-subtitle">{slide.subtitle}</p>}{slide.bullets?.length > 0 && <ul>{slide.bullets.map((bullet, bulletIndex) => <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>)}</ul>}</div>
    <div className="slide-sheet-corner" aria-hidden="true" />
  </article>;
}

function SlideEditor({ slide, onChange }) {
  const update = (field, value) => onChange({ ...slide, [field]: value });
  return <div className="slide-editor" aria-label="Edit current slide">
    <div className="slide-editor-heading"><strong>Edit Slide</strong><span>keep it clear / keep it short</span></div>
    <label>Slide title<input value={slide.title || ""} onChange={(event) => update("title", event.target.value)} /></label>
    <label>Subtitle<textarea rows={2} value={slide.subtitle || ""} onChange={(event) => update("subtitle", event.target.value)} /></label>
    <label>Bullet points<textarea rows={Math.max(3, (slide.bullets || []).length)} value={(slide.bullets || []).join("\n")} onChange={(event) => update("bullets", event.target.value.split(/\r?\n/).filter(Boolean).slice(0, 6))} /></label>
    <label>Speaker notes<textarea rows={3} value={slide.notes || ""} onChange={(event) => update("notes", event.target.value)} /></label>
  </div>;
}

export default function Presentation() {
  const [form, setForm] = useState(initialForm);
  const [deck, setDeck] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [status, setStatus] = useState("ready");
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!deck || isEditing || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (event.key === "ArrowRight") setSlideIndex((value) => Math.min(value + 1, deck.slides.length - 1));
      if (event.key === "ArrowLeft") setSlideIndex((value) => Math.max(value - 1, 0));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deck, isEditing]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setFeedback("");
  };

  const updateInclude = (event) => {
    const { name, checked } = event.target;
    setForm((previous) => ({ ...previous, include: { ...previous.include, [name]: checked } }));
  };

  const generate = (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); setStatus("error"); setFeedback("check the marked fields"); inputRef.current?.focus(); return; }
    setErrors({}); setFeedback(""); setStatus("sketching"); setIsGenerating(true);
    timerRef.current = setTimeout(async () => {
      try { const generated = await generatePresentation(form); setDeck(generated); setSlideIndex(0); setStatus("generated"); }
      catch { setStatus("error"); setFeedback("the desk could not draw that deck"); }
      finally { setIsGenerating(false); }
    }, 850);
  };

  const clearAll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setForm(initialForm); setDeck(null); setSlideIndex(0); setStatus("ready"); setErrors({}); setFeedback(""); setIsGenerating(false); setIsEditing(false);
  };

  const updateSlide = (slide) => setDeck((previous) => ({ ...previous, slides: previous.slides.map((item, index) => index === slideIndex ? slide : item) }));
  const addSlide = () => { setDeck((previous) => ({ ...previous, slides: [...previous.slides, { type: "content", title: "New slide", subtitle: "", bullets: [], notes: "" }] })); setSlideIndex(deck.slides.length); setIsEditing(true); };
  const deleteSlide = () => { if (!deck || deck.slides.length <= 1) return; setDeck((previous) => ({ ...previous, slides: previous.slides.filter((_, index) => index !== slideIndex) })); setSlideIndex((value) => Math.max(0, Math.min(value, deck.slides.length - 2))); };

  const copyOutline = async () => {
    if (!deck) return;
    const outline = deck.slides.map((slide, index) => [`SLIDE ${index + 1}: ${slide.title}`, ...(slide.bullets || []).map((bullet) => `- ${bullet}`)].join("\n")).join("\n\n");
    try { await navigator.clipboard.writeText(outline); setFeedback("OUTLINE COPIED ✓"); } catch { setStatus("error"); setFeedback("copy was not available in this browser"); }
  };

  const download = async () => {
    try { await downloadPresentation(deck); setFeedback("PPTX READY ✓"); } catch { setStatus("error"); setFeedback("the PowerPoint could not be prepared"); }
  };

  const currentSlide = deck?.slides?.[slideIndex];

  return <div className="page presentation-page">
    <header className="presentation-header"><div className="presentation-kicker"><span>03</span><span>/</span><span>AI PRESENTATION BUILDER</span></div><h1 className="hand">BUILD THE DECK.</h1><p>Turn a topic, syllabus, or rough material into a structured presentation.</p></header>
    <div className="presentation-flow"><span>IDEA</span><b>→</b><span>STRUCTURE</span><b>→</b><span>SLIDES</span></div>
    <div className="presentation-layout">
      <section className="presentation-input-panel" ref={inputRef}>
        <div className="presentation-panel-heading"><strong>Input Worksheet</strong><span>give the desk a direction</span></div>
        <form className="presentation-form" onSubmit={generate} noValidate>
          <div className={`presentation-field ${errors.topic ? "presentation-field-error" : ""}`}><label htmlFor="presentation-topic">Presentation Topic *</label><input id="presentation-topic" name="topic" value={form.topic} onChange={updateField} placeholder="e.g. Artificial Intelligence in Healthcare" aria-invalid={Boolean(errors.topic)} /><small>{errors.topic || "what should the deck explain?"}</small></div>
          <div className={`presentation-field ${errors.sourceMaterial ? "presentation-field-error" : ""}`}><label htmlFor="presentation-source">Source Material *</label><textarea id="presentation-source" name="sourceMaterial" value={form.sourceMaterial} onChange={updateField} placeholder="Paste lecture material, syllabus content, rough notes, or textbook material here..." rows={10} aria-invalid={Boolean(errors.sourceMaterial)} /><small>{errors.sourceMaterial || "the generator stays grounded in this material"}</small></div>
          <fieldset className="presentation-option-group"><legend>Number of Slides</legend><div className="presentation-choice-grid presentation-choice-grid-five">{[5, 7, 10, 12, 15].map((count) => <label className={`presentation-choice ${form.slideCount === String(count) ? "selected" : ""}`} key={count}><input type="radio" name="slideCount" value={count} checked={form.slideCount === String(count)} onChange={updateField} /><span>{count}</span></label>)}</div></fieldset>
          <div className="presentation-select-row"><label>Presentation Style<select name="style" value={form.style} onChange={updateField}><option>Academic</option><option>Minimal</option><option>Exam / Revision</option><option>Technical</option></select></label><label>Audience<select name="audience" value={form.audience} onChange={updateField}><option>School</option><option>Undergraduate</option><option>Technical</option><option>General</option></select></label></div>
          <fieldset className="presentation-option-group"><legend>Include</legend><div className="presentation-check-grid">{includeOptions.map(([name, label]) => <label className="presentation-check" key={name}><input type="checkbox" name={name} checked={form.include[name]} onChange={updateInclude} /><span>{label}</span></label>)}</div></fieldset>
          <div className="presentation-form-footer"><span className="presentation-hand-note">make the first draft visible</span><button type="submit" className="presentation-generate-button" disabled={isGenerating}>{isGenerating ? "Drawing..." : "Generate Presentation →"}</button></div>
        </form>
      </section>
      <section className="presentation-preview-panel">
        <div className="presentation-panel-topline"><span className="presentation-annotation">02 / SLIDE PREVIEW</span><Status status={isGenerating ? "sketching" : status} message={feedback} /></div>
        {!deck ? <div className="slide-empty"><div className="slide-empty-outline" aria-hidden="true" /><div className="slide-empty-title">YOUR DECK WILL APPEAR HERE.</div><div className="slide-empty-subtitle">Give the desk a topic and some source material.</div></div> : status === "sketching" ? <div className="slide-empty"><div className="presentation-loader-lines" aria-hidden="true"><span /><span /><span /><span /></div><div className="slide-empty-title">AI IS DRAWING THE DECK...</div></div> : <><div className="slide-toolbar"><button type="button" className="presentation-small-button" onClick={() => setSlideIndex((value) => Math.max(0, value - 1))} disabled={slideIndex === 0}>← Previous</button><span>{slideIndex + 1} / {deck.slides.length}</span><button type="button" className="presentation-small-button" onClick={() => setSlideIndex((value) => Math.min(deck.slides.length - 1, value + 1))} disabled={slideIndex === deck.slides.length - 1}>Next →</button></div>{isEditing ? <SlideEditor slide={currentSlide} onChange={updateSlide} /> : <SlideSheet slide={currentSlide} index={slideIndex} total={deck.slides.length} />}<div className="presentation-actions"><button type="button" className="presentation-action-button" onClick={() => setIsEditing((value) => !value)}>{isEditing ? "Done Editing" : "Edit Deck"}</button><button type="button" className="presentation-action-button" onClick={addSlide}>Add Slide</button><button type="button" className="presentation-action-button" onClick={deleteSlide} disabled={deck.slides.length <= 1}>Delete Slide</button><button type="button" className="presentation-action-button" onClick={copyOutline}>Copy Outline</button><button type="button" className="presentation-action-button primary" onClick={download}>Download PPTX</button><button type="button" className="presentation-action-button" onClick={clearAll}>Clear</button></div></>}
      </section>
    </div>
  </div>;
}
