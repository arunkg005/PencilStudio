import { Link } from "react-router-dom";

export default function PencilButton({ children, to, onClick, className = "" }) {
  const classes = `pencil-button ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
