// D3.js client-side canvas graph renderer for Obsidian .canvas files
// Reads embedded canvas JSON from the page and renders an interactive SVG
// with pan/zoom, styled nodes by type, edges with labels, and clickable file nodes.
//
// D3.js v7 is loaded as an external CDN resource by the CanvasTransformer plugin.
// Access d3 from the window global. Named _d3 to avoid conflicts with @types/d3 module declarations.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _d3: any = (window as any).d3

// ── Types ───────────────────────────────────────────────────────────────────

interface CanvasNode {
  id: string
  type: "text" | "file" | "link" | "group"
  x: number
  y: number
  width: number
  height: number
  text?: string
  file?: string
  url?: string
  label?: string
  color?: string
}

interface CanvasEdge {
  id: string
  fromNode: string
  toNode: string
  fromSide?: "top" | "right" | "bottom" | "left"
  toSide?: "top" | "right" | "bottom" | "left"
  label?: string
  color?: string
}

interface CanvasData {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

interface CanvasGraphOptions {
  containerId: string
  canvasData: CanvasData
  baseUrl: string
}

// ── Color palette ───────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  text: { fill: "#2a2a3e", stroke: "#8888aa", text: "#ccccdd" },
  file: { fill: "#1a2a4e", stroke: "#4a8af4", text: "#8ab4f8" },
  link: { fill: "#1a3e2a", stroke: "#4caf50", text: "#81c784" },
  group: { fill: "rgba(42, 42, 62, 0.3)", stroke: "#8888aa", text: "#ccccdd" },
}

const EDGE_COLOR_DEFAULT = "#8888aa"
const EDGE_LABEL_COLOR = "#ccccdd"

// ── Edge geometry helpers ───────────────────────────────────────────────────

/** Get the connection point on a node's side. */
function getNodeAnchor(
  node: CanvasNode,
  side?: "top" | "right" | "bottom" | "left",
): { x: number; y: number } {
  const cx = node.x + node.width / 2
  const cy = node.y + node.height / 2

  switch (side) {
    case "top":
      return { x: cx, y: node.y }
    case "bottom":
      return { x: cx, y: node.y + node.height }
    case "left":
      return { x: node.x, y: cy }
    case "right":
      return { x: node.x + node.width, y: cy }
    default:
      return { x: cx, y: cy }
  }
}

// ── Render function ─────────────────────────────────────────────────────────

