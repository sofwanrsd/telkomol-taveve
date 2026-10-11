"""Telkom OL (Moodle 3.9) public API — guest-only, no user credentials.

Endpoint:
  GET /api/ping                     -> upstream health
  GET /api/search?q=&page=&perpage  -> course search (core_course_search_courses)
  GET /api/courses?page=&perpage    -> browse all courses (empty query)
  GET /api/course?id=               -> course detail: sections + activities (scraped)
  GET /api/img?u=<url>              -> image proxy (pluginfile / theme images)

Cloudflare sits in front of Moodle: plain Python/Node TLS fingerprints get a 403
managed challenge, so every upstream call uses curl_cffi's chrome impersonation.
"""

from __future__ import annotations

import html as html_mod
import json
import re
import time
import urllib.parse

from curl_cffi import requests
from flask import Flask, Response, jsonify, request

app = Flask(__name__)
BASE = "https://onlinelearning.telkomuniversity.ac.id"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

_search_cache: dict = {}
_detail_cache: dict = {}
_shared: dict = {"sess": None, "sk": None, "at": 0.0}


# ---------------------------------------------------------------- helpers
def _session() -> requests.Session:
    """Satu sesi guest dipakai ulang (cookie MoodleSession harus sama dengan
    yang membawa sesskey — sesskey divalidasi per sesi)."""
    now = time.time()
    if _shared["sess"] is None or now - _shared["at"] > 900:
        s = requests.Session(impersonate="chrome", timeout=25)
        _shared["sess"] = s
        _shared["sk"] = None
        _shared["at"] = now
    return _shared["sess"]


def _sesskey(sess: requests.Session) -> str:
    """Guest sesskey dari sesi yang sama; refresh otomatis kalau expired."""
    if _shared["sk"]:
        return _shared["sk"]
    for _ in range(3):
        try:
            html = sess.get(f"{BASE}/my/", timeout=20).text
            m = re.search(r'"sesskey":"([^"]+)"', html)
            if m:
                _shared["sk"] = m.group(1)
                return m.group(1)
        except Exception:
            time.sleep(1)
    raise RuntimeError("gagal ambil sesskey dari upstream")


def _drop_session() -> None:
    _shared["sess"] = None
    _shared["sk"] = None
    _shared["at"] = 0.0


def _strip(v: str) -> str:
    v = re.sub(r"<[^>]+>", " ", v or "")
    return re.sub(r"\s+", " ", html_mod.unescape(v)).strip()


def _ajax(sess: requests.Session, methodname: str, args: dict) -> dict:
    """POST ke Moodle AJAX API. Kalau sesi mati (expired/logout), buang sesi
    dan ulangi sekali dengan sesi baru."""
    sk = _sesskey(sess)
    payload = [{"index": 0, "methodname": methodname, "args": args}]
    for attempt in (0, 1):
        r = sess.post(f"{BASE}/lib/ajax/service.php?sesskey={sk}",
                      data=json.dumps(payload),
                      headers={"Content-Type": "application/json"}, timeout=25)
        body = r.json()
        item = body[0] if isinstance(body, list) else body
        msg = ""
        if item.get("error"):
            msg = (item.get("exception", {}) or {}).get("message", "") or str(item.get("error", ""))
        if item.get("error") and any(x in msg for x in
                                     ("logged out", "expired", "sesi", "sesskey")) \
                and attempt == 0:
            _drop_session()
            sess = _session()
            sk = _sesskey(sess)
            continue
        if item.get("error"):
            raise RuntimeError(msg or "upstream error")
        return item.get("data", {})
    raise RuntimeError("upstream error")


def _search(sess: requests.Session, q: str, page: int, perpage: int) -> dict:
    key = (q, page, perpage)
    if key in _search_cache:
        return _search_cache[key]
    data = _ajax(sess, "core_course_search_courses",
                 {"criterianame": "search", "criteriavalue": q,
                  "page": page, "perpage": perpage})
    out = {
        "total": data.get("total", 0),
        "page": page,
        "perpage": perpage,
        "courses": [_shape(c) for c in data.get("courses", [])],
    }
    if len(_search_cache) > 240:
        _search_cache.clear()
    _search_cache[key] = out
    return out


