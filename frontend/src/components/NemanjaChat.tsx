"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Fragment, use, useCallback, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import { categoryOf, isRemoteImage } from "@/lib/catalog";

// Chat with Nemanja, the AI asset-tracking consultant (OpenAI, via the Python
// API). The conversation id + secret token are kept in this browser
// (localStorage) so a reload or a later visit continues the same chat; a
// staff email links back with ?chat=<id>&t=<token>. New messages are polled:
// every 1.2s while Nemanja is working, every 5s otherwise (staff replies).

type Card = {
  slug: string;
  name: string;
  image: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  url: string;
};
type Msg = {
  id: number;
  role: "visitor" | "assistant" | "staff" | "notice";
  content: string;
  products: Card[];
  created_at: string;
};
type State = {
  status: "ai" | "waiting_human" | "human" | "closed";
  busy: boolean;
  activity: string | null;
  available: boolean;
  messages: Msg[];
};
type Conv = { id: number; token: string };

const STORE_KEY = "rfdsl-nemanja-chat";
const STARTERS = [
  "We need to track IT equipment across three offices",
  "Which handheld reader suits a cold store?",
  "RFID for hotel linen and laundry",
  "Tagging metal tools and equipment",
];

function loadConv(): Conv | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    return v && typeof v.id === "number" && typeof v.token === "string"
      ? v
      : null;
  } catch {
    return null;
  }
}
function saveConv(c: Conv | null) {
  try {
    if (c) localStorage.setItem(STORE_KEY, JSON.stringify(c));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* storage blocked: the chat lasts for this page view */
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "Something went wrong. Please try again.",
    );
  return body as T;
}

