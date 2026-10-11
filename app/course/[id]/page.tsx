"use client";

import { use, useEffect, useState } from "react";

type Activity = {
  id: string;
  name: string;
  mod: string;
  url: string;
};

type Detail = {
  id: number;
  title: string;
  accessible: boolean;
  reason?: string;
  sections: string[];
  activities: Activity[];
  url: string;
  error?: string;
};

const MOD_LABEL: Record<string, string> = {
  assign: "Tugas",
  forum: "Forum",
  url: "URL",
  page: "Halaman",
  resource: "File",
  quiz: "Kuis",
  label: "Label",
  attendance: "Presensi",
  url_resource: "URL",
  h5pactivity: "H5P",
  lesson: "Lesson",
  choice: "Pilihan",
  workshop: "Workshop",
  gtopic: "Forum",
  data: "Database",
  wiki: "Wiki",
  scorm: "SCORM",
  chat: "Chat",
  choicegroup: "Kelompok",
  customcert: "Sertifikat",
  checklist: "Checklist",
  googlemeet: "Google Meet",
  bigbluebuttonbn: "BBB",
  certificate: "Sertifikat",
};

const MOD_COLOR: Record<string, string> = {
  assign: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  forum: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  quiz: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  url: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  resource: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  page: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  attendance: "text-lime-400 bg-lime-400/10 border-lime-400/20",
};

export default function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/course?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const j = (await r.json()) as Detail;
        if (alive) setD(j);
      } catch {
        if (alive) setD({ id: 0, title: "", accessible: false, sections: [], activities: [], url: "", error: "Gagal memuat data course." });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <main className="mx-auto max-w-5xl px-5 pb-16">
      <a
        href="/"
        className="mt-8 inline-flex items-center gap-1.5 text-[13px] text-neutral-400 transition hover:text-white"
      >
        ← Kembali cari course
      </a>

      {loading && (
        <div className="mt-6 space-y-3">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-neutral-900" />
          <div className="h-4 w-1/3 animate-pulse rounded-lg bg-neutral-900" />
          <div className="h-40 animate-pulse rounded-xl bg-neutral-900/60" />
        </div>
      )}

      {!loading && d?.error && (
        <div className="mt-6 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-[13.5px] text-red-300">
          {d.error}
        </div>
      )}

      {!loading && d && !d.error && (
        <>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                {d.title || `Course #${d.id}`}
              </h1>
              <p className="mt-2 text-[13px] text-neutral-500">
                {d.activities.length} aktivitas · {d.sections.length} section
              </p>
            </div>
            <a
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-white px-4 py-2 text-[13.5px] font-medium text-black transition hover:bg-neutral-200"
            >
              Buka di Moodle ↗
            </a>
          </div>

          {!d.accessible && (
            <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-[13.5px] text-amber-300">
              {d.reason || "Course ini butuh enrolment / login untuk dibuka."}
            </div>
          )}

          {d.sections.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {d.sections.map((s, i) => (
                <span
                  key={i}
                  className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[12.5px] text-neutral-300"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {d.activities.length > 0 && (
            <ul className="mt-6 divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8 bg-neutral-950/70">
              {d.activities.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/4"
                  >
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                        MOD_COLOR[a.mod] ||
                        "border-white/10 bg-white/5 text-neutral-400"
                      }`}
                    >
                      {MOD_LABEL[a.mod] || a.mod}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-neutral-200">
                      {a.name}
                    </span>
                    <span className="shrink-0 text-[13px] text-neutral-600">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {d.accessible && d.activities.length === 0 && (
            <div className="mt-6 rounded-xl border border-white/8 bg-neutral-950/60 px-4 py-8 text-center text-[14px] text-neutral-500">
              Tidak ada aktivitas terdeteksi (course mungkin kosong / format
              khusus).
            </div>
          )}
        </>
      )}
    </main>
  );
}
