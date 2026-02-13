# Implementation Plan: D&D Obsidian Wiki

## Overview

Set up Quartz v4 on top of the existing Obsidian vault, implement a custom canvas transformer plugin with D3.js visualization, configure a D&D dark theme, create content templates, and wire up GitHub Actions for automated deployment to GitHub Pages. The content is organized under a `content/` directory using a campaign-centric folder hierarchy.

## Tasks

- [x] 1. Initialize Quartz v4 in the existing vault
  - [x] 1.1 Install Quartz v4 and configure it to use the existing vault root as the content directory
    - Run `npx quartz create` or manually set up `quartz.config.ts`, `quartz.layout.ts`, `package.json`, and `tsconfig.json`
    - Ensure `.obsidian/` is excluded from the Quartz build via `.gitignore` or Quartz filter config
    - Verify the vault remains openable in Obsidian after Quartz files are added
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Configure Quartz site metadata and D&D dark theme
    - Set `pageTitle`, `baseUrl`, and `locale` in `quartz.config.ts`
    - Configure dark-mode color scheme with the parchment gold / purple accent palette from the design
    - Set heading font to Cinzel (fantasy serif) and body font to Source Sans Pro
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 1.3 Configure Quartz built-in plugins for navigation and discoverability
    - Enable Explorer, Search, Graph, Backlinks, and TagPage plugins in `quartz.config.ts` and `quartz.layout.ts`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Checkpoint - Verify Quartz base setup
  - Run `npx quartz build` and verify the site builds successfully with the existing vault content
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Implement Canvas Transformer Plugin
  - [x] 3.1 Create the canvas data parser module
    - Create `quartz/plugins/transformers/canvas-utils.ts`
    - Implement `parseCanvasData(raw: string): CanvasData` that parses and validates canvas JSON
    - Implement `serializeCanvasData(data: CanvasData): string` for round-trip support
    - Define TypeScript interfaces: `CanvasData`, `CanvasNode`, `CanvasEdge`
    - Implement validation: required fields, valid node types, edge reference integrity
    - Return structured error for malformed JSON or invalid schema
    - _Requirements: 3.1, 3.7_
  - [x] 3.2 Write property tests for canvas parser
    - **Property 1: Canvas parse round-trip**
    - **Validates: Requirements 3.1**
    - Use fast-check to generate random valid CanvasData objects
    - Assert `parseCanvasData(serializeCanvasData(data))` equals original data
  - [x] 3.3 Create the canvas HTML renderer module
    - Create `quartz/plugins/transformers/canvas-renderer.ts`
    - Implement `renderCanvasToHtml(data: CanvasData, baseUrl: string): string`
    - Render each node type: text (with content), file (with link), group (as container with label), link (with URL)
    - Render edges as SVG path data attributes referencing source/target node IDs
    - For malformed input, return an error message HTML block
    - Embed canvas data as JSON in a `<script>` tag for D3.js client-side rendering
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  - [x] 3.4 Write property tests for canvas renderer
    - **Property 2: Canvas node rendering completeness**
    - **Validates: Requirements 3.2, 3.4, 3.5, 3.6**
    - Generate random CanvasData, render to HTML, assert each node has a corresponding element with correct content by type
  - [x] 3.5 Write property test for canvas edge rendering
    - **Property 3: Canvas edge rendering completeness**
    - **Validates: Requirements 3.3**
    - Generate random CanvasData with edges, render to HTML, assert each edge has a corresponding connection element
  - [x] 3.6 Write property test for malformed canvas input
    - **Property 4: Canvas malformed JSON produces error message**
    - **Validates: Requirements 3.7**
    - Generate random non-JSON strings and invalid objects, assert error message HTML returned without exceptions
  - [x] 3.7 Write unit tests for canvas parser and renderer
    - Test minimal canvas (one text node, no edges)
    - Test empty canvas (`{"nodes":[],"edges":[]}`)
    - Test file node with valid path resolves to correct URL
    - Test group node renders as container with label
    - Test edge with label renders label in output
    - Test edge referencing non-existent node is skipped with warning
    - Test completely empty file produces error message
    - Test non-JSON content produces error message
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 4. Integrate Canvas Plugin into Quartz
  - [x] 4.1 Create the Quartz transformer plugin wrapper
    - Create `quartz/plugins/transformers/canvas.ts`
    - Implement the `QuartzTransformerPlugin` interface
    - In `textTransform`, detect `.canvas` files, parse with `parseCanvasData`, render with `renderCanvasToHtml`
    - Pass through non-canvas files unchanged
    - Register D3.js as an external resource via `externalResources()`
    - _Requirements: 3.1_
  - [x] 4.2 Create the D3.js client-side canvas graph script
    - Create `quartz/static/scripts/canvas-graph.inline.ts`
    - Implement `renderCanvasGraph()` that reads embedded canvas JSON from the page
    - Render interactive SVG with pan/zoom using D3.js
    - Style nodes by type (text, file, link, group) with distinct colors
    - Draw edges as lines/paths with optional labels
    - Make file-reference nodes clickable (navigate to linked page)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 4.3 Register the Canvas plugin in quartz.config.ts
    - Add `Plugin.CanvasTransformer()` to the transformers array
    - _Requirements: 3.1_

