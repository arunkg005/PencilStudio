import PaperCard from "../components/PaperCard";
import TechnicalLabel from "../components/TechnicalLabel";

const tools = [
  {
    number: "01",
    title: "AI RESUME BUILDER",
    description:
      "Turn raw academic and professional information into a polished resume.",
    href: "/resume",
    rotation: -1.2,
  },
  {
    number: "02",
    title: "AI NOTES",
    description:
      "Transform messy study material into structured revision notes.",
    href: "/notes",
    rotation: 1.5,
  },
  {
    number: "03",
    title: "AI PRESENTATION",
    description:
      "Generate structured slide content from a simple topic.",
    href: "/presentation",
    rotation: -0.7,
  },
  {
    number: "04",
    title: "MIND MAP",
    description:
      "Turn a syllabus into a visual hierarchy of connected concepts.",
    href: "/mind-map",
    rotation: 1,
  },
  {
    number: "05",
    title: "SHEETS",
    description:
      "Connect a live Google Sheet to an interactive frontend.",
    href: "/sheets",
    rotation: -1.5,
  },
  {
    number: "06",
    title: "AI QUIZ",
    description:
      "Generate and solve interactive multiple-choice questions.",
    href: "/quiz",
    rotation: 0.8,
  },
  {
    number: "07",
    title: "AI TUTOR",
    description:
      "Ask subject questions and receive explanations with examples.",
    href: "/tutor",
    rotation: -1,
  },
  {
    number: "08",
    title: "FLASHCARDS",
    description:
      "Convert study material into interactive 3D revision cards.",
    href: "/flashcards",
    rotation: 1.3,
  },
  {
    number: "09",
    title: "STUDY PLANNER",
    description:
      "Generate a day-wise study schedule around your exams.",
    href: "/planner",
    rotation: -0.6,
  },
  {
    number: "10",
    title: "OCR SUMMARIZER",
    description:
      "Extract text from notes and turn it into concise summaries.",
    href: "/ocr",
    rotation: 1,
  },
];

export default function Home() {
  return (
    <div className="page home-page">
      <section className="hero">
        <TechnicalLabel>
          AI STUDY WORKBENCH / 001
        </TechnicalLabel>

        <h1>
          YOUR DIGITAL
          <br />
          <span>STUDY DESK.</span>
        </h1>

        <p className="hero-description">
          Ten AI-powered tools for students —
          designed like a notebook, built like a
          digital workbench.
        </p>

        <a
          href="#workbench"
          className="pencil-button"
        >
          EXPLORE THE WORKBENCH →
        </a>

        <div className="hero-desk">
          <div className="desk-paper main-paper">
            <div className="paper-corner">
              PENCILSTUDIO
            </div>

            <div className="paper-title">
              DRAW.
              <br />
              THINK.
              <br />
              BUILD.
            </div>

            <div className="paper-lines">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="paper-note">
              start anywhere →
            </div>
          </div>

          <div className="desk-paper back-paper" />

          <div className="pencil-object">
            <div className="pencil-body">
              <span />
            </div>
            <div className="pencil-tip" />
            <div className="pencil-eraser" />
          </div>

          <div className="paper-clip">
            ◌
          </div>

          <div className="desk-note">
            <span>IDEA</span>
            <br />
            ↓
            <br />
            AI
            <br />
            ↓
            <br />
            OUTPUT
          </div>
        </div>
      </section>

      <section className="process">
        <TechnicalLabel>
          WORKFLOW / 003
        </TechnicalLabel>

        <div className="process-grid">
          <div>
            <span>01</span>
            <strong>RAW INPUT</strong>
            <p>Give the tool your information.</p>
          </div>

          <div className="process-arrow">
            →
          </div>

          <div>
            <span>02</span>
            <strong>AI ASSIST</strong>
            <p>Let the system structure it.</p>
          </div>

          <div className="process-arrow">
            →
          </div>

          <div>
            <span>03</span>
            <strong>WORKING OUTPUT</strong>
            <p>Get something you can actually use.</p>
          </div>
        </div>
      </section>

      <section id="workbench" className="workbench">
        <div className="section-heading">
          <TechnicalLabel>
            TOOLBOX / 010
          </TechnicalLabel>

          <h2>
            THE
            <br />
            WORKBENCH.
          </h2>

          <p>
            Pick a sheet. Start working.
          </p>
        </div>

        <div className="tool-grid">
          {tools.map((tool) => (
            <PaperCard
              key={tool.number}
              {...tool}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
