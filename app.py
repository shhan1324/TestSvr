import os
from flask import Flask, jsonify
from supabase import create_client

app = Flask(__name__)

# Supabase (환경변수: SUPABASE_URL, SUPABASE_KEY)
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None


@app.route("/api/health")
def health():
    return jsonify({"message": "정상입니다"})


@app.route("/api/db-check")
def db_check():
    """Supabase 연결 테스트"""
    if not supabase:
        return jsonify({"ok": False, "error": "SUPABASE_URL/SUPABASE_KEY 미설정"}), 500
    try:
        # 실제 테이블명으로 확인 (테이블 없으면 에러)
        result = supabase.table("health").select("1").limit(1).execute()
        return jsonify({"ok": True, "message": "Supabase 연결 정상"})
    except Exception as e:
        err = str(e).lower()
        if "relation" in err or "does not exist" in err:
            return jsonify({"ok": True, "message": "Supabase 연결됨 (health 테이블 없음)"})
        return jsonify({"ok": False, "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"\n  TestSvr API: http://127.0.0.1:{port}/api/health\n  Ctrl+C 로 종료\n")
    app.run(host="0.0.0.0", port=port)
