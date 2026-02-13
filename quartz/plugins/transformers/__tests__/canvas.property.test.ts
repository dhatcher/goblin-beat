import { describe, it, expect } from "vitest"
import fc from "fast-check"
import {
  parseCanvasData,
  serializeCanvasData,
  type CanvasData,
  type CanvasNode,
  type CanvasEdge,
} from "../canvas-utils"
import { renderCanvasToHtml, renderCanvasError } from "../canvas-renderer"

// ── Arbitraries ─────────────────────────────────────────────────────────────

const nodeTypeArb = fc.constantFrom("text" as const, "file" as const, "link" as const, "group" as const)
const sideArb = fc.constantFrom("top" as const, "right" as const, "bottom" as const, "left" as const)

/** Generate a unique alphanumeric ID (Obsidian uses hex-like IDs). */
const nodeIdArb = fc.stringMatching(/^[a-f0-9]{8,16}$/)

/** Generate optional string fields — either undefined or a non-empty string. */
const optionalStringArb = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined })

/** Generate a single CanvasNode with a given ID. */
function canvasNodeArb(id: string): fc.Arbitrary<CanvasNode> {
  return fc
    .record({
      type: nodeTypeArb,
      x: fc.integer({ min: -5000, max: 5000 }),
      y: fc.integer({ min: -5000, max: 5000 }),
      width: fc.integer({ min: 50, max: 2000 }),
      height: fc.integer({ min: 50, max: 2000 }),
      text: optionalStringArb,
      file: optionalStringArb,
      url: optionalStringArb,
      label: optionalStringArb,
      color: optionalStringArb,
    })
    .map((fields) => {
      const node: CanvasNode = {
        id,
        type: fields.type,
        x: fields.x,
        y: fields.y,
        width: fields.width,
        height: fields.height,
      }
      if (fields.text !== undefined) node.text = fields.text
      if (fields.file !== undefined) node.file = fields.file
      if (fields.url !== undefined) node.url = fields.url
      if (fields.label !== undefined) node.label = fields.label
      if (fields.color !== undefined) node.color = fields.color
      return node
    })
}

/**
 * Generate a valid CanvasData object:
 * - 0–10 nodes with unique IDs
 * - 0–10 edges whose fromNode/toNode reference existing node IDs
 */
const canvasDataArb: fc.Arbitrary<CanvasData> = fc
  .uniqueArray(nodeIdArb, { minLength: 0, maxLength: 10, comparator: (a, b) => a === b })
  .chain((ids) => {
    // Generate nodes for each unique ID
    const nodesArb =
      ids.length === 0
        ? fc.constant([] as CanvasNode[])
        : fc.tuple(...ids.map((id) => canvasNodeArb(id))).map((arr) => arr as CanvasNode[])

    // Generate edges that only reference existing node IDs
    const edgesArb =
      ids.length === 0
        ? fc.constant([] as CanvasEdge[])
        : fc
            .array(
              fc.record({
                id: nodeIdArb,
                fromNode: fc.constantFrom(...ids),
                toNode: fc.constantFrom(...ids),
                fromSide: fc.option(sideArb, { nil: undefined }),
                toSide: fc.option(sideArb, { nil: undefined }),
                label: optionalStringArb,
                color: optionalStringArb,
              }),
              { minLength: 0, maxLength: 10 },
            )
            .map((rawEdges) =>
              rawEdges.map((e) => {
                const edge: CanvasEdge = {
                  id: e.id,
                  fromNode: e.fromNode,
                  toNode: e.toNode,
                }
                if (e.fromSide !== undefined) edge.fromSide = e.fromSide
                if (e.toSide !== undefined) edge.toSide = e.toSide
                if (e.label !== undefined) edge.label = e.label
                if (e.color !== undefined) edge.color = e.color
                return edge
              }),
            )

    return fc.tuple(nodesArb, edgesArb).map(([nodes, edges]) => ({ nodes, edges }))
  })

// ── Property Tests ──────────────────────────────────────────────────────────

describe("Feature: dnd-obsidian-wiki, Property 1: Canvas parse round-trip", () => {
  it("parseCanvasData(serializeCanvasData(data)) equals original data — **Validates: Requirements 3.1**", () => {
    fc.assert(
      fc.property(canvasDataArb, (original: CanvasData) => {
        const serialized = serializeCanvasData(original)
        const result = parseCanvasData(serialized)

        expect(result.ok).toBe(true)
        if (!result.ok) return

        // Nodes should match exactly
        expect(result.data.nodes).toEqual(original.nodes)
        // Edges should match exactly (all edges reference valid node IDs by construction)
        expect(result.data.edges).toEqual(original.edges)
      }),
      { numRuns: 100 },
    )
  })
})


// ── Helpers ──────────────────────────────────────────────────────────────────

