"use client";

import { useEffect, useState } from "react";
import { isTrackingExcluded, setTrackingExcluded } from "@/lib/tracking";
import { adminApi, type VisitorDetail, type VisitorList, type VisitorStats } from "./api";
import { Button, Icon, ICON, inputClass, Toggle } from "./ui";

// Visitor tracking: summary for a chosen period, the visitor list (one row
// per IP address) and, for a selected visitor, every page they viewed in
// order, grouped into visits (sessions).

const PERIODS = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 0, label: "All time" },
];

const nf = new Intl.NumberFormat("en-NZ");
const compact = (n: number) => (n >= 10_000 ? new Intl.NumberFormat("en-NZ", { notation: "compact" }).format(n) : nf.format(n));
const fmtDate = (iso: string, withTime = true) =>
  new Date(iso).toLocaleString("en-NZ", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", second: "2-digit" });
const fmtDuration = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60 ? `${s % 60}s` : ""}`.trim() : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
const host = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export default function VisitorsView({ selectedId, onSelect }: { selectedId: number | null; onSelect: (id: number | null) => void }) {
  const [days, setDays] = useState(7);
  if (selectedId !== null) return <VisitorTimeline id={selectedId} onBack={() => onSelect(null)} />;
  return <Overview days={days} setDays={setDays} onSelect={onSelect} />;
}

// ------------------------------------------------------------------ overview

function Overview({ days, setDays, onSelect }: { days: number; setDays: (d: number) => void; onSelect: (id: number) => void }) {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [list, setList] = useState<VisitorList | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [excluded, setExcluded] = useState(isTrackingExcluded);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Every figure below follows the period filter. While a new period loads,
  // the previous figures stay on screen, dimmed.
  const requestKey = `${days}|${debouncedQ}|${page}`;
  const loading = loadedKey !== requestKey;
  useEffect(() => {
    let cancelled = false;
    Promise.all([adminApi.visitorStats(days), adminApi.visitors({ days, q: debouncedQ, page })])
      .then(([s, l]) => {
        if (cancelled) return;
        setStats(s);
        setList(l);
        setError("");
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoadedKey(`${days}|${debouncedQ}|${page}`));
    return () => {
      cancelled = true;
    };
  }, [days, debouncedQ, page]);

  const periodLabel = PERIODS.find((p) => p.days === days)?.label.toLowerCase() ?? "";

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,2.2vw,2rem)] font-extrabold tracking-[-0.02em] text-neutral-950">Visitors</h1>
          <p className="mt-1 text-sm text-slate-500">Everyone who opened the website, by IP address. Bots and admin pages aren&apos;t counted.</p>
        </div>
        <label className="flex items-center gap-2.5 text-sm text-neutral-700">
          <Toggle
            checked={excluded}
            onChange={(v) => {
              setTrackingExcluded(v);
              setExcluded(v);
            }}
            label="Don't count my visits from this browser"
          />
          Don&apos;t count my visits from this browser
        </label>
      </div>

      {/* Period filter: one row above everything it scopes. */}
      <div className="mt-5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Period">
        {PERIODS.map((p) => {
          const on = p.days === days;
          return (
            <button
              key={p.days}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setDays(p.days);
                setPage(1);
              }}
              className={`h-9 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                on ? "border-black bg-black text-white" : "border-slate-300 bg-white text-neutral-700 hover:border-slate-400 hover:text-neutral-950"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className={`transition-opacity duration-200 ${loading && stats ? "opacity-50" : ""}`}>
        {!stats ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <KpiRow stats={stats} />
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Card title={days === 1 ? "Today" : "Visitors per day"} subtitle={days === 1 ? "Daily chart is shown for 7 days or more" : `Unique visitors, ${periodLabel}`}>
                {days === 1 ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    {stats.visitors} visitor{stats.visitors === 1 ? "" : "s"} and {stats.page_views} page view{stats.page_views === 1 ? "" : "s"} so far today.
                  </p>
                ) : stats.series.length ? (
                  <DailyChart series={stats.series} />
                ) : (
                  <p className="py-10 text-center text-sm text-slate-500">No data for all time view; choose 7, 30 or 90 days.</p>
                )}
              </Card>
              <Card title="Most viewed products" subtitle={`Product pages, ${periodLabel}`}>
                <RankedBars
                  rows={stats.top_products.map((p) => ({ key: String(p.id), label: p.name, href: `/products/${p.slug}`, value: p.views, note: `${p.visitors} visitor${p.visitors === 1 ? "" : "s"}` }))}
                  empty="No product pages viewed in this period."
                />
              </Card>
            </div>
            <Card title="Most viewed pages" subtitle={`All pages, ${periodLabel}`} className="mt-5">
              <RankedBars
                rows={stats.top_pages.map((p, i) => ({ key: `${p.label}-${i}`, label: p.label, href: p.path, value: p.views, note: `${p.visitors} visitor${p.visitors === 1 ? "" : "s"}` }))}
                empty="No page views in this period."
              />
            </Card>
          </>
        )}

        {/* Visitor list */}
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">Visitor list</h2>
            <p className="text-sm text-slate-500">
              {list ? `${nf.format(list.total)} visitor${list.total === 1 ? "" : "s"} active ${days === 0 ? "ever" : periodLabel === "today" ? "today" : `in the last ${periodLabel}`}` : " "} · click one to see every page they viewed
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Icon d={ICON.search} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an IP address" aria-label="Find an IP address" className={`h-10 pl-10 ${inputClass}`} />
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_6rem_6rem_minmax(0,1.6fr)_9.5rem] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase lg:grid">
            <span>IP address</span>
            <span>Device</span>
            <span className="text-right">Visits</span>
            <span className="text-right">Pages</span>
            <span>Last page viewed</span>
            <span>Last seen</span>
          </div>
          {list?.items.length === 0 && <p className="px-4 py-12 text-center text-sm text-slate-500">No visitors {debouncedQ ? "match that IP address" : "in this period yet"}.</p>}
          <ul className="divide-y divide-slate-100">
            {list?.items.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onSelect(v.id)}
                  className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left text-sm transition-colors outline-none hover:bg-slate-50 focus-visible:bg-slate-50 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_6rem_6rem_minmax(0,1.6fr)_9.5rem]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold text-neutral-950 tabular-nums">{v.ip}</span>
                    {v.sessions > 1 ? <Badge tone="dark">Returning</Badge> : <Badge>New</Badge>}
                  </span>
                  <span className="text-right text-xs text-slate-500 lg:hidden">{fmtDate(v.last_seen)}</span>
                  <span className="col-span-2 truncate text-slate-600 lg:col-span-1">
                    {[v.device, v.browser, v.os].filter(Boolean).join(" · ")}
                  </span>
                  <span className="hidden text-right text-neutral-900 tabular-nums lg:block">{nf.format(v.sessions)}</span>
                  <span className="hidden text-right text-neutral-900 tabular-nums lg:block">{nf.format(v.page_views)}</span>
                  <span className="col-span-2 truncate text-slate-600 lg:col-span-1">
                    <span className="text-slate-400 lg:hidden">
                      {v.sessions} visit{v.sessions === 1 ? "" : "s"} · {v.page_views} page{v.page_views === 1 ? "" : "s"} · last:{" "}
                    </span>
                    {v.last_page ?? "—"}
                  </span>
                  <span className="hidden text-slate-500 lg:block">{fmtDate(v.last_seen)}</span>
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
              <Button size="sm" disabled={list.page <= 1} onClick={() => setPage(list.page - 1)}>
                <Icon d={ICON.left} className="size-3.5" />
                Previous
              </Button>
              <Button size="sm" disabled={list.page >= list.pages} onClick={() => setPage(list.page + 1)}>
                Next
                <Icon d={ICON.right} className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiRow({ stats }: { stats: VisitorStats }) {
  const rate = Math.round(stats.returning_rate * 100);
  return (
    <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Stat label="Visitors" value={compact(stats.visitors)} note="unique IP addresses" />
      <Stat label="New visitors" value={compact(stats.new_visitors)} note="first visit in this period" />
      <Stat label="Returning visitors" value={compact(stats.returning_visitors)} note="came back for another visit" />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <dt className="text-sm text-slate-500">Returning rate</dt>
        <dd className="mt-1 text-[1.75rem] leading-tight font-semibold text-neutral-950">{rate}%</dd>
        {/* Meter: the share of visitors who returned. */}
        <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rate} aria-label="Returning rate" className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-neutral-900" style={{ width: `${rate}%` }} />
        </div>
      </div>
      <Stat label="Visits" value={compact(stats.sessions)} note="sessions (30 min inactivity ends one)" />
      <Stat label="Page views" value={compact(stats.page_views)} note={`${stats.pages_per_session} pages per visit`} />
    </dl>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-[1.75rem] leading-tight font-semibold text-neutral-950">{value}</dd>
      <dd className="mt-1 text-xs text-slate-500">{note}</dd>
    </div>
  );
}

