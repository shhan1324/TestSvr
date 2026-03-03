# TestSvr 웹서비스 분석 보고서

> 분석 일자: 2026-03-03
> 분석 대상: `C:\project\TestSvr`

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [디렉토리 구조](#2-디렉토리-구조)
3. [기술 스택](#3-기술-스택)
4. [아키텍처](#4-아키텍처)
5. [데이터베이스 모델](#5-데이터베이스-모델)
6. [API 엔드포인트](#6-api-엔드포인트)
7. [인증 및 보안](#7-인증-및-보안)
8. [게임 기능](#8-게임-기능)
9. [배포 설정](#9-배포-설정)
10. [보안 취약점 및 개선 권장사항](#10-보안-취약점-및-개선-권장사항)

---

## 1. 프로젝트 개요

**TestSvr**은 Flask 기반의 풀스택 웹 애플리케이션으로, 게시판 커뮤니티와 미니 게임을 통합한 서비스입니다.

| 항목 | 내용 |
|------|------|
| 프레임워크 | Flask 3.0+ (Python) |
| 데이터베이스 | Supabase (PostgreSQL) |
| 배포 플랫폼 | Render (render.yaml) |
| 실행 포트 | 5001 (기본값) |
| 주요 기능 | 게시판, 회원관리, 지뢰찾기, 타임스탑 게임 |

---

## 2. 디렉토리 구조

```
C:\project\TestSvr
├── app.py                      # 메인 애플리케이션 (Flask, 551줄)
├── requirements.txt            # Python 의존성
├── supabase_init.sql           # DB 스키마 초기화 SQL
├── render.yaml                 # Render 배포 설정
├── run.bat                     # Windows 로컬 실행 스크립트
├── .gitignore
├── README.md
├── templates/                  # Jinja2 HTML 템플릿
│   ├── base.html               # 공통 레이아웃 (네비게이션)
│   ├── index.html              # 게시판 목록
│   ├── write.html              # 글쓰기
│   ├── post.html               # 게시글 상세
│   ├── login.html              # 로그인
│   ├── register.html           # 회원가입
│   ├── admin_members.html      # 관리자 회원관리
│   ├── minesweeper.html        # 지뢰찾기 게임
│   └── timestop.html           # 타임스탑 게임
└── static/
    ├── css/
    │   ├── board.css           # 게시판 반응형 스타일
    │   └── minesweeper.css     # 지뢰찾기 스타일
    └── js/
        ├── minesweeper.js      # 지뢰찾기 게임 로직 (~500줄)
        └── timestop.js         # 타임스탑 게임 로직 (~100줄)
```

---

## 3. 기술 스택

### 백엔드

| 항목 | 버전 | 용도 |
|------|------|------|
| Python | 3.x | 언어 |
| Flask | ≥3.0.0 | 웹 프레임워크 |
| flask-cors | ≥4.0.0 | CORS 처리 |
| gunicorn | ≥21.0.0 | WSGI 서버 (배포용) |
| supabase-py | ≥2.0.0 | DB 클라이언트 |
| Werkzeug | ≥3.0.0 | 비밀번호 해싱 |

### 프론트엔드

| 항목 | 버전 | 용도 |
|------|------|------|
| Bootstrap | 5.3.2 (CDN) | UI 프레임워크 |
| Vanilla JS | - | 클라이언트 로직 |
| Fetch API | - | REST API 통신 |
| Noto Sans KR | CDN | 한국어 폰트 |

### 인프라

| 항목 | 내용 |
|------|------|
| 데이터베이스 | Supabase (관리형 PostgreSQL) |
| 배포 플랫폼 | Render.com |
| 로컬 실행 | run.bat (Python 3.10~3.14 자동 감지) |

---

## 4. 아키텍처

### 전체 구조 (MVC 패턴)

```
┌──────────────────────────────────────┐
│          클라이언트 (브라우저)         │
│    Bootstrap 5 반응형 + Vanilla JS    │
└──────────────┬───────────────────────┘
               │ HTTP / REST API
               ▼
┌──────────────────────────────────────┐
│          Flask 웹 프레임워크           │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ before_request (로그인 검증)   │  │
│  ├────────────────────────────────┤  │
│  │ 웹 라우트   /  /write  /post   │  │
│  │ API 라우트  /api/*             │  │
│  ├────────────────────────────────┤  │
│  │ 세션 관리 (user_id, is_admin)  │  │
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │ Supabase SDK
               ▼
┌──────────────────────────────────────┐
│     Supabase (PostgreSQL Backend)    │
│  users / posts / game_records        │
└──────────────────────────────────────┘
```

### 계층별 역할

| 계층 | 담당 | 구현 위치 |
|------|------|-----------|
| Model | 데이터 접근 | Supabase SDK (app.py) |
| View | UI 렌더링 | templates/*.html + static/* |
| Controller | 비즈니스 로직 | Flask 라우트 함수 (app.py) |

---

## 5. 데이터베이스 모델

### users

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | 사용자 고유 ID |
| username | TEXT UNIQUE | 로그인 아이디 |
| password_hash | TEXT | Werkzeug 해시 |
| is_blacklisted | BOOLEAN | 차단 여부 (기본: false) |
| created_at | TIMESTAMPTZ | 가입 일시 (UTC) |

### posts

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | 게시글 고유 ID |
| author | TEXT | 글쓴이 |
| password_hash | TEXT | 비로그인 수정/삭제용 |
| title | TEXT | 제목 |
| content | TEXT | 본문 |
| user_id | BIGINT FK→users | 로그인 사용자 ID (NULL 가능) |
| created_at | TIMESTAMPTZ | 작성 일시 |

### minesweeper_records

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | 기록 ID |
| user_id | BIGINT FK→users | 사용자 ID |
| username | TEXT | 아이디 스냅샷 |
| level | SMALLINT | 난이도 (1~6) |
| created_at | TIMESTAMPTZ | 클리어 일시 |

### timestop_records

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | 기록 ID |
| user_id | BIGINT FK→users | 사용자 ID |
| username | TEXT | 아이디 스냅샷 |
| stop_time | NUMERIC(5,2) | 정지 시간 (0.00~30.00) |
| created_at | TIMESTAMPTZ | 기록 일시 |

### 관계도

```
users (1) ──── (N) posts
users (1) ──── (N) minesweeper_records
users (1) ──── (N) timestop_records
```

---

## 6. API 엔드포인트

### 웹 페이지 라우트

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/` | 게시판 메인 | 로그인 필수 |
| GET | `/write` | 글쓰기 페이지 | 로그인 필수 |
| GET | `/post/<id>` | 게시글 상세 | 로그인 필수 |
| GET | `/minesweeper` | 지뢰찾기 게임 | 로그인 필수 |
| GET | `/timestop` | 타임스탑 게임 | 로그인 필수 |
| GET | `/login` | 로그인 페이지 | 비로그인만 |
| GET | `/register` | 회원가입 페이지 | 비로그인만 |
| GET | `/logout` | 로그아웃 | 공개 |
| GET | `/admin/members` | 회원관리 페이지 | admin만 |

### 인증 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/auth/register` | 회원가입 | 공개 |
| POST | `/api/auth/login` | 로그인 | 공개 |
| POST | `/api/auth/logout` | 로그아웃 | 공개 |

#### POST /api/auth/register
```json
// 요청
{ "username": "string", "password": "string", "password_confirm": "string" }
// 응답
{ "ok": true }  // 201
```

#### POST /api/auth/login
```json
// 요청
{ "username": "string", "password": "string" }
// 응답
{ "ok": true, "is_admin": false }
```

### 게시판 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/posts?page=1&limit=15` | 목록 조회 (페이징) | 로그인 필수 |
| POST | `/api/posts` | 게시글 작성 | 로그인 필수 |
| GET | `/api/posts/<id>` | 게시글 상세 | 로그인 필수 |
| PUT | `/api/posts/<id>` | 게시글 수정 | 로그인 필수 |
| DELETE | `/api/posts/<id>` | 게시글 삭제 | 로그인 필수 |

#### GET /api/posts 응답 예시
```json
{
  "posts": [
    { "id": 1, "number": 10, "author": "홍길동", "title": "제목", "created_at": "2026-03-03 10:30:00" }
  ],
  "total": 10
}
```

### 관리자 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/admin/members` | 회원 목록 | admin만 |
| PUT | `/api/admin/members/<id>/blacklist` | 블랙리스트 설정 | admin만 |

### 게임 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/minesweeper/ranking` | 지뢰찾기 랭킹 (상위 5) | 공개 |
| POST | `/api/minesweeper/record` | 클리어 기록 저장 | 로그인 필수 |
| GET | `/api/timestop/ranking` | 타임스탑 랭킹 (상위 5) | 공개 |
| POST | `/api/timestop/record` | 타임스탑 기록 저장 | 로그인 필수 |

### 헬스 체크

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/health` | 서버 상태 확인 |
| GET | `/api/db-check` | Supabase 연결 확인 |

---

## 7. 인증 및 보안

### 인증 방식

- **세션 기반**: Flask 기본 서버 세션 사용
- **세션 데이터**: `user_id`, `username`, `is_admin`
- **비밀번호 해싱**: Werkzeug (`generate_password_hash` / `check_password_hash`)

### 관리자 계정

```python
_ADMIN_USERNAME = "admin"
_ADMIN_PASSWORD_HASH = generate_password_hash(os.environ.get("ADMIN_PASSWORD", "admin123"))
```

- DB에 저장되지 않고 메모리에만 존재
- `ADMIN_PASSWORD` 환경변수로 설정 (배포 시 필수 변경)

### 접근 제어

| 미들웨어/데코레이터 | 적용 범위 |
|---|---|
| `@app.before_request` | 모든 요청 (로그인 면제 경로 제외) |
| `@_admin_required` | 관리자 전용 라우트 |

**로그인 면제 경로**: `/login`, `/register`, `/logout`, `/api/auth/*`, `/api/health`, `/static/*`

### 환경변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `SECRET_KEY` | Flask 세션 암호화 키 | `dev-secret-key-change-in-production` |
| `SUPABASE_URL` | Supabase 프로젝트 URL | 없음 (필수) |
| `SUPABASE_KEY` | Supabase 익명 키 | 없음 (필수) |
| `ADMIN_PASSWORD` | 관리자 비밀번호 | `admin123` |
| `PORT` | 실행 포트 | `5001` |

### XSS 방지

```javascript
function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;  // 텍스트로 처리 → XSS 방지
    return div.innerHTML;
}
```

---

## 8. 게임 기능

### 지뢰찾기

| 레벨 | 행 | 열 | 지뢰 수 |
|------|----|----|---------|
| 1 | 10 | 10 | 10 |
| 2 | 20 | 20 | 20 |
| 3 | 30 | 30 | 30 |
| 4 | 10 | 10 | 20 |
| 5 | 20 | 20 | 64 |
| 6 | 30 | 30 | 145 |

**조작 방법**:
- 탭 (0.4초 이내): 셀 열기
- 롱프레스 (0.4초 이상): 깃발 설정 팝업
- 우클릭: 깃발 설정

**랭킹 기준**: 레벨 높은 순 → 최신 순 (상위 5명)

### 타임스탑

- 0.00초부터 카운트, 최대 30초 자동 정지
- 목표: 10.00초 정확히 정지
- **10.00초 정확 (±0.01초)**: 특별 메시지 표시
- **랭킹 기준**: 10.00초와의 거리가 가까운 순 (상위 5명)

---

## 9. 배포 설정

### Render 배포 (render.yaml)

```yaml
services:
  - type: web
    name: testsvr
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
```

### 배포 체크리스트

- [ ] `SUPABASE_URL` 환경변수 설정
- [ ] `SUPABASE_KEY` 환경변수 설정
- [ ] `SECRET_KEY` 강력한 랜덤 값으로 변경
- [ ] `ADMIN_PASSWORD` 안전한 비밀번호로 변경
- [ ] `supabase_init.sql` 실행 후 테이블 확인
- [ ] `GET /api/health` 응답 확인
- [ ] `GET /api/db-check` 응답 확인

### 로컬 실행 (Windows)

```batch
# run.bat 실행 (Python 3.10~3.14 자동 감지, 의존성 자동 설치)
run.bat

# 또는 수동 실행
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...
set SECRET_KEY=your-secret-key
set ADMIN_PASSWORD=your-admin-password
python app.py
```

### 로컬 실행 (Linux/Mac)

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...
export SECRET_KEY=your-secret-key
export ADMIN_PASSWORD=your-admin-password
python app.py
```

---

## 10. 보안 취약점 및 개선 권장사항

### 현재 보안 문제점

| 심각도 | 항목 | 문제 | 해결책 |
|--------|------|------|--------|
| 높음 | 기본 SECRET_KEY | 하드코딩된 기본값 | 배포 시 환경변수로 강력한 랜덤 키 설정 |
| 높음 | 기본 ADMIN_PASSWORD | `admin123` | 배포 시 반드시 변경 |
| 중간 | CORS 과도 허용 | 모든 도메인 허용 | `origins=["https://yourdomain.com"]`으로 제한 |
| 낮음 | 비밀번호 강도 검증 없음 | 짧은 비밀번호 허용 | 최소 길이/복잡도 규칙 추가 |
| 낮음 | RLS 미적용 | Supabase 행 수준 보안 미설정 | 테이블별 RLS 정책 추가 |

### 추가 개선 권장사항

1. **자동화 테스트**: pytest 기반 테스트 작성 (현재 없음)
   ```
   tests/
   ├── test_auth.py
   ├── test_posts.py
   ├── test_admin.py
   └── test_games.py
   ```

2. **API 문서화**: Swagger/OpenAPI 또는 Flask-RESTX 도입

3. **입력 검증 강화**: WTForms 또는 Pydantic 활용

4. **로깅 시스템**: Python logging 모듈로 구조화된 로그

5. **캐싱**: Redis 활용 (랭킹 등 자주 조회되는 데이터)

6. **Rate Limiting**: Flask-Limiter로 API 요청 제한

---

## 부록: 주요 함수 목록 (app.py)

| 함수 | 줄 번호 | 설명 |
|------|---------|------|
| `_fmt_dt()` | ~34 | UTC → KST 변환 (YYYY-MM-DD HH:mm:ss) |
| `_fmt_date_yyyymmdd()` | ~46 | UTC → KST 변환 (YYYYMMDD) |
| `inject_user()` | ~48 | 템플릿에 사용자 정보 주입 |
| `_admin_required()` | ~56 | 관리자 권한 데코레이터 |
| `_require_login()` | ~73 | 로그인 필수 미들웨어 |
| `_create_post()` | ~412 | 게시글 작성 |
| `_get_password_hash()` | ~476 | 게시글 비밀번호 해시 조회 |
| `_update_post()` | ~484 | 게시글 수정 |
| `_delete_post()` | ~518 | 게시글 삭제 |