def _shape(c: dict) -> dict:
    files = c.get("overviewfiles") or []
    img = None
    if files:
        img = files[0].get("fileurl", "").replace("/webservice/pluginfile.php",
                                                   "/pluginfile.php")
    elif c.get("courseimage", "").startswith("http"):
        img = c["courseimage"]
    return {
        "id": c.get("id"),
        "fullname": _strip(c.get("fullname", "")),
        "shortname": c.get("shortname", ""),
        "category": c.get("categoryname", ""),
        "summary": _strip(c.get("summary", ""))[:400],
        "image": f"/api/img?u={urllib.parse.quote(img, safe='')}" if img else None,
        "url": f"{BASE}/course/view.php?id={c.get('id')}",
    }


def _detail(sess: requests.Session, cid: int) -> dict:
    if cid in _detail_cache:
        return _detail_cache[cid]
    r = sess.get(f"{BASE}/course/view.php?id={cid}", timeout=25, allow_redirects=True)
    final = r.url
    title = re.search(r"<title>([^<]+)</title>", r.text)
    title = html_mod.unescape(title.group(1)).strip() if title else ""

    if "/enrol/" in final or "login" in final:
        out = {"id": cid, "title": title, "accessible": False,
               "reason": "Butuh enrolment / login", "sections": []}
        _detail_cache[cid] = out
        return out

    # activities: <a href=".../mod/<type>/view.php?id=N">name</a>
    acts: dict[str, dict] = {}
    for m in re.finditer(
            r'<a[^>]+href="([^"]*?/(?:mod|course)/[a-z]+/(?:view|index)\.php\?[^"]*?id=(\d+)[^"]*)"[^>]*>(.*?)</a>',
            r.text, re.S):
        href, aid, inner = m.group(1), m.group(2), m.group(3)
        name = _strip(inner)
        if not name or len(name) < 2:
            continue
        mod = re.search(r"/mod/([a-z]+)/", href)
        acts.setdefault(aid, {
            "id": aid,
            "name": name[:160],
            "mod": mod.group(1) if mod else "course",
            "url": href if href.startswith("http") else BASE + href,
        })

    # section headings (remui/course format variants)
    sections = []
    for m in re.finditer(r'<h[23][^>]*class="[^"]*(?:sectionname|section-title)[^"]*"[^>]*>(.*?)</h[23]>',
                         r.text, re.S):
        name = _strip(m.group(1))
        if name:
            sections.append(name)

    out = {
        "id": cid,
        "title": title.replace("Course: ", ""),
        "accessible": True,
        "sections": sections[:60],
        "activities": list(acts.values())[:200],
        "url": f"{BASE}/course/view.php?id={cid}",
    }
    if len(_detail_cache) > 120:
        _detail_cache.clear()
    _detail_cache[cid] = out
    return out


# ---------------------------------------------------------------- routes
@app.after_request
def _cors(resp: Response) -> Response:
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp


@app.route("/api/ping")
def ping():
    t = time.time()
    try:
        r = _session().get(f"{BASE}/my/", timeout=20)
        m = re.search(r"<title>([^<]+)</title>", r.text)
        return jsonify({"upstream": r.status_code, "title": m.group(1) if m else None,
                        "ms": int((time.time() - t) * 1000)})
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 502


@app.route("/api/search")
@app.route("/api/courses")
def search():
    q = (request.args.get("q") or "").strip()
    try:
        page = max(int(request.args.get("page", 0)), 0)
    except ValueError:
        page = 0
    try:
        perpage = int(request.args.get("perpage", 24))
    except ValueError:
        perpage = 24
    perpage = max(1, min(perpage, 50))
    try:
        return jsonify(_search(_session(), q, page, perpage))
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 502


@app.route("/api/course")
def course():
    try:
        cid = int(request.args.get("id", 0))
    except ValueError:
        return jsonify({"error": "id wajib angka"}), 400
    if cid <= 0:
        return jsonify({"error": "id wajib diisi"}), 400
    try:
        return jsonify(_detail(_session(), cid))
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 502


@app.route("/api/img")
def img():
    u = request.args.get("u", "")
    if not u.startswith("http"):
        return jsonify({"error": "url tidak valid"}), 400
    host = urllib.parse.urlparse(u).netloc
    if "telkomuniversity.ac.id" not in host:
        return jsonify({"error": "hanya host telkom diizinkan"}), 403
    try:
        r = _session().get(u, timeout=25)
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 502
    if r.status_code != 200:
        return jsonify({"error": f"upstream {r.status_code}"}), 502
    resp = Response(r.content, content_type=r.headers.get("content-type", "image/jpeg"))
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


@app.route("/")
def home():
    return jsonify({"ok": True, "service": "telkomol-api",
                    "endpoints": ["/api/ping", "/api/search", "/api/course", "/api/img"]})
