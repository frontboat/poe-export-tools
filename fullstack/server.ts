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

async function extractAttachmentUrls(
  stream: ReadableStream<Uint8Array>
): Promise<{ urls: string[]; sawNextData: boolean }> {
  let nextDataPayload = "";
  let sawNextData = false;

  const rewriter = new HTMLRewriter().on('script[id="__NEXT_DATA__"]', {
    text(text) {
      sawNextData = true;
      nextDataPayload += text.text;
    },
  });

  await rewriter.transform(new Response(stream)).arrayBuffer();

  if (!sawNextData) {
    return { urls: [], sawNextData: false };
  }

  try {
    const nextData = JSON.parse(nextDataPayload) as PoeNextData;
    return { urls: collectAttachmentUrls(nextData), sawNextData: true };
  } catch {
    return { urls: [], sawNextData: true };
  }
}

type PoeAttachment = {
  url?: string;
  file?: {
    url?: string;
  };
};

type PoeMessage = {
  attachments?: PoeAttachment[];
};

type PoeNextData = {
  props?: {
    pageProps?: {
      data?: {
        mainQuery?: {
          chatShare?: {
            messages?: PoeMessage[];
          };
        };
      };
    };
  };
};

function collectAttachmentUrls(nextData: PoeNextData): string[] {
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
async function fetchShareUrls(shareUrl: string) {
  const response = await fetch(shareUrl, {
    headers: { "User-Agent": userAgent },
  });

  if (!response.ok) {
    return {
      error: { error: "Upstream error", status: response.status },
      urls: [],
    };
  }

  if (!response.body) {
    return {
      error: { error: "Missing response body", status: 502 },
      urls: [],
    };
  }

  const { urls, sawNextData } = await extractAttachmentUrls(response.body);
  if (!sawNextData) {
    return {
      error: { error: "Missing __NEXT_DATA__ payload", status: 502 },
      urls: [],
    };
  }

  return { urls, error: null };
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
