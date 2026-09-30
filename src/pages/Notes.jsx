import { useEffect, useRef, useState } from "react";

import { generateNotes } from "../services/ai";
import { downloadNotesPDF } from "../services/notesPdf";

const initialForm = {
  topic: "",
  rawMaterial: "",
  style: "concise",
  difficulty: "intermediate",
  sections: {
    keyConcepts: true,
    definitions: true,
    examples: true,
    importantPoints: true,
    examQuestions: false,
    summary: true,
  },
};

const sectionOptions = [
  ["keyConcepts", "Key Concepts"],
  ["definitions", "Definitions"],
  ["examples", "Examples"],
  ["importantPoints", "Important Points"],
  ["examQuestions", "Exam Questions"],
  ["summary", "Summary"],
];

const clean = (value) => String(value || "").trim();

function validate(form) {
  const errors = {};
  if (!clean(form.topic)) errors.topic = "write a topic first";
  if (!clean(form.rawMaterial)) errors.rawMaterial = "paste some raw material first";
  return errors;
}

function NotesStatus({ status, message }) {
  const label = status === "sketching" ? "SKETCHING" : status === "generated" ? "GENERATED" : status === "error" ? "ERROR" : "READY";
  return (
    <div className={`notes-status notes-status-${status}`} aria-live="polite">
      <span className="notes-status-mark" aria-hidden="true" />
      <span>DESK STATUS:</span>
      <strong>{label}</strong>
      {message && <span className="notes-status-message">{message}</span>}
    </div>
  );
}

function NotesLoader() {
  return (
    <div className="notes-loader" aria-live="polite">
      <div className="notes-loader-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>AI IS ORGANIZING YOUR NOTES...</p>
    </div>
  );
}

function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  });
}

