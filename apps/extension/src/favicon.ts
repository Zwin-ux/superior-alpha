import { BotIdentity, createBotIconSvg } from "@clawdbot/shared";

export function updateFavicon(bot: BotIdentity): void {
  const existingLink = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  const link = existingLink ?? document.createElement("link");
  const svg = createBotIconSvg(bot);

  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  if (!existingLink) {
    document.head.append(link);
  }
}
