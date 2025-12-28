const form = document.querySelector<HTMLFormElement>("#share-form");
const input = document.querySelector<HTMLInputElement>("#share-url");
const grid = document.querySelector<HTMLElement>("#grid");
const downloadButton = document.querySelector<HTMLButtonElement>("#download-btn");

const urls: string[] = [];
let currentShareUrl: string | null = null;

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
    const img = document.createElement("img");
    img.src = url;
    img.loading = "lazy";
    img.alt = "Attachment preview";
    preview.appendChild(img);

    anchor.appendChild(preview);
    fragment.appendChild(anchor);
  });

  grid.appendChild(fragment);
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
    currentShareUrl = shareUrl;
    const url = new URL(window.location.href);
    url.searchParams.set("url", shareUrl);
    window.history.replaceState({}, "", url.toString());
  } catch (error) {
  } finally {
    setLoading(false);
  }
}

async function downloadAll() {
  if (urls.length === 0 || !downloadButton || !currentShareUrl) return;
  downloadButton.disabled = true;

  const zipUrl = `/api/zip?url=${encodeURIComponent(currentShareUrl)}`;
  const link = document.createElement("a");
  link.href = zipUrl;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();

  downloadButton.disabled = false;
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
