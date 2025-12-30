import { serve } from "bun";
import { request as httpsRequest } from "node:https";
import index from "./index.html";
import type { Root } from "./types.ts";

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

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, { headers: { "User-Agent": userAgent } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf-8"));
      });
      res.on("error", reject);
    });

    req.on("error", reject);
    req.end();
  });
}

async function fetchShareUrls(shareUrl: string) {
  let html: string;
  try {
    html = await httpGet(shareUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: { error: `Upstream error: ${message}` }, urls: [] };
  }

  const startMarker = '<script id="__NEXT_DATA__" type="application/json">';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) {
    return { error: { error: "Missing __NEXT_DATA__", status: 502 }, urls: [] };
  }

  const jsonStart = startIdx + startMarker.length;
  const jsonEnd = html.indexOf("</script>", jsonStart);

  try {
    const nextData: Root = JSON.parse(html.slice(jsonStart, jsonEnd));
    const messages = nextData.props.pageProps.data.mainQuery.chatShare.messages;

    const urls: string[] = [];
    for (const msg of messages) {
      for (const att of msg.attachments ?? []) {
        if (att.file?.url) urls.push(att.file.url);
      }
    }

    return { urls, error: null };
  } catch {
    return { error: { error: "Invalid JSON in __NEXT_DATA__", status: 502 }, urls: [] };
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
          const result = await fetchShareUrls(shareUrl);
          if (result.error) {
            return Response.json(result.error, { status: 502 });
          }

          return Response.json({ urls: result.urls });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return Response.json({ error: `Fetch failed: ${message}` }, { status: 502 });
        }
      },
    },
  },
});

console.log(`Server running at http://localhost:${server.port}`);