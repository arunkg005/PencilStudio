export default function PaperCard({
  number,
  title,
  description,
  href,
  rotation = 0,
}) {
  return (
    <a
      href={href}
      className="paper-card"
      style={{
        "--rotation": `${rotation}deg`,
      }}
    >
      <div className="paper-card-number">
        {number}
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      <span className="paper-card-arrow">
        OPEN TOOL →
      </span>
    </a>
  );
}