function renderCanvasGraph(options: CanvasGraphOptions): void {
  const { containerId, canvasData, baseUrl } = options
  const container = document.getElementById(containerId)
  if (!container) return

  const { nodes, edges } = canvasData
  if (!nodes || !edges) return

  // Build a node lookup map
  const nodeMap = new Map<string, CanvasNode>()
  for (const node of nodes) {
    nodeMap.set(node.id, node)
  }

  // Clear existing static HTML content (the server-rendered fallback)
  container.innerHTML = ""

  // Compute bounding box of all nodes for initial viewBox
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  }

  // Add padding around the bounding box
  const padding = 50
  if (nodes.length === 0) {
    minX = 0
    minY = 0
    maxX = 800
    maxY = 600
  }
  const viewWidth = maxX - minX + padding * 2
  const viewHeight = maxY - minY + padding * 2
  const viewX = minX - padding
  const viewY = minY - padding

  // Create SVG element
  const svg = _d3
    .select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `${viewX} ${viewY} ${viewWidth} ${viewHeight}`)
    .attr("class", "canvas-graph-svg")

  // Create a group for zoom/pan transforms
  const zoomGroup = svg.append("g").attr("class", "canvas-zoom-group")

  // Add zoom/pan behavior
  const zoomBehavior = _d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (event: any) => {
      zoomGroup.attr("transform", event.transform)
    })

  svg.call(zoomBehavior)

  // Set initial transform to fit content
  svg.call(
    zoomBehavior.transform,
    _d3.zoomIdentity,
  )

  // ── Render groups first (background layer) ──────────────────────────────
  const groupNodes = nodes.filter((n) => n.type === "group")
  const regularNodes = nodes.filter((n) => n.type !== "group")

  for (const node of groupNodes) {
    const colors = NODE_COLORS.group
    const g = zoomGroup.append("g").attr("class", "canvas-node-group-g")

    // Group background rectangle (dashed border, semi-transparent)
    g.append("rect")
      .attr("x", node.x)
      .attr("y", node.y)
      .attr("width", node.width)
      .attr("height", node.height)
      .attr("fill", node.color || colors.fill)
      .attr("stroke", colors.stroke)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "8,4")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("data-node-id", node.id)

    // Group label at top
    if (node.label) {
      g.append("text")
        .attr("x", node.x + 10)
        .attr("y", node.y + 20)
        .attr("fill", colors.text)
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text(node.label)
    }
  }

  // ── Render edges ────────────────────────────────────────────────────────
  const edgesGroup = zoomGroup.append("g").attr("class", "canvas-edges-group")

  for (const edge of edges) {
    const fromNode = nodeMap.get(edge.fromNode)
    const toNode = nodeMap.get(edge.toNode)
    if (!fromNode || !toNode) continue

    const from = getNodeAnchor(fromNode, edge.fromSide)
    const to = getNodeAnchor(toNode, edge.toSide)
    const edgeColor = edge.color || EDGE_COLOR_DEFAULT

    // Draw edge line
    edgesGroup
      .append("line")
      .attr("x1", from.x)
      .attr("y1", from.y)
      .attr("x2", to.x)
      .attr("y2", to.y)
      .attr("stroke", edgeColor)
      .attr("stroke-width", 2)
      .attr("data-edge-id", edge.id)
      .attr("data-from-node", edge.fromNode)
      .attr("data-to-node", edge.toNode)

    // Draw arrowhead
    edgesGroup
      .append("polygon")
      .attr("points", arrowheadPoints(from, to, 8))
      .attr("fill", edgeColor)

    // Edge label at midpoint
    if (edge.label) {
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2

      // Background rect for readability
      const labelText = edgesGroup
        .append("text")
        .attr("x", midX)
        .attr("y", midY - 6)
        .attr("text-anchor", "middle")
        .attr("fill", EDGE_LABEL_COLOR)
        .attr("font-size", "12px")
        .attr("class", "canvas-edge-label")
        .text(edge.label)

      // Add a background behind the label for readability
      const bbox = labelText.node()?.getBBox()
      if (bbox) {
        edgesGroup
          .insert("rect", ".canvas-edge-label")
          .attr("x", bbox.x - 4)
          .attr("y", bbox.y - 2)
          .attr("width", bbox.width + 8)
          .attr("height", bbox.height + 4)
          .attr("fill", "#1a1a2e")
          .attr("rx", 3)
          .attr("ry", 3)
      }
    }
  }

  // ── Render regular nodes ────────────────────────────────────────────────
  const nodesGroup = zoomGroup.append("g").attr("class", "canvas-nodes-group")

  for (const node of regularNodes) {
    const colors = NODE_COLORS[node.type] || NODE_COLORS.text
    const g = nodesGroup.append("g").attr("class", `canvas-node-g canvas-node-${node.type}-g`)

    // Node rectangle
    g.append("rect")
      .attr("x", node.x)
      .attr("y", node.y)
      .attr("width", node.width)
      .attr("height", node.height)
      .attr("fill", node.color || colors.fill)
      .attr("stroke", colors.stroke)
      .attr("stroke-width", 2)
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("data-node-id", node.id)

    // Node label text
    const label = getNodeLabel(node)
    if (label) {
      g.append("text")
        .attr("x", node.x + node.width / 2)
        .attr("y", node.y + node.height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", colors.text)
        .attr("font-size", "13px")
        .each(function (this: SVGTextElement) {
          wrapText(_d3.select(this), label, node.width - 16)
        })
    }

    // Make file nodes clickable
    if (node.type === "file" && node.file) {
      const href = resolveFileUrl(baseUrl, node.file)
      g.attr("cursor", "pointer").on("click", () => {
        window.location.href = href
      })

      // Hover effect
      const fileG = g
      fileG.on("mouseenter", () => {
        fileG.select("rect").attr("stroke-width", 3)
      }).on("mouseleave", () => {
        fileG.select("rect").attr("stroke-width", 2)
      })
    }

    // Make link nodes clickable
    if (node.type === "link" && node.url) {
      g.attr("cursor", "pointer").on("click", () => {
        window.open(node.url, "_blank")
      })

      const linkG = g
      linkG.on("mouseenter", () => {
        linkG.select("rect").attr("stroke-width", 3)
      }).on("mouseleave", () => {
        linkG.select("rect").attr("stroke-width", 2)
      })
    }
  }
}