- [x] 5. Checkpoint - Verify canvas rendering
  - Create a test `.canvas` file in the vault with sample nodes and edges
  - Run `npx quartz build` and verify the canvas page renders correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Create content templates and landing page
  - [x] 6.1 Create the Campaign template
    - Create `_templates/Campaign.md` with frontmatter (campaign name, DM, setting, status, tags)
    - Include sections: World Overview, Major Factions, Active Quests, Locations, Player Characters, NPCs, Session Notes
    - Use wikilink placeholders to demonstrate linking pattern
    - _Requirements: 6.2_
  - [x] 6.2 Create Character, Location, and Session Notes templates
    - Create `_templates/Character.md` with frontmatter (name, race, class, level, player, type: PC|NPC, campaign, tags)
    - Create `_templates/Location.md` with frontmatter (name, type, region, campaign, tags)
    - Create `_templates/Session Notes.md` with frontmatter (session number, date, campaign, players present, tags)
    - Each template uses wikilinks to demonstrate cross-referencing
    - _Requirements: 6.2_
  - [x] 6.3 Create the landing page and contributor README
    - Create `index.md` as the wiki home page with welcome text and links to key sections
    - Create/update `README.md` with step-by-step contributor instructions: clone repo, open in Obsidian, edit, commit, push
    - Include instructions for using templates
    - _Requirements: 5.3, 6.1, 6.3_

- [ ] 7. Set up GitHub Actions deployment pipeline
  - [x] 7.1 Create the GitHub Actions workflow file
    - Create `.github/workflows/deploy.yml`
    - Trigger on push to `main` branch and `workflow_dispatch`
    - Steps: checkout, setup Node.js 20, `npm ci`, `npx quartz build`, upload pages artifact, deploy to GitHub Pages
    - Configure permissions: `contents: read`, `pages: write`, `id-token: write`
    - Set concurrency group to prevent parallel deployments
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 8. Final checkpoint - Full build verification
  - Run `npx quartz build` and verify the complete site builds with all features
  - Verify canvas rendering, templates, theme, and navigation all work together
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Restructure content into `content/` directory
  - [x] 9.1 Create the `content/` directory structure and move content files
    - Create `content/` directory at vault root
    - Create `content/campaigns/` directory
    - Move `index.md` from vault root to `content/index.md`
    - Move `test-canvas.md` to `content/test-canvas.md` (so it's included in the build)
    - Create a sample campaign folder: `content/campaigns/Saturday-Sorcerers/` with subfolders `characters/`, `locations/`, `sessions/`
    - Create `content/campaigns/Saturday-Sorcerers/index.md` as a campaign overview page using the Campaign template structure
    - _Requirements: 1.1, 1.2, 4.1_

  - [x] 9.2 Update `content/index.md` landing page to dynamically list campaigns
    - Rewrite the landing page to list available campaigns with wikilinks to each campaign's `index.md`
    - Use links like `[[campaigns/Saturday-Sorcerers/index|Saturday Sorcerers]]`
    - Keep the quick-start instructions and contributor guide link
    - _Requirements: 4.1, 5.3_

  - [x] 9.3 Update `quartz.config.ts` ignorePatterns for the new content directory
    - Remove patterns that are no longer needed (`.obsidian`, `node_modules`, `_templates`, `.kiro`, `.vscode`, `.github`, `quartz`, `.quartz-cache`, `public`, `*.json`, `*.ts`, `*.mjs`, `.npmrc`, `.gitignore`, `.git`, `.prettierrc`, `.prettierignore`, `*.d.ts`) since these are all outside `content/`
    - Keep only patterns for files within `content/` that should be excluded (e.g., `private`)
    - _Requirements: 1.2_

  - [x] 9.4 Update `package.json` scripts to use `-d content`
    - Change `"build"` script from `npx quartz build -d .` to `npx quartz build -d content`
    - Change `"serve"` script from `npx quartz build --serve -d .` to `npx quartz build --serve -d content`
    - _Requirements: 1.2, 2.1_

  - [x] 9.5 Update `.github/workflows/deploy.yml` to use `-d content`
    - Change the build step from `npx quartz build` to `npx quartz build -d content`
    - _Requirements: 2.1, 2.4_

- [ ] 10. Update templates and documentation for new structure
  - [x] 10.1 Update content templates to reflect new folder paths
    - Add a comment at the top of each template in `_templates/` indicating the intended destination path within `content/campaigns/`
    - `Campaign.md` → copy to `content/campaigns/<Campaign-Name>/index.md`
    - `Character.md` → copy to `content/campaigns/<Campaign-Name>/characters/<Character-Name>.md`
    - `Location.md` → copy to `content/campaigns/<Campaign-Name>/locations/<Location-Name>.md`
    - `Session Notes.md` → copy to `content/campaigns/<Campaign-Name>/sessions/Session-NNN.md`
    - Update wikilink paths in templates to use campaign-relative paths
    - _Requirements: 6.2_

  - [x] 10.2 Update `README.md` with new content organization instructions
    - Document the `content/` folder structure and campaign-centric hierarchy
    - Update the "Adding Content" section to explain creating a new campaign folder under `content/campaigns/`
    - Explain the subfolder convention: `characters/`, `locations/`, `sessions/`
    - Update template usage instructions to reference the new destination paths
    - _Requirements: 6.1, 6.3_

- [x] 11. Checkpoint - Verify restructured build
  - Run `npx quartz build -d content` and verify the site builds successfully with content from the `content/` directory
  - Verify the landing page renders and links to the sample campaign
  - Verify the sample campaign overview page renders correctly
  - Verify canvas files under `content/` still render correctly
  - Verify that files outside `content/` (templates, config, etc.) are not included in the build output
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties of the canvas renderer
- Unit tests validate specific examples and edge cases
- Quartz built-in features (wikilinks, callouts, backlinks, search, explorer, tags) require configuration only, not custom implementation
- Tasks 1–8 cover the original setup; tasks 9–11 implement the content restructure into the `content/` directory
