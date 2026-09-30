import { useEffect, useRef, useState } from "react";

import { generateResume } from "../services/ai";
import { downloadResumePDF } from "../utils/pdf";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  objective: "",
  education: "",
  skills: "",
  experience: "",
  projects: "",
  certifications: "",
  achievements: "",
};

const fieldGroups = [
  {
    title: "Personal",
    fields: [
      { name: "fullName", label: "Full Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "location", label: "Location", type: "text" },
      { name: "linkedin", label: "LinkedIn", type: "url" },
      { name: "github", label: "GitHub", type: "url" },
    ],
  },
  {
    title: "Profile",
    fields: [{ name: "objective", label: "Career Objective", type: "textarea" }],
  },
  {
    title: "Education",
    fields: [{ name: "education", label: "Education", type: "textarea" }],
  },
  {
    title: "Skills",
    fields: [{ name: "skills", label: "Skills", type: "textarea" }],
  },
  {
    title: "Experience",
    fields: [{ name: "experience", label: "Experience", type: "textarea" }],
  },
  {
    title: "Projects",
    fields: [{ name: "projects", label: "Projects", type: "textarea" }],
  },
  {
    title: "Additional",
    fields: [
      { name: "certifications", label: "Certifications", type: "textarea" },
      { name: "achievements", label: "Achievements", type: "textarea" },
    ],
  },
];

function validateForm(form) {
  const nextErrors = {};

  if (!form.fullName.trim()) {
    nextErrors.fullName = "Required";
  }

  const hasCoreContent = [
    form.education,
    form.skills,
    form.experience,
    form.projects,
  ].some((value) => value.trim().length > 0);

  if (!hasCoreContent) {
    nextErrors.general = "Add at least one of Education, Skills, Experience, or Projects.";
  }

  return nextErrors;
}

function ResumeStatus({ status }) {
  const normalized = status === "ready" ? "READY" : status === "sketching" ? "SKETCHING" : "NOT GENERATED";
  const className = status === "ready" ? "status-dot ready" : status === "sketching" ? "status-dot sketching" : "status-dot";

  return (
    <div className="resume-status">
      <span className={className} />
      <span>DRAFT STATUS:</span>
      <strong>{normalized}</strong>
    </div>
  );
}

function ResumeLoader() {
  return (
    <div className="resume-loader" aria-live="polite">
      <div className="resume-loader-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="resume-loader-text">AI IS SKETCHING YOUR RESUME...</div>
    </div>
  );
}

function ResumeSection({ title, items }) {
  if (!items || (Array.isArray(items) && items.length === 0)) {
    return null;
  }

  const list = Array.isArray(items) ? items : [items];

  return (
    <div className="resume-section">
      <h3>{title}</h3>
      <div className="resume-section-body">
        <ul className="resume-list">
          {list.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ResumePreview({ resumeData, status, onEditInput }) {
  const previewContent = status === "sketching" ? (
    <div className="resume-sheet resume-sheet-loading">
      <ResumeLoader />
    </div>
  ) : !resumeData ? (
    <div className="resume-sheet resume-sheet-empty">
      <div className="resume-sheet-frame" aria-hidden="true" />
      <div className="empty-title">YOUR RESUME</div>
      <div className="empty-subtitle">WILL APPEAR HERE</div>
      <div className="empty-note">start filling the sheet →</div>
    </div>
  ) : (
    <div className="resume-sheet resume-sheet-ready">
      <div className="resume-stamp">AI GENERATED DRAFT</div>

      <div className="resume-sheet-content">
        <h2>{resumeData.name}</h2>

        <div className="resume-contact">
          <div>
            {resumeData.contact && (
              [
                resumeData.contact.email,
                resumeData.contact.phone,
                resumeData.contact.location,
              ]
                .filter(Boolean)
                .join(" | ") || "Contact details will appear here"
            )}
          </div>
          <div>
            {resumeData.contact && (
              [
                resumeData.contact.github,
                resumeData.contact.linkedin,
              ]
                .filter(Boolean)
                .join(" | ") || "Professional links will appear here"
            )}
          </div>
        </div>

        {resumeData.summary && (
          <div className="resume-section">
            <h3>Professional Summary</h3>
            <div className="resume-summary">{resumeData.summary}</div>
          </div>
        )}

        <ResumeSection title="Education" items={resumeData.education} />
        <ResumeSection title="Skills" items={resumeData.skills} />
        <ResumeSection title="Experience" items={resumeData.experience} />
        <ResumeSection title="Projects" items={resumeData.projects} />
        <ResumeSection title="Certifications" items={resumeData.certifications} />
        <ResumeSection title="Achievements" items={resumeData.achievements} />
      </div>
    </div>
  );

  return (
    <div className="resume-panel resume-preview-shell">
      <div className="resume-preview-header">
        <div className="resume-annotation">{status === "sketching" ? "02 / AI STRUCTURE" : "03 / FINAL SHEET"}</div>
        <ResumeStatus status={status} />
      </div>

      {previewContent}

      <div className="resume-preview-actions">
        <button type="button" className="action-button" onClick={onEditInput}>
          Edit Input
        </button>
        <button
          type="button"
          className="action-button primary"
          onClick={() => resumeData && downloadResumePDF(resumeData)}
          disabled={!resumeData}
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}

function FormField({ field, value, onChange, error, firstRef }) {
  const hasError = Boolean(error);
  const commonProps = {
    id: field.name,
    name: field.name,
    value,
    onChange,
    placeholder: field.label,
    autoComplete: field.name === "fullName" ? "name" : "off",
    "aria-invalid": hasError,
    "aria-describedby": hasError ? `${field.name}-error` : undefined,
    ref: firstRef && field.name === "fullName" ? firstRef : null,
  };

  const fieldClasses = ["field", hasError ? "has-error" : ""].filter(Boolean).join(" ");

  return (
    <div className={field.type === "textarea" ? `${fieldClasses} field-full` : fieldClasses}>
      <label htmlFor={field.name}>
        {field.label}
        {field.required ? " *" : ""}
      </label>

      {field.type === "textarea" ? (
        <textarea {...commonProps} rows={field.name === "objective" ? 4 : 5} />
      ) : (
        <input {...commonProps} type={field.type} />
      )}

      <div id={`${field.name}-error`} className="field-error" aria-live="polite">
        {error || ""}
      </div>
    </div>
  );
}

export default function Resume() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("not-generated");
  const [resumeData, setResumeData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const inputSectionRef = useRef(null);
  const firstFieldRef = useRef(null);
  const generationTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (generationTimerRef.current) {
        clearTimeout(generationTimerRef.current);
      }
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errors[name] || errors.general) {
      setErrors((previous) => ({
        ...previous,
        [name]: "",
        general: "",
      }));
    }
  };

  const handleClear = () => {
    if (generationTimerRef.current) {
      clearTimeout(generationTimerRef.current);
    }

    setForm(initialForm);
    setErrors({});
    setResumeData(null);
    setIsGenerating(false);
    setStatus("not-generated");
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus("not-generated");
      setResumeData(null);
      setIsGenerating(false);
      return;
    }

    setErrors({});
    setIsGenerating(true);
    setStatus("sketching");

    generationTimerRef.current = setTimeout(async () => {
      const generated = await generateResume(form);
      setResumeData(generated);
      setIsGenerating(false);
      setStatus("ready");
    }, 850);
  };

  const editInput = () => {
    inputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    firstFieldRef.current?.focus();
  };

  return (
    <div className="page resume-page">
      <header className="resume-header">
        <div className="resume-kicker">
          <span>01</span>
          <span>/</span>
          <span>AI RESUME BUILDER</span>
        </div>

        <h1 className="hand">BUILD YOUR RESUME.</h1>

        <p>
          Give PencilStudio your raw information. We&apos;ll structure it into a professional resume.
        </p>
      </header>

      <div className="resume-flow" aria-label="resume generation flow">
        <div>01 / INPUT</div>
        <div className="resume-flow-arrow">→</div>
        <div>02 / AI STRUCTURE</div>
        <div className="resume-flow-arrow">→</div>
        <div>03 / FINAL SHEET</div>
      </div>

      <div className="resume-layout">
        <section className="resume-panel" ref={inputSectionRef}>
          <div className="resume-panel-header">
            <strong>Input Sheet</strong>
            <span className="resume-annotation">start with what you know</span>
          </div>

          <form className="resume-form" onSubmit={handleGenerate} noValidate>
            {fieldGroups.map((group) => (
              <fieldset key={group.title} className="form-group">
                <legend>{group.title}</legend>

                <div className="form-grid">
                  {group.fields.map((field) => (
                    <FormField
                      key={field.name}
                      field={field}
                      value={form[field.name]}
                      onChange={handleChange}
                      error={errors[field.name]}
                      firstRef={firstFieldRef}
                    />
                  ))}
                </div>
              </fieldset>
            ))}

            {errors.general && <div className="field-error field-error-general">{errors.general}</div>}

            <div className="form-note">
              <span>rough input is okay</span>
              <span>AI will structure this</span>
            </div>

            <div className="resume-actions">
              <button type="button" className="action-button" onClick={handleClear}>
                Clear
              </button>
              <button type="submit" className="action-button primary" disabled={isGenerating}>
                {isGenerating ? "Sketching..." : "Generate Resume →"}
              </button>
            </div>
          </form>
        </section>

        <ResumePreview resumeData={resumeData} status={isGenerating ? "sketching" : status} onEditInput={editInput} />
      </div>
    </div>
  );
}
