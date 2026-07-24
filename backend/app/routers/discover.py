# # app/routers/discover.py
# """
# Discover router – search students & projects (teams).
# Adjust the get_current_user import to match your auth module.
# """

# from fastapi import APIRouter, Depends, Query, HTTPException
# from typing import Optional, List
# from bson import ObjectId
# from app.database import get_database

# router = APIRouter(tags=["discover"])

# try:
#     from app.routers.auth import get_current_user
# except ImportError:
#     async def get_current_user(db=Depends(get_database)):
#         raise HTTPException(status_code=401, detail="Auth not configured")


# def _serialize(doc) -> dict:
#     if doc is None:
#         return None
#     doc["id"] = str(doc.pop("_id", None))
#     # Convert nested ObjectIds (e.g. owner_id in teams)
#     for key in ("owner_id", "user_id"):
#         if key in doc and isinstance(doc[key], ObjectId):
#             doc[key] = str(doc[key])
#     if "member_ids" in doc:
#         doc["member_ids"] = [str(m) for m in doc["member_ids"] if isinstance(m, ObjectId)]
#     return doc


# def _calc_match(current: dict, target: dict) -> int:
#     """Simple skill-overlap + department/semester match score (0-100)."""
#     score = 0.0
#     cur_skills = set(current.get("skills", []) or [])
#     tgt_skills = set(target.get("skills", []) or [])

#     # Skill overlap → up to 60 pts
#     if tgt_skills:
#         overlap = len(cur_skills & tgt_skills)
#         score += (overlap / len(tgt_skills)) * 60

#     # Same department → 20 pts
#     if current.get("department") and target.get("department"):
#         if current["department"].lower() == target["department"].lower():
#             score += 20

#     # Semester proximity → up to 20 pts
#     cur_sem = current.get("semester")
#     tgt_sem = target.get("semester")
#     if cur_sem and tgt_sem:
#         score += max(0, 20 - abs(cur_sem - tgt_sem) * 5)

#     return min(100, int(score))


# def _build_student_query(
#     search: Optional[str],
#     department: Optional[str],
#     semester: Optional[int],
#     skills: Optional[List[str]],
#     exclude_id: str,
# ) -> dict:
#     q: dict = {"_id": {"$ne": ObjectId(exclude_id)}}
#     if search:
#         q["$or"] = [
#             {"name": {"$regex": search, "$options": "i"}},
#             {"skills": {"$regex": search, "$options": "i"}},
#             {"department": {"$regex": search, "$options": "i"}},
#         ]
#     if department:
#         q["department"] = {"$regex": f"^{department}$", "$options": "i"}
#     if semester is not None:
#         q["semester"] = semester
#     if skills:
#         q["skills"] = {"$all": [s.strip() for s in skills if s.strip()]}
#     return q


# def _build_project_query(
#     search: Optional[str],
#     status: Optional[str],
#     skills: Optional[List[str]],
# ) -> dict:
#     q: dict = {}
#     if search:
#         q["$or"] = [
#             {"title": {"$regex": search, "$options": "i"}},
#             {"description": {"$regex": search, "$options": "i"}},
#             {"skills": {"$regex": search, "$options": "i"}},
#         ]
#     if status:
#         q["status"] = status
#     if skills:
#         q["skills"] = {"$all": [s.strip() for s in skills if s.strip()]}
#     return q


# # ── Endpoints ───────────────────────────────────────────────

# @router.get("/discover/students")
# async def search_students(
#     search: Optional[str] = Query(None, max_length=100),
#     department: Optional[str] = Query(None, max_length=100),
#     semester: Optional[int] = Query(None, ge=1, le=12),
#     skills: Optional[List[str]] = Query(None),
#     page: int = Query(1, ge=1),
#     limit: int = Query(12, ge=1, le=50),
#     sort: str = Query("relevance", regex="^(relevance|name_asc|name_desc|semester_asc|semester_desc)$"),
#     db=Depends(get_database),
#     current_user=Depends(get_current_user),
# ):
#     """Search & filter students, sorted by match relevance by default."""
#     query = _build_student_query(search, department, semester, skills, current_user["id"])
#     total = await db.users.count_documents(query)

