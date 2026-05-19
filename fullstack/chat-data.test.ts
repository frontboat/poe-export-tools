import { describe, expect, test } from "bun:test";
import { parseChatMessages } from "./chat-data";

describe("parseChatMessages", () => {
  test("keeps existing compact JSON export support", () => {
    const result = parseChatMessages(
      JSON.stringify({
        messages: [
          {
            role: "user",
            content: "show this",
            attachments: [{ url: "https://example.test/image.png" }],
          },
        ],
      })
    );

    expect(result.error).toBeNull();
    expect(result.messages).toEqual([
      {
        role: "human",
        text: "show this",
        attachments: ["https://example.test/image.png"],
      },
    ]);
  });

  test("parses Poe next-data chatShare messages arrays", () => {
    const result = parseChatMessages(
      JSON.stringify({
        props: {
          pageProps: {
            data: {
              mainQuery: {
                chatShare: {
                  messages: [
                    {
                      author: "human",
                      text: "make an image",
                    },
                    {
                      author: "pacarana",
                      text: "[img]: https://example.test/image.png",
                      attachments: [
                        {
                          name: "image",
                          url: "https://example.test/image.png?w=1408&h=768",
                          file: {
                            mimeType: "image/png",
                            url: "https://example.test/image.png?w=1408&h=768",
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      })
    );

    expect(result.error).toBeNull();
    expect(result.messages).toEqual([
      {
        role: "human",
        text: "make an image",
        attachments: [],
      },
      {
        role: "bot",
        text: "[img]: https://example.test/image.png",
        attachments: ["https://example.test/image.png?w=1408&h=768"],
      },
    ]);
  });

  test("parses Markdown transcripts emitted by the Poe export bots", () => {
    const mediaHtml =
      '<body><video src="https://example.test/base/video.mp4?download=1&amp;name=clip" controls></video></body>';
    const mediaSrc = `data:text/html;charset=utf-8,${encodeURIComponent(mediaHtml)}`;
    const result = parseChatMessages(`User:

Hello

---

GPT-5.5:

Here is the image and video.

![cat](<https://example.test/cat.png>)

<iframe width="100%" height="720" src="${mediaSrc}" allow="autoplay"></iframe>`);

    expect(result.error).toBeNull();
    expect(result.messages).toEqual([
      {
        role: "human",
        text: "Hello",
        attachments: [],
      },
      {
        role: "bot",
        text: "Here is the image and video.",
        attachments: [
          "https://example.test/cat.png",
          "https://example.test/base/video.mp4?download=1&name=clip",
        ],
      },
    ]);
  });

  test("parses Markdown reference attachment links", () => {
    const result = parseChatMessages(`Bot:

[video_0]: <https://example.test/video.mp4>`);

    expect(result.error).toBeNull();
    expect(result.messages).toEqual([
      {
        role: "bot",
        text: "",
        attachments: ["https://example.test/video.mp4"],
      },
    ]);
  });
});
