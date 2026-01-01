import { downloadZip } from "client-zip";

const form = document.querySelector<HTMLFormElement>("#share-form");
const input = document.querySelector<HTMLInputElement>("#share-url");
const grid = document.querySelector<HTMLElement>("#grid");
const chat = document.querySelector<HTMLElement>("#chat");
const toggleButton = document.querySelector<HTMLButtonElement>("#toggle-chat");
const downloadButton = document.querySelector<HTMLButtonElement>("#download-btn");

const urls: string[] = [];
let nextDataRaw: string | null = null;
let chatMessages: ChatMessage[] = [];
let isChatView = false;

const videoExtensions = new Set(["mp4", "webm", "ogg", "mov", "m4v"]);

type PoeAttachment = {
  url?: string;
  file?: {
    url?: string;
  };
};

type PoeMessage = {
  author?: string;
  text?: string;
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

type ChatMessage = {
  role: "human" | "bot";
  text: string;
  attachments: string[];
};

function setLoading(loading: boolean) {
  if (input) input.disabled = loading;
  if (downloadButton) downloadButton.disabled = loading || urls.length === 0;
  if (toggleButton) toggleButton.disabled = loading || chatMessages.length === 0;
}

function clearGrid() {
  if (grid) grid.textContent = "";
}

function clearChat() {
  if (chat) chat.textContent = "";
}

function setViewMode(view: "grid" | "chat") {
  isChatView = view === "chat";
  if (grid) grid.classList.toggle("is-hidden", isChatView);
  if (chat) chat.classList.toggle("is-hidden", !isChatView);
  if (toggleButton) {
    toggleButton.setAttribute("aria-pressed", isChatView ? "true" : "false");
    toggleButton.dataset.active = isChatView ? "true" : "false";
  }
}

function createMediaAnchor(url: string, className: string, index?: number) {
  const anchor = document.createElement("a");
  anchor.className = className;
  if (typeof index === "number") {
    anchor.style.animationDelay = `${Math.min(index * 0.03, 0.3)}s`;
  }
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
  return anchor;
}

function renderUrls(list: string[]) {
  if (!grid) return;

  clearGrid();
  if (list.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach((url, index) => {
    fragment.appendChild(createMediaAnchor(url, "media-item", index));
  });

  grid.appendChild(fragment);
}

function renderChat(messages: ChatMessage[]) {
  if (!chat) return;
  clearChat();
  if (messages.length === 0) return;

  const fragment = document.createDocumentFragment();

  messages.forEach((message) => {
    if (!message.text && message.attachments.length === 0) return;
    const row = document.createElement("div");
    row.className = `chat-row ${
      message.role === "human" ? "chat-row-human" : "chat-row-bot"
    }`;

    const card = document.createElement("div");
    card.className = "chat-card";

    if (message.text) {
      const text = document.createElement("p");
      text.className = "chat-text";
      text.textContent = message.text;
      card.appendChild(text);
    }

    if (message.attachments.length > 0) {
      const media = document.createElement("div");
      media.className = "chat-media";
      message.attachments.forEach((url) => {
        media.appendChild(createMediaAnchor(url, "chat-media-item"));
      });
      card.appendChild(media);
    }

    row.appendChild(card);
    fragment.appendChild(row);
  });

  chat.appendChild(fragment);
}

function parseChatMessages(raw: string | null): ChatMessage[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as PoeNextData;
    const messages = data?.props?.pageProps?.data?.mainQuery?.chatShare?.messages;
    if (!Array.isArray(messages)) return [];
    return messages.map((message) => {
      const attachments: string[] = [];
      if (Array.isArray(message?.attachments)) {
        const seen = new Set<string>();
        for (const attachment of message.attachments) {
          const url = attachment?.file?.url ?? attachment?.url;
          if (typeof url === "string" && url.length > 0 && !seen.has(url)) {
            seen.add(url);
            attachments.push(url);
          }
        }
      }

      return {
        role: message?.author === "human" ? "human" : "bot",
        text: typeof message?.text === "string" ? message.text : "",
        attachments,
      };
    });
  } catch {
    return [];
  }
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
  nextDataRaw = null;
  chatMessages = [];
  if (downloadButton) downloadButton.disabled = true;
  clearGrid();
  clearChat();
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
    if (typeof data?.nextData === "string") {
      nextDataRaw = data.nextData;
    }

    chatMessages = parseChatMessages(nextDataRaw);
    renderUrls(urls);
    renderChat(chatMessages);
    const nextView = isChatView && chatMessages.length > 0 ? "chat" : "grid";
    setViewMode(nextView);
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
        if (nextDataRaw) {
          yield {
            name: "next-data.json",
            input: new Blob([nextDataRaw], { type: "application/json" }),
          };
        }
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

toggleButton?.addEventListener("click", () => {
  if (toggleButton?.disabled) return;
  setViewMode(isChatView ? "grid" : "chat");
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

if (toggleButton) {
  toggleButton.disabled = true;
}

setViewMode("grid");
