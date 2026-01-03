import { downloadZip } from "client-zip";

const form = document.querySelector<HTMLFormElement>("#share-form");
const input = document.querySelector<HTMLInputElement>("#share-url");
const grid = document.querySelector<HTMLElement>("#grid");
const chat = document.querySelector<HTMLElement>("#chat");
const leftButton = document.querySelector<HTMLButtonElement>("#left-action");
const rightButton = document.querySelector<HTMLButtonElement>("#right-action");
const actionMenu = document.querySelector<HTMLElement>("#action-menu");
const menuDownload = document.querySelector<HTMLButtonElement>("#menu-download");
const menuUpload = document.querySelector<HTMLButtonElement>("#menu-upload");
const menuToggle = document.querySelector<HTMLButtonElement>("#menu-toggle");
const uploadInput = document.querySelector<HTMLInputElement>("#upload-input");
const notice = document.querySelector<HTMLElement>("#notice");

const urls: string[] = [];
let nextDataRaw: string | null = null;
let chatMessages: ChatMessage[] = [];
let isChatView = false;
let isLoading = false;
let isMenuOpen = false;

const videoExtensions = new Set(["mp4", "webm", "ogg", "mov", "m4v"]);

const icons = {
  upload:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload-icon lucide-upload"><path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>',
  home:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-house-icon lucide-house"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  paste:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-paste-icon lucide-clipboard-paste"><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  enter:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  ellipsis:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-vertical-icon lucide-ellipsis-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
};

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

type ChatParseResult = {
  messages: ChatMessage[];
  error: string | null;
};

function setLoading(loading: boolean) {
  isLoading = loading;
  if (input) input.disabled = loading;
  updateHeaderState();
}

function setError(message: string | null) {
  if (!notice) return;
  if (message) {
    notice.textContent = message;
    notice.classList.remove("is-hidden");
  } else {
    notice.textContent = "";
    notice.classList.add("is-hidden");
  }
}

function normalizeShareUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.hostname !== "poe.com") return null;
    if (url.search || url.hash) return null;
    const match = url.pathname.match(/^\/s\/[^/]+$/);
    if (!match) return null;
    return `https://poe.com${url.pathname}`;
  } catch {
    return null;
  }
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
  updateHeaderState();
}

function setButtonIcon(
  button: HTMLButtonElement | null,
  icon: string,
  label: string,
  key: string
) {
  if (!button) return;
  if (button.dataset.icon !== key) {
    button.innerHTML = icon;
    button.dataset.icon = key;
  }
  button.setAttribute("aria-label", label);
}

function setMenuOpen(open: boolean) {
  isMenuOpen = open;
  updateHeaderState();
}

function hasContent() {
  return urls.length > 0 || chatMessages.length > 0 || Boolean(nextDataRaw);
}

