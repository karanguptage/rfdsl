"use client";

import { useCallback, useEffect, useState } from "react";
import { SITE, SITE_URL } from "@/lib/site";
import { adminApi, ApiError, type Message, type MessageFilter, type MessageList, type MessageStatus } from "./api";
import { AutoTextarea, Button, Icon, ICON, inputClass, Modal } from "./ui";

const FILTERS: { value: MessageFilter; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "new", label: "Unread" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const STATUS_STYLE: Record<MessageStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-neutral-950 text-white" },
  read: { label: "Read", className: "bg-slate-100 text-slate-600" },
  replied: { label: "Replied", className: "bg-emerald-50 text-emerald-700" },
  archived: { label: "Archived", className: "bg-slate-100 text-slate-500" },
};

const fmtDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });

// Messages sent with the website's "Contact Us" form. List on the left (or on
// its own on phones), the selected message on the right with reply, status,
// internal note and email delivery status.
export default function MessagesView({
  selectedId,
  onSelect,
  onCountsChange,
}: {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCountsChange: () => void;
}) {
  const [filter, setFilter] = useState<MessageFilter>("inbox");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<MessageList | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .messages({ status: filter, q: debouncedQ, page })
      .then((d) => {
        if (cancelled) return;
        setList(d);
        setError("");
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [filter, debouncedQ, page, reload]);

  const refresh = useCallback(() => {
    setReload((n) => n + 1);
    onCountsChange();
  }, [onCountsChange]);

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,2.2vw,2rem)] font-extrabold tracking-[-0.02em] text-neutral-950">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sent with the website&apos;s Contact Us form. Each one is also emailed to the company address.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Message folders">
          {FILTERS.map((f) => {
            const on = f.value === filter;
            const n = list?.counts[f.value === "new" ? "new" : f.value] ?? 0;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setFilter(f.value);
                  setPage(1);
                }}
                className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  on ? "border-black bg-black text-white" : "border-slate-300 bg-white text-neutral-700 hover:border-slate-400 hover:text-neutral-950"
                }`}
              >
                {f.label}
                <span className={`text-xs ${on ? "text-white/60" : "text-slate-400"}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="relative lg:ml-auto lg:w-80">
          <Icon d={ICON.search} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, company, text…"
            aria-label="Search messages"
            className={`h-10 pl-10 ${inputClass}`}
          />
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        {/* List (hidden on phones while a message is open). */}
        <div className={selectedId !== null ? "max-lg:hidden" : ""}>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {!list && !error && <p className="px-4 py-10 text-center text-sm text-slate-500">Loading…</p>}
            {list?.items.length === 0 && (
              <div className="px-4 py-14 text-center">
                <Icon d="M4 4h16v16H4zM4 4l8 8 8-8" className="mx-auto size-8 text-slate-300" strokeWidth={1.5} />
                <p className="mt-3 font-semibold text-neutral-900">No messages</p>
                <p className="mt-1 text-sm text-slate-500">{debouncedQ ? "Nothing matches your search." : "Messages from the Contact Us form will appear here."}</p>
              </div>
            )}
            <ul className="divide-y divide-slate-100">
              {list?.items.map((m) => {
                const active = m.id === selectedId;
                const unread = m.status === "new";
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(m.id)}
                      aria-current={active || undefined}
                      className={`block w-full cursor-pointer px-4 py-3.5 text-left transition-colors outline-none focus-visible:bg-slate-50 ${
                        active ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-baseline gap-2">
                        {unread && <span aria-label="Unread" className="size-2 shrink-0 translate-y-[-1px] rounded-full bg-neutral-950" />}
                        <span className={`min-w-0 flex-1 truncate ${unread ? "font-bold text-neutral-950" : "font-semibold text-neutral-800"}`}>
                          {m.first_name} {m.last_name}
                          {m.company && <span className="font-normal text-slate-500"> · {m.company}</span>}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{fmtDate(m.created_at)}</span>
                      </div>
                      <p className={`mt-1 line-clamp-2 text-sm ${unread ? "text-neutral-800" : "text-slate-500"}`}>{m.preview}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {m.status !== "new" && (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[m.status].className}`}>{STATUS_STYLE[m.status].label}</span>
                        )}
                        {!m.email_sent && m.email_error && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Email failed</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {list && list.pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                Page {list.page} of {list.pages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" disabled={list.page <= 1} onClick={() => setPage(list.page - 1)}>
                  <Icon d={ICON.left} className="size-3.5" />
                </Button>
                <Button size="sm" disabled={list.page >= list.pages} onClick={() => setPage(list.page + 1)}>
                  <Icon d={ICON.right} className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Selected message. */}
        <div className={selectedId === null ? "max-lg:hidden" : ""}>
          {selectedId === null ? (
            <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
              Select a message to read it.
            </div>
          ) : (
            <MessageDetail key={selectedId} id={selectedId} onBack={() => onSelect(null)} onChanged={refresh} onDeleted={() => (onSelect(null), refresh())} />
          )}
        </div>
      </div>
    </div>
  );
}

