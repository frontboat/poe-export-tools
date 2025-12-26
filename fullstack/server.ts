import { serve } from "bun";
import index from "./index.html";

const allowedHosts = new Set(["poe.com", "www.poe.com"]);
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
const envPort = Bun.env.PORT;
const parsedPort = envPort ? Number.parseInt(envPort, 10) : NaN;
const port = Number.isInteger(parsedPort) && parsedPort >= 0 ? parsedPort : 3000;

function normalizeShareUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (!allowedHosts.has(url.hostname)) return null;
    if (!url.pathname.startsWith("/s/")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function extractNextData(html: string): unknown | null {
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);
  if (start === -1) return null;

  const jsonStart = html.indexOf(">", start);
  if (jsonStart === -1) return null;

  const jsonEnd = html.indexOf("</script>", jsonStart);
  if (jsonEnd === -1) return null;

  const jsonText = html.slice(jsonStart + 1, jsonEnd).trim();
  return JSON.parse(jsonText);
}

function collectAttachmentUrls(nextData: any): string[] {
  const messages = nextData?.props?.pageProps?.data?.mainQuery?.chatShare?.messages;
  if (!Array.isArray(messages)) return [];

  const urls = new Set<string>();
  for (const message of messages) {
    const attachments = message?.attachments;
    if (!Array.isArray(attachments)) continue;
    for (const attachment of attachments) {
      const url = attachment?.file?.url ?? attachment?.url;
      if (typeof url === "string" && url.length > 0) {
        urls.add(url);
      }
    }
  }

  return [...urls];
}

function normalizeFileUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const server = serve({
  port,
  routes: {
    "/": index,
    "/api/share": {
      async GET(req) {
        const requestUrl = new URL(req.url);
        const rawUrl = requestUrl.searchParams.get("url");
        if (!rawUrl) {
          return Response.json({ error: "Missing url parameter" }, { status: 400 });
        }

        const shareUrl = normalizeShareUrl(rawUrl);
        if (!shareUrl) {
          return Response.json({ error: "Invalid share URL" }, { status: 400 });
        }

        try {
          const response = await fetch(shareUrl, {
            headers: { "User-Agent": userAgent },
          });

          if (!response.ok) {
            return Response.json(
              { error: "Upstream error", status: response.status },
              { status: 502 }
            );
          }

          const html = await response.text();
          const nextData = extractNextData(html);
          if (!nextData) {
            return Response.json({ error: "Missing __NEXT_DATA__ payload" }, { status: 502 });
          }

          const urls = collectAttachmentUrls(nextData);
          return Response.json({ urls });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return Response.json({ error: `Fetch failed: ${message}` }, { status: 502 });
        }
      },
    },
    "/api/file": {
      async GET(req) {
        const requestUrl = new URL(req.url);
        const rawUrl = requestUrl.searchParams.get("url");
        if (!rawUrl) {
          return Response.json({ error: "Missing url parameter" }, { status: 400 });
        }

        const fileUrl = normalizeFileUrl(rawUrl);
        if (!fileUrl) {
          return Response.json({ error: "Invalid file URL" }, { status: 400 });
        }

        try {
          const response = await fetch(fileUrl, {
            headers: { "User-Agent": userAgent },
          });

          if (!response.ok) {
            return Response.json(
              { error: "Upstream error", status: response.status },
              { status: 502 }
            );
          }

          const headers = new Headers(response.headers);
          if (!headers.has("Cache-Control")) {
            headers.set("Cache-Control", "public, max-age=31536000, immutable");
          }

          return new Response(response.body, {
            status: response.status,
            headers,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return Response.json({ error: `File fetch failed: ${message}` }, { status: 502 });
        }
      },
    },
  },
});

console.log(`Server running at http://localhost:${server.port}`);