#     # Sorting
#     if sort == "relevance":
#         sort_key = "name"  # fallback; we re-sort by match below
#         sort_dir = 1
#     elif sort == "name_asc":
#         sort_key, sort_dir = "name", 1
#     elif sort == "name_desc":
#         sort_key, sort_dir = "name", -1
#     elif sort == "semester_asc":
#         sort_key, sort_dir = "semester", 1
#     else:
#         sort_key, sort_dir = "semester", -1

#     skip = (page - 1) * limit
#     cursor = db.users.find(query).sort(sort_key, sort_dir).skip(skip).limit(limit)
#     docs = await cursor.to_list(length=limit)
#     results = [_serialize(d) for d in docs]

#     # Attach match score when sorting by relevance
#     if sort == "relevance":
#         for r in results:
#             r["match_score"] = _calc_match(current_user, r)
#         results.sort(key=lambda x: x["match_score"], reverse=True)

#     pages = max(1, (total + limit - 1) // limit)
#     return {"results": results, "total": total, "page": page, "limit": limit, "pages": pages}


# @router.get("/discover/projects")
# async def search_projects(
#     search: Optional[str] = Query(None, max_length=200),
#     status: Optional[str] = Query(None, regex="^(Recruiting|In Progress|Completed)$"),
#     skills: Optional[List[str]] = Query(None),
#     page: int = Query(1, ge=1),
#     limit: int = Query(12, ge=1, le=50),
#     sort: str = Query("newest", regex="^(relevance|newest|members_asc|members_desc)$"),
#     db=Depends(get_database),
#     current_user=Depends(get_current_user),
# ):
#     """Search & filter projects (teams)."""
#     query = _build_project_query(search, status, skills)
#     total = await db.teams.count_documents(query)

#     sort_map = {
#         "newest": ("created_at", -1),
#         "members_asc": ("member_count", 1),
#         "members_desc": ("member_count", -1),
#         "relevance": ("created_at", -1),
#     }
#     sort_key, sort_dir = sort_map.get(sort, ("created_at", -1))

#     skip = (page - 1) * limit
#     cursor = db.teams.find(query).sort(sort_key, sort_dir).skip(skip).limit(limit)
#     docs = await cursor.to_list(length=limit)
#     results = [_serialize(d) for d in docs]

#     # Compute member_count if stored as array
#     for r in results:
#         r["member_count"] = len(r.get("member_ids", []))

#     pages = max(1, (total + limit - 1) // limit)
#     return {"results": results, "total": total, "page": page, "limit": limit, "pages": pages}


# @router.get("/discover/meta")
# async def discover_meta(
#     db=Depends(get_database),
#     current_user=Depends(get_current_user),
# ):
#     """Return available departments, semesters, and top skills for filter dropdowns."""
#     departments = await db.users.distinct("department")
#     departments = sorted([d for d in departments if d])

#     semesters = sorted(await db.users.distinct("semester"))
#     semesters = [s for s in semesters if isinstance(s, int)]

#     # Top 20 most common skills
#     pipeline = [
#         {"$unwind": "$skills"},
#         {"$group": {"_id": "$skills", "count": {"$sum": 1}}},
#         {"$sort": {"count": -1}},
#         {"$limit": 20},
#     ]
#     skill_docs = await db.users.aggregate(pipeline).to_list(length=20)
#     skills = [s["_id"] for s in skill_docs if s["_id"]]

#     return {"departments": departments, "semesters": semesters, "skills": skills}

# app/routers/discover.py
from fastapi import APIRouter, Depends, Query, Request
from typing import Optional, List
from bson import ObjectId
from app.database import get_database

