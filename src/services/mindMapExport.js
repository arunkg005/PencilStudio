function escapeXml(value) {
  return String(value || "").replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[character]));
}

function layoutTree(root) {
  const nodes = [];
  const edges = [];
  let leafIndex = 0;
  const visit = (node, depth, parent) => {
    const visibleChildren = node.children || [];
    const childLayouts = visibleChildren.map((child) => visit(child, depth + 1, node));
    const y = childLayouts.length ? childLayouts.reduce((sum, child) => sum + child.y, 0) / childLayouts.length : 90 + leafIndex++ * 92;
    const layout = { node, x: 90 + depth * 235, y };
    nodes.push(layout);
    if (parent) edges.push({ from: parent, to: node });
    return layout;
  };
  visit(root, 0, null);
  const height = Math.max(560, leafIndex * 92 + 100);
  return { nodes, edges, width: 90 + 235 * 3 + 220, height };
}

function wrapLabel(label, limit = 22) {
  const words = String(label || "").split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    if ((line + " " + word).trim().length > limit && line) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  });
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function createMindMapSvg(mapData) {
  const layout = layoutTree(mapData.root);
  const nodeWidth = 158;
  const nodeHeight = 52;
  const lines = layout.edges.map(({ from, to }) => `<path d="M ${from.x + nodeWidth} ${from.y} C ${from.x + 180} ${from.y}, ${to.x - 45} ${to.y}, ${to.x} ${to.y}" fill="none" stroke="#777" stroke-width="1.5" stroke-dasharray="4 3"/>`).join("");
  const nodes = layout.nodes.map(({ node, x, y }) => {
    const fill = node.type === "root" ? "#171717" : "#fffdf9";
    const text = node.type === "root" ? "#faf8f2" : "#171717";
    const labels = wrapLabel(node.label);
    const labelText = labels.map((line, index) => `<tspan x="${x + 10}" dy="${index === 0 ? 0 : 16}">${escapeXml(line)}</tspan>`).join("");
    return `<g><rect x="${x}" y="${y - nodeHeight / 2}" width="${nodeWidth}" height="${nodeHeight}" fill="${fill}" stroke="#171717" stroke-width="1.5"/><text x="${x + 10}" y="${y - ((labels.length - 1) * 8)}" fill="${text}" font-family="Space Mono, monospace" font-size="11">${labelText}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}"><rect width="100%" height="100%" fill="#f4f1e9"/>${lines}${nodes}</svg>`;
}

export function downloadMindMapSvg(mapData) {
  if (!mapData?.root) throw new Error("Mind map data is missing.");
  const blob = new Blob([createMindMapSvg(mapData)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(mapData.subject || "mind-map").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}