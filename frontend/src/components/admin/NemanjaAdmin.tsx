"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { RichText } from "@/components/NemanjaChat";
import { isRemoteImage } from "@/lib/catalog";
import { adminApi, ApiError, type AiTestResult, type ChatDetail, type ChatList, type ChatStatus, type KnowledgeNote, type NemanjaStatus } from "./api";
import { AutoTextarea, BulkBar, Button, Checkbox, Icon, ICON, TextInput, useSelection } from "./ui";

// Nemanja (AI consultant) administration:
// - Conversations: chats handed to a person land in "Needs reply"; staff read
//   the transcript, reply (optionally by email too), take over, hand back to
//   Nemanja, close or delete. Tick rows to delete several, or delete all in
//   the current filter.
// - Knowledge notes: facts Nemanja found on manufacturer sites; only approved
//   notes are given back to Nemanja as product knowledge.
// - Setup: whether Nemanja is configured, model, budget, allowed web sites.

const STATUS_LABEL: Record<ChatStatus, { text: string; className: string }> = {
  ai: { text: "With Nemanja", className: "bg-slate-100 text-slate-700" },
  waiting_human: { text: "Needs a person", className: "bg-red-600 text-white" },
  human: { text: "Staff", className: "bg-neutral-950 text-white" },
  closed: { text: "Closed", className: "bg-slate-100 text-slate-500" },
};