router = APIRouter(tags=["discover"])


# ── Optional auth — never blocks the request ───────────────

async def _try_get_user(request: Request, db) -> Optional[dict]:
    """Best-effort user lookup. Returns None on any failure."""
    try:
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        token = auth[7:]
        if not token:
            return None

        payload = None

        # Try python-jose
        try:
            from jose import jwt
            from app.config import settings
            secret = getattr(settings, "JWT_SECRET", None) or getattr(settings, "SECRET_KEY", None) or getattr(settings, "JWT_SECRET_KEY", None)
            if secret:
                payload = jwt.decode(token, secret, algorithms=["HS256"])
            else:
                payload = jwt.decode(token, options={"verify_signature": False})
        except Exception:
            pass

        # Try PyJWT
        if not payload:
            try:
                import jwt as pyjwt
                from app.config import settings
                secret = getattr(settings, "JWT_SECRET", None) or getattr(settings, "SECRET_KEY", None) or getattr(settings, "JWT_SECRET_KEY", None)
                if secret:
                    payload = pyjwt.decode(token, secret, algorithms=["HS256"])
                else:
                    payload = pyjwt.decode(token, options={"verify_signature": False})
            except Exception:
                pass

        # Raw base64 fallback
        if not payload:
            try:
                import base64, json
                parts = token.split(".")
                if len(parts) >= 2:
                    padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(padded))
            except Exception:
                pass

        if not payload:
            return None

        uid = payload.get("sub") or payload.get("user_id") or payload.get("id")
        if not uid:
            return None

        try:
            user = await db.users.find_one({"_id": ObjectId(uid)}, {"password_hash": 0})
        except Exception:
            user = await db.users.find_one({"_id": uid}, {"password_hash": 0})

        if not user:
            return None

        user["id"] = str(user["_id"])
        return user

    except Exception:
        return None


# ── Helpers ─────────────────────────────────────────────────

def _ser(doc) -> dict:
    if not doc:
        return None
    doc["id"] = str(doc.pop("_id", None))
    for k in ("owner_id", "user_id"):
        if k in doc and doc[k] is not None:
            doc[k] = str(doc[k])
    if "member_ids" in doc:
        doc["member_ids"] = [str(m) for m in doc["member_ids"] if m]
    if "password_hash" in doc:
        del doc["password_hash"]
    return doc


def _skills(doc) -> list:
    s = doc.get("skills", [])
    if isinstance(s, str):
        s = [x.strip() for x in s.split(",") if x.strip()]
    return s if isinstance(s, list) else []


def _match(current: dict, target: dict) -> int:
    cur = set(current.get("skills") or [])
    tgt = set(_skills(target))
    score = 0.0
    if tgt:
        score += (len(cur & tgt) / len(tgt)) * 60
    cd = (current.get("department") or "").lower()
    td = (target.get("department") or "").lower()
    if cd and td and cd == td:
        score += 20
    cs = current.get("semester")
    ts = target.get("semester")
    if cs is not None and ts is not None:
        score += max(0, 20 - abs(int(cs) - int(ts)) * 5)
    return min(100, int(score))


# ── Endpoints ───────────────────────────────────────────────