export default function NemanjaChat() {
  use(browser("The chat is kept in this browser."));
  const params = useSearchParams();
  const [conv, setConv] = useState<Conv | null>(() => {
    const id = Number(params.get("chat"));
    const token = params.get("t");
    if (id && token) {
      const fromLink = { id, token };
      saveConv(fromLink);
      return fromLink;
    }
    return loadConv();
  });
  const [state, setState] = useState<State>({
    status: "ai",
    busy: false,
    activity: null,
    available: true,
    messages: [],
  });
  const [pending, setPending] = useState<string | null>(null); // visitor text sent, not yet back from the server
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const lastId = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const poll = useCallback(async (c: Conv) => {
    try {
      const s = await api<State & { id: number }>(
        `/api/chat/${c.id}?token=${encodeURIComponent(c.token)}&after=${lastId.current}`,
      );
      if (s.messages.length)
        lastId.current = s.messages[s.messages.length - 1].id;
      setState((prev) => ({
        ...s,
        messages: [...prev.messages, ...s.messages],
      }));
      if (s.messages.some((m) => m.role === "visitor")) setPending(null);
    } catch (e) {
      if (e instanceof Error && /not found/i.test(e.message)) {
        // The saved chat no longer exists: start fresh.
        saveConv(null);
        setConv(null);
      }
    }
  }, []);

  // Poll faster while Nemanja is working (kept in a ref for the timer loop).
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = state.busy || pending !== null;
  }, [state.busy, pending]);

  // Load the conversation, then keep polling.
  useEffect(() => {
    if (!conv) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      await poll(conv);
      if (!stop)
        timer = setTimeout(
          tick,
          document.hidden ? 15000 : busyRef.current ? 1200 : 5000,
        );
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [conv, poll]);

  // Follow new messages unless the visitor scrolled up to read.
  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current)
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [state.messages.length, pending, state.busy]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setError("");
    try {
      let c = conv;
      if (!c) {
        const started = await api<Conv>("/api/chat/start", {
          method: "POST",
          body: JSON.stringify({ page: "/solutions" }),
        });
        c = { id: started.id, token: started.token };
        saveConv(c);
        lastId.current = 0;
        setConv(c);
      }
      setPending(t);
      setInput("");
      stickToBottom.current = true;
      await api(`/api/chat/${c.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ token: c.token, text: t }),
      });
      await poll(c);
    } catch (e) {
      setPending(null);
      setInput(t);
      setError(
        e instanceof Error ? e.message : "Your message couldn't be sent.",
      );
    } finally {
      setSending(false);
      textarea.current?.focus();
    }
  };

  const restart = () => {
    saveConv(null);
    setConv(null);
    lastId.current = 0;
    setPending(null);
    setError("");
    setState({
      status: "ai",
      busy: false,
      activity: null,
      available: state.available,
      messages: [],
    });
    window.history.replaceState(null, "", "/solutions");
  };

  const closed = state.status === "closed";
  const showTyping =
    (state.busy || (pending !== null && state.status === "ai")) && !closed;
  const empty = state.messages.length === 0 && pending === null;

  return (
    // Fills the page below the site header (80px phones / 112px desktop) and
    // its full width, edges aligned with the header's border line like the
    // other sections; the input stays at the very bottom.
    <section
      aria-label="Chat with Nemanja"
      className="flex h-[calc(100dvh-5rem)] min-h-[480px] flex-col bg-white lg:h-[calc(100dvh-7rem)]"
    >
      {/* Messages */}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto"
        aria-live="polite"
      >
        <div className="w-full space-y-4 py-6 @max-[1537px]/page:px-6 @max-[640px]/page:px-4">
          <Bubble role="assistant">
            <p>
              Kia ora! I&apos;m <b>Nemanja</b>, RF Data Systems&apos;
              asset-tracking consultant. Tell me what you&apos;d like to track
              (assets, stock, linen, tools, people), where, and how many, and
              I&apos;ll suggest the right readers, tags, printers and software,
              with photos and links to the details.
            </p>
          </Bubble>
          {empty && (
            <div className="flex flex-wrap gap-2 pl-11">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="cursor-pointer rounded-full border border-slate-300 bg-white px-3.5 py-2 text-left text-sm text-neutral-800 transition-colors hover:border-neutral-950"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {state.messages.map((m) => (
            <MessageView key={m.id} m={m} />
          ))}
          {pending !== null && <Bubble role="visitor">{pending}</Bubble>}
          {showTyping && (
            <div className="flex items-center gap-3 pl-0.5">
              <Avatar kind="assistant" />
              <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                <span className="flex gap-1" aria-hidden="true">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="size-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
                {state.activity ? `${state.activity}…` : "Nemanja is typing…"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white">
        <div className="w-full pt-2 pb-3 sm:pb-4 @max-[1537px]/page:px-6 @max-[640px]/page:px-4">
          {error && (
            <p
              role="alert"
              className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          {closed ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                This conversation has been closed.
              </p>
              <button
                type="button"
                onClick={restart}
                className="h-10 cursor-pointer rounded-full bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Start a new chat
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={textarea}
                value={input}
                maxLength={2000}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={
                  state.status === "ai"
                    ? "Describe what you need to track…"
                    : "Write to the RF Data Systems team…"
                }
                aria-label="Your message"
                className="max-h-40 min-h-12 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] leading-snug text-neutral-950 outline-none placeholder:text-slate-400 hover:border-slate-400 focus:border-neutral-950 focus:ring-4 focus:ring-sky-500/15"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                aria-label="Send"
                className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-black text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </form>
          )}
          {(conv || !empty) && !closed && (
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={restart}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950 hover:underline"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New chat
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MessageView({ m }: { m: Msg }) {
  if (m.role === "notice")
    return (
      <p className="mx-auto max-w-md rounded-full bg-slate-200/70 px-4 py-1.5 text-center text-xs text-slate-600">
        {m.content}
      </p>
    );
  if (m.role === "visitor") return <Bubble role="visitor">{m.content}</Bubble>;
  return (
    <Bubble role={m.role}>
      {m.content && <RichText text={m.content} />}
      {m.products.length > 0 && <ProductCards cards={m.products} />}
    </Bubble>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "visitor" | "assistant" | "staff";
  children: React.ReactNode;
}) {
  if (role === "visitor")
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-neutral-950 px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-white sm:max-w-[75%]">
          {children}
        </div>
      </div>
    );
  return (
    <div className="flex items-start gap-3">
      <Avatar kind={role} />
      <div className="min-w-0 max-w-[92%] sm:max-w-[85%]">
        {role === "staff" && (
          <p className="mb-1 text-xs font-semibold text-slate-500">
            RF Data Systems team
          </p>
        )}
        <div
          className={`rounded-2xl rounded-tl-sm border px-4 py-3 text-[15px] leading-relaxed text-neutral-900 ${
            role === "staff"
              ? "border-neutral-300 bg-neutral-100"
              : "border-slate-200 bg-white"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function Avatar({ kind }: { kind: "assistant" | "staff" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        kind === "assistant"
          ? "bg-neutral-950 text-white"
          : "border border-neutral-300 bg-white text-neutral-900"
      }`}
    >
      {kind === "assistant" ? "N" : "RF"}
    </span>
  );
}

function ProductCards({ cards }: { cards: Card[] }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {cards.map((c) => (
        <li key={c.slug}>
          <a
            href={c.url}
            target="_blank"
            rel="noopener"
            className="group block h-full overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-neutral-950"
          >
            <span className="relative block aspect-square bg-white">
              {c.image ? (
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="200px"
                  unoptimized={isRemoteImage(c.image)}
                  className="object-contain p-3"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-slate-50 text-xs text-slate-400">
                  No photo yet
                </span>
              )}
            </span>
            <span className="block border-t border-slate-100 px-2.5 py-2">
              <span className="block truncate text-sm font-semibold text-neutral-950">
                {c.name}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {c.subcategory || categoryOf(c.category)?.label}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 group-hover:underline">
                View details
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// Small, safe Markdown subset for Nemanja's replies: paragraphs, "-"/"*" and
// numbered lists, ### headings, **bold**, *italic*, `code` and [links](url)
// (http(s) or site paths only). Everything is rendered as text, never HTML.
// Also used for the transcript in /admin.
export function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = line.match(/^#{1,4}\s+(.*)/);
    if (heading) {
      blocks.push(
        <p key={i} className="font-bold text-neutral-950">
          <Inline text={heading[1]} />
        </p>,
      );
      i++;
      continue;
    }
    const bullet = /^\s*[-*•]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(lines[i].replace(re, ""));
        i++;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List
          key={i}
          className={`space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-slate-400`}
        >
          {items.map((it, j) => (
            <li key={j}>
              <Inline text={it} />
            </li>
          ))}
        </List>,
      );
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !bullet.test(lines[i]) &&
      !numbered.test(lines[i]) &&
      !/^#{1,4}\s/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={i}>
        {para.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            <Inline text={p} />
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="space-y-2.5">{blocks}</div>;
}

function Inline({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  const re =
    /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\s][^*]*)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const href = m[2];
      if (/^(https?:\/\/|\/(?!\/))/i.test(href)) {
        const external =
          /^https?:\/\//i.test(href) && !href.includes("rfdsl.co.nz");
        out.push(
          <a
            key={k++}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="font-semibold text-neutral-950 underline decoration-slate-400 underline-offset-2 hover:decoration-neutral-950"
          >
            {m[1]}
          </a>,
        );
      } else out.push(m[1]);
    } else if (m[3] !== undefined)
      out.push(
        <b key={k++} className="font-semibold text-neutral-950">
          {m[3]}
        </b>,
      );
    else if (m[4] !== undefined)
      out.push(
        <code
          key={k++}
          className="rounded bg-slate-100 px-1 py-0.5 text-[13px]"
        >
          {m[4]}
        </code>,
      );
    else if (m[5] !== undefined) out.push(<i key={k++}>{m[5]}</i>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
