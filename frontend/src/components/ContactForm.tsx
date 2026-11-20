"use client";

import { useId, useState } from "react";

// Shared input styling: slate border like the other panels, sky-blue focus
// ring, red border once the visitor has interacted with an invalid field.
const FIELD =
  "w-full rounded-md border border-slate-300 bg-white px-3.5 text-[15px] text-neutral-950 transition-colors outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 user-invalid:border-red-500 user-invalid:focus:ring-red-500/20";

function Field({
  label,
  optional,
  className,
  children,
  htmlFor,
}: {
  label: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-neutral-800">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-slate-500">(optional)</span>
        ) : (
          <span aria-hidden="true" className="ml-0.5 text-sky-600">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

// Contact form in a white, bordered panel. First/last name and email/phone sit
// in pairs when the panel is wide enough (448px+), otherwise one per row.
// Every field except the phone number and company name is required; the browser checks them
// (including the email format) before submitting.
// Sending posts to the API (/api/contact): the message is saved (readable in
// /admin > Messages) and emailed to the company. A hidden "website" field
// catches spam bots.
type SendState = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

export default function ContactForm({ className }: { className?: string }) {
  const id = useId();
  const [state, setState] = useState<SendState>({ kind: "idle" });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.kind === "sending") return;
    const form = e.currentTarget;
    const f = new FormData(form);
    const text = (name: string) => String(f.get(name) ?? "").trim();
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: text("firstName"),
          last_name: text("lastName"),
          email: text("email"),
          phone: text("phone"),
          company: text("company"),
          message: text("message"),
          website: text("website"),
          page: window.location.pathname,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = body?.detail;
        throw new Error(typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg?.replace(/^Value error, /, "") : "");
      }
      form.reset();
      setState({ kind: "sent" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error && err.message ? err.message : "Your message couldn't be sent." });
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Contact form"
      className={`@container relative rounded-lg border border-slate-300 bg-white p-5 md:p-6 lg:p-8 ${className ?? ""}`}
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 @[28rem]:grid-cols-2">
        <Field label="First Name" htmlFor={`${id}-first`}>
          <input id={`${id}-first`} name="firstName" type="text" autoComplete="given-name" required className={`${FIELD} h-11`} />
        </Field>
        <Field label="Last Name" htmlFor={`${id}-last`}>
          <input id={`${id}-last`} name="lastName" type="text" autoComplete="family-name" required className={`${FIELD} h-11`} />
        </Field>
        <Field label="Email Address" htmlFor={`${id}-email`}>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.co.nz"
            required
            className={`${FIELD} h-11`}
          />
        </Field>
        <Field label="Phone Number" optional htmlFor={`${id}-phone`}>
          <input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" className={`${FIELD} h-11`} />
        </Field>
        <Field label="Company Name" optional htmlFor={`${id}-company`} className="@[28rem]:col-span-2">
          <input id={`${id}-company`} name="company" type="text" autoComplete="organization" className={`${FIELD} h-11`} />
        </Field>
        <Field label="Message" htmlFor={`${id}-message`} className="@[28rem]:col-span-2">
          <textarea
            id={`${id}-message`}
            name="message"
            rows={11}
            required
            placeholder="Tell us about your enquiry or requirements"
            className={`${FIELD} block min-h-48 resize-y py-3 leading-relaxed`}
          />
        </Field>
      </div>

      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 @[28rem]:flex-row @[28rem]:items-center @[28rem]:justify-between">
        <p className="text-sm text-slate-500">
          <span aria-hidden="true" className="text-sky-600">
            *
          </span>{" "}
          Required fields
        </p>
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-black px-7 text-[15px] font-semibold text-white transition-colors outline-none hover:bg-[#0b1f45] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        >
          {state.kind === "sending" ? "Sending…" : "Send message"}
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div role="status" aria-live="polite" className="empty:hidden">
        {state.kind === "sent" && (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Thank you, your message has been sent. We&apos;ll get back to you shortly.
          </p>
        )}
        {state.kind === "error" && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message} Please try again, or email us at{" "}
            <a href="mailto:info@rfdsl.co.nz" className="font-semibold underline">
              info@rfdsl.co.nz
            </a>
            .
          </p>
        )}
      </div>
    </form>
  );
}
