import { useEffect, useMemo, useRef, useState } from "react";

import { generateMindMap } from "../services/ai";
import { downloadMindMapSvg } from "../services/mindMapExport";

const initialForm = { subject: "", syllabus: "", detail: "balanced", include: { units: true, topics: true, subtopics: true, keyTerms: false } };

function findNode(node, id) {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const match = findNode(child, id);
    if (match) return match;
  }
  return null;
}

function updateNode(node, id, updater) {
  if (node.id === id) return updater(node);
  return { ...node, children: (node.children || []).map((child) => updateNode(child, id, updater)) };
}

function removeNode(node, id) {
  return { ...node, children: (node.children || []).filter((child) => child.id !== id).map((child) => removeNode(child, id)) };
}

function layoutTree(root, collapsed) {
  const nodes = [];
  const edges = [];
  let leafIndex = 0;
  const visit = (node, depth, parent) => {
    const children = collapsed.has(node.id) ? [] : node.children || [];
    const childLayouts = children.map((child) => visit(child, depth + 1, node));
    const y = childLayouts.length ? childLayouts.reduce((sum, child) => sum + child.y, 0) / childLayouts.length : 90 + leafIndex++ * 92;
    const layout = { node, x: 72 + depth * 235, y };
    nodes.push(layout);
    if (parent) edges.push({ from: parent, to: node });
    return layout;
  };
  visit(root, 0, null);
  return { nodes, edges, width: 1010, height: Math.max(560, leafIndex * 92 + 100) };
}

function Status({ status, message }) {
  const label = status === "sketching" ? "SKETCHING" : status === "generated" ? "GENERATED" : status === "error" ? "ERROR" : "READY";
  return <div className={`mind-map-status mind-map-status-${status}`} aria-live="polite"><span className="mind-map-status-mark" aria-hidden="true" /><span>MAP STATUS:</span><strong>{label}</strong>{message && <span className="mind-map-status-message">{message}</span>}</div>;
}

function MapCanvas({ root, selectedId, collapsed, onSelect, onToggle }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const layout = useMemo(() => layoutTree(root, collapsed), [root, collapsed]);

  const startDrag = (event) => {
    if (event.button !== 0) return;
    dragRef.current = { x: event.clientX, y: event.clientY, pan };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drag = (event) => {
    if (!dragRef.current) return;
    setPan({ x: dragRef.current.pan.x + (event.clientX - dragRef.current.x), y: dragRef.current.pan.y + (event.clientY - dragRef.current.y) });
  };
  const stopDrag = () => { dragRef.current = null; };
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const fit = () => { setZoom(Math.min(1, 820 / Math.max(layout.width, 820))); setPan({ x: 0, y: 0 }); };

  return <div className="mind-map-canvas-wrap">
    <div className="mind-map-canvas-tools"><button type="button" onClick={() => setZoom((value) => Math.min(1.65, value + 0.1))}>Zoom +</button><button type="button" onClick={() => setZoom((value) => Math.max(0.55, value - 0.1))}>Zoom -</button><button type="button" onClick={reset}>Reset</button><button type="button" onClick={fit}>Fit Map</button><span>{Math.round(zoom * 100)}%</span></div>
    <div className="mind-map-viewport" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} role="application" aria-label="Interactive syllabus mind map">
      <svg className="mind-map-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={`Mind map for ${root.label}`}>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {layout.edges.map(({ from, to }) => <path key={`${from.node.id}-${to.id}`} className="mind-map-edge" d={`M ${from.x + 158} ${from.y} C ${from.x + 190} ${from.y}, ${to.x - 42} ${to.y}, ${to.x} ${to.y}`} />)}
          {layout.nodes.map(({ node, x, y }) => {
            const isSelected = selectedId === node.id;
            const hasChildren = node.children?.length > 0;
            const lines = node.label.match(/.{1,22}(?:\s|$)/g)?.slice(0, 3) || [node.label];
            return <g className={`mind-map-node mind-map-node-${node.type} ${isSelected ? "selected" : ""}`} key={node.id} tabIndex="0" role="button" aria-label={`${node.type}: ${node.label}`} onClick={(event) => { event.stopPropagation(); onSelect(node.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(node.id); } }}>
              <rect x={x} y={y - 27} width="158" height="54" />
              <text x={x + 10} y={y - ((lines.length - 1) * 7)}>{lines.map((line, index) => <tspan x={x + 10} dy={index === 0 ? 0 : 14} key={index}>{line.trim()}</tspan>)}</text>
              {hasChildren && <g className="mind-map-toggle" role="button" tabIndex="0" onClick={(event) => { event.stopPropagation(); onToggle(node.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onToggle(node.id); } }}><circle cx={x + 148} cy={y - 17} r="9" /><text x={x + 148} y={y - 13}>{collapsed.has(node.id) ? "+" : "−"}</text></g>}
            </g>;
          })}
        </g>
      </svg>
    </div>
  </div>;
}

