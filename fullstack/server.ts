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

function toDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  return { dosDate, dosTime };
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32Start() {
  return 0xffffffff;
}

function crc32Update(crc: number, bytes: Uint8Array) {
  let value = crc;
  for (const byte of bytes) {
    const index = (value ^ byte) & 0xff;
    value = crcTable[index] ^ (value >>> 8);
  }
  return value;
}

function crc32Finish(crc: number) {
  return (crc ^ 0xffffffff) >>> 0;
}

function buildLocalHeader(
  nameBytes: Uint8Array,
  flags: number,
  crc: number,
  size: number,
  dosTime: number,
  dosDate: number
) {
  const localHeader = new Uint8Array(30 + nameBytes.length);
  const localView = new DataView(localHeader.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(6, flags, true);
  localView.setUint16(8, 0, true);
  localView.setUint16(10, dosTime, true);
  localView.setUint16(12, dosDate, true);
  localView.setUint32(14, crc, true);
  localView.setUint32(18, size, true);
  localView.setUint32(22, size, true);
  localView.setUint16(26, nameBytes.length, true);
  localView.setUint16(28, 0, true);
  localHeader.set(nameBytes, 30);
  return localHeader;
}

function buildCentralHeader(
  nameBytes: Uint8Array,
  flags: number,
  crc: number,
  size: number,
  dosTime: number,
  dosDate: number,
  offset: number
) {
  const centralHeader = new Uint8Array(46 + nameBytes.length);
  const centralView = new DataView(centralHeader.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint16(8, flags, true);
  centralView.setUint16(10, 0, true);
  centralView.setUint16(12, dosTime, true);
  centralView.setUint16(14, dosDate, true);
  centralView.setUint32(16, crc, true);
  centralView.setUint32(20, size, true);
  centralView.setUint32(24, size, true);
  centralView.setUint16(28, nameBytes.length, true);
  centralView.setUint16(30, 0, true);
  centralView.setUint16(32, 0, true);
  centralView.setUint16(34, 0, true);
  centralView.setUint16(36, 0, true);
  centralView.setUint32(38, 0, true);
  centralView.setUint32(42, offset, true);
  centralHeader.set(nameBytes, 46);
  return centralHeader;
}

function formatGalleryZipName(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear() % 100).padStart(2, "0");
  return `gallery${month}${day}${year}.zip`;
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

  const html = await response.text();
  const nextData = extractNextData(html);
  if (!nextData) {
    return {
      error: { error: "Missing __NEXT_DATA__ payload", status: 502 },
      urls: [],
    };
  }

  return { urls: collectAttachmentUrls(nextData), error: null };
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
    "/api/zip": {
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

          const attachments = result.urls;
          if (attachments.length === 0) {
            return Response.json({ error: "No attachments found" }, { status: 404 });
          }

          const entries: {
            nameBytes: Uint8Array;
            crc: number;
            size: number;
            offset: number;
          }[] = [];
          const seenNames = new Map<string, number>();
          const filename = formatGalleryZipName(new Date());
          const encoder = new TextEncoder();
          const { dosDate, dosTime } = toDosDateTime(new Date());
          const streamFlags = 0x08;

          const stream = {
            async *[Symbol.asyncIterator]() {
              let offset = 0;

              for (let i = 0; i < attachments.length; i++) {
                const rawFileUrl = attachments[i];
                const fileUrl = normalizeFileUrl(rawFileUrl);
                if (!fileUrl) {
                  throw new Error("Invalid attachment URL");
                }

                const fileResponse = await fetch(fileUrl, {
                  headers: { "User-Agent": userAgent },
                });

                if (!fileResponse.ok) {
                  throw new Error("Upstream error");
                }

                const url = new URL(fileUrl);
                let name = url.pathname.split("/").pop() || `attachment-${i + 1}`;
                const count = seenNames.get(name) ?? 0;
                if (count > 0) {
                  const dotIndex = name.lastIndexOf(".");
                  if (dotIndex > 0) {
                    name =
                      name.slice(0, dotIndex) + `-${count + 1}` + name.slice(dotIndex);
                  } else {
                    name = `${name}-${count + 1}`;
                  }
                }

                if (!name.includes(".")) {
                  name = `${name}.png`;
                }
                seenNames.set(name, count + 1);

                const nameBytes = encoder.encode(name);
                const localOffset = offset;
                const localHeader = buildLocalHeader(
                  nameBytes,
                  streamFlags,
                  0,
                  0,
                  dosTime,
                  dosDate
                );

                yield localHeader;
                offset += localHeader.length;

                if (!fileResponse.body) {
                  throw new Error("Missing file body");
                }

                const reader = fileResponse.body.getReader();
                let crc = crc32Start();
                let size = 0;
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const chunk = value ?? new Uint8Array();
                  size += chunk.length;
                  crc = crc32Update(crc, chunk);
                  yield chunk;
                  offset += chunk.length;
                }

                const finalCrc = crc32Finish(crc);
                const descriptor = new Uint8Array(16);
                const descView = new DataView(descriptor.buffer);
                descView.setUint32(0, 0x08074b50, true);
                descView.setUint32(4, finalCrc, true);
                descView.setUint32(8, size, true);
                descView.setUint32(12, size, true);
                yield descriptor;
                offset += descriptor.length;

                entries.push({
                  nameBytes,
                  crc: finalCrc,
                  size,
                  offset: localOffset,
                });
              }

              const centralOffset = offset;
              let centralSize = 0;
              const centralChunks: Uint8Array[] = [];
              for (const entry of entries) {
                const centralHeader = buildCentralHeader(
                  entry.nameBytes,
                  streamFlags,
                  entry.crc,
                  entry.size,
                  dosTime,
                  dosDate,
                  entry.offset
                );
                centralChunks.push(centralHeader);
                centralSize += centralHeader.length;
              }

              for (const chunk of centralChunks) {
                yield chunk;
                offset += chunk.length;
              }

              const endRecord = new Uint8Array(22);
              const endView = new DataView(endRecord.buffer);
              endView.setUint32(0, 0x06054b50, true);
              endView.setUint16(4, 0, true);
              endView.setUint16(6, 0, true);
              endView.setUint16(8, entries.length, true);
              endView.setUint16(10, entries.length, true);
              endView.setUint32(12, centralSize, true);
              endView.setUint32(16, centralOffset, true);
              endView.setUint16(20, 0, true);
              yield endRecord;
            },
          };

          return new Response(stream, {
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return Response.json({ error: `Zip failed: ${message}` }, { status: 502 });
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
