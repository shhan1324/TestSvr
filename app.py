import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from flask import Flask, jsonify, request, render_template, session, redirect, url_for
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from supabase import create_client
from functools import wraps

_script_dir = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    template_folder=os.path.join(_script_dir, "templates"),
    static_folder=os.path.join(_script_dir, "static"),
    static_url_path="/static",
)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
CORS(app, supports_credentials=True)

# Admin 계정 (admin/admin123)
_ADMIN_USERNAME = "admin"
_ADMIN_PASSWORD_HASH = generate_password_hash(os.environ.get("ADMIN_PASSWORD", "admin123"))

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


@app.context_processor
def inject_user():
    return {
        "current_user": session.get("username"),
        "is_admin": session.get("is_admin", False),
    }


def _admin_required(f):
    @wraps(f)
    def inner(*args, **kwargs):
        if not session.get("is_admin"):
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return inner


# 로그인 없이 접근 가능한 경로 (전체 사이트 로그인 필수)
_LOGIN_EXEMPT = frozenset([
    "/login", "/register", "/logout",
    "/api/auth/login", "/api/auth/register", "/api/auth/logout",
    "/api/health",
])


@app.before_request
def _require_login():
    if request.path in _LOGIN_EXEMPT:
        return None
    if request.path.startswith("/static/"):
        return None
    if session.get("username"):
        return None
    if request.path.startswith("/api/"):
        return jsonify({"error": "로그인이 필요합니다.", "redirect": "/login"}), 401
    return redirect(url_for("login_page"))


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


@app.route("/register", strict_slashes=False)
def register_page():
    if session.get("username"):
        return redirect(url_for("index"))
    return render_template("register.html")


@app.route("/login", strict_slashes=False)
def login_page():
    if session.get("username"):
        return redirect(url_for("index"))
    return render_template("login.html")


@app.route("/admin/members", strict_slashes=False)
@_admin_required
def admin_members_page():
    return render_template("admin_members.html")


@app.route("/api/auth/register", methods=["POST"], strict_slashes=False)
def api_register():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    password_confirm = data.get("password_confirm") or ""
    if not username or not password:
        return jsonify({"error": "아이디와 비밀번호를 입력하세요."}), 400
    if password != password_confirm:
        return jsonify({"error": "비밀번호가 일치하지 않습니다."}), 400
    if username == _ADMIN_USERNAME:
        return jsonify({"error": "이미 사용 중인 아이디입니다."}), 400
    if not supabase:
        return _post_error("DB 미설정")
    try:
        res = supabase.table("users").select("id").eq("username", username).execute()
        if res.data and len(res.data) > 0:
            return jsonify({"error": "이미 사용 중인 아이디입니다."}), 400
        password_hash = generate_password_hash(password)
        supabase.table("users").insert({
            "username": username,
            "password_hash": password_hash,
        }).execute()
        return jsonify({"ok": True}), 201
    except Exception as e:
        err = str(e).lower()
        if "unique" in err or "duplicate" in err:
            return jsonify({"error": "이미 사용 중인 아이디입니다."}), 400
        return _post_error(e)


@app.route("/api/auth/login", methods=["POST"], strict_slashes=False)
def api_login():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "아이디와 비밀번호를 입력하세요."}), 400
    if username == _ADMIN_USERNAME:
        if check_password_hash(_ADMIN_PASSWORD_HASH, password):
            session["user_id"] = -1
            session["username"] = username
            session["is_admin"] = True
            return jsonify({"ok": True, "is_admin": True})
        return jsonify({"error": "아이디 또는 비밀번호가 올바르지 않습니다."}), 401
    if not supabase:
        return _post_error("DB 미설정")
    try:
        res = supabase.table("users").select("id,password_hash,is_blacklisted").eq(
            "username", username
        ).execute()
        rows = res.data or []
        if not rows:
            return jsonify({"error": "아이디 또는 비밀번호가 올바르지 않습니다."}), 401
        row = rows[0]
        if row.get("is_blacklisted"):
            return jsonify({"error": "블랙리스트로 지정되어 로그인할 수 없습니다."}), 403
        if not check_password_hash(row.get("password_hash", ""), password):
            return jsonify({"error": "아이디 또는 비밀번호가 올바르지 않습니다."}), 401
        session["user_id"] = row["id"]
        session["username"] = username
        session["is_admin"] = False
        return jsonify({"ok": True, "is_admin": False})
    except Exception as e:
        return _post_error(e)


