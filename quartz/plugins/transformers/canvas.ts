import { QuartzTransformerPlugin } from "../types"
import { parseCanvasData } from "./canvas-utils"
import { renderCanvasToHtml, renderCanvasError } from "./canvas-renderer"

/**
 * Quartz transformer plugin for Obsidian .canvas files.
 *
 * In textTransform, detects canvas content (JSON with nodes/edges arrays),
 * parses it with parseCanvasData, and renders it to HTML with renderCanvasToHtml.
 * Non-canvas content passes through unchanged.
 *
 * Registers D3.js as an external resource for client-side interactive rendering.
 */
export const CanvasTransformer: QuartzTransformerPlugin = () => ({
  name: "CanvasTransformer",
  textTransform(_ctx, src) {
    // Quick check: canvas files are JSON objects starting with "{"
    const trimmed = src.trim()
    if (!trimmed.startsWith("{")) {
      return src
    }

    // Attempt to detect canvas JSON structure before full parse
    let raw: unknown
    try {
      raw = JSON.parse(trimmed)
    } catch {
      // Not valid JSON — pass through as regular content
      return src
    }

    // Check if it looks like a canvas file (has nodes and edges arrays)
    if (
      typeof raw !== "object" ||
      raw === null ||
      !Array.isArray((raw as Record<string, unknown>)["nodes"]) ||
      !Array.isArray((raw as Record<string, unknown>)["edges"])
    ) {
      return src
    }

    // Parse and validate with the canvas parser
    const result = parseCanvasData(trimmed)
    if (!result.ok) {
      return renderCanvasError(result.error)
    }

    // Render canvas data to HTML
    const baseUrl = _ctx.cfg.configuration.baseUrl ?? ""
    return renderCanvasToHtml(result.data, baseUrl)
  },
  markdownPlugins() {
    return []
  },
  htmlPlugins() {
    return []
  },
  externalResources() {
    return {
      js: [
        {
          src: "https://d3js.org/d3.v7.min.js",
          loadTime: "afterDOMReady",
          contentType: "external",
        },
      ],
    }
  },
})
