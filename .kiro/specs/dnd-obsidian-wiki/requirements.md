# Requirements Document

## Introduction

A Dungeons & Dragons group wiki built on top of an Obsidian vault. The vault serves as the single source of truth: group members edit markdown files in Obsidian, push changes to a GitHub repository, and a static site is automatically built and deployed to GitHub Pages. The site must faithfully render Obsidian-flavored markdown — including wikilinks, callouts, and Canvas files — so that non-developer group members can contribute content without touching code.

Quartz is selected as the static site generator. Quartz is purpose-built for publishing Obsidian vaults: it natively supports wikilinks, backlinks, callouts, graph view, tags, and the Obsidian content model out of the box. Astro is a general-purpose framework that would require significant custom plugin work to achieve the same Obsidian compatibility. For a "write in Obsidian, publish to the web" workflow, Quartz is the clear fit.

## Glossary

- **Vault**: The Obsidian vault directory containing all markdown and canvas files that serve as the wiki content source
- **Quartz**: A static site generator (https://quartz.jzhao.xyz/) designed to publish Obsidian vaults as websites
- **Canvas_File**: An Obsidian `.canvas` file (JSON format) that defines nodes and edges representing a visual graph or diagram
- **Canvas_Renderer**: The component responsible for parsing Canvas_File JSON and producing an interactive visual graph on the published site
- **Wikilink**: An Obsidian-style internal link using `[[page-name]]` or `[[page-name|display text]]` syntax
- **Callout**: An Obsidian-style admonition block using `> [!type]` syntax for notes, warnings, tips, etc.
- **Build_Pipeline**: The GitHub Actions workflow that builds the Quartz site and deploys it to GitHub Pages
- **Content_Author**: A D&D group member who edits content in Obsidian and pushes changes via Git
- **Site_Visitor**: Any person viewing the published GitHub Pages website

## Requirements

### Requirement 1: Obsidian Vault as Content Source

**User Story:** As a Content_Author, I want to open the project as an Obsidian vault and edit markdown files directly, so that I can use familiar Obsidian tooling to manage wiki content.

#### Acceptance Criteria

1. THE Vault SHALL be openable in Obsidian as a fully functional vault with no additional configuration by the Content_Author
2. WHEN a Content_Author creates or edits a markdown file in the Vault, THE Quartz build SHALL include that file in the generated site output
3. WHEN a Content_Author uses Wikilink syntax in a markdown file, THE Quartz build SHALL resolve the link to the correct page on the published site
4. WHEN a Content_Author uses Callout syntax in a markdown file, THE Quartz build SHALL render the callout with appropriate styling on the published site
5. WHEN a Content_Author adds images or attachments to the Vault, THE Quartz build SHALL include those assets and resolve references to them in the published site

### Requirement 2: Automated Build and Deployment

**User Story:** As a Content_Author, I want changes pushed to the main branch to automatically update the published site, so that I do not need to run any build commands manually.

#### Acceptance Criteria

1. WHEN changes are pushed to the main branch, THE Build_Pipeline SHALL trigger a Quartz build and deploy the output to GitHub Pages
2. WHEN the Build_Pipeline completes successfully, THE Site_Visitor SHALL see the updated content on the GitHub Pages URL within 5 minutes of the push
3. IF the Build_Pipeline fails, THEN THE Build_Pipeline SHALL report the failure via GitHub Actions status checks visible to the Content_Author
4. THE Build_Pipeline SHALL use a GitHub Actions workflow file stored in the repository

### Requirement 3: Canvas File Rendering

**User Story:** As a Content_Author, I want to create Obsidian Canvas files to map out relationships between characters, locations, and plot points, and have those canvases render as viewable graphs on the published site.

#### Acceptance Criteria

1. WHEN a Canvas_File is present in the Vault, THE Canvas_Renderer SHALL parse the Canvas_File JSON and produce a visual graph on the corresponding site page
2. THE Canvas_Renderer SHALL render each node in the Canvas_File as a labeled element in the visual graph
3. THE Canvas_Renderer SHALL render each edge in the Canvas_File as a connection between the corresponding nodes in the visual graph
4. WHEN a node in the Canvas_File references a markdown file via a Wikilink, THE Canvas_Renderer SHALL link that node to the corresponding page on the published site
5. WHEN a Canvas_File contains text-only nodes, THE Canvas_Renderer SHALL display the text content within the node element
6. WHEN a Canvas_File contains group nodes, THE Canvas_Renderer SHALL render the group as a visual container enclosing its child nodes
7. IF a Canvas_File contains malformed JSON, THEN THE Canvas_Renderer SHALL display an error message on the page instead of a broken graph

### Requirement 4: Site Navigation and Discoverability

**User Story:** As a Site_Visitor, I want to browse the wiki with clear navigation, so that I can find information about characters, locations, and lore easily.

#### Acceptance Criteria

1. THE Quartz site SHALL display a file explorer sidebar reflecting the Vault folder structure
2. THE Quartz site SHALL display a search interface allowing Site_Visitors to search across all page content
3. THE Quartz site SHALL display a graph view showing connections between pages based on Wikilinks
4. WHEN a Site_Visitor views a page, THE Quartz site SHALL display backlinks showing other pages that link to the current page
5. WHEN a Site_Visitor views a page with tags, THE Quartz site SHALL display the tags and allow navigation to other pages sharing the same tag

### Requirement 5: Theming and Presentation

**User Story:** As a Site_Visitor, I want the wiki to have a fantasy/D&D-appropriate visual theme, so that the site feels immersive and fitting for the campaign content.

#### Acceptance Criteria

1. THE Quartz site SHALL use a dark-mode color scheme as the default theme
2. THE Quartz site SHALL use a serif or fantasy-style font for headings to evoke a D&D aesthetic
3. THE Quartz site SHALL display a configurable site title and description on the landing page
4. WHEN a Content_Author specifies frontmatter metadata (title, tags, description) in a markdown file, THE Quartz site SHALL use that metadata for page titles and SEO

### Requirement 6: Non-Developer Contribution Workflow

**User Story:** As a Content_Author who is not a developer, I want a simple workflow for contributing content, so that I do not need to understand build tools or web development.

#### Acceptance Criteria

1. THE Vault SHALL include a README file with step-by-step instructions for Content_Authors to set up Obsidian, clone the repository, and push changes
2. THE Vault SHALL include template markdown files demonstrating common page structures (campaign, character sheet, location, session notes)
3. WHEN a Content_Author follows the README instructions, THE Content_Author SHALL be able to publish new content without running any build commands locally