@app.route("/logout", strict_slashes=False)
@app.route("/api/auth/logout", methods=["POST"], strict_slashes=False)
def api_logout():
    session.clear()
    if request.method == "GET" or request.path == "/logout":
        return redirect(url_for("index"))
    return jsonify({"ok": True})


@app.route("/api/admin/members", methods=["GET"], strict_slashes=False)
def api_admin_members():
    if not session.get("is_admin"):
        return jsonify({"error": "권한이 없습니다."}), 403
    if not supabase:
        return _post_error("DB 미설정")
    try:
        res = supabase.table("users").select(
            "id,username,is_blacklisted,created_at"
        ).neq("username", _ADMIN_USERNAME).order("created_at", desc=True).execute()
        members = []
        for i, row in enumerate(res.data or []):
            members.append({
                "id": row["id"],
                "number": i + 1,
                "username": row.get("username", ""),
                "is_blacklisted": row.get("is_blacklisted", False),
                "created_at": _fmt_dt(row.get("created_at")),
            })
        return jsonify({"members": members})
    except Exception as e:
        return _post_error(e)


@app.route("/api/admin/members/<int:member_id>/blacklist", methods=["PUT"], strict_slashes=False)
def api_admin_blacklist(member_id):
    if not session.get("is_admin"):
        return jsonify({"error": "권한이 없습니다."}), 403
    data = request.get_json() or {}
    blacklist = data.get("blacklist", True)
    if not supabase:
        return _post_error("DB 미설정")
    try:
        supabase.table("users").update({"is_blacklisted": bool(blacklist)}).eq(
            "id", member_id
        ).neq("username", _ADMIN_USERNAME).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return _post_error(e)


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
    logged_user = session.get("username")
    author = (data.get("author") or "").strip()
    password = data.get("password") or ""
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    if logged_user:
        author = logged_user
        password_hash = ""
        user_id = session.get("user_id") if session.get("user_id", -1) > 0 else None
    else:
        if not author or not password or not title:
            return jsonify({"error": "글쓴이, 비밀번호, 제목은 필수입니다."}), 400
        password_hash = generate_password_hash(password)
        user_id = None
    if not title:
        return jsonify({"error": "제목은 필수입니다."}), 400
    try:
        payload = {
            "author": author,
            "password_hash": password_hash,
            "title": title,
            "content": content,
        }
        if user_id is not None:
            payload["user_id"] = user_id
        ins = supabase.table("posts").insert(payload).execute()
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
        res = supabase.table("posts").select("id,author,title,content,created_at,user_id").eq(
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
            "user_id": row.get("user_id"),
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
        res = supabase.table("posts").select("author,password_hash,user_id").eq(
            "id", post_id
        ).execute()
        rows = res.data or []
        if not rows:
            return jsonify({"error": "Not found"}), 404
        row = rows[0]
        author = row.get("author", "")
        logged_user = session.get("username")
        if logged_user and author == logged_user:
            pass
        else:
            stored = row.get("password_hash")
            if not stored or not check_password_hash(stored, password):
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
        res = supabase.table("posts").select("author,password_hash").eq(
            "id", post_id
        ).execute()
        rows = res.data or []
        if not rows:
            return jsonify({"error": "Not found"}), 404
        row = rows[0]
        author = row.get("author", "")
        logged_user = session.get("username")
        is_admin = session.get("is_admin", False)
        if is_admin:
            pass
        elif logged_user and author == logged_user:
            pass
        else:
            stored = row.get("password_hash")
            if not stored or not check_password_hash(stored, password):
                return jsonify({"error": "비밀번호가 일치하지 않습니다."}), 403
        supabase.table("posts").delete().eq("id", post_id).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return _post_error(e)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"\n  TestSvr API: http://127.0.0.1:{port}/api/health\n  Ctrl+C 로 종료\n")
    app.run(host="0.0.0.0", port=port)
