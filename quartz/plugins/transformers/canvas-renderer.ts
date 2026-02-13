// Canvas HTML renderer — converts parsed CanvasData into an HTML representation
// with embedded JSON for D3.js client-side interactive rendering.

import type { CanvasData, CanvasNode, CanvasEdge } from "./canvas-utils"

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Escape HTML special characters to prevent XSS in rendered output. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/** Resolve a vault file path to a site URL (strip .md extension). */
function resolveFileUrl(baseUrl: string, filePath: string): string {
  const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const stripped = filePath.endsWith(".md") ? filePath.slice(0, -3) : filePath
  return `${normalized}/${stripped}`
}

// ── Node renderers ──────────────────────────────────────────────────────────

function renderTextNode(node: CanvasNode): string {
  const content = node.text ? escapeHtml(node.text) : ""
  return (
    `<div class="canvas-node canvas-node-text" data-node-id="${escapeHtml(node.id)}" ` +
    `style="position:absolute;left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;">` +
    `<div class="canvas-node-content">${content}</div>` +
    `</div>`
  )
}

function renderFileNode(node: CanvasNode, baseUrl: string): string {
  const filePath = node.file ?? ""
  const href = resolveFileUrl(baseUrl, filePath)
  const label = escapeHtml(filePath)
  return (
    `<div class="canvas-node canvas-node-file" data-node-id="${escapeHtml(node.id)}" ` +
    `style="position:absolute;left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;">` +
    `<a href="${escapeHtml(href)}">${label}</a>` +
    `</div>`
  )
}

function renderGroupNode(node: CanvasNode): string {
  const label = node.label ? escapeHtml(node.label) : ""
  return (
    `<div class="canvas-node canvas-node-group" data-node-id="${escapeHtml(node.id)}" ` +
    `style="position:absolute;left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;">` +
    `<div class="canvas-group-label">${label}</div>` +
    `<div class="canvas-group-container"></div>` +
    `</div>`
  )
}

function renderLinkNode(node: CanvasNode): string {
  const url = node.url ?? ""
  const displayUrl = escapeHtml(url)
  return (
    `<div class="canvas-node canvas-node-link" data-node-id="${escapeHtml(node.id)}" ` +
    `style="position:absolute;left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;">` +
    `<a href="${escapeHtml(url)}">${displayUrl}</a>` +
    `</div>`
  )
}

function renderNode(node: CanvasNode, baseUrl: string): string {
  switch (node.type) {
    case "text":
      return renderTextNode(node)
    case "file":
      return renderFileNode(node, baseUrl)
    case "group":
      return renderGroupNode(node)
    case "link":
      return renderLinkNode(node)
    default:
      return renderTextNode(node)
  }
}

// ── Edge renderer ───────────────────────────────────────────────────────────

function renderEdge(edge: CanvasEdge): string {
  const labelAttr = edge.label ? ` data-edge-label="${escapeHtml(edge.label)}"` : ""
  return (
    `<line class="canvas-edge" ` +
    `data-edge-id="${escapeHtml(edge.id)}" ` +
    `data-from-node="${escapeHtml(edge.fromNode)}" ` +
    `data-to-node="${escapeHtml(edge.toNode)}"` +
    `${labelAttr} />`
  )
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Render an error message HTML block for malformed canvas input.
 */
export function renderCanvasError(message: string): string {
  return (
    `<div class="canvas-error">` +
    `<p class="canvas-error-message">${escapeHtml(message)}</p>` +
    `</div>`
  )
}

/**
 * Render parsed CanvasData into an HTML string.
 *
 * The output includes:
 * - A container div with `id="canvas-graph"` for D3.js to render into
 * - Node elements with `data-node-id` attributes
 * - Edge elements (SVG lines) with `data-edge-id`, `data-from-node`, `data-to-node` attributes
 * - A `<script type="application/json" id="canvas-data">` tag with the embedded canvas JSON
 */
export function renderCanvasToHtml(data: CanvasData, baseUrl: string): string {
  // Validate input — if data is missing nodes/edges arrays, treat as malformed
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    return renderCanvasError("This canvas file could not be rendered. The data is malformed.")
  }

  // Render nodes
  const nodesHtml = data.nodes.map((node) => renderNode(node, baseUrl)).join("\n")

  // Render edges as SVG
  const edgesHtml = data.edges.map((edge) => renderEdge(edge)).join("\n")

  const svgSection = data.edges.length > 0
    ? `<svg class="canvas-edges">\n${edgesHtml}\n</svg>`
    : `<svg class="canvas-edges"></svg>`

  // Embed canvas data as JSON for D3.js client-side rendering
  const jsonBlob = JSON.stringify(data)

  return (
    `<div id="canvas-graph" class="canvas-container">\n` +
    `<div class="canvas-nodes">\n${nodesHtml}\n</div>\n` +
    `${svgSection}\n` +
    `</div>\n` +
    `<script type="application/json" id="canvas-data">${jsonBlob}</script>`
  )
}
