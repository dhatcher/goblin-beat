// Canvas data parser and serializer for Obsidian .canvas files
// Self-contained module with no external dependencies beyond TypeScript

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface CanvasNode {
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

export interface CanvasEdge {
  id: string
  fromNode: string
  toNode: string
  fromSide?: "top" | "right" | "bottom" | "left"
  toSide?: "top" | "right" | "bottom" | "left"
  label?: string
  color?: string
}

export interface CanvasData {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

// ── Result types ────────────────────────────────────────────────────────────

export interface CanvasParseError {
  ok: false
  error: string
}

export interface CanvasParseWarning {
  message: string
}

export interface CanvasParseSuccess {
  ok: true
  data: CanvasData
  warnings: CanvasParseWarning[]
}

export type CanvasParseResult = CanvasParseSuccess | CanvasParseError

// ── Constants ───────────────────────────────────────────────────────────────

const VALID_NODE_TYPES = new Set(["text", "file", "link", "group"])
const VALID_SIDES = new Set(["top", "right", "bottom", "left"])

// ── Validation helpers ──────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function validateNode(raw: unknown, index: number): { node?: CanvasNode; error?: string } {
  if (!isRecord(raw)) {
    return { error: `Node at index ${index} is not an object` }
  }

  // Required fields
  const requiredStrings = ["id", "type"] as const
  const requiredNumbers = ["x", "y", "width", "height"] as const

  for (const field of requiredStrings) {
    if (typeof raw[field] !== "string") {
      return { error: `Node at index ${index} is missing required string field "${field}"` }
    }
  }

  for (const field of requiredNumbers) {
    if (typeof raw[field] !== "number") {
      return { error: `Node at index ${index} is missing required number field "${field}"` }
    }
  }

  const typeValue = raw["type"] as string
  if (!VALID_NODE_TYPES.has(typeValue)) {
    return {
      error: `Node at index ${index} has invalid type "${typeValue}". Must be one of: text, file, link, group`,
    }
  }

  const node: CanvasNode = {
    id: raw["id"] as string,
    type: typeValue as CanvasNode["type"],
    x: raw["x"] as number,
    y: raw["y"] as number,
    width: raw["width"] as number,
    height: raw["height"] as number,
  }

  // Optional string fields
  if (typeof raw["text"] === "string") node.text = raw["text"]
  if (typeof raw["file"] === "string") node.file = raw["file"]
  if (typeof raw["url"] === "string") node.url = raw["url"]
  if (typeof raw["label"] === "string") node.label = raw["label"]
  if (typeof raw["color"] === "string") node.color = raw["color"]

  return { node }
}

function validateEdge(
  raw: unknown,
  index: number,
): { edge?: CanvasEdge; error?: string } {
  if (!isRecord(raw)) {
    return { error: `Edge at index ${index} is not an object` }
  }

  const requiredStrings = ["id", "fromNode", "toNode"] as const
  for (const field of requiredStrings) {
    if (typeof raw[field] !== "string") {
      return { error: `Edge at index ${index} is missing required string field "${field}"` }
    }
  }

  const edge: CanvasEdge = {
    id: raw["id"] as string,
    fromNode: raw["fromNode"] as string,
    toNode: raw["toNode"] as string,
  }

  // Optional side fields with validation
  for (const field of ["fromSide", "toSide"] as const) {
    if (raw[field] !== undefined) {
      if (typeof raw[field] === "string" && VALID_SIDES.has(raw[field] as string)) {
        edge[field] = raw[field] as CanvasEdge["fromSide"]
      }
      // Silently ignore invalid side values — not a hard error
    }
  }

  if (typeof raw["label"] === "string") edge.label = raw["label"]
  if (typeof raw["color"] === "string") edge.color = raw["color"]

  return { edge }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse raw JSON string into a validated CanvasData structure.
 *
 * - Malformed JSON → CanvasParseError
 * - Missing required fields → CanvasParseError
 * - Edges referencing non-existent node IDs → skipped with warning
 */
export function parseCanvasData(raw: string): CanvasParseResult {
  // Step 1: Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "Malformed JSON: unable to parse canvas file" }
  }

  // Step 2: Validate top-level structure
  if (!isRecord(parsed)) {
    return { ok: false, error: "Invalid canvas schema: expected an object with nodes and edges" }
  }

  if (!Array.isArray(parsed["nodes"])) {
    return { ok: false, error: 'Invalid canvas schema: "nodes" must be an array' }
  }

  if (!Array.isArray(parsed["edges"])) {
    return { ok: false, error: 'Invalid canvas schema: "edges" must be an array' }
  }

  const warnings: CanvasParseWarning[] = []

  // Step 3: Validate nodes
  const nodes: CanvasNode[] = []
  for (let i = 0; i < (parsed["nodes"] as unknown[]).length; i++) {
    const result = validateNode((parsed["nodes"] as unknown[])[i], i)
    if (result.error) {
      return { ok: false, error: result.error }
    }
    nodes.push(result.node!)
  }

  // Step 4: Build node ID set for edge reference checking
  const nodeIds = new Set(nodes.map((n) => n.id))

  // Step 5: Validate edges, skip orphaned ones
  const edges: CanvasEdge[] = []
  for (let i = 0; i < (parsed["edges"] as unknown[]).length; i++) {
    const result = validateEdge((parsed["edges"] as unknown[])[i], i)
    if (result.error) {
      return { ok: false, error: result.error }
    }

    const edge = result.edge!

    // Check reference integrity — skip orphaned edges with warning
    if (!nodeIds.has(edge.fromNode)) {
      warnings.push({
        message: `Edge "${edge.id}" references non-existent fromNode "${edge.fromNode}" — skipped`,
      })
      continue
    }
    if (!nodeIds.has(edge.toNode)) {
      warnings.push({
        message: `Edge "${edge.id}" references non-existent toNode "${edge.toNode}" — skipped`,
      })
      continue
    }

    edges.push(edge)
  }

  return {
    ok: true,
    data: { nodes, edges },
    warnings,
  }
}

/**
 * Serialize a CanvasData object back to JSON string.
 * Used for round-trip support and embedding data in HTML.
 */
export function serializeCanvasData(data: CanvasData): string {
  return JSON.stringify({ nodes: data.nodes, edges: data.edges })
}