const fmt = (iso: string) => new Date(iso).toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function NemanjaAdmin({ selectedId, onSelect, onCountsChange }: { selectedId: number | null; onSelect: (id: number | null) => void; onCountsChange: () => void }) {
  const [tab, setTab] = useState<"chats" | "notes" | "setup">("chats");
  const [status, setStatus] = useState<NemanjaStatus | null>(null);
  const [pendingNotes, setPendingNotes] = useState(0);

  useEffect(() => {
    adminApi.nemanjaStatus().then(setStatus).catch(() => {});
    adminApi.notes("pending").then((r) => setPendingNotes(r.counts.pending)).catch(() => {});
  }, []);

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,2.2vw,2rem)] font-extrabold tracking-[-0.02em] text-neutral-950">Nemanja</h1>
          <p className="mt-1 text-sm text-slate-500">The AI consultant on the Solutions page: conversations, hand-offs to staff, and what it has learned.</p>
        </div>
        {status && (
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${status.configured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
            <span className={`size-2 rounded-full ${status.configured ? "bg-emerald-500" : "bg-amber-500"}`} />
            {status.configured ? "Online" : "Not set up: chats go to staff"}
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5" role="tablist">
        {(
          [
            ["chats", "Conversations", 0],
            ["notes", "Knowledge notes", pendingNotes],
            ["setup", "Setup", 0],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
              tab === key ? "border-black bg-black text-white" : "border-slate-300 bg-white text-neutral-700 hover:border-slate-400"
            }`}
          >
            {label}
            {n > 0 && <span className={`rounded-full px-1.5 text-[11px] ${tab === key ? "bg-white/20" : "bg-amber-100 text-amber-800"}`}>{n} to review</span>}
          </button>
        ))}
      </div>

      {tab === "chats" && <Conversations selectedId={selectedId} onSelect={onSelect} onCountsChange={onCountsChange} />}
      {tab === "notes" && <Notes onChange={(n) => setPendingNotes(n)} />}
      {tab === "setup" && <Setup status={status} />}
    </div>
  );
}

// ------------------------------------------------------------------ conversations

function Conversations({ selectedId, onSelect, onCountsChange }: { selectedId: number | null; onSelect: (id: number | null) => void; onCountsChange: () => void }) {
  const [filter, setFilter] = useState("needs_reply");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ChatList | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      adminApi
        .chats(filter, page)
        .then((d) => !cancelled && (setList(d), setError("")))
        .catch((e) => !cancelled && setError(e.message));
    load();
    const t = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [filter, page, reload]);

  const refresh = useCallback(() => {
    setReload((n) => n + 1);
    onCountsChange();
  }, [onCountsChange]);

  const pageIds = list?.items.map((c) => c.id) ?? [];
  const selection = useSelection(pageIds, `${filter}|${list?.page ?? page}`);
  const filterLabel = (value: string) => ({ needs_reply: "Needs reply", ai: "With Nemanja", human: "Staff", closed: "Closed" })[value] ?? "All";

  const filters = [
    ["needs_reply", "Needs reply"],
    ["ai", "With Nemanja"],
    ["human", "Staff"],
    ["closed", "Closed"],
    ["", "All"],
  ] as const;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-1.5">
        {filters.map(([value, label]) => {
          const n = value ? list?.counts[value as keyof ChatList["counts"]] : list?.total;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              className={`h-8 cursor-pointer rounded-full px-3 text-sm font-semibold transition-colors ${
                filter === value ? "bg-slate-200 text-neutral-950" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label} <span className="text-xs text-slate-500">{filter === value || value ? n ?? "" : ""}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className={selectedId !== null ? "max-lg:hidden" : ""}>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {list && (
              <BulkBar
                pageIds={pageIds}
                selection={selection}
                total={list.total}
                noun={["conversation", "conversations"]}
                scope={`“${filterLabel(filter)}”`}
                deleteSelected={(ids) => adminApi.deleteChats({ ids })}
                deleteAll={() => adminApi.deleteChats({ all: true, status: filter })}
                onDeleted={(ids) => {
                  if (selectedId !== null && (ids === "all" || ids.includes(selectedId))) onSelect(null);
                  setPage(1);
                  refresh();
                }}
              />
            )}
            {list?.items.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-slate-500">{filter === "needs_reply" ? "Nobody is waiting for a person." : "No conversations here."}</p>
            )}
            <ul className="divide-y divide-slate-100">
              {list?.items.map((c) => (
                <li key={c.id} className={`flex items-stretch transition-colors ${c.id === selectedId ? "bg-slate-100" : selection.has(c.id) ? "bg-sky-50/60" : "hover:bg-slate-50"}`}>
                  <label className="flex cursor-pointer items-start py-3.5 pr-1 pl-4">
                    <Checkbox checked={selection.has(c.id)} onChange={() => selection.toggle(c.id)} label={`Select ${c.customer_name || `Visitor #${c.id}`}`} />
                  </label>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="block min-w-0 flex-1 cursor-pointer py-3 pr-4 pl-2 text-left"
                  >
                    <span className="flex items-baseline gap-2">
                      {c.unread_staff && <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-red-600" />}
                      <span className="min-w-0 flex-1 truncate font-semibold text-neutral-950">{c.customer_name || `Visitor #${c.id}`}</span>
                      <span className="shrink-0 text-xs text-slate-500">{fmt(c.last_message_at)}</span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-slate-600">{c.last_text || "—"}</span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_LABEL[c.status].className}`}>{STATUS_LABEL[c.status].text}</span>
                      <span className="text-xs text-slate-400">{c.visitor_messages} message{c.visitor_messages === 1 ? "" : "s"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {list && list.pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                Page {list.page} of {list.pages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" aria-label="Previous page" disabled={list.page <= 1} onClick={() => setPage(list.page - 1)}>
                  <Icon d={ICON.left} className="size-3.5" />
                </Button>
                <Button size="sm" aria-label="Next page" disabled={list.page >= list.pages} onClick={() => setPage(list.page + 1)}>
                  <Icon d={ICON.right} className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className={selectedId === null ? "max-lg:hidden" : ""}>
          {selectedId === null ? (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
              Select a conversation.
            </div>
          ) : (
            <ChatView key={selectedId} id={selectedId} onBack={() => onSelect(null)} onChanged={refresh} onDeleted={() => (onSelect(null), refresh())} />
          )}
        </div>
      </div>
    </div>
  );
}

function ChatView({ id, onBack, onChanged, onDeleted }: { id: number; onBack: () => void; onChanged: () => void; onDeleted: () => void }) {
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [emailToo, setEmailToo] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = (first: boolean) =>
      adminApi
        .chat(id)
        .then((d) => {
          if (cancelled) return;
          setChat(d);
          if (first) onChanged();
        })
        .catch((e) => !cancelled && setError(e.message));
    load(true);
    const t = setInterval(() => load(false), 5000); // new visitor messages
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload per conversation only
  }, [id]);

  const act = async (fn: () => Promise<ChatDetail>) => {
    setBusy(true);
    setError("");
    try {
      setChat(await fn());
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!chat) return <p className="rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">{error || "Loading…"}</p>;

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start gap-3 border-b border-slate-200 p-5">
        <button type="button" onClick={onBack} aria-label="Back" className="flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden">
          <Icon d={ICON.left} className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-neutral-950">{chat.customer_name || `Visitor #${chat.id}`}</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {[chat.customer_email, chat.customer_phone].filter(Boolean).join(" · ") || "No contact details given"}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Started {fmt(chat.created_at)} · IP {chat.visitor_ip ?? "—"}
            {chat.tokens_used > 0 && ` · AI usage ${chat.tokens_used.toLocaleString("en-NZ")} tokens (about US$${chat.cost_estimate.toFixed(4)})`}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_LABEL[chat.status].className}`}>{STATUS_LABEL[chat.status].text}</span>
      </div>

      {chat.handoff_reason && (
        <div className="border-b border-slate-200 bg-amber-50/60 px-5 py-4 text-sm">
          <p className="font-semibold text-neutral-950">Handed to staff{chat.handoff_at ? ` · ${fmt(chat.handoff_at)}` : ""}: {chat.handoff_reason}</p>
          {chat.handoff_summary && <p className="mt-1.5 whitespace-pre-wrap text-neutral-700">{chat.handoff_summary}</p>}
        </div>
      )}

      <div className="max-h-[60vh] space-y-3 overflow-y-auto bg-slate-50/60 px-5 py-4">
        {chat.messages.map((m) =>
          m.role === "notice" ? (
            <p key={m.id} className="text-center text-xs text-slate-500">
              {m.content}
            </p>
          ) : (
            <div key={m.id} className={`flex ${m.role === "visitor" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "assistant" ? "" : "whitespace-pre-wrap"} ${
                  m.role === "visitor" ? "border border-slate-200 bg-white text-neutral-900" : m.role === "staff" ? "bg-neutral-950 text-white" : "bg-slate-200/80 text-neutral-900"
                }`}
              >
                <p className={`mb-0.5 text-[11px] font-semibold ${m.role === "staff" ? "text-white/60" : "text-slate-500"}`}>
                  {m.role === "visitor" ? chat.customer_name || "Visitor" : m.role === "staff" ? "Staff" : "Nemanja"} · {fmt(m.created_at)}
                </p>
                {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
                {m.products.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-2">
                    {m.products.map((p) => (
                      <a key={p.slug} href={p.url} target="_blank" rel="noopener" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 pr-3 text-xs font-semibold text-neutral-900 hover:border-neutral-950">
                        <span className="relative size-9 overflow-hidden rounded bg-white">
                          {p.image && <Image src={p.image} alt="" fill sizes="36px" unoptimized={isRemoteImage(p.image)} className="object-contain" />}
                        </span>
                        {p.name}
                      </a>
                    ))}
                  </span>
                )}
              </div>
            </div>
          ),
        )}
        {chat.busy && <p className="text-right text-xs text-slate-500">Nemanja: {chat.activity ?? "working"}…</p>}
      </div>

      <div className="space-y-3 border-t border-slate-200 p-5">
        {chat.status !== "closed" && (
          <>
            <AutoTextarea minRows={3} value={text} maxLength={5000} onChange={(e) => setText(e.target.value)} placeholder="Reply to the customer in the chat…" aria-label="Reply" />
            <div className="flex flex-wrap items-center gap-3">
              {chat.customer_email && (
                <label className="flex items-center gap-2 text-sm text-neutral-800">
                  <input type="checkbox" checked={emailToo} onChange={(e) => setEmailToo(e.target.checked)} className="size-4 accent-black" />
                  Also email it to {chat.customer_email}
                </label>
              )}
              <Button
                variant="primary"
                className="ml-auto"
                disabled={!text.trim() || busy}
                onClick={async () => {
                  if (await act(() => adminApi.chatReply(chat.id, text.trim(), emailToo && !!chat.customer_email))) setText("");
                }}
              >
                {busy ? "Sending…" : "Send reply"}
              </Button>
            </div>
          </>
        )}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {chat.status === "ai" && (
            <Button size="sm" disabled={busy} onClick={() => act(() => adminApi.chatStatus(chat.id, "human"))}>
              Take over from Nemanja
            </Button>
          )}
          {(chat.status === "human" || chat.status === "waiting_human") && (
            <Button size="sm" disabled={busy} onClick={() => act(() => adminApi.chatStatus(chat.id, "ai"))}>
              Hand back to Nemanja
            </Button>
          )}
          {chat.status !== "closed" ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm("Close this conversation?") && act(() => adminApi.chatStatus(chat.id, "closed"))}>
              Close conversation
            </Button>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => act(() => adminApi.chatStatus(chat.id, "human"))}>
              Reopen
            </Button>
          )}
          {chat.notes.length > 0 && <span className="self-center text-xs text-slate-500">{chat.notes.length} knowledge note(s) from this chat</span>}
          <Button
            size="sm"
            variant="danger"
            className="ml-auto"
            disabled={busy}
            onClick={async () => {
              if (!confirm(`Delete the conversation with ${chat.customer_name || `Visitor #${chat.id}`} permanently? This can't be undone.`)) return;
              setBusy(true);
              try {
                await adminApi.removeChat(chat.id);
                onDeleted();
              } catch (e) {
                setError(e instanceof ApiError ? e.message : "Failed");
                setBusy(false);
              }
            }}
          >
            <Icon d={ICON.trash} className="size-3.5" />
            Delete
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </article>
  );
}

// ------------------------------------------------------------------ knowledge notes

function Notes({ onChange }: { onChange: (pending: number) => void }) {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [data, setData] = useState<{ items: KnowledgeNote[]; counts: Record<string, number> } | null>(null);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminApi
      .notes(filter)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        onChange(d.counts.pending);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [filter, reload, onChange]);

  return (
    <div className="mt-5">
      <p className="text-sm text-slate-600">
        Facts Nemanja found on manufacturer sites while answering customers. <b>Approved</b> notes become part of what Nemanja knows about the
        product; check them against the source first.
      </p>
      <div className="mt-3 flex gap-1.5">
        {(["pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`h-8 cursor-pointer rounded-full px-3 text-sm font-semibold capitalize ${filter === f ? "bg-slate-200 text-neutral-950" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {f === "pending" ? "To review" : f} <span className="text-xs text-slate-500">{data?.counts[f] ?? ""}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <ul className="mt-4 space-y-3">
        {data?.items.length === 0 && <li className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Nothing here.</li>}
        {data?.items.map((n) => (
          <NoteCard key={n.id} note={n} onDone={() => setReload((x) => x + 1)} />
        ))}
      </ul>
    </div>
  );
}

function NoteCard({ note, onDone }: { note: KnowledgeNote; onDone: () => void }) {
  const [content, setContent] = useState(note.content);
  const [slug, setSlug] = useState(note.product_slug ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = content !== note.content || slug !== (note.product_slug ?? "");

  const save = async (status?: string) => {
    setBusy(true);
    setError("");
    try {
      await adminApi.updateNote(note.id, { ...(dirty ? { content, product_slug: slug } : {}), ...(status ? { status } : {}) });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-neutral-950">{note.device_name}</p>
        <p className="text-xs text-slate-500">
          {fmt(note.created_at)}
          {note.conversation_id && ` · from chat #${note.conversation_id}`}
        </p>
      </div>
      <AutoTextarea minRows={2} value={content} onChange={(e) => setContent(e.target.value)} className="mt-2 text-sm" aria-label="Note" />
      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <label className="text-xs text-slate-500">
          Catalogue product (slug, empty if not listed)
          <TextInput value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. mc51" className="mt-1 h-9 text-sm" />
        </label>
        <p className="self-end truncate text-xs text-slate-500">
          Source:{" "}
          {note.source_url ? (
            <a href={note.source_url} target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-900 underline">
              {note.source_url}
            </a>
          ) : (
            "not given"
          )}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {note.status !== "approved" && (
          <Button size="sm" variant="primary" disabled={busy} onClick={() => save("approved")}>
            <Icon d={ICON.check} className="size-3.5" />
            Approve{dirty ? " with changes" : ""}
          </Button>
        )}
        {note.status !== "rejected" && (
          <Button size="sm" disabled={busy} onClick={() => save("rejected")}>
            Reject
          </Button>
        )}
        {dirty && note.status === "approved" && (
          <Button size="sm" disabled={busy} onClick={() => save()}>
            Save changes
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          disabled={busy}
          onClick={async () => {
            if (!confirm("Delete this note?")) return;
            await adminApi.removeNote(note.id).catch(() => {});
            onDone();
          }}
        >
          <Icon d={ICON.trash} className="size-3.5" />
          Delete
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  );
}

// ------------------------------------------------------------------ setup

function Setup({ status }: { status: NemanjaStatus | null }) {
  if (!status) return <p className="mt-6 text-sm text-slate-500">Loading…</p>;
  const rows: [string, React.ReactNode][] = [
    ["Status", status.configured ? "Online" : "Not set up"],
    ["AI provider", status.provider],
    ["API key", status.api_key_set ? "Set (AI_API_KEY in backend/.env)" : "Missing: add AI_API_KEY to backend/.env"],
    ["Endpoint", status.base_url],
    ["Model", `${status.model} (AI_MODEL), reasoning effort: ${status.reasoning_effort}`],
    ["Web search", status.web_search],
    ["Prices (estimates)", `US$${status.cost_per_mtok.input} in / US$${status.cost_per_mtok.output} out per 1M tokens`],
    ["Usage limit", `${status.max_tokens_per_chat.toLocaleString("en-NZ")} tokens per conversation, then staff take over (NEMANJA_MAX_TOKENS_PER_CHAT)`],
    ["Hand-off alerts", status.alerts_to.join(", ") || "—"],
    ["Web sites it may search", status.web_domains.join(", ")],
  ];
  return (
    <div className="mt-5 space-y-5">
      <AiTestPanel model={status.model} />
      {!status.configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">To switch Nemanja on</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Create an API key at <span className="font-mono">platform.openai.com/api-keys</span> and put it in <span className="font-mono">backend/.env</span> as{" "}
              <span className="font-mono">AI_API_KEY=…</span>, with <span className="font-mono">AI_PROVIDER=openai_compatible</span>
            </li>
            <li>Restart the backend. Until then, chats on the Solutions page go straight to your team.</li>
          </ol>
        </div>
      )}
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt className="text-slate-500">{k}</dt>
            <dd className="break-words text-neutral-900">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-500">
        Nemanja&apos;s instructions and tools are defined in <span className="font-mono">backend/app/nemanja.py</span>; changes apply after restarting the
        backend. Requests and usage can be reviewed in the OpenAI dashboard (Logs, Usage).
      </p>
    </div>
  );
}


// Lets an administrator check, independently of the chat, that the AI answers:
// a free connection check (key + model) and a plain test question (no website
// tools, nothing stored). A different key or model can be tried without saving.
function AiTestPanel({ model }: { model: string }) {
  const [question, setQuestion] = useState("What is RFID, in one sentence?");
  const [key, setKey] = useState("");
  const [altModel, setAltModel] = useState("");
  const [busy, setBusy] = useState<"connection" | "question" | "nemanja" | null>(null);
  const [result, setResult] = useState<{ mode: "connection" | "question" | "nemanja"; r: AiTestResult } | null>(null);
  const [error, setError] = useState("");

  const run = async (mode: "connection" | "question" | "nemanja") => {
    setBusy(mode);
    setError("");
    setResult(null);
    try {
      const r = await adminApi.nemanjaTest({ mode, question, api_key: key.trim() || undefined, model: altModel.trim() || undefined });
      setResult({ mode, r });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The test could not be run.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Test the AI" className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold text-neutral-950">Test the AI</h2>
      <p className="mt-1 text-sm text-slate-600">
        Check that the AI answers, separately from the chat. &ldquo;Ask the AI&rdquo; sends the question straight to the model; &ldquo;Ask as Nemanja&rdquo; uses the chat&apos;s full setup
        (instructions, catalogue tools, web search). Nothing is saved, and product cards, notes and hand-offs are skipped in tests.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <TextInput value={question} maxLength={2000} onChange={(e) => setQuestion(e.target.value)} aria-label="Test question" placeholder="Ask anything simple" />
        <div className="flex gap-2">
          <Button variant="primary" disabled={busy !== null} onClick={() => run("question")}>
            {busy === "question" ? "Asking…" : "Ask the AI"}
          </Button>
          <Button disabled={busy !== null} onClick={() => run("nemanja")} title="Same setup as the chat: instructions, catalogue, tools, web search. Nothing is saved.">
            {busy === "nemanja" ? "Nemanja is working…" : "Ask as Nemanja"}
          </Button>
          <Button disabled={busy !== null} onClick={() => run("connection")}>
            {busy === "connection" ? "Checking…" : "Check connection"}
          </Button>
        </div>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-neutral-800">Try a different key or model (not saved)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-500">
            API key (leave empty to use AI_API_KEY from backend/.env)
            <TextInput type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" className="mt-1" />
          </label>
          <label className="text-xs text-slate-500">
            Model (leave empty for {model})
            <TextInput value={altModel} onChange={(e) => setAltModel(e.target.value)} placeholder={model} className="mt-1" />
          </label>
        </div>
      </details>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {result && result.r.ok && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-emerald-800">
            <Icon d={ICON.check} className="size-4" />
            {result.mode === "connection" ? "Connection works" : result.mode === "nemanja" ? "Nemanja answered" : "The AI answered"} · {result.r.model} ·{" "}
            {(result.r.ms / 1000).toFixed(1)}s
          </p>
          {result.mode !== "connection" ? (
            <>
              <p className="mt-3 rounded-md border border-emerald-100 bg-white p-3 whitespace-pre-wrap text-neutral-900">{result.r.answer}</p>
              <p className="mt-2 text-xs text-emerald-800">
                {result.r.input_tokens} input + {result.r.output_tokens} output tokens · about US${(result.r.cost_estimate ?? 0).toFixed(6)} · key: {result.r.key_source}
              </p>
              {result.mode === "nemanja" && (
                <p className="mt-1 text-xs text-emerald-800">
                  Tools used: {result.r.tools_used && result.r.tools_used.length ? result.r.tools_used.join(", ") : "none"} · web search: {result.r.web_search}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-emerald-900">
              The key is accepted ({result.r.key_source}).{" "}
              {result.r.model_available ? (
                <>
                  Model <b>{result.r.model}</b> is available to this account.
                </>
              ) : (
                <>
                  But model <b>{result.r.model}</b> is <b>not</b> in this account&apos;s list ({result.r.models_count} models).
                  {result.r.similar_models && result.r.similar_models.length > 0 && <> Similar: {result.r.similar_models.slice(0, 12).join(", ")}.</>}
                </>
              )}
            </p>
          )}
        </div>
      )}

      {result && !result.r.ok && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">
            {result.mode === "connection" ? "Connection failed" : "The AI could not answer"}
            {result.r.status ? ` · HTTP ${result.r.status}` : ""}
            {result.r.code ? ` · ${result.r.code}` : ""}
          </p>
          <p className="mt-2">{result.r.hint}</p>
          {result.r.message && <p className="mt-2 font-mono text-xs break-words text-red-700">{result.r.message}</p>}
        </div>
      )}
    </section>
  );
}