function MarkdownText({ text }) {
  const lines = String(text || "").split(/\r?\n/);
  return (
    <div className="notes-markdown">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div className="notes-markdown-gap" key={index} />;
        if (trimmed.startsWith("### ")) return <h4 key={index}>{renderInline(trimmed.slice(4))}</h4>;
        if (trimmed.startsWith("## ")) return <h3 key={index}>{renderInline(trimmed.slice(3))}</h3>;
        if (trimmed.startsWith("# ")) return <h2 key={index}>{renderInline(trimmed.slice(2))}</h2>;
        if (/^[-*] /.test(trimmed)) return <li key={index}>{renderInline(trimmed.slice(2))}</li>;
        if (/^\d+\. /.test(trimmed)) return <li className="notes-numbered-item" key={index}>{renderInline(trimmed.replace(/^\d+\. /, ""))}</li>;
        return <p key={index}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

function NotesSection({ title, items, prose = false }) {
  if (!items || (Array.isArray(items) && items.length === 0)) return null;
  const content = Array.isArray(items) ? (
    <ul className="notes-list">
      {items.map((item, index) => <li key={`${title}-${index}`}><MarkdownText text={item} /></li>)}
    </ul>
  ) : prose ? <MarkdownText text={items} /> : <p>{items}</p>;

  return (
    <section className="notes-content-section">
      <h2>{title}</h2>
      {content}
    </section>
  );
}

function NotesPreview({ notes, status, onEdit, onCopy, onDownload, onClear, copyStatus }) {
  let content;
  if (status === "sketching") {
    content = <div className="notes-paper notes-paper-loading"><NotesLoader /></div>;
  } else if (!notes) {
    content = (
      <div className="notes-paper notes-paper-empty">
        <div className="notes-paper-mark notes-paper-mark-one" aria-hidden="true" />
        <div className="notes-paper-mark notes-paper-mark-two" aria-hidden="true" />
        <div className="notes-empty-title">YOUR NOTES WILL APPEAR HERE.</div>
        <div className="notes-empty-subtitle">Feed the desk some raw material.</div>
      </div>
    );
  } else {
    content = (
      <article className="notes-paper notes-paper-ready">
        <header className="notes-document-header">
          <div className="notes-document-label">STUDY NOTES / {notes.difficulty.toUpperCase()}</div>
          <h2>{notes.title}</h2>
          <p>{notes.topic} <span>/</span> {notes.style} <span>/</span> structured draft</p>
        </header>
        <NotesSection title="Overview" items={notes.overview} prose />
        <NotesSection title="Key Concepts" items={notes.keyConcepts} />
        <NotesSection title="Definitions" items={notes.definitions} />
        <NotesSection title="Examples" items={notes.examples} />
        <NotesSection title="Important Points" items={notes.importantPoints} />
        <NotesSection title="Exam Questions" items={notes.examQuestions} />
        <NotesSection title="Quick Summary" items={notes.summary} prose />
      </article>
    );
  }

  return (
    <section className="notes-preview-panel">
      <div className="notes-panel-topline">
        <span className="notes-annotation">03 / STUDY NOTES</span>
        <NotesStatus status={status} message={copyStatus} />
      </div>
      {content}
      <div className="notes-actions">
        <button type="button" className="notes-action-button" onClick={onEdit}>Edit Input</button>
        <button type="button" className="notes-action-button" disabled={!notes} onClick={onCopy}>{copyStatus || "Copy Notes"}</button>
        <button type="button" className="notes-action-button" disabled={!notes} onClick={onDownload}>Download PDF</button>
        <button type="button" className="notes-action-button notes-action-clear" onClick={onClear}>Clear</button>
      </div>
    </section>
  );
}

export default function Notes() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [notes, setNotes] = useState(null);
  const [status, setStatus] = useState("ready");
  const [feedback, setFeedback] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setFeedback("");
  };

  const updateSection = (event) => {
    const { name, checked } = event.target;
    setForm((previous) => ({ ...previous, sections: { ...previous.sections, [name]: checked } }));
  };

  const clearAll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setForm(initialForm);
    setErrors({});
    setNotes(null);
    setFeedback("");
    setStatus("ready");
    setIsGenerating(false);
  };

  const generate = (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setStatus("error");
      setFeedback("check the marked fields");
      inputRef.current?.focus();
      return;
    }

    setErrors({});
    setFeedback("");
    setStatus("sketching");
    setIsGenerating(true);
    timerRef.current = setTimeout(async () => {
      try {
        const generated = await generateNotes(form);
        setNotes(generated);
        setStatus("generated");
      } catch {
        setStatus("error");
        setFeedback("the desk could not organize that material");
      } finally {
        setIsGenerating(false);
      }
    }, 850);
  };

  const editInput = () => {
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    inputRef.current?.focus();
  };

  const copyNotes = async () => {
    if (!notes) return;
    try {
      await navigator.clipboard.writeText(notes.markdown);
      setFeedback("NOTES COPIED ✓");
    } catch {
      setStatus("error");
      setFeedback("copy was not available in this browser");
    }
  };

  const download = () => {
    try {
      downloadNotesPDF(notes);
      setFeedback("PDF READY ✓");
    } catch {
      setStatus("error");
      setFeedback("the PDF could not be prepared");
    }
  };

  return (
    <div className="page notes-page">
      <header className="notes-header">
        <div className="notes-kicker"><span>02</span><span>/</span><span>AI NOTES GENERATOR</span></div>
        <h1 className="hand">TURN RAW MATERIAL INTO NOTES.</h1>
        <p>Paste a topic, lecture text, textbook content, or rough material and turn it into structured study notes.</p>
      </header>

      <div className="notes-flow" aria-label="notes generation flow">
        <span>INPUT</span><b>→</b><span>STRUCTURE</span><b>→</b><span>STUDY NOTES</span>
      </div>

      <div className="notes-layout">
        <section className="notes-input-panel" ref={inputRef}>
          <div className="notes-panel-heading"><strong>Input Worksheet</strong><span>start with the rough material</span></div>
          <form className="notes-form" onSubmit={generate} noValidate>
            <div className={`notes-field ${errors.topic ? "notes-field-error" : ""}`}>
              <label htmlFor="notes-topic">Topic / Subject *</label>
              <input id="notes-topic" name="topic" value={form.topic} onChange={updateField} placeholder="e.g. Database Normalization" aria-invalid={Boolean(errors.topic)} />
              <small>{errors.topic || "name the idea you are studying"}</small>
            </div>

            <div className={`notes-field ${errors.rawMaterial ? "notes-field-error" : ""}`}>
              <label htmlFor="notes-material">Raw Material *</label>
              <textarea id="notes-material" name="rawMaterial" value={form.rawMaterial} onChange={updateField} placeholder="Paste lecture notes, textbook text, assignment material, or rough notes here..." rows={12} aria-invalid={Boolean(errors.rawMaterial)} />
              <small>{errors.rawMaterial || "rough input is welcome; the structure comes later"}</small>
            </div>

            <fieldset className="notes-option-group">
              <legend>Note Style</legend>
              <div className="notes-choice-grid">
                {[['concise', 'Concise'], ['detailed', 'Detailed'], ['exam', 'Exam Focused']].map(([value, label]) => (
                  <label className={`notes-choice ${form.style === value ? "selected" : ""}`} key={value}>
                    <input type="radio" name="style" value={value} checked={form.style === value} onChange={updateField} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="notes-option-group">
              <legend>Difficulty</legend>
              <div className="notes-choice-grid notes-choice-grid-three">
                {[['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']].map(([value, label]) => (
                  <label className={`notes-choice ${form.difficulty === value ? "selected" : ""}`} key={value}>
                    <input type="radio" name="difficulty" value={value} checked={form.difficulty === value} onChange={updateField} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="notes-option-group">
              <legend>Include Sections</legend>
              <div className="notes-check-grid">
                {sectionOptions.map(([name, label]) => (
                  <label className="notes-check" key={name}>
                    <input type="checkbox" name={name} checked={form.sections[name]} onChange={updateSection} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="notes-form-footer">
              <span className="notes-hand-note">the desk is ready when you are</span>
              <button type="submit" className="notes-generate-button" disabled={isGenerating}>{isGenerating ? "Organizing..." : "Generate Notes →"}</button>
            </div>
          </form>
        </section>

        <NotesPreview notes={notes} status={isGenerating ? "sketching" : status} onEdit={editInput} onCopy={copyNotes} onDownload={download} onClear={clearAll} copyStatus={feedback} />
      </div>
    </div>
  );
}
