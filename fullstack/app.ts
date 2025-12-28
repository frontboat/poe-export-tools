import { downloadZip } from "client-zip";

const form = document.querySelector<HTMLFormElement>("#share-form");
const input = document.querySelector<HTMLInputElement>("#share-url");
const grid = document.querySelector<HTMLElement>("#grid");
const downloadButton = document.querySelector<HTMLButtonElement>("#download-btn");

const urls: string[] = [];

const videoExtensions = new Set(["mp4", "webm", "ogg", "mov", "m4v"]);

function setLoading(loading: boolean) {
  if (input) input.disabled = loading;
  if (downloadButton) downloadButton.disabled = loading || urls.length === 0;
}

function clearGrid() {
  if (grid) grid.textContent = "";
}

function renderUrls(list: string[]) {
  if (!grid) return;

  clearGrid();
  if (list.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach((url, index) => {
    const anchor = document.createElement("a");
    anchor.className = "media-item";
    anchor.style.animationDelay = `${Math.min(index * 0.03, 0.3)}s`;
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";

    const preview = document.createElement("div");
    preview.className = "media-preview";
    if (isVideoUrl(url)) {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-label", "Attachment preview");
      preview.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = url;
      img.loading = "lazy";
      img.alt = "Attachment preview";
      preview.appendChild(img);
    }

    anchor.appendChild(preview);
    fragment.appendChild(anchor);
  });

  grid.appendChild(fragment);
}

function formatGalleryZipName(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear() % 100).padStart(2, "0");
  return `gallery${month}${day}${year}.zip`;
}

function buildAttachmentName(rawUrl: string, index: number, seenNames: Map<string, number>) {
  let name = `attachment-${index + 1}`;
  try {
    const url = new URL(rawUrl);
    name = url.pathname.split("/").pop() || name;
  } catch {
    // Fallback to default name.
  }

  const count = seenNames.get(name) ?? 0;
  if (count > 0) {
    const dotIndex = name.lastIndexOf(".");
    if (dotIndex > 0) {
      name = name.slice(0, dotIndex) + `-${count + 1}` + name.slice(dotIndex);
    } else {
      name = `${name}-${count + 1}`;
    }
  }

  if (!name.includes(".")) {
    name = `${name}.${isVideoUrl(rawUrl) ? "mp4" : "png"}`;
  }

  seenNames.set(name, count + 1);
  return name;
}

function isVideoUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const segments = url.pathname.split("/");
    const lastSegment = segments[segments.length - 1] ?? "";
    if (segments.includes("video")) return true;
    const extension = lastSegment.split(".").pop()?.toLowerCase();
    return extension ? videoExtensions.has(extension) : false;
  } catch {
    return false;
  }
}

async function fetchShare() {
  if (!input) return;
  const shareUrl = input.value.trim();

  if (!shareUrl) {
    return;
  }

  urls.length = 0;
  if (downloadButton) downloadButton.disabled = true;
  clearGrid();
  setLoading(true);
  try {
    const response = await fetch(`/api/share?url=${encodeURIComponent(shareUrl)}`);
    const data = await response.json();

    if (!response.ok) {
      return;
    }

    urls.length = 0;
    if (Array.isArray(data?.urls)) {
      urls.push(...data.urls);
    }

    renderUrls(urls);
    if (downloadButton) downloadButton.disabled = urls.length === 0;
    const url = new URL(window.location.href);
    url.searchParams.set("url", shareUrl);
    window.history.replaceState({}, "", url.toString());
  } catch (error) {
  } finally {
    setLoading(false);
  }
}

async function downloadAll() {
  if (urls.length === 0 || !downloadButton) return;
  downloadButton.disabled = true;
  const filename = formatGalleryZipName(new Date());

  try {
    const seenNames = new Map<string, number>();
    const zipResponse = downloadZip(
      (async function* () {
        for (const [index, url] of urls.entries()) {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch attachment ${index + 1}`);
          }

          yield {
            name: buildAttachmentName(url, index, seenNames),
            input: response,
          };
        }
      })()
    );

    const blob = await zipResponse.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } finally {
    downloadButton.disabled = false;
  }
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  void fetchShare();
});

downloadButton?.addEventListener("click", () => {
  void downloadAll();
});

const params = new URLSearchParams(window.location.search);
const initialUrl = params.get("url");
if (initialUrl && input) {
  input.value = initialUrl;
  void fetchShare();
}

if (downloadButton) {
  downloadButton.disabled = true;
}
