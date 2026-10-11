import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telkom OL API — Pencarian Course Online Learning Telkom University",
  description:
    "Cari course, lihat isi materi dan aktivitas course di onlinelearning.telkomuniversity.ac.id lewat API publik guest.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        <div className="grain fixed inset-0 -z-10 opacity-60" />
        <header className="border-b border-white/8 bg-black/40 backdrop-blur-xl sticky top-0 z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
            <a href="/" className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-md bg-blue-600 text-[13px] font-bold text-white shadow-[0_0_20px_-6px] shadow-blue-500">
                T
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Telkom OL <span className="text-neutral-500">API</span>
              </span>
            </a>
            <nav className="flex items-center gap-4 text-[13px] text-neutral-400">
              <a
                href="https://onlinelearning.telkomuniversity.ac.id/my/"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
              >
                Situs Asli ↗
              </a>
              <a
                href="/api/ping"
                className="rounded-md border border-white/10 px-2.5 py-1 transition hover:border-white/25 hover:text-white"
              >
                Status
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="mx-auto max-w-6xl px-5 py-10 text-[12.5px] leading-relaxed text-neutral-500">
          Data publik dibaca dari{" "}
          <span className="text-neutral-400">
            onlinelearning.telkomuniversity.ac.id
          </span>{" "}
          mode guest (tanpa login). Bukan situs resmi — untuk keperluan
          pemrograman & riset.
        </footer>
      </body>
    </html>
  );
}
