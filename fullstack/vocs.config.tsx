import { defineConfig } from "vocs";

export default defineConfig({
  title: "export.tools",
  titleTemplate: "%s · export.tools",
  description:
    "Download images, videos, and files from any poe.com share link. Runs in your browser — nothing is uploaded.",
  rootDir: "docs",
  iconUrl: "/faviconsvg.svg",
  ogImageUrl: "https://export.tools/static/og.png",
  socials: [
    { icon: "github", link: "https://github.com/frontboat/poe-export-tools" },
  ],
  editLink: {
    pattern:
      "https://github.com/frontboat/poe-export-tools/edit/main/fullstack/docs/pages/:path",
    text: "Edit this page on GitHub",
  },
  topNav: [
    { text: "Guide", link: "/getting-started", match: "/guides" },
    { text: "API", link: "/api/http-endpoints", match: "/api" },
    { text: "Live app", link: "https://export.tools" },
  ],
  sidebar: [
    {
      text: "Introduction",
      items: [
        { text: "Overview", link: "/" },
        { text: "Getting Started", link: "/getting-started" },
      ],
    },
    {
      text: "Guides",
      collapsed: false,
      items: [
        { text: "Self-hosting", link: "/guides/self-hosting" },
        { text: "Local development", link: "/guides/local-development" },
        { text: "Building the binary", link: "/guides/building-the-binary" },
        { text: "Uploading exported JSON", link: "/guides/uploading-exported-json" },
        { text: "Troubleshooting", link: "/guides/troubleshooting" },
      ],
    },
    {
      text: "Concepts",
      collapsed: false,
      items: [
        { text: "Architecture", link: "/concepts/architecture" },
        { text: "Share-URL validation", link: "/concepts/share-url-validation" },
        { text: "__NEXT_DATA__ extraction", link: "/concepts/next-data-extraction" },
        { text: "Hash-tolerant static routing", link: "/concepts/hash-tolerant-static-routing" },
        { text: "Chat parsing", link: "/concepts/chat-parsing" },
        { text: "Client-side zip streaming", link: "/concepts/client-zip-streaming" },
      ],
    },
    {
      text: "API",
      collapsed: false,
      items: [
        { text: "HTTP endpoints", link: "/api/http-endpoints" },
        { text: "/api/share", link: "/api/share-endpoint" },
        { text: "Debug endpoints", link: "/api/debug-endpoints" },
        { text: "Data shapes", link: "/api/data-shapes" },
      ],
    },
    {
      text: "Reference",
      collapsed: true,
      items: [
        { text: "Gotchas", link: "/reference/gotchas" },
        { text: "Changelog", link: "/reference/changelog" },
      ],
    },
  ],
});
