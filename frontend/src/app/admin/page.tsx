import type { Metadata } from "next";
import { Suspense } from "react";
import AdminApp from "@/components/admin/AdminApp";

// Product administration (password protected by the API). Not linked from the
// menu and kept out of search engines.
export const metadata: Metadata = {
  title: "Product admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<p className="px-4 py-24 text-center text-slate-500">Loading…</p>}>
        <AdminApp />
      </Suspense>
    </main>
  );
}
