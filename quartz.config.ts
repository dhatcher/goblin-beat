import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration — D&D Campaign Wiki
 *
 * Built on top of an existing Obsidian vault.
 * Wiki content lives under content/ — the build uses `-d content`
 * so only files in that directory are processed.
 *
 * See https://quartz.jzhao.xyz/configuration for all options.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Campaign Wiki",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "dhatcher.github.io/goblin-beat",
    ignorePatterns: ["private"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Cinzel",
        body: "Source Sans Pro",
        code: "Fira Code",
      },
      colors: {
        lightMode: {
          light: "#faf8f0",
          lightgray: "#e8e4d9",
          gray: "#8888aa",
          darkgray: "#3a3a4e",
          dark: "#1a1a2e",
          secondary: "#7b4bcf",
          tertiary: "#9d6bff",
          highlight: "rgba(123, 75, 207, 0.1)",
          textHighlight: "rgba(123, 75, 207, 0.2)",
        },
        darkMode: {
          light: "#1a1a2e",
          lightgray: "#2a2a3e",
          gray: "#8888aa",
          darkgray: "#ccccdd",
          dark: "#e8d5b7",
          secondary: "#7b4bcf",
          tertiary: "#9d6bff",
          highlight: "#2a2a4e",
          textHighlight: "#7b4bcf33",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
      Plugin.CanvasTransformer(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
