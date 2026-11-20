// Browser-side calls to the admin API (/api/admin/*, forwarded to the Python
// backend by next.config.ts). The login token is kept in sessionStorage, so it
// ends when the browser tab is closed.

import type { Product, ProductList } from "@/lib/catalog";

const TOKEN_KEY = "rfdsl-admin-token";
export const SESSION_EXPIRED_EVENT = "rfdsl-admin-session-expired";

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: the login just won't survive a reload */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: string[] = [],
  ) {
    super(message);
  }
}

// FastAPI errors: {"detail": "text"} or {"detail": [{loc: [...], msg}]} (validation).
function readError(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown })?.detail;
  if (Array.isArray(detail)) {
    const lines = detail.map((d: { loc?: (string | number)[]; msg?: string }) => {
      const where = (d.loc ?? []).filter((p) => p !== "body").join(" › ");
      return `${where ? where + ": " : ""}${(d.msg ?? "").replace(/^Value error, /, "")}`;
    });
    return new ApiError("Some fields need attention", status, lines);
  }
  return new ApiError(typeof detail === "string" ? detail : `Request failed (${status})`, status);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && path !== "/login") {
      setToken(null);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw readError(res.status, body);
  }
  return body as T;
}

export type Suggestions = {
  brands: string[];
  frequencies: string[];
  subcategories: Record<string, string[]>;
  highlight_titles: string[];
  spec_groups: string[];
  spec_labels: Record<string, string[]>;
  link_kinds: string[];
};

export type UploadResult = { url: string; name: string; kind: "image" | "file"; width?: number; height?: number };

// What the editor sends (same shape as the backend's ProductIn).
export type ProductInput = Pick<
  Product,
  "highlights" | "specs" | "links" | "gallery" | "is_published" | "sort_order" | "category" | "is_popular" | "is_new" | "is_on_sale"
> & {
  sale_label: string;
  slug: string;
  name: string;
  model: string;
  brand: string;
  subcategory: string;
  frequency: string;
  tagline: string;
  summary: string;
  description: string;
  keywords: string;
};

export type MessageStatus = "new" | "read" | "replied" | "archived";
export type MessageFilter = "inbox" | "new" | "replied" | "archived" | "all";

export type MessageSummary = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  preview: string;
  status: MessageStatus;
  email_sent: boolean;
  email_error: string | null;
  created_at: string;
};

export type MessageReply = {
  id: number;
  to_email: string;
  subject: string;
  body: string;
  copied_to: string | null;
  sent_at: string;
};

export type Message = Omit<MessageSummary, "preview"> & {
  message: string;
  replies: MessageReply[];
  reply_from: string; // CONTACT_EMAIL_FROM in backend/.env
  company_copy_to: string; // CONTACT_EMAIL_TO
  page: string | null;
  admin_note: string | null;
  ip: string | null;
  user_agent: string | null;
  updated_at: string;
};

