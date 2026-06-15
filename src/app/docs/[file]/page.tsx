import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

const guides = new Map([
  ["how-this-codebase-runs.md", "How this codebase runs"],
  ["validation-platform-redesign.md", "Validation platform redesign"],
]);

type MarkdownBlock =
  | { type: "heading"; depth: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; language: string; value: string };

export default async function MarkdownDocPage({ params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const decoded = decodeURIComponent(file);
  const title = guides.get(decoded);
  if (!title) notFound();

  const markdown = await readFile(path.join(process.cwd(), "docs", "guides", decoded), "utf8").catch(() => null);
  if (!markdown) notFound();

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl">
        <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 md:p-8">
          <Link href="/architecture" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">
            Back to architecture and docs
          </Link>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white">{title}</h1>
          <div className="mt-8 max-w-4xl space-y-5 text-slate-300">{renderMarkdown(markdown)}</div>
        </article>
      </div>
    </AppShell>
  );
}

function renderMarkdown(markdown: string) {
  return parseMarkdown(markdown).map((block, index) => {
    const key = `${block.type}-${index}`;
    if (block.type === "heading") {
      const classes = {
        1: "pt-4 text-3xl font-black text-white",
        2: "pt-6 text-2xl font-bold text-cyan-100",
        3: "pt-4 text-xl font-bold text-pink-100",
      };
      const HeadingTag = `h${block.depth + 1}` as "h2" | "h3" | "h4";
      return <HeadingTag key={key} className={classes[block.depth]}>{renderInline(block.text)}</HeadingTag>;
    }
    if (block.type === "list") {
      return (
        <ul key={key} className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          {block.items.map((item) => (
            <li key={item} className="grid grid-cols-[auto_1fr] gap-3 text-sm leading-7 text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
    if (block.type === "code") {
      return (
        <pre key={key} className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm leading-7 text-slate-200">
          <code>{block.value}</code>
        </pre>
      );
    }
    return <p key={key} className="text-sm leading-7 text-slate-300">{renderInline(block.text)}</p>;
  });
}

function parseMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  let language = "";

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    blocks.push({ type: "list", items: list });
    list = [];
  }

  for (const line of lines) {
    if (code) {
      if (line.startsWith("```")) {
        blocks.push({ type: "code", language, value: code.join("\n") });
        code = null;
        language = "";
      } else {
        code.push(line);
      }
      continue;
    }

    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      code = [];
      language = line.slice(3).trim();
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", depth: heading[1].length as 1 | 2 | 3, text: heading[2] });
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(trimmed);
    const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (unordered || ordered) {
      flushParagraph();
      list.push((unordered ?? ordered)?.[1] ?? trimmed);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  if (code) blocks.push({ type: "code", language, value: code.join("\n") });
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={`${part}-${index}`} className="rounded-md bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-cyan-100">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}
