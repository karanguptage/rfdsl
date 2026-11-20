"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import { adminApi, ApiError, getToken, SESSION_EXPIRED_EVENT, setToken, type Suggestions } from "./api";
import { setTrackingExcluded } from "@/lib/tracking";
import MessagesView from "./MessagesView";
import NemanjaAdmin from "./NemanjaAdmin";
import ProductEditor from "./ProductEditor";
import ProductTable from "./ProductTable";
import VisitorsView from "./VisitorsView";
import { Button, Icon, ICON, inputClass } from "./ui";

type View =
  | { name: "list" }
  | { name: "new" }
  | { name: "edit"; id: number }
  | { name: "messages"; id: number | null }
  | { name: "visitors"; id: number | null }
  | { name: "nemanja"; id: number | null };

// /admin (products), #new, #edit/12, #messages, #messages/5: the view survives a reload.
function parseHash(hash: string): View {
  const h = hash.replace(/^#\/?/, "");
  if (h === "new") return { name: "new" };
  const edit = h.match(/^edit\/(\d+)$/);
  if (edit) return { name: "edit", id: Number(edit[1]) };
  const msg = h.match(/^messages(?:\/(\d+))?$/);
  if (msg) return { name: "messages", id: msg[1] ? Number(msg[1]) : null };
  const vis = h.match(/^visitors(?:\/(\d+))?$/);
  if (vis) return { name: "visitors", id: vis[1] ? Number(vis[1]) : null };
  const nem = h.match(/^nemanja(?:\/(\d+))?$/);
  if (nem) return { name: "nemanja", id: nem[1] ? Number(nem[1]) : null };
  return { name: "list" };
}
const toHash = (v: View) =>
  v.name === "list"
    ? ""
    : v.name === "new"
      ? "#new"
      : v.name === "edit"
        ? `#edit/${v.id}`
        : `#${v.name}${v.id ? `/${v.id}` : ""}`;

const UNREAD_POLL_MS = 60_000;

// Product administration: password sign-in, then the product list and editor.
// Browser-only: the sign-in token lives in this tab's sessionStorage and the
// current view in the URL hash (render inside <Suspense>).
export default function AdminApp() {
  use(browser("The admin sign-in is kept in this browser tab."));
  const [auth, setAuth] = useState<"checking" | "out" | "in">(() => (getToken() ? "checking" : "out"));
  const [expired, setExpired] = useState(false);
  const [view, setView] = useState<View>(() => parseHash(window.location.hash));
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [listKey, setListKey] = useState(0);
  const [flash, setFlash] = useState(""); // message carried into the next editor (e.g. after create)
  const dirtyRef = useRef(false);
  const [unread, setUnread] = useState(0);
  const [needsReply, setNeedsReply] = useState(0);

  // Unread messages badge, refreshed every minute and after changes.
  const loadUnread = useCallback(() => {
    adminApi
      .messages({ status: "new", per_page: 1 })
      .then((d) => setUnread(d.counts.new))
      .catch(() => {});
    adminApi
      .chats("needs_reply")
      .then((d) => setNeedsReply(d.counts.needs_reply))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (auth !== "in") return;
    loadUnread();
    const t = setInterval(loadUnread, UNREAD_POLL_MS);
    return () => clearInterval(t);
  }, [auth, loadUnread]);

  // Restore an existing sign-in (token in this tab's sessionStorage).
  useEffect(() => {
    if (!getToken()) return;
    adminApi
      .session()
      .then(() => setAuth("in"))
      .catch(() => setAuth("out"));
  }, []);

  useEffect(() => {
    // Keep the editor (and any unsaved changes) on screen; sign in over it.
    const onExpired = () => setExpired(true);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const loadSuggestions = useCallback(() => {
    adminApi.suggestions().then(setSuggestions).catch(() => {});
  }, []);
  useEffect(() => {
    if (auth === "in") loadSuggestions();
  }, [auth, loadSuggestions]);

  // Browser back/forward between list and editor, guarding unsaved changes.
  useEffect(() => {
    let current = window.location.hash;
    const onHash = () => {
      if (dirtyRef.current && !confirm("Leave without saving your changes?")) {
        history.replaceState(null, "", current || window.location.pathname);
        return;
      }
      dirtyRef.current = false;
      current = window.location.hash;
      setView(parseHash(current));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (v: View, replace = false) => {
    if (!replace && dirtyRef.current && !confirm("Leave without saving your changes?")) return;
    dirtyRef.current = false;
    if (!replace) setFlash("");
    const url = toHash(v) || window.location.pathname;
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
    setView(v);
    if (!replace) window.scrollTo({ top: 0 });
  };

  const signOut = () => {
    if (dirtyRef.current && !confirm("Sign out without saving your changes?")) return;
    dirtyRef.current = false;
    setToken(null);
    setAuth("out");
  };

  const onDirtyChange = useCallback((d: boolean) => {
    dirtyRef.current = d;
  }, []);

  if (auth === "checking") return <p className="px-4 py-24 text-center text-slate-500">Loading…</p>;
  // Signing in marks this browser as the administrator's, so its own visits to
  // the site aren't counted (changeable on the Visitors page).
  const signedIn = () => {
    setTrackingExcluded(true);
    setAuth("in");
  };

  if (auth === "out") return <LoginScreen onSignedIn={signedIn} />;

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm lg:px-6">
        <nav aria-label="Admin sections" className="flex items-center gap-1">
          <AdminTab active={view.name === "list" || view.name === "new" || view.name === "edit"} onClick={() => go({ name: "list" })}>
            Products
          </AdminTab>
          <AdminTab active={view.name === "messages"} onClick={() => go({ name: "messages", id: null })}>
            Messages
            {unread > 0 && (
              <span aria-label={`${unread} unread`} className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
                {unread}
              </span>
            )}
          </AdminTab>
          <AdminTab active={view.name === "visitors"} onClick={() => go({ name: "visitors", id: null })}>
            Visitors
          </AdminTab>
          <AdminTab active={view.name === "nemanja"} onClick={() => go({ name: "nemanja", id: null })}>
            Nemanja
            {needsReply > 0 && (
              <span aria-label={`${needsReply} waiting for a person`} className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
                {needsReply}
              </span>
            )}
          </AdminTab>
        </nav>
        <div className="flex items-center gap-1">
          <button type="button" onClick={signOut} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium text-slate-600 hover:bg-slate-200/60 hover:text-neutral-950">
            <Icon d={ICON.logout} className="size-3.5" />
            Sign out
          </button>
        </div>
      </div>

      {view.name === "nemanja" ? (
        <NemanjaAdmin selectedId={view.id} onSelect={(id) => go({ name: "nemanja", id })} onCountsChange={loadUnread} />
      ) : view.name === "visitors" ? (
        <VisitorsView key={view.id ?? "overview"} selectedId={view.id} onSelect={(id) => go({ name: "visitors", id })} />
      ) : view.name === "messages" ? (
        <MessagesView
          selectedId={view.id}
          onSelect={(id) => go({ name: "messages", id })}
          onCountsChange={loadUnread}
        />
      ) : view.name === "list" ? (
        <ProductTable refreshKey={listKey} onNew={() => go({ name: "new" })} onEdit={(id) => go({ name: "edit", id })} />
      ) : (
        <ProductEditor
          key={view.name === "edit" ? `edit-${view.id}` : "new"}
          productId={view.name === "edit" ? view.id : null}
          suggestions={suggestions}
          onBack={() => go({ name: "list" })}
          initialToast={flash}
          onCreated={(id) => {
            setFlash("Product created");
            go({ name: "edit", id }, true);
          }}
          onSaved={() => {
            loadSuggestions();
            setListKey((n) => n + 1);
          }}
          onDirtyChange={onDirtyChange}
        />
      )}

      {expired && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 backdrop-blur-[2px]">
          <LoginScreen
            notice="Your session has ended. Sign in again to continue; your unsaved changes are kept."
            onSignedIn={() => setExpired(false)}
          />
        </div>
      )}
    </div>
  );
}

function AdminTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
        active ? "bg-white text-neutral-950 shadow-[0_1px_2px_rgb(15_23_42/0.08)] ring-1 ring-slate-200" : "text-slate-600 hover:bg-slate-200/60 hover:text-neutral-950"
      }`}
    >
      {children}
    </button>
  );
}

function LoginScreen({ notice, onSignedIn }: { notice?: string; onSignedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      const { token } = await adminApi.login(password);
      setToken(token);
      onSignedIn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed");
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-30px_rgb(11_31_69/0.45)] sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-xl bg-[#0b1f45] text-white">
          <Icon d="M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4" className="size-5" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-neutral-950">Product admin</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the administrator password to register and edit products.</p>
        {notice && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
        <label htmlFor="admin-password" className="mt-6 block text-sm font-semibold text-neutral-900">
          Password
        </label>
        <div className="relative mt-1.5">
          <input
            id="admin-password"
            type={show ? "text" : "password"}
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`h-11 pr-16 ${inputClass}`}
            aria-invalid={!!error}
            aria-describedby={error ? "admin-password-error" : undefined}
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-1 right-1 cursor-pointer rounded-md px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-neutral-950">
            {show ? "Hide" : "Show"}
          </button>
        </div>
        {error && (
          <p id="admin-password-error" role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={!password || busy} className="mt-5 h-11 w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