export type MessageList = {
  items: MessageSummary[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  counts: Record<MessageStatus | "inbox" | "all", number>;
};

export type VisitorStats = {
  days: number;
  visitors: number;
  new_visitors: number;
  returning_visitors: number;
  returning_rate: number; // 0..1
  sessions: number;
  page_views: number;
  pages_per_session: number;
  top_pages: { label: string; path: string; product_id: number | null; views: number; visitors: number }[];
  top_products: { id: number; name: string; slug: string; views: number; visitors: number }[];
  series: { date: string; visitors: number; views: number }[];
};

export type VisitorSummary = {
  id: number;
  ip: string;
  first_seen: string;
  last_seen: string;
  sessions: number;
  page_views: number;
  device: string | null;
  browser: string | null;
  os: string | null;
  first_referrer: string | null;
  last_page?: string | null;
};

export type VisitorList = { items: VisitorSummary[]; total: number; page: number; per_page: number; pages: number };

export type VisitorSession = {
  id: number;
  started_at: string;
  last_activity: string;
  page_views: number;
  referrer: string | null;
  duration_seconds: number;
  views: { id: number; path: string; label: string; viewed_at: string; product_slug: string | null }[];
};

export type VisitorDetail = VisitorSummary & { user_agent: string | null; visit_sessions: VisitorSession[] };

export type ChatStatus = "ai" | "waiting_human" | "human" | "closed";
export type ChatCard = { slug: string; name: string; image: string | null; url: string; subcategory: string | null; category: string };
export type ChatMessage = { id: number; role: "visitor" | "assistant" | "staff" | "notice"; content: string; products: ChatCard[]; created_at: string };
export type ChatSummary = {
  id: number;
  status: ChatStatus;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  handoff_reason: string | null;
  unread_staff: boolean;
  visitor_ip: string | null;
  created_at: string;
  last_message_at: string;
  visitor_messages: number;
  last_text: string | null;
};
export type ChatList = { items: ChatSummary[]; total: number; page: number; pages: number; counts: Record<"needs_reply" | "ai" | "human" | "closed", number> };
export type ChatDetail = Omit<ChatSummary, "unread_staff" | "visitor_messages" | "last_text"> & {
  handoff_summary: string | null;
  handoff_at: string | null;
  page: string | null;
  tokens_used: number;
  cost_estimate: number;
  busy: boolean;
  activity: string | null;
  messages: ChatMessage[];
  notes: { id: number; device_name: string; status: string }[];
};
export type KnowledgeNote = {
  id: number;
  product_id: number | null;
  product_name: string | null;
  product_slug: string | null;
  device_name: string;
  content: string;
  source_url: string | null;
  status: "pending" | "approved" | "rejected";
  conversation_id: number | null;
  created_at: string;
  reviewed_at: string | null;
};
export type NemanjaStatus = {
  configured: boolean;
  api_key_set: boolean;
  provider: string;
  base_url: string;
  web_search: string;
  cost_per_mtok: { input: number; output: number };
  model: string;
  reasoning_effort: string;
  max_tokens_per_chat: number;
  web_domains: string[];
  alerts_to: string[];
};

export type AiTestResult =
  | {
      ok: true;
      model: string;
      ms: number;
      key_source: string;
      // connection check
      model_available?: boolean;
      models_count?: number;
      similar_models?: string[];
      // test question
      answer?: string;
      input_tokens?: number;
      output_tokens?: number;
      cost_estimate?: number;
      // full Nemanja test
      tools_used?: string[];
      web_search?: string;
    }
  | { ok: false; error_type: string; status: number | null; code: string | null; message: string; hint: string };

export const adminApi = {
  login: (password: string) =>
    request<{ token: string; expires: number }>("/login", { method: "POST", body: JSON.stringify({ password }) }),
  session: () => request<{ ok: boolean }>("/session"),
  list: (params: { q?: string; category?: string; page?: number; per_page?: number }) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && v !== "all" && sp.set(k, String(v)));
    return request<ProductList>(`/products?${sp}`);
  },
  get: (id: number) => request<Product>(`/products/${id}`),
  create: (data: ProductInput) => request<Product>("/products", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: ProductInput) => request<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  patch: (id: number, data: { is_published?: boolean; is_popular?: boolean; is_new?: boolean; is_on_sale?: boolean; sort_order?: number }) =>
    request<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  duplicate: (id: number) => request<Product>(`/products/${id}/duplicate`, { method: "POST" }),
  remove: (id: number) => request<void>(`/products/${id}`, { method: "DELETE" }),
  upload: (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return request<UploadResult[]>("/uploads", { method: "POST", body: form });
  },
  suggestions: () => request<Suggestions>("/suggestions"),

  messages: (params: { status?: MessageFilter; q?: string; page?: number; per_page?: number }) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && sp.set(k, String(v)));
    return request<MessageList>(`/messages?${sp}`);
  },
  message: (id: number) => request<Message>(`/messages/${id}`),
  updateMessage: (id: number, data: { status?: MessageStatus; admin_note?: string }) =>
    request<Message>(`/messages/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  resendMessage: (id: number) => request<Message>(`/messages/${id}/resend`, { method: "POST" }),
  replyMessage: (id: number, data: { subject: string; body: string; include_original: boolean; copy_to_company: boolean }) =>
    request<Message>(`/messages/${id}/reply`, { method: "POST", body: JSON.stringify(data) }),
  removeMessage: (id: number) => request<void>(`/messages/${id}`, { method: "DELETE" }),

  visitorStats: (days: number) => request<VisitorStats>(`/visitors/stats?days=${days}`),
  visitors: (params: { days: number; q?: string; page?: number }) => {
    const sp = new URLSearchParams({ days: String(params.days) });
    if (params.q) sp.set("q", params.q);
    if (params.page) sp.set("page", String(params.page));
    return request<VisitorList>(`/visitors?${sp}`);
  },
  visitor: (id: number) => request<VisitorDetail>(`/visitors/${id}`),
  removeVisitor: (id: number) => request<void>(`/visitors/${id}`, { method: "DELETE" }),

  nemanjaStatus: () => request<NemanjaStatus>("/nemanja/status"),
  nemanjaTest: (data: { mode: "connection" | "question" | "nemanja"; question?: string; api_key?: string; model?: string }) =>
    request<AiTestResult>("/nemanja/test", { method: "POST", body: JSON.stringify(data) }),
  chats: (status: string, page = 1) => request<ChatList>(`/chats?status=${encodeURIComponent(status)}&page=${page}`),
  chat: (id: number) => request<ChatDetail>(`/chats/${id}`),
  chatReply: (id: number, text: string, emailCustomer: boolean) =>
    request<ChatDetail>(`/chats/${id}/reply`, { method: "POST", body: JSON.stringify({ text, email_customer: emailCustomer }) }),
  chatStatus: (id: number, status: "ai" | "human" | "closed") =>
    request<ChatDetail>(`/chats/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  notes: (status: string) => request<{ items: KnowledgeNote[]; counts: Record<"pending" | "approved" | "rejected", number> }>(`/knowledge?status=${status}`),
  updateNote: (id: number, data: { status?: string; content?: string; product_slug?: string }) =>
    request<KnowledgeNote>(`/knowledge/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  removeNote: (id: number) => request<void>(`/knowledge/${id}`, { method: "DELETE" }),
};