function Card({ title, subtitle, className, children }: { title: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 ${className ?? ""}`} aria-label={title}>
      <h2 className="font-bold text-neutral-950">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Badge({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone === "dark" ? "bg-neutral-900 text-white" : "bg-slate-100 text-slate-600"}`}>
      {children}
    </span>
  );
}

// Ranked horizontal bars: name, bar and figure per row, bars on one baseline.
function RankedBars({ rows, empty }: { rows: { key: string; label: string; href: string; value: number; note: string }[]; empty: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ol className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
          <a href={r.href} target="_blank" rel="noopener" className="truncate text-sm text-neutral-900 hover:underline" title={r.label}>
            {r.label}
          </a>
          <span className="col-span-2 row-start-2 h-2 overflow-hidden rounded-full bg-neutral-100 sm:col-span-1 sm:row-start-auto" aria-hidden="true">
            <span className="block h-full rounded-full bg-neutral-900" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </span>
          <span className="col-start-2 row-start-1 text-right text-sm text-neutral-900 tabular-nums sm:col-start-auto sm:row-start-auto" title={r.note}>
            {nf.format(r.value)} <span className="text-xs text-slate-500">{r.value === 1 ? "view" : "views"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// Daily unique visitors as columns (one series, so no legend), with a hover /
// focus tooltip per day and a table view of the same numbers.
function DailyChart({ series }: { series: VisitorStats["series"] }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const peak = Math.max(1, ...series.map((d) => d.visitors));
  const step = peak <= 4 ? 1 : peak <= 10 ? 2 : Math.pow(10, Math.floor(Math.log10(peak))) * (peak / Math.pow(10, Math.floor(Math.log10(peak))) > 5 ? 2 : 1);
  const top = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const labelEvery = series.length <= 7 ? 1 : series.length <= 31 ? 7 : 14;
  const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={() => setAsTable((t) => !t)} className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-neutral-950">
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 text-right font-semibold">Visitors</th>
                <th className="px-3 py-2 text-right font-semibold">Page views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {series.map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5">{dayLabel(d.date)}</td>
                  <td className="px-3 py-1.5 text-right">{d.visitors}</td>
                  <td className="px-3 py-1.5 text-right">{d.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
          {/* Y axis */}
          <div className="relative h-52 w-7 text-right text-[11px] text-slate-500 tabular-nums" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
                {compact(t)}
              </span>
            ))}
          </div>
          <div className="relative h-52" onPointerLeave={() => setActive(null)}>
            {/* Hairline gridlines */}
            {ticks.map((t) => (
              <span key={t} aria-hidden="true" className="absolute inset-x-0 h-px bg-slate-200" style={{ bottom: `${(t / top) * 100}%` }} />
            ))}
            <ol className="absolute inset-0 flex items-end gap-[2px]" aria-label="Unique visitors per day">
              {series.map((d, i) => (
                <li key={d.date} className="relative flex h-full flex-1 items-end justify-center">
                  <button
                    type="button"
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    aria-label={`${dayLabel(d.date)}: ${d.visitors} visitors, ${d.views} page views`}
                    className="flex h-full w-full cursor-default items-end justify-center outline-none focus-visible:bg-slate-100"
                  >
                    <span
                      className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${active === i ? "bg-neutral-600" : "bg-neutral-900"}`}
                      style={{ height: d.visitors ? `${(d.visitors / top) * 100}%` : 0 }}
                    />
                  </button>
                  {active === i && (
                    <span
                      role="tooltip"
                      className={`pointer-events-none absolute bottom-full z-10 mb-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs whitespace-nowrap shadow-lg ${
                        i < series.length / 3 ? "left-0" : i > (series.length * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2"
                      }`}
                      style={{ bottom: `calc(${(d.visitors / top) * 100}% + 4px)` }}
                    >
                      <b className="block text-sm font-semibold text-neutral-950">{d.visitors} visitor{d.visitors === 1 ? "" : "s"}</b>
                      <span className="text-slate-500">
                        {d.views} page view{d.views === 1 ? "" : "s"} · {dayLabel(d.date)}
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
          {/* X axis labels */}
          <span />
          <div className="mt-1.5 flex gap-[2px] text-[11px] text-slate-500" aria-hidden="true">
            {series.map((d, i) => (
              <span key={d.date} className="relative flex-1 text-center">
                {(i === series.length - 1 || (series.length - 1 - i) % labelEvery === 0) && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{dayLabel(d.date)}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ one visitor

function VisitorTimeline({ id, onBack }: { id: number; onBack: () => void }) {
  const [v, setV] = useState<VisitorDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminApi
      .visitor(id)
      .then((d) => !cancelled && setV(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <button type="button" onClick={onBack} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white pr-4 pl-1.5 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-950">
        <span className="flex size-6 items-center justify-center rounded-full bg-neutral-100">
          <Icon d={ICON.left} className="size-3.5" />
        </span>
        All visitors
      </button>

      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!v && !error && <p className="py-16 text-center text-sm text-slate-500">Loading…</p>}

      {v && (
        <>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="flex flex-wrap items-center gap-3 text-[clamp(1.5rem,2.2vw,2rem)] font-extrabold tracking-[-0.02em] text-neutral-950 tabular-nums">
                {v.ip}
                {v.sessions > 1 ? <Badge tone="dark">Returning visitor</Badge> : <Badge>New visitor</Badge>}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{[v.device, v.browser, v.os].filter(Boolean).join(" · ")}</p>
            </div>
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirm(`Delete all tracking data for ${v.ip}?`)) return;
                try {
                  await adminApi.removeVisitor(v.id);
                  onBack();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed");
                }
              }}
            >
              <Icon d={ICON.trash} className="size-4" />
              Delete this visitor&apos;s data
            </Button>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Visits" value={nf.format(v.sessions)} note={v.sessions > 1 ? "came back" : "one visit so far"} />
            <Stat label="Pages viewed" value={nf.format(v.page_views)} note={`${(v.page_views / Math.max(1, v.sessions)).toFixed(1)} per visit`} />
            <Stat label="First seen" value={fmtDate(v.first_seen, false)} note={fmtTime(v.first_seen)} />
            <Stat label="Last seen" value={fmtDate(v.last_seen, false)} note={fmtTime(v.last_seen)} />
          </dl>
          <p className="mt-3 text-xs break-all text-slate-500">
            {v.first_referrer && (
              <>
                First came from <b className="font-semibold text-neutral-800">{host(v.first_referrer)}</b> ·{" "}
              </>
            )}
            {v.user_agent}
          </p>

          {/* Every page, in order, grouped into visits. */}
          <h2 className="mt-8 text-lg font-bold text-neutral-950">Pages viewed, in order</h2>
          <ol className="mt-4 space-y-4">
            {v.visit_sessions.map((s, si) => (
              <li key={s.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <b className="font-bold text-neutral-950">Visit {si + 1 + Math.max(0, v.sessions - v.visit_sessions.length)}</b>
                  <span className="text-neutral-800">{fmtDate(s.started_at)}</span>
                  <span className="text-slate-500">
                    · {s.page_views} page{s.page_views === 1 ? "" : "s"} · {fmtDuration(s.duration_seconds)}
                    {s.referrer && <> · from {host(s.referrer)}</>}
                  </span>
                </div>
                <ol className="relative px-4 py-2">
                  {s.views.map((pv, i) => {
                    const gap = i > 0 ? Math.round((new Date(pv.viewed_at).getTime() - new Date(s.views[i - 1].viewed_at).getTime()) / 1000) : null;
                    return (
                      <li key={pv.id} className="grid grid-cols-[5.5rem_1rem_minmax(0,1fr)] items-start gap-x-2 py-2 text-sm">
                        <span className="pt-px text-xs text-slate-500 tabular-nums">{fmtTime(pv.viewed_at)}</span>
                        <span className="relative flex h-full justify-center" aria-hidden="true">
                          {i < s.views.length - 1 && <span className="absolute top-0 bottom-[-1rem] w-px bg-slate-200" />}
                          <span className={`relative mt-1 size-2.5 rounded-full ring-2 ring-white ${pv.product_slug ? "bg-neutral-900" : "bg-slate-400"}`} />
                        </span>
                        <span className="min-w-0">
                          <a href={pv.path} target="_blank" rel="noopener" className="font-medium text-neutral-950 hover:underline">
                            {pv.label}
                          </a>
                          {pv.product_slug && <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">Product</span>}
                          <span className="block truncate text-xs text-slate-400">
                            {pv.path}
                            {gap !== null && <> · {fmtDuration(gap)} after the previous page</>}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