function updateHeaderState() {
  const showContent = hasContent();
  const trimmed = input?.value.trim() ?? "";
  if (!showContent && isMenuOpen) {
    isMenuOpen = false;
  }

  setButtonIcon(
    leftButton,
    showContent ? icons.home : icons.upload,
    showContent ? "Home" : "Upload next-data.json",
    showContent ? "home" : "upload"
  );
  if (leftButton) leftButton.disabled = isLoading;

  if (showContent) {
    setButtonIcon(rightButton, icons.ellipsis, "More actions", "ellipsis");
    if (rightButton) {
      rightButton.setAttribute("aria-expanded", isMenuOpen ? "true" : "false");
      rightButton.setAttribute("aria-haspopup", "menu");
    }
  } else {
    const showEnter = trimmed.length > 0;
    setButtonIcon(
      rightButton,
      showEnter ? icons.enter : icons.paste,
      showEnter ? "Fetch share URL" : "Paste share URL",
      showEnter ? "enter" : "paste"
    );
    if (rightButton) {
      rightButton.removeAttribute("aria-expanded");
      rightButton.removeAttribute("aria-haspopup");
    }
  }
  if (rightButton) rightButton.disabled = isLoading;

  if (actionMenu) {
    actionMenu.classList.toggle("is-hidden", !showContent || !isMenuOpen);
  }

  if (menuDownload) {
    menuDownload.disabled = isLoading || (urls.length === 0 && !nextDataRaw);
  }
  if (menuUpload) {
    menuUpload.disabled = isLoading;
  }
  if (menuToggle) {
    menuToggle.disabled = isLoading || chatMessages.length === 0;
    menuToggle.setAttribute("aria-pressed", isChatView ? "true" : "false");
    menuToggle.dataset.active = isChatView ? "true" : "false";
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

function applyNextData(raw: string | null, fallbackUrls: string[] = []) {
  nextDataRaw = raw;
  const parsed = parseChatMessages(raw);
  chatMessages = parsed.messages;
  urls.length = 0;
  const seen = new Set<string>();
  for (const message of chatMessages) {
    for (const url of message.attachments) {
      if (!seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }
  }
  if (urls.length === 0 && fallbackUrls.length > 0) {
    urls.push(...fallbackUrls);
  }

  renderUrls(urls);
  renderChat(chatMessages);
  setError(parsed.error);
  const nextView = isChatView && chatMessages.length > 0 ? "chat" : "grid";
  setMenuOpen(false);
  setViewMode(nextView);
}

function parseChatMessages(raw: string | null): ChatParseResult {
  if (!raw) return { messages: [], error: null };
  let data: PoeNextData;
  try {
    data = JSON.parse(raw) as PoeNextData;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { messages: [], error: `Invalid next-data.json payload: ${message}` };
  }

  const messages = data?.props?.pageProps?.data?.mainQuery?.chatShare?.messages;
  if (!Array.isArray(messages)) {
    return { messages: [], error: "Chat data missing from next-data.json." };
  }

  return {
    messages: messages.map((message) => {
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
    }),
    error: null,
  };
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

  const normalized = normalizeShareUrl(shareUrl);
  if (!normalized) {
    setError("Invalid share URL. Expected https://poe.com/s/<share-id>.");
    return;
  }

  if (input) input.value = normalized;
  setError(null);
  urls.length = 0;
  nextDataRaw = null;
  chatMessages = [];
  clearGrid();
  clearChat();
  setLoading(true);
  try {
    const response = await fetch(`/api/share?url=${encodeURIComponent(normalized)}`);
    let data: unknown = null;
    try {
      data = await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to read server response: ${message}`);
      return;
    }
    const payload = data as { urls?: unknown; nextData?: unknown; error?: unknown };

    if (!response.ok) {
      const message = typeof payload?.error === "string" ? payload.error : "Request failed.";
      setError(message);
      return;
    }

    const fallbackUrls = Array.isArray(payload?.urls)
      ? (payload.urls as string[])
      : [];
    const raw =
      typeof payload?.nextData === "string" ? (payload.nextData as string) : null;
    applyNextData(raw, fallbackUrls);
    const url = new URL(window.location.href);
    url.searchParams.set("url", normalized);
    window.history.replaceState({}, "", url.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setError(`Request failed: ${message}`);
  } finally {
    setLoading(false);
  }
}

async function downloadAll() {
  if (urls.length === 0 && !nextDataRaw) return;
  if (menuDownload) menuDownload.disabled = true;
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setError(`Download failed: ${message}`);
  } finally {
    if (menuDownload) menuDownload.disabled = false;
  }
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  void fetchShare();
});

input?.addEventListener("input", () => {
  setError(null);
  updateHeaderState();
});

leftButton?.addEventListener("click", () => {
  if (leftButton?.disabled) return;
  if (hasContent()) {
    urls.length = 0;
    nextDataRaw = null;
    chatMessages = [];
    clearGrid();
    clearChat();
    setError(null);
    if (input) input.value = "";
    const url = new URL(window.location.href);
    url.searchParams.delete("url");
    window.history.replaceState({}, "", url.toString());
    setMenuOpen(false);
    setViewMode("grid");
    return;
  }
  uploadInput?.click();
});

rightButton?.addEventListener("click", () => {
  if (rightButton?.disabled) return;
  if (hasContent()) {
    setMenuOpen(!isMenuOpen);
    return;
  }
  const trimmed = input?.value.trim() ?? "";
  if (trimmed.length > 0) {
    void fetchShare();
    return;
  }
  void (async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setError("Clipboard access unavailable. Paste the URL manually.");
        if (input) input.focus();
        return;
      }
      setError(null);
      const text = await navigator.clipboard.readText();
      if (input) input.value = text.trim();
    } catch {
      setError("Clipboard access blocked. Paste the URL manually.");
      if (input) input.focus();
    } finally {
      updateHeaderState();
    }
  })();
});

menuDownload?.addEventListener("click", () => {
  if (menuDownload?.disabled) return;
  setMenuOpen(false);
  void downloadAll();
});

menuUpload?.addEventListener("click", () => {
  if (menuUpload?.disabled) return;
  setMenuOpen(false);
  uploadInput?.click();
});

menuToggle?.addEventListener("click", () => {
  if (menuToggle?.disabled) return;
  setMenuOpen(false);
  setViewMode(isChatView ? "grid" : "chat");
});

uploadInput?.addEventListener("change", () => {
  const file = uploadInput.files?.[0];
  if (!file) return;
  void (async () => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      if (input) input.value = "";
      applyNextData(text);
      const url = new URL(window.location.href);
      url.searchParams.delete("url");
      window.history.replaceState({}, "", url.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to read file: ${message}`);
    } finally {
      setLoading(false);
      uploadInput.value = "";
    }
  })();
});

document.addEventListener("click", (event) => {
  if (!isMenuOpen) return;
  const target = event.target as Node;
  if (actionMenu?.contains(target) || rightButton?.contains(target)) {
    return;
  }
  setMenuOpen(false);
});

const params = new URLSearchParams(window.location.search);
const initialUrl = params.get("url");
if (initialUrl && input) {
  input.value = initialUrl;
  void fetchShare();
}

setViewMode("grid");
