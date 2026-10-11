"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Course = {
  id: number;
  fullname: string;
  shortname: string;
  category: string;
  summary: string;
  image: string | null;
  url: string;
};

type SearchResp = {
  total: number;
  page: number;
  perpage: number;
  courses: Course[];
  error?: string;
};

const PERPAGE = 24;

function Spinner() {
  return (
    <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
  );
}

function CourseCard({ c }: { c: Course }) {
  return (
    <a
      href={`/course/${c.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/8 bg-neutral-950/70 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-neutral-900/70 hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900">
        {c.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.image}
            alt=""
            loading="lazy"
            className="size-full object-cover opacity-85 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[linear-gradient(135deg,#141416,#1d1d21)] text-3xl text-neutral-700">
            ◍
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-neutral-300 backdrop-blur">
          {c.shortname || `#${c.id}`}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-neutral-100 group-hover:text-white">
          {c.fullname}
        </h3>
        {c.category && (
          <p className="truncate text-[11.5px] uppercase tracking-wider text-blue-400/80">
            {c.category}
          </p>
        )}
        {c.summary && (
          <p className="line-clamp-2 text-[12.5px] leading-relaxed text-neutral-500">
            {c.summary}
          </p>
        )}
        <span className="mt-auto pt-1 text-[12px] font-medium text-neutral-400 transition group-hover:text-blue-400">
          Lihat isi course →
        </span>
      </div>
    </a>
  );
}

export default function Home() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async (query: string, p: number) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&page=${p}&perpage=${PERPAGE}`,
        { cache: "no-store" },
      );
      const j = (await r.json()) as SearchResp;
      if (j.error) {
        setErr(j.error);
        setData(null);
      } else {
        setData(j);
      }
    } catch {
      setErr("Gagal menghubungi API. Coba lagi sebentar lagi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run("", 0);
  }, [run]);

  const onSearch = (v: string) => {
    setQ(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(0);
      run(v, 0);
    }, 380);
  };

  const goPage = (p: number) => {
    setPage(p);
    run(q, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const total = data?.total ?? 0;
  const pages = Math.min(Math.ceil(total / PERPAGE), 40);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16">
      <section className="py-14 text-center sm:py-20">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-neutral-400">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          API publik · mode guest · Moodle 3.9
        </p>
        <h1 className="mx-auto max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight text-white sm:text-5xl">
          Cari course Online Learning
          <br className="hidden sm:block" />{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Telkom University
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[14.5px] leading-relaxed text-neutral-400">
          Full-text search ke {""}
          <span className="font-medium text-neutral-200">
            ~{total || 700} course
          </span>
          , lengkap dengan isi materi & aktivitas tiap course.
        </p>

        <div className="mx-auto mt-8 max-w-2xl">
          <div className="group relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-500 transition group-focus-within:text-blue-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" strokeLinecap="round" />
            </svg>
            <input
              autoFocus
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Contoh: teori coding, jaringan, PKKMB…"
              className="w-full rounded-xl border border-white/10 bg-neutral-950/80 py-3.5 pl-11 pr-4 text-[15px] text-white placeholder:text-neutral-600 outline-none transition focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[12.5px]">
            {["teori coding", "informatika", "jaringan", "matematika", " PKKMB"].map(
              (s) => (
                <button
                  key={s}
                  onClick={() => onSearch(s.trim())}
                  className="rounded-full border border-white/10 px-3 py-1 text-neutral-400 transition hover:border-white/25 hover:text-white"
                >
                  {s.trim()}
                </button>
              ),
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between text-[13px] text-neutral-500">
          <span>
            {loading
              ? "Memuat…"
              : err
                ? ""
                : `${total} hasil${q ? ` untuk “${q}”` : ""}`}
          </span>
          {data && !loading && (
            <span className="tabular-nums">
              hal. {page + 1} / {Math.max(pages, 1)}
            </span>
          )}
        </div>

        {err && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-[13.5px] text-red-300">
            {err}
          </div>
        )}

        {loading && !data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl border border-white/8 bg-neutral-900/50"
              />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.courses.map((c) => (
                <CourseCard key={c.id} c={c} />
              ))}
            </div>

            {data.courses.length === 0 && (
              <div className="rounded-xl border border-white/8 bg-neutral-950/60 px-4 py-10 text-center text-[14px] text-neutral-500">
                Tidak ada course yang cocok.
              </div>
            )}

            {pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  disabled={page === 0 || loading}
                  onClick={() => goPage(page - 1)}
                  className="rounded-lg border border-white/10 px-3.5 py-2 text-[13px] text-neutral-300 transition hover:border-white/25 disabled:opacity-35"
                >
                  ← Sebelumnya
                </button>
                {Array.from({ length: Math.min(pages, 9) }).map((_, i) => {
                  const start = Math.max(0, Math.min(page - 4, pages - 9));
                  const p = start + i;
                  if (p >= pages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => goPage(p)}
                      className={`size-9 rounded-lg text-[13px] tabular-nums transition ${
                        p === page
                          ? "bg-blue-600 font-medium text-white"
                          : "border border-white/10 text-neutral-400 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {p + 1}
                    </button>
                  );
                })}
                <button
                  disabled={page >= pages - 1 || loading}
                  onClick={() => goPage(page + 1)}
                  className="rounded-lg border border-white/10 px-3.5 py-2 text-[13px] text-neutral-300 transition hover:border-white/25 disabled:opacity-35"
                >
                  Berikutnya →
                </button>
              </div>
            )}
          </>
        )}

        {loading && data && (
          <div className="mt-4 flex items-center gap-2 text-[13px] text-neutral-500">
            <Spinner /> memperbarui…
          </div>
        )}
      </section>

      <section className="mt-16 grid gap-3 sm:grid-cols-3">
        {[
          {
            t: "GET /api/search",
            d: "Full-text search course: q, page, perpage.",
          },
          {
            t: "GET /api/course?id=",
            d: "Detail course: judul, section, daftar aktivitas.",
          },
          { t: "GET /api/img?u=", d: "Proxy gambar materi (pluginfile)." },
        ].map((e) => (
          <div
            key={e.t}
            className="rounded-xl border border-white/8 bg-neutral-950/60 p-4"
          >
            <code className="text-[13px] font-medium text-emerald-400">
              {e.t}
            </code>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">
              {e.d}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