/** Mirror the renderer's HTML escaping so assertions compare apples to apples. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

describe("Feature: dnd-obsidian-wiki, Property 2: Canvas node rendering completeness", () => {
  const baseUrl = "https://example.github.io/wiki"

  it("every node in CanvasData has a corresponding element with correct content by type — **Validates: Requirements 3.2, 3.4, 3.5, 3.6**", () => {
    fc.assert(
      fc.property(canvasDataArb, (data: CanvasData) => {
        const html = renderCanvasToHtml(data, baseUrl)

        for (const node of data.nodes) {
          // Each node must have a corresponding element with data-node-id
          expect(html).toContain(`data-node-id="${escapeHtml(node.id)}"`)

          switch (node.type) {
            case "text":
              // Text nodes should contain their HTML-escaped text content
              if (node.text) {
                expect(html).toContain(escapeHtml(node.text))
              }
              break

            case "file":
              // File nodes should contain an <a> tag with the resolved URL
              if (node.file) {
                const expectedPath = node.file.endsWith(".md")
                  ? node.file.slice(0, -3)
                  : node.file
                const escapedHref = escapeHtml(`${baseUrl}/${expectedPath}`)
                expect(html).toContain(`<a href="${escapedHref}">`)
              }
              break

            case "group":
              // Group nodes should contain their HTML-escaped label
              if (node.label) {
                expect(html).toContain(escapeHtml(node.label))
              }
              break

            case "link":
              // Link nodes should contain their URL in an <a> tag
              if (node.url) {
                expect(html).toContain(`<a href="${escapeHtml(node.url)}">`)
              }
              break
          }
        }

        // Verify exactly one element per node by counting data-node-id occurrences
        for (const node of data.nodes) {
          const escapedId = escapeHtml(node.id)
          const regex = new RegExp(`data-node-id="${escapedId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g")
          const matches = html.match(regex)
          expect(matches).toHaveLength(1)
        }
      }),
      { numRuns: 100 },
    )
  })
})

describe("Feature: dnd-obsidian-wiki, Property 3: Canvas edge rendering completeness", () => {
  const baseUrl = "https://example.github.io/wiki"

  it("every edge in CanvasData has exactly one connection element with correct source and target — **Validates: Requirements 3.3**", () => {
    fc.assert(
      fc.property(canvasDataArb, (data: CanvasData) => {
        const html = renderCanvasToHtml(data, baseUrl)

        for (const edge of data.edges) {
          const escapedId = escapeHtml(edge.id)
          const escapedFrom = escapeHtml(edge.fromNode)
          const escapedTo = escapeHtml(edge.toNode)

          // Each edge must have a corresponding element with data-edge-id
          expect(html).toContain(`data-edge-id="${escapedId}"`)
          // Each edge must reference the correct source node
          expect(html).toContain(`data-from-node="${escapedFrom}"`)
          // Each edge must reference the correct target node
          expect(html).toContain(`data-to-node="${escapedTo}"`)

          // Verify the edge element contains all three attributes together
          // by checking for the full <line> pattern
          const edgePattern = new RegExp(
            `<line\\s+class="canvas-edge"\\s+` +
            `data-edge-id="${escapedId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s+` +
            `data-from-node="${escapedFrom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s+` +
            `data-to-node="${escapedTo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
            "g",
          )
          const matches = html.match(edgePattern)
          expect(matches).not.toBeNull()
          // Exactly one connection element per edge
          expect(matches).toHaveLength(1)
        }
      }),
      { numRuns: 100 },
    )
  })
})



describe("Feature: dnd-obsidian-wiki, Property 4: Canvas malformed JSON produces error message", () => {
  it("non-JSON strings produce an error result and renderable error HTML — **Validates: Requirements 3.7**", () => {
    fc.assert(
      fc.property(fc.string(), (input: string) => {
        // Filter out strings that happen to be valid JSON conforming to CanvasData schema
        let isValidJson = false
        try {
          const parsed = JSON.parse(input)
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            !Array.isArray(parsed) &&
            Array.isArray(parsed.nodes) &&
            Array.isArray(parsed.edges)
          ) {
            isValidJson = true
          }
        } catch {
          // Not valid JSON — good, this is what we want
        }
        if (isValidJson) return // skip inputs that accidentally conform

        // parseCanvasData should NOT throw
        const result = parseCanvasData(input)

        // Should return an error result
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(typeof result.error).toBe("string")
          expect(result.error.length).toBeGreaterThan(0)

          // renderCanvasError should NOT throw and should produce error HTML
          const html = renderCanvasError(result.error)
          expect(html).toContain('class="canvas-error"')
          expect(html).toContain(escapeHtml(result.error))
        }
      }),
      { numRuns: 100 },
    )
  })

  it("valid JSON not conforming to CanvasData schema produces an error result and renderable error HTML — **Validates: Requirements 3.7**", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (jsonValue: unknown) => {
        // Filter out values that happen to conform to CanvasData schema
        if (
          typeof jsonValue === "object" &&
          jsonValue !== null &&
          !Array.isArray(jsonValue) &&
          Array.isArray((jsonValue as Record<string, unknown>).nodes) &&
          Array.isArray((jsonValue as Record<string, unknown>).edges)
        ) {
          return // skip — this might be valid canvas data
        }

        const input = JSON.stringify(jsonValue)

        // parseCanvasData should NOT throw
        const result = parseCanvasData(input)

        // Should return an error result
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(typeof result.error).toBe("string")
          expect(result.error.length).toBeGreaterThan(0)

          // renderCanvasError should NOT throw and should produce error HTML
          const html = renderCanvasError(result.error)
          expect(html).toContain('class="canvas-error"')
          expect(html).toContain(escapeHtml(result.error))
        }
      }),
      { numRuns: 100 },
    )
  })
})
