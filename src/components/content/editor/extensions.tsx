"use client";

import { Node, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes, type NodeViewProps } from "@tiptap/react";
import { LayoutTemplate, Play } from "lucide-react";
import { createContext, useContext } from "react";

/** What a card shows in the editor (its content is edited in Settings, not in the article). */
export type CardSummary = { kind: string; title: string };
export const CardsContext = createContext<{ cards: CardSummary[]; labels: Record<string, string> }>({ cards: [], labels: {} });

function CardView({ node, selected }: NodeViewProps) {
  const { cards, labels } = useContext(CardsContext);
  const card = cards[Number(node.attrs.index)];
  return (
    <NodeViewWrapper className="my-6" data-drag-handle>
      <div contentEditable={false} className={`flex items-center gap-3 rounded-2xl border bg-canvas px-4 py-3 ${selected ? "border-ink ring-2 ring-ink/10" : "border-line"}`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-ink-secondary">
          <LayoutTemplate className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-[1px] text-ink-subtle">{labels[card?.kind ?? ""] ?? card?.kind}</span>
          <span className="block truncate text-sm font-medium text-ink">{card?.title}</span>
        </span>
      </div>
    </NodeViewWrapper>
  );
}

/** A CTA, contact, map or product card, kept as one block (moved or deleted, not edited). */
export const VaultioCard = Node.create({
  name: "vaultioCard",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { index: { default: "0", parseHTML: (element) => element.getAttribute("data-vaultio-block"), renderHTML: (attributes) => ({ "data-vaultio-block": attributes.index }) } };
  },
  parseHTML() {
    return [{ tag: "div[data-vaultio-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CardView);
  },
});

function VideoView({ node, selected }: NodeViewProps) {
  const videoId = String(node.attrs.videoId);
  return (
    <NodeViewWrapper className="my-6" data-drag-handle>
      <div contentEditable={false} className={`relative overflow-hidden rounded-2xl border bg-black ${selected ? "border-ink ring-2 ring-ink/10" : "border-line"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */}
        <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" className="aspect-video w-full object-cover opacity-80" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-white/90 text-ink shadow">
            <Play className="size-6 fill-current" />
          </span>
        </span>
        {node.attrs.title && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 px-4 pb-3 pt-8 text-sm font-medium text-white">{String(node.attrs.title)}</span>}
      </div>
    </NodeViewWrapper>
  );
}

/** A YouTube video, embedded as a privacy-friendly card when the article is published. */
export const VaultioVideo = Node.create({
  name: "vaultioVideo",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      videoId: { default: "", parseHTML: (element) => element.getAttribute("data-vaultio-video"), renderHTML: (attributes) => ({ "data-vaultio-video": attributes.videoId }) },
      title: {
        default: "",
        parseHTML: (element) => decodeURIComponent(element.getAttribute("data-title") ?? ""),
        renderHTML: (attributes) => ({ "data-title": encodeURIComponent(String(attributes.title ?? "")) }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-vaultio-video]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});
