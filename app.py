import os
from flask import Flask, jsonify

app = Flask(__name__)


@app.route("/api/health")
def health():
    return jsonify({"message": "정상입니다"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"\n  TestSvr API: http://127.0.0.1:{port}/api/health\n  Ctrl+C 로 종료\n")
    app.run(host="0.0.0.0", port=port)