function Outline({ node, collapsed, onToggle, level = 0 }) {
  return <li className={`mind-map-outline-item level-${level}`}><div><button type="button" className="mind-map-outline-toggle" onClick={() => onToggle(node.id)} disabled={!node.children?.length}>{node.children?.length ? (collapsed.has(node.id) ? "+" : "−") : "·"}</button><span>{node.label}</span><small>{node.type}</small></div>{node.children?.length > 0 && !collapsed.has(node.id) && <ul>{node.children.map((child) => <Outline key={child.id} node={child} collapsed={collapsed} onToggle={onToggle} level={level + 1} />)}</ul>}</li>;
}

export default function MindMap() {
  const [form, setForm] = useState(initialForm);
  const [mapData, setMapData] = useState(null);
  const [status, setStatus] = useState("ready");
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [view, setView] = useState("map");
  const [selectedId, setSelectedId] = useState("root");
  const [collapsed, setCollapsed] = useState(new Set());
  const [editMode, setEditMode] = useState(false);
  const [rename, setRename] = useState("");
  const [newChild, setNewChild] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  const selectedNode = mapData ? findNode(mapData.root, selectedId) : null;
  const updateField = (event) => { const { name, value } = event.target; setForm((previous) => ({ ...previous, [name]: value })); setErrors((previous) => ({ ...previous, [name]: "" })); };
  const updateInclude = (event) => { const { name, checked } = event.target; setForm((previous) => ({ ...previous, include: { ...previous.include, [name]: checked } })); };
  const toggle = (id) => setCollapsed((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const generate = (event) => {
    event.preventDefault();
    const nextErrors = { ...(form.subject.trim() ? {} : { subject: "name the course first" }), ...(form.syllabus.trim() ? {} : { syllabus: "paste the syllabus first" }) };
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); setStatus("error"); setFeedback("check the marked fields"); inputRef.current?.focus(); return; }
    setStatus("sketching"); setIsGenerating(true); setFeedback("");
    timerRef.current = setTimeout(async () => { try { const generated = await generateMindMap(form); setMapData(generated); setSelectedId("root"); setCollapsed(new Set()); setStatus("generated"); } catch { setStatus("error"); setFeedback("the desk could not draw that syllabus"); } finally { setIsGenerating(false); } }, 850);
  };

  const clearAll = () => { if (timerRef.current) clearTimeout(timerRef.current); setForm(initialForm); setMapData(null); setStatus("ready"); setErrors({}); setFeedback(""); setSelectedId("root"); setCollapsed(new Set()); setEditMode(false); };
  const beginEdit = () => { setEditMode(true); setRename(selectedNode?.label || ""); };
  const applyRename = () => { if (!mapData || !rename.trim()) return; setMapData((previous) => ({ ...previous, root: updateNode(previous.root, selectedId, (node) => ({ ...node, label: rename.trim() })) })); setFeedback("NODE RENAMED ✓"); };
  const addChild = () => { if (!mapData || !newChild.trim() || !selectedNode) return; const child = { id: `node-${Date.now()}`, label: newChild.trim(), type: selectedNode.type === "root" ? "unit" : selectedNode.type === "unit" ? "topic" : "subtopic", children: [] }; setMapData((previous) => ({ ...previous, root: updateNode(previous.root, selectedId, (node) => ({ ...node, children: [...(node.children || []), child] })) })); setNewChild(""); setFeedback("CHILD ADDED ✓"); };
  const deleteSelected = () => { if (!mapData || selectedId === "root") return; if (!confirmDelete) { setConfirmDelete(true); return; } setMapData((previous) => ({ ...previous, root: removeNode(previous.root, selectedId) })); setSelectedId("root"); setConfirmDelete(false); setFeedback("NODE DELETED ✓"); };
  const download = () => { try { downloadMindMapSvg(mapData); setFeedback("SVG READY ✓"); } catch { setStatus("error"); setFeedback("the SVG could not be prepared"); } };

  return <div className="page mind-map-page">
    <header className="mind-map-header"><div className="mind-map-kicker"><span>04</span><span>/</span><span>AI SYLLABUS MIND MAP</span></div><h1 className="hand">DRAW THE SYLLABUS.</h1><p>Turn a syllabus into a visual study map of subjects, units, concepts, and relationships.</p></header>
    <div className="mind-map-flow"><span>SYLLABUS</span><b>→</b><span>HIERARCHY</span><b>→</b><span>MIND MAP</span></div>
    <div className="mind-map-layout">
      <section className="mind-map-input-panel" ref={inputRef}><div className="mind-map-panel-heading"><strong>Input Worksheet</strong><span>give the desk a syllabus</span></div><form className="mind-map-form" onSubmit={generate} noValidate>
        <div className={`mind-map-field ${errors.subject ? "mind-map-field-error" : ""}`}><label htmlFor="mind-subject">Subject / Course Name *</label><input id="mind-subject" name="subject" value={form.subject} onChange={updateField} placeholder="e.g. Data Structures and Algorithms" aria-invalid={Boolean(errors.subject)} /><small>{errors.subject || "name the course"}</small></div>
        <div className={`mind-map-field ${errors.syllabus ? "mind-map-field-error" : ""}`}><label htmlFor="mind-syllabus">Syllabus *</label><textarea id="mind-syllabus" name="syllabus" value={form.syllabus} onChange={updateField} placeholder="Paste a university syllabus, unit-wise topics, chapter list, or rough course outline..." rows={12} aria-invalid={Boolean(errors.syllabus)} /><small>{errors.syllabus || "headings and line breaks help the parser"}</small></div>
        <fieldset className="mind-map-option-group"><legend>Map Detail</legend><div className="mind-map-choice-grid">{[["compact", "Compact"], ["balanced", "Balanced"], ["detailed", "Detailed"]].map(([value, label]) => <label className={`mind-map-choice ${form.detail === value ? "selected" : ""}`} key={value}><input type="radio" name="detail" value={value} checked={form.detail === value} onChange={updateField} /><span>{label}</span></label>)}</div></fieldset>
        <fieldset className="mind-map-option-group"><legend>Include</legend><div className="mind-map-check-grid">{[["units", "Units"], ["topics", "Topics"], ["subtopics", "Subtopics"], ["keyTerms", "Key Terms"]].map(([name, label]) => <label className="mind-map-check" key={name}><input type="checkbox" name={name} checked={form.include[name]} onChange={updateInclude} /><span>{label}</span></label>)}</div></fieldset>
        <div className="mind-map-form-footer"><span className="mind-map-hand-note">structure first, decorate later</span><button type="submit" className="mind-map-generate-button" disabled={isGenerating}>{isGenerating ? "Drawing..." : "Generate Mind Map →"}</button></div>
      </form></section>
      <section className="mind-map-preview-panel"><div className="mind-map-panel-topline"><span className="mind-map-annotation">02 / HIERARCHY PREVIEW</span><Status status={isGenerating ? "sketching" : status} message={feedback} /></div>
        {!mapData ? <div className="mind-map-empty"><div className="mind-map-empty-lines" aria-hidden="true" /><div className="mind-map-empty-title">YOUR MAP WILL APPEAR HERE.</div><div className="mind-map-empty-subtitle">Give the desk a syllabus to draw.</div></div> : status === "sketching" ? <div className="mind-map-empty"><div className="mind-map-loader-lines" aria-hidden="true"><span /><span /><span /><span /></div><div className="mind-map-empty-title">AI IS DRAWING THE MAP...</div></div> : <>
          <div className="mind-map-toolbar"><div className="mind-map-view-toggle"><button type="button" className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Map View</button><button type="button" className={view === "outline" ? "active" : ""} onClick={() => setView("outline")}>Outline View</button></div><button type="button" onClick={() => download()}>Download</button><button type="button" onClick={clearAll}>Clear</button></div>
          {view === "map" ? <MapCanvas root={mapData.root} selectedId={selectedId} collapsed={collapsed} onSelect={setSelectedId} onToggle={toggle} /> : <div className="mind-map-outline"><ul><Outline node={mapData.root} collapsed={collapsed} onToggle={toggle} /></ul></div>}
          <div className="mind-map-bottom"><aside className="mind-map-info"><strong>Selected Node</strong><span>{selectedNode?.label || "Nothing selected"}</span><small>{selectedNode?.type || "-"} / {selectedNode?.children?.length || 0} children</small></aside><div className="mind-map-edit-area">{editMode ? <><input value={rename} onChange={(event) => setRename(event.target.value)} aria-label="Rename selected node" placeholder="Rename selected node" /><button type="button" onClick={applyRename}>Rename</button><input value={newChild} onChange={(event) => setNewChild(event.target.value)} aria-label="New child label" placeholder="New child label" /><button type="button" onClick={addChild}>Add Child</button><button type="button" onClick={deleteSelected} disabled={selectedId === "root"}>Delete</button>{confirmDelete && <span className="mind-map-confirm">Delete this node and descendants? <button type="button" onClick={deleteSelected}>Confirm</button><button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button></span>}</> : <button type="button" className="mind-map-edit-button" onClick={beginEdit}>Edit Map</button>}</div></div>
        </>}
      </section>
    </div>
  </div>;
}