@router.get("/discover/students")
async def search_students(
    request: Request,
    search: Optional[str] = Query(None, max_length=100),
    department: Optional[str] = Query(None, max_length=100),
    semester: Optional[int] = Query(None, ge=1, le=12),
    skills: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    sort: str = Query("relevance"),
    db=Depends(get_database),
):
    current_user = await _try_get_user(request, db)

    q: dict = {}
    if current_user:
        q["_id"] = {"$ne": ObjectId(current_user["id"])}

    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"skills": {"$regex": search, "$options": "i"}},
            {"department": {"$regex": search, "$options": "i"}},
        ]
    if department:
        q["department"] = {"$regex": "^" + department + "$", "$options": "i"}
    if semester is not None:
        q["semester"] = semester
    if skills:
        clean = [s.strip() for s in skills if s.strip()]
        if clean:
            q["skills"] = {"$all": clean}

    total = await db.users.count_documents(q)

    sort_map = {
        "relevance": ("name", 1),
        "name_asc": ("name", 1),
        "name_desc": ("name", -1),
        "semester_asc": ("semester", 1),
        "semester_desc": ("semester", -1),
    }
    sk, sd = sort_map.get(sort, ("name", 1))
    skip = (page - 1) * limit

    cursor = db.users.find(q, {"password_hash": 0}).sort(sk, sd).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    results = [_ser(d) for d in docs]

    for r in results:
        r["skills"] = _skills(r)

    if sort == "relevance" and current_user:
        for r in results:
            r["match_score"] = _match(current_user, r)
        results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    else:
        for r in results:
            r["match_score"] = 0

    pages = max(1, (total + limit - 1) // limit)
    return {"results": results, "total": total, "page": page, "limit": limit, "pages": pages}


@router.get("/discover/projects")
async def search_projects(
    request: Request,
    search: Optional[str] = Query(None, max_length=200),
    status: Optional[str] = Query(None),
    skills: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    sort: str = Query("newest"),
    db=Depends(get_database),
):
    q: dict = {}
    if search:
        q["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"skills": {"$regex": search, "$options": "i"}},
        ]
    if status:
        q["status"] = status
    if skills:
        clean = [s.strip() for s in skills if s.strip()]
        if clean:
            q["skills"] = {"$all": clean}

    total = await db.teams.count_documents(q)

    sort_map = {
        "newest": ("created_at", -1),
        "relevance": ("created_at", -1),
        "members_asc": ("_mc", 1),
        "members_desc": ("_mc", -1),
    }
    sk, sd = sort_map.get(sort, ("created_at", -1))

    pipeline = []
    if q:
        pipeline.append({"$match": q})
    pipeline.append({"$addFields": {"_mc": {"$size": {"$ifNull": ["$member_ids", []]}}}})
    pipeline.append({"$sort": {sk: sd}})
    pipeline.append({"$skip": (page - 1) * limit})
    pipeline.append({"$limit": limit})

    docs = await db.teams.aggregate(pipeline).to_list(length=limit)
    results = [_ser(d) for d in docs]

    for r in results:
        r["skills"] = _skills(r)
        r["member_count"] = r.pop("_mc", 0)
        r["max_members"] = r.get("max_members") or 5

    # Batch owner names
    oids = list({r.get("owner_id") for r in results if r.get("owner_id")})
    owner_map = {}
    if oids:
        try:
            obj_ids = [ObjectId(o) for o in oids]
            owners = await db.users.find({"_id": {"$in": obj_ids}}, {"name": 1}).to_list(length=len(obj_ids))
            owner_map = {str(o["_id"]): o.get("name", "Unknown") for o in owners}
        except Exception:
            pass
    for r in results:
        r["owner_name"] = owner_map.get(str(r.get("owner_id", "")), "Unknown")

    pages = max(1, (total + limit - 1) // limit)
    return {"results": results, "total": total, "page": page, "limit": limit, "pages": pages}


@router.get("/discover/meta")
async def discover_meta(
    request: Request,
    db=Depends(get_database),
):
    departments = await db.users.distinct("department")
    departments = sorted([d for d in departments if d])

    semesters = await db.users.distinct("semester")
    semesters = sorted([int(s) for s in semesters if isinstance(s, (int, float))])

    pipeline = [
        {"$unwind": {"path": "$skills", "preserveNullAndEmptyArrays": False}},
        {"$group": {"_id": "$skills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]
    skill_docs = await db.users.aggregate(pipeline).to_list(length=20)
    skills = [s["_id"] for s in skill_docs if s["_id"]]

    return {"departments": departments, "semesters": semesters, "skills": skills}