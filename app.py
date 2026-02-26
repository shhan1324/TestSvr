import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from supabase import create_client

_script_dir = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, template_folder=os.path.join(_script_dir, "templates"))
CORS(app)

# Supabase (환경변수: SUPABASE_URL, SUPABASE_KEY)
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None


def _post_error(e):
    return jsonify({"error": str(e) or "오류가 발생했습니다."}), 500


def _fmt_dt(dt_str):
    """created_at (UTC) -> 한국시간(KST) YYYY-MM-DD HH:mm:ss"""
    if not dt_str:
        return ""
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        kst = dt.astimezone(ZoneInfo("Asia/Seoul"))
        return kst.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(dt_str)


@app.route("/", strict_slashes=False)
@app.route("/index.html", strict_slashes=False)
def index():
    return render_template("index.html")


@app.route("/write", strict_slashes=False)
def write_page():
    return render_template("write.html")


@app.route("/post/<int:post_id>", strict_slashes=False)
def post_page(post_id):
    return render_template("post.html", post_id=post_id)


@app.route("/minesweeper", strict_slashes=False)
def minesweeper():
    return render_template("minesweeper.html")


@app.route("/api/health")
def health():
    return jsonify({"message": "정상입니다"})


@app.route("/api/db-check")
def db_check():
    """Supabase 연결 테스트"""
    if not supabase:
        return jsonify({"ok": False, "error": "SUPABASE_URL/SUPABASE_KEY 미설정"}), 500
    try:
        result = supabase.table("health").select("1").limit(1).execute()
        return jsonify({"ok": True, "message": "Supabase 연결 정상"})
    except Exception as e:
        err = str(e).lower()
        if any(x in err for x in [
            "relation", "does not exist", "42p01", "not find",
            "schema cache", "rgrst205", "could not find"
        ]):
            return jsonify({"ok": True, "message": "Supabase 연결됨 (health 테이블 없음)"})
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/posts", methods=["GET", "POST"], strict_slashes=False)
def posts_collection():
    if not supabase:
        return _post_error("DB 미설정")
    if request.method == "POST":
        return _create_post()
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = max(1, min(50, int(request.args.get("limit", 15))))
        offset = (page - 1) * limit

        res = supabase.table("posts").select("id,author,title,created_at", count="exact").order(
            "created_at", desc=True
        ).range(offset, offset + limit - 1).execute()

        total = getattr(res, "count", None) or len(res.data or [])

        posts = []
        for i, row in enumerate(res.data or []):
            posts.append({
                "id": row["id"],
                "number": total - offset - i,
                "author": row.get("author", ""),
                "title": row.get("title", ""),
                "created_at": _fmt_dt(row.get("created_at")),
            })
        return jsonify({"posts": posts, "total": total})
    except Exception as e:
        return _post_error(e)


def _create_post():
    if not supabase:
        return _post_error("DB 미설정")
    data = request.get_json() or {}
    author = (data.get("author") or "").strip()
    password = data.get("password") or ""
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    if not author or not password or not title:
        return jsonify({"error": "글쓴이, 비밀번호, 제목은 필수입니다."}), 400
    password_hash = generate_password_hash(password)
    try:
        ins = supabase.table("posts").insert({
            "author": author,
            "password_hash": password_hash,
            "title": title,
            "content": content,
        }).execute()
        row = (ins.data or [{}])[0]
        return jsonify({"id": row.get("id"), "created_at": _fmt_dt(row.get("created_at"))}), 201
    except Exception as e:
        return _post_error(e)


@app.route("/api/posts/<int:post_id>", methods=["GET", "PUT", "DELETE"], strict_slashes=False)
def post_by_id(post_id):
    if not supabase:
        return _post_error("DB 미설정")
    if request.method == "PUT":
        return _update_post(post_id)
    if request.method == "DELETE":
        return _delete_post(post_id)
    try:
        res = supabase.table("posts").select("id,author,title,content,created_at").eq(
            "id", post_id
        ).execute()
        rows = res.data or []
        if not rows:
            return jsonify({"error": "Not found"}), 404
        row = rows[0]
        return jsonify({
            "id": row["id"],
            "author": row.get("author", ""),
            "title": row.get("title", ""),
            "content": row.get("content", ""),
            "created_at": _fmt_dt(row.get("created_at")),
        })
    except Exception as e:
        return _post_error(e)


def _get_password_hash(post_id):
    res = supabase.table("posts").select("password_hash").eq("id", post_id).execute()
    rows = res.data or []
    if not rows:
        return None
    return rows[0].get("password_hash")


def _update_post(post_id):
    if not supabase:
        return _post_error("DB 미설정")
    data = request.get_json() or {}
    password = data.get("password") or ""
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    if not title:
        return jsonify({"error": "제목은 필수입니다."}), 400
    try:
        stored = _get_password_hash(post_id)
        if not stored:
            return jsonify({"error": "Not found"}), 404
        if not check_password_hash(stored, password):
            return jsonify({"error": "비밀번호가 일치하지 않습니다."}), 403
        supabase.table("posts").update({
            "title": title,
            "content": content,
        }).eq("id", post_id).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return _post_error(e)


def _delete_post(post_id):
    if not supabase:
        return _post_error("DB 미설정")
    data = request.get_json() or {}
    password = data.get("password") or ""
    try:
        stored = _get_password_hash(post_id)
        if not stored:
            return jsonify({"error": "Not found"}), 404
        if not check_password_hash(stored, password):
            return jsonify({"error": "비밀번호가 일치하지 않습니다."}), 403
        supabase.table("posts").delete().eq("id", post_id).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return _post_error(e)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"\n  TestSvr API: http://127.0.0.1:{port}/api/health\n  Ctrl+C 로 종료\n")
    app.run(host="0.0.0.0", port=port)
