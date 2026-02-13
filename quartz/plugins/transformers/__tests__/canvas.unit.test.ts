import { describe, it, expect } from "vitest"
import {
  parseCanvasData,
  serializeCanvasData,
  type CanvasData,
  type CanvasNode,
} from "../canvas-utils"
import { renderCanvasToHtml, renderCanvasError } from "../canvas-renderer"

// ── Parser Tests ────────────────────────────────────────────────────────────

describe("parseCanvasData", () => {
  it("parses a minimal canvas with one text node and no edges", () => {
    const raw = JSON.stringify({
      nodes: [
        { id: "node1", type: "text", x: 0, y: 0, width: 200, height: 100, text: "Hello world" },
      ],
      edges: [],
    })

    const result = parseCanvasData(raw)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.nodes).toHaveLength(1)
    expect(result.data.nodes[0].id).toBe("node1")
    expect(result.data.nodes[0].type).toBe("text")
    expect(result.data.nodes[0].text).toBe("Hello world")
    expect(result.data.edges).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it("parses an empty canvas with no nodes and no edges", () => {
    const raw = JSON.stringify({ nodes: [], edges: [] })

    const result = parseCanvasData(raw)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.nodes).toHaveLength(0)
    expect(result.data.edges).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it("skips edges referencing non-existent nodes and produces warnings", () => {
    const raw = JSON.stringify({
      nodes: [
        { id: "a", type: "text", x: 0, y: 0, width: 100, height: 50 },
      ],
      edges: [
        { id: "e1", fromNode: "a", toNode: "missing-node" },
      ],
    })

    const result = parseCanvasData(raw)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // The orphaned edge should be skipped
    expect(result.data.edges).toHaveLength(0)
    // A warning should be produced
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].message).toContain("missing-node")
  })

  it("returns an error for a completely empty file", () => {
    const result = parseCanvasData("")

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeTruthy()
    expect(typeof result.error).toBe("string")
  })

  it("returns an error for non-JSON content", () => {
    const result = parseCanvasData("this is not json at all {{{")

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeTruthy()
    expect(result.error.toLowerCase()).toContain("json")
  })
})


// ── Renderer Tests ──────────────────────────────────────────────────────────

describe("renderCanvasToHtml", () => {
  const baseUrl = "https://example.github.io/wiki"

  it("renders a file node with a valid path resolving to the correct URL", () => {
    const data: CanvasData = {
      nodes: [
        { id: "f1", type: "file", x: 0, y: 0, width: 200, height: 100, file: "Characters/Gandalf.md" },
      ],
      edges: [],
    }

    const html = renderCanvasToHtml(data, baseUrl)

    // The .md extension should be stripped in the resolved URL
    expect(html).toContain('href="https://example.github.io/wiki/Characters/Gandalf"')
    // The file path should appear as the link label
    expect(html).toContain("Characters/Gandalf.md")
    expect(html).toContain('data-node-id="f1"')
    expect(html).toContain('class="canvas-node canvas-node-file"')
  })

  it("renders a group node as a container with label", () => {
    const data: CanvasData = {
      nodes: [
        { id: "g1", type: "group", x: 10, y: 20, width: 400, height: 300, label: "Party Members" },
      ],
      edges: [],
    }

    const html = renderCanvasToHtml(data, baseUrl)

    expect(html).toContain('data-node-id="g1"')
    expect(html).toContain('class="canvas-node canvas-node-group"')
    expect(html).toContain('class="canvas-group-label"')
    expect(html).toContain("Party Members")
    expect(html).toContain('class="canvas-group-container"')
  })

  it("renders an edge with a label and includes the label in output", () => {
    const data: CanvasData = {
      nodes: [
        { id: "n1", type: "text", x: 0, y: 0, width: 100, height: 50, text: "A" },
        { id: "n2", type: "text", x: 300, y: 0, width: 100, height: 50, text: "B" },
      ],
      edges: [
        { id: "e1", fromNode: "n1", toNode: "n2", label: "travels to" },
      ],
    }

    const html = renderCanvasToHtml(data, baseUrl)

    expect(html).toContain('data-edge-id="e1"')
    expect(html).toContain('data-from-node="n1"')
    expect(html).toContain('data-to-node="n2"')
    expect(html).toContain('data-edge-label="travels to"')
  })
})

describe("renderCanvasError", () => {
  it("produces an error message HTML block", () => {
    const html = renderCanvasError("Something went wrong")

    expect(html).toContain('class="canvas-error"')
    expect(html).toContain('class="canvas-error-message"')
    expect(html).toContain("Something went wrong")
  })

  it("escapes HTML in error messages", () => {
    const html = renderCanvasError('<script>alert("xss")</script>')

    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>alert")
  })
})