// ── Utility functions ───────────────────────────────────────────────────────

/** Get display label for a node based on its type. */
function getNodeLabel(node: CanvasNode): string {
  switch (node.type) {
    case "text":
      return node.text || ""
    case "file":
      return node.file ? node.file.replace(/\.md$/, "").split("/").pop() || node.file : ""
    case "link":
      return node.url || ""
    case "group":
      return node.label || ""
    default:
      return ""
  }
}

/** Resolve a vault file path to a site URL. */
function resolveFileUrl(baseUrl: string, filePath: string): string {
  const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const stripped = filePath.endsWith(".md") ? filePath.slice(0, -3) : filePath
  return `${normalized}/${stripped}`
}

/** Calculate arrowhead polygon points at the end of a line. */
function arrowheadPoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number,
): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return ""

  const ux = dx / len
  const uy = dy / len

  // Perpendicular
  const px = -uy
  const py = ux

  // Arrowhead tip is at the "to" point
  const tipX = to.x
  const tipY = to.y
  const baseX1 = to.x - ux * size + px * (size / 2)
  const baseY1 = to.y - uy * size + py * (size / 2)
  const baseX2 = to.x - ux * size - px * (size / 2)
  const baseY2 = to.y - uy * size - py * (size / 2)

  return `${tipX},${tipY} ${baseX1},${baseY1} ${baseX2},${baseY2}`
}

/** Wrap text into multiple tspan elements to fit within a given width. */
function wrapText(textEl: any, text: string, maxWidth: number): void {
  const words = text.split(/\s+/)
  if (words.length === 0) return

  const x = textEl.attr("x")
  const dy = 0

  let line: string[] = []
  let lineNumber = 0
  const lineHeight = 1.2 // em

  let tspan = textEl
    .append("tspan")
    .attr("x", x)
    .attr("dy", `${dy}em`)

  for (const word of words) {
    line.push(word)
    tspan.text(line.join(" "))

    const node = tspan.node()
    if (node && node.getComputedTextLength() > maxWidth && line.length > 1) {
      line.pop()
      tspan.text(line.join(" "))
      line = [word]
      lineNumber++
      tspan = textEl
        .append("tspan")
        .attr("x", x)
        .attr("dy", `${lineHeight}em`)
        .text(word)
    }
  }

  // Center vertically by adjusting the first tspan
  const totalLines = lineNumber + 1
  const offset = -((totalLines - 1) * lineHeight) / 2
  textEl.select("tspan").attr("dy", `${offset}em`)
}

// ── Auto-execute on DOM ready ───────────────────────────────────────────────

function initCanvasGraph(): void {
  const dataEl = document.getElementById("canvas-data")
  if (!dataEl) return

  let canvasData: CanvasData
  try {
    canvasData = JSON.parse(dataEl.textContent || "")
  } catch {
    return
  }

  if (!canvasData || !canvasData.nodes || !canvasData.edges) return

  // Determine base URL from the page's meta or default to current origin
  const baseUrl =
    document.querySelector<HTMLMetaElement>('meta[name="base-url"]')?.content ||
    window.location.origin

  renderCanvasGraph({
    containerId: "canvas-graph",
    canvasData,
    baseUrl,
  })
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCanvasGraph)
} else {
  initCanvasGraph()
}