function MessageDetail({ id, onBack, onChanged, onDeleted }: { id: number; onBack: () => void; onChanged: () => void; onDeleted: () => void }) {
  const [m, setM] = useState<Message | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replySent, setReplySent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .message(id)
      .then((data) => {
        if (cancelled) return;
        setM(data);
        setNote(data.admin_note ?? "");
        onChanged(); // opening marks it read: refresh list + unread badge
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per message
  }, [id]);

  // The email goes out in the background right after a message arrives: if
  // it's still pending, check again shortly so the delivery status updates.
  useEffect(() => {
    if (!m || m.email_sent || m.email_error) return;
    const t = setTimeout(() => {
      adminApi
        .message(id)
        .then((d) => setM((cur) => (cur ? { ...cur, email_sent: d.email_sent, email_error: d.email_error } : d)))
        .catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
  }, [m, id]);

  const run = async (label: string, fn: () => Promise<Message | void>) => {
    setBusy(label);
    setError("");
    try {
      const res = await fn();
      if (res) {
        setM(res);
        onChanged();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (error && !m) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!m) return <p className="rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">Loading…</p>;

  const name = `${m.first_name} ${m.last_name}`.trim();

  return (
    <article className="rounded-xl border border-slate-200 bg-white" aria-label={`Message from ${name}`}>
      <div className="flex flex-wrap items-start gap-3 border-b border-slate-200 p-5 sm:p-6">
        <button type="button" onClick={onBack} aria-label="Back to messages" className="-ml-1 flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden">
          <Icon d={ICON.left} className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-neutral-950">{name}</h2>
          {m.company && <p className="text-sm text-slate-600">{m.company}</p>}
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <Info label="Email">
              <a href={`mailto:${m.email}`} className="font-medium text-neutral-950 hover:underline">
                {m.email}
              </a>
            </Info>
            <Info label="Phone">
              {m.phone ? (
                <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="font-medium text-neutral-950 hover:underline">
                  {m.phone}
                </a>
              ) : (
                "—"
              )}
            </Info>
            <Info label="Received">{fmtDate(m.created_at, true)}</Info>
            <Info label="Sent from">{m.page || "—"}</Info>
          </dl>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[m.status].className}`}>{STATUS_STYLE[m.status].label}</span>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-900">{m.message}</div>

        {/* Email delivery to the company address. */}
        {m.email_sent ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <Icon d={ICON.check} className="size-4" />
            Emailed to the company address.
          </p>
        ) : m.email_error ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="min-w-0 flex-1">
              <b>Email not delivered.</b> {m.email_error}
            </span>
            <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => run("resend", () => adminApi.resendMessage(m.id))}>
              {busy === "resend" ? "Sending…" : "Resend email"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Sending the email to the company address…</p>
        )}

        {/* Replies sent from here, oldest first. */}
        {m.replies.length > 0 && (
          <section aria-label="Replies sent" className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">
              Replies sent <span className="font-normal text-slate-500">({m.replies.length})</span>
            </h3>
            {m.replies.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                  <span className="min-w-0 truncate">
                    <b className="font-semibold text-neutral-900">{r.subject}</b> · to {r.to_email}
                  </span>
                  <span className="shrink-0">
                    {fmtDate(r.sent_at, true)}
                    {r.copied_to && " · copy to company"}
                  </span>
                </div>
                <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-neutral-800">{r.body}</p>
              </div>
            ))}
          </section>
        )}
        {replySent && (
          <p role="status" className="flex items-center gap-2 text-sm text-emerald-700">
            <Icon d={ICON.check} className="size-4" />
            Reply sent to {m.email}.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setReplying(true)}>
            <Icon d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" className="size-4" />
            Reply by email
          </Button>
          {m.status !== "replied" ? (
            <Button disabled={busy !== null} onClick={() => run("replied", () => adminApi.updateMessage(m.id, { status: "replied" }))}>
              <Icon d={ICON.check} className="size-4" />
              Mark as replied
            </Button>
          ) : (
            <Button disabled={busy !== null} onClick={() => run("read", () => adminApi.updateMessage(m.id, { status: "read" }))}>
              Not replied yet
            </Button>
          )}
          {m.status !== "archived" ? (
            <Button disabled={busy !== null} onClick={() => run("archive", () => adminApi.updateMessage(m.id, { status: "archived" }))}>
              <Icon d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" className="size-4" />
              Archive
            </Button>
          ) : (
            <Button disabled={busy !== null} onClick={() => run("inbox", () => adminApi.updateMessage(m.id, { status: "read" }))}>
              Move to inbox
            </Button>
          )}
          <Button disabled={busy !== null} variant="ghost" onClick={() => run("unread", () => adminApi.updateMessage(m.id, { status: "new" }))}>
            Mark unread
          </Button>
          <Button
            variant="danger"
            className="sm:ml-auto"
            disabled={busy !== null}
            onClick={() =>
              confirm(`Delete the message from ${name} permanently?`) &&
              run("delete", async () => {
                await adminApi.removeMessage(m.id);
                onDeleted();
              })
            }
          >
            <Icon d={ICON.trash} className="size-4" />
            Delete
          </Button>
        </div>

        <div>
          <label htmlFor="admin-note" className="text-sm font-semibold text-neutral-900">
            Internal note <span className="font-normal text-slate-500">(only visible here)</span>
          </label>
          <textarea
            id="admin-note"
            value={note}
            maxLength={5000}
            rows={3}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteSaved(false);
            }}
            placeholder="e.g. Called back on 20 Nov, sent quote Q-1042"
            className={`mt-1.5 block resize-y py-2 leading-relaxed ${inputClass}`}
          />
          <div className="mt-2 flex items-center gap-3">
            <Button
              size="sm"
              disabled={busy !== null || note === (m.admin_note ?? "")}
              onClick={() =>
                run("note", async () => {
                  const res = await adminApi.updateMessage(m.id, { admin_note: note });
                  setNoteSaved(true);
                  return res;
                })
              }
            >
              {busy === "note" ? "Saving…" : "Save note"}
            </Button>
            {noteSaved && <span className="text-xs text-emerald-700">Saved</span>}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {replying && (
        <ReplyModal
          message={m}
          onClose={() => setReplying(false)}
          onSent={(updated) => {
            setM(updated);
            setReplying(false);
            setReplySent(true);
            onChanged();
          }}
        />
      )}
    </article>
  );
}

const SIGNATURE = `Kind regards,

${SITE.legalName}
${SITE.phone} | ${SITE.email} | ${SITE_URL.replace(/^https?:\/\//, "")}`;

// Email form for answering a message, sent through the company mail server
// (From = CONTACT_EMAIL_FROM in backend/.env). Pre-filled with a greeting and
// the signature; the visitor's message can be quoted underneath.
function ReplyModal({ message: m, onClose, onSent }: { message: Message; onClose: () => void; onSent: (m: Message) => void }) {
  const earlier = m.replies.length > 0;
  const [subject, setSubject] = useState(earlier ? m.replies[m.replies.length - 1].subject : "Re: Your enquiry to RF Data Systems");
  const [body, setBody] = useState(`Hi ${m.first_name},\n\n\n\n${SIGNATURE}`);
  const [includeOriginal, setIncludeOriginal] = useState(true);
  const [copyToCompany, setCopyToCompany] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const name = `${m.first_name} ${m.last_name}`.trim();
  const ready = subject.trim() && body.trim() && body.trim() !== `Hi ${m.first_name},\n\n\n\n${SIGNATURE}`.trim();

  // On open, put the cursor on the empty line under the greeting (once only,
  // so later clicks in the text place the cursor normally).
  useEffect(() => {
    const el = document.getElementById("reply-body") as HTMLTextAreaElement | null;
    if (!el) return;
    const pos = `Hi ${m.first_name},\n\n`.length;
    el.focus();
    el.setSelectionRange(pos, pos);
  }, [m.first_name]);

  const send = async () => {
    if (!ready || sending) return;
    setSending(true);
    setError("");
    try {
      onSent(await adminApi.replyMessage(m.id, { subject, body, include_original: includeOriginal, copy_to_company: copyToCompany }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The email could not be sent.");
      setSending(false);
    }
  };

  return (
    <Modal
      title={`Reply to ${name}`}
      onClose={() => !sending && onClose()}
      size="md"
      footer={
        <>
          <Button onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={send} disabled={!ready || sending} title={ready ? "Send (Ctrl+Enter)" : "Write your reply first"}>
            {sending ? "Sending…" : "Send reply"}
            {!sending && <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" className="size-4" />}
          </Button>
        </>
      }
    >
      <div
        className="space-y-4"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            send();
          }
        }}
      >
        <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
          <div className="flex gap-3 px-3.5 py-2.5">
            <dt className="w-14 shrink-0 text-slate-500">From</dt>
            <dd className="min-w-0 truncate text-neutral-900">
              RF Data Systems &lt;{m.reply_from}&gt;
            </dd>
          </div>
          <div className="flex gap-3 px-3.5 py-2.5">
            <dt className="w-14 shrink-0 text-slate-500">To</dt>
            <dd className="min-w-0 truncate font-medium text-neutral-950">
              {name} &lt;{m.email}&gt;
            </dd>
          </div>
        </dl>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-neutral-900">Subject</span>
          <input type="text" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} className={`h-10 ${inputClass}`} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-neutral-900">Message</span>
          <AutoTextarea
            id="reply-body"
            minRows={10}
            value={body}
            maxLength={20000}
            onChange={(e) => setBody(e.target.value)}
            className="text-[15px]"
          />
        </label>

        <div className="space-y-2 text-sm text-neutral-800">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={includeOriginal} onChange={(e) => setIncludeOriginal(e.target.checked)} className="mt-0.5 size-4 accent-black" />
            <span>Include {m.first_name}&apos;s original message below the reply</span>
          </label>
          {m.company_copy_to && (
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={copyToCompany} onChange={(e) => setCopyToCompany(e.target.checked)} className="mt-0.5 size-4 accent-black" />
              <span>
                Send a hidden copy to {m.company_copy_to}{" "}
                <span className="text-slate-500">(replies sent from here don&apos;t appear in the mailbox&apos;s Sent folder)</span>
              </span>
            </label>
          )}
        </div>

        {includeOriginal && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
            <p className="mb-1 text-slate-500">
              On {fmtDate(m.created_at, true)}, {name} wrote:
            </p>
            <p className="line-clamp-4 border-l-2 border-slate-300 pl-3 whitespace-pre-wrap">{m.message}</p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="w-20 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate text-neutral-800">{children}</dd>
    </div>
  );
}
