import { Link } from "react-router-dom";

const tools = [
  ["01", "RESUME", "/resume"],
  ["02", "NOTES", "/notes"],
  ["03", "PRESENT", "/presentation"],
  ["04", "MIND MAP", "/mind-map"],
  ["05", "SHEETS", "/sheets"],
  ["06", "QUIZ", "/quiz"],
  ["07", "TUTOR", "/tutor"],
  ["08", "CARDS", "/flashcards"],
  ["09", "PLANNER", "/planner"],
  ["10", "OCR", "/ocr"],
];

export default function Navbar() {
  return (
    <aside className="navbar">
      <Link to="/" className="nav-logo">
        <span>✎</span>
        <small>PENCIL</small>
        <small>STUDIO</small>
      </Link>

      <div className="nav-tools">
        {tools.map(([number, name, path]) => (
          <Link
            key={path}
            to={path}
            className="nav-tool"
          >
            <span>{number}</span>
            <span>{name}</span>
          </Link>
        ))}
      </div>

      <div className="nav-footer">
        <span>GRAPHITE</span>
        <span>4B</span>
      </div>
    </aside>
  );
}
