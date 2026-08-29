# from fastapi import APIRouter, Depends, HTTPException, Request
# from typing import Optional, List
# from bson import ObjectId
# from app.database import get_database

# router = APIRouter(tags=["home"])


# # ── Helpers (same pattern as discover.py) ──────────────────

# def _ser(doc) -> dict:
#     if not doc:
#         return None
#     doc["id"] = str(doc.pop("_id", None))
#     for k in ("owner_id", "user_id"):
#         if k in doc and doc[k] is not None:
#             doc[k] = str(doc[k])
#     if "member_ids" in doc:
#         doc["member_ids"] = [str(m) for m in doc["member_ids"] if m]
#     if "password_hash" in doc:
#         del doc["password_hash"]
#     return doc


# def _skills(doc) -> list:
#     s = doc.get("skills", [])
#     if isinstance(s, str):
#         s = [x.strip() for x in s.split(",") if x.strip()]
#     return s if isinstance(s, list) else []


# async def _try_get_user(request: Request, db) -> Optional[dict]:
#     try:
#         auth_header = request.headers.get("Authorization")
#         if not auth_header or not auth_header.startswith("Bearer "):
#             return None
#         token = auth_header.split(" ")[1]
#         payload = None

#         try:
#             import jwt as pyjwt
#             payload = pyjwt.decode(token, options={"verify_signature": False})
#         except Exception:
#             pass

#         if not payload:
#             try:
#                 import base64, json
#                 parts = token.split(".")
#                 if len(parts) >= 2:
#                     padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
#                     payload = json.loads(base64.urlsafe_b64decode(padded))
#             except Exception:
#                 pass

#         if not payload:
#             return None

#         uid = payload.get("sub") or payload.get("user_id") or payload.get("id")
#         if not uid:
#             return None

#         if uid and "@" in str(uid):
#             user = await db.users.find_one({"email": str(uid).strip().lower()}, {"password_hash": 0})
#         else:
#             try:
#                 user = await db.users.find_one({"_id": ObjectId(uid)}, {"password_hash": 0})
#             except Exception:
#                 user = await db.users.find_one({"_id": uid}, {"password_hash": 0})

#         if not user:
#             return None

#         user["id"] = str(user["_id"])
#         return user
#     except Exception:
#         return None


# def _match_score(current: dict, target: dict) -> int:
#     cur = set(_skills(current))
#     tgt = set(_skills(target))
#     score = 0.0
#     if tgt and cur:
#         score += (len(cur & tgt) / len(tgt)) * 60
#     cd = (current.get("department") or "").lower()
#     td = (target.get("department") or "").lower()
#     if cd and td and cd == td:
#         score += 20
#     cs = current.get("semester")
#     ts = target.get("semester")
#     if cs is not None and ts is not None:
#         try:
#             score += max(0, 20 - abs(int(cs) - int(ts)) * 5)
#         except (ValueError, TypeError):
#             pass
#     return min(100, int(score))


# # ── Endpoints ──────────────────────────────────────────────

# @router.get("/home/stats")
# async def get_home_stats(
#     request: Request,
#     db=Depends(get_database),
# ):
#     current_user = await _try_get_user(request, db)
#     if not current_user:
#         raise HTTPException(status_code=401, detail="Authentication required")

#     uid = ObjectId(current_user["id"])
#     stats = {"projects_joined": 0, "teammates": 0, "messages": 0, "invitations": 0}

#     # Projects joined: owner or member
#     try:
#         stats["projects_joined"] = await db.teams.count_documents({
#             "$or": [{"owner_id": uid}, {"member_ids": uid}]
#         })
#     except Exception:
#         pass

#     # Teammates: accepted connections
#     try:
#         stats["teammates"] = await db.connection_requests.count_documents({
#             "$or": [
#                 {"from_user_id": uid, "status": "accepted"},
#                 {"to_user_id": uid, "status": "accepted"},
#             ]
#         })
#     except Exception:
#         pass

#     # Messages: count in user's conversations
#     try:
#         convs = await db.conversations.find(
#             {"participants": uid}, {"_id": 1}
#         ).to_list(length=200)
#         if convs:
#             conv_ids = [c["_id"] for c in convs]
#             stats["messages"] = await db.messages.count_documents(
#                 {"conversation_id": {"$in": conv_ids}}
#             )
#     except Exception:
#         pass

#     # Pending invitations received
#     try:
#         stats["invitations"] = await db.connection_requests.count_documents({
#             "to_user_id": uid,
#             "status": "pending"
#         })
#     except Exception:
#         pass

#     return stats


# @router.get("/home/recommended-teammates")
# async def get_recommended_teammates(
#     request: Request,
#     db=Depends(get_database),
# ):
#     current_user = await _try_get_user(request, db)
#     if not current_user:
#         raise HTTPException(status_code=401, detail="Authentication required")

#     uid = ObjectId(current_user["id"])

#     # Collect IDs to exclude: self + connected + pending-sent
#     exclude_ids = {uid}

#     try:
#         connected = await db.connection_requests.find(
#             {
#                 "$or": [{"from_user_id": uid}, {"to_user_id": uid}],
#                 "status": {"$in": ["accepted", "pending"]}
#             },
#             {"from_user_id": 1, "to_user_id": 1}
#         ).to_list(length=300)
#         for c in connected:
#             fid = c.get("from_user_id")
#             tid = c.get("to_user_id")
#             if fid:
#                 exclude_ids.add(fid)
#             if tid:
#                 exclude_ids.add(tid)
#     except Exception:
#         pass

#     # Fetch candidates
#     try:
#         candidates = await db.users.find(
#             {"_id": {"$nin": list(exclude_ids)}},
#             {"password_hash": 0}
#         ).to_list(length=60)
#     except Exception:
#         return []

#     # Score and sort
#     scored = []
#     for c in candidates:
#         doc = _ser(c)
#         doc["skills"] = _skills(doc)
#         doc["match_score"] = _match_score(current_user, doc)
#         scored.append(doc)

#     scored.sort(key=lambda x: x.get("match_score", 0), reverse=True)
#     return scored[:6]


# @router.get("/home/recent-projects")
# async def get_recent_projects(
#     request: Request,
#     db=Depends(get_database),
# ):
#     """Global — no auth needed, shows latest 5 projects."""
#     pipeline = [
#         {"$addFields": {"_mc": {"$size": {"$ifNull": ["$member_ids", []]}}}},
#         {"$sort": {"created_at": -1}},
#         {"$limit": 5},
#     ]

#     try:
#         docs = await db.teams.aggregate(pipeline).to_list(length=5)
#     except Exception:
#         return []

#     results = []
#     for d in docs:
#         doc = _ser(d)
#         # Title fallback
#         if not doc.get("title"):
#             doc["title"] = doc.get("name") or doc.get("project_name") or "Untitled Project"
#         doc["skills"] = _skills(doc)
#         doc["member_count"] = doc.pop("_mc", 0)
#         doc["max_members"] = doc.get("max_members") or 5
#         results.append(doc)

#     # Batch fetch owner names
#     oids = list({r.get("owner_id") for r in results if r.get("owner_id")})
#     owner_map = {}
#     if oids:
#         try:
#             obj_ids = [ObjectId(o) for o in oids]
#             owners = await db.users.find(
#                 {"_id": {"$in": obj_ids}}, {"name": 1}
#             ).to_list(length=len(obj_ids))
#             owner_map = {str(o["_id"]): o.get("name", "Unknown") for o in owners}
#         except Exception:
#             pass

#     for r in results:
#         r["owner_name"] = owner_map.get(str(r.get("owner_id", "")), "Unknown")

#     return results


# @router.get("/home/trending-skills")
# async def get_trending_skills(
#     db=Depends(get_database),
# ):
#     """Global — no auth needed, aggregates skills from all users."""
#     pipeline = [
#         # Normalize skills to array (handles string or list)
#         {
#             "$addFields": {
#                 "skills_array": {
#                     "$cond": {
#                         "if": {"$isArray": "$skills"},
#                         "then": "$skills",
#                         "else": {
#                             "$split": [
#                                 {"$toString": {"$ifNull": ["$skills", ""]}},
#                                 ","
#                             ]
#                         }
#                     }
#                 }
#             }
#         },
#         {"$unwind": "$skills_array"},
#         {"$addFields": {"skills_array": {"$trim": {"input": "$skills_array"}}}},
#         {"$match": {"skills_array": {"$ne": ""}}},
#         {"$group": {"_id": "$skills_array", "count": {"$sum": 1}}},
#         {"$sort": {"count": -1}},
#         {"$limit": 8},
#     ]

#     try:
#         result = await db.users.aggregate(pipeline).to_list(length=8)
#     except Exception:
#         return []

#     return [{"name": r["_id"], "count": r["count"]} for r in result]
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, List
from bson import ObjectId
from app.database import get_database

router = APIRouter(tags=["home"])


# ── Helpers (same pattern as discover.py) ──────────────────

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


async def _try_get_user(request: Request, db) -> Optional[dict]:
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        token = auth_header.split(" ")[1]
        payload = None

        try:
            import jwt as pyjwt
            payload = pyjwt.decode(token, options={"verify_signature": False})
        except Exception:
            pass

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

        if uid and "@" in str(uid):
            user = await db.users.find_one({"email": str(uid).strip().lower()}, {"password_hash": 0})
        else:
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


def _match_score(current: dict, target: dict) -> int:
    cur = set(_skills(current))
    tgt = set(_skills(target))
    score = 0.0
    if tgt and cur:
        score += (len(cur & tgt) / len(tgt)) * 60
    cd = (current.get("department") or "").lower()
    td = (target.get("department") or "").lower()
    if cd and td and cd == td:
        score += 20
    cs = current.get("semester")
    ts = target.get("semester")
    if cs is not None and ts is not None:
        try:
            score += max(0, 20 - abs(int(cs) - int(ts)) * 5)
        except (ValueError, TypeError):
            pass
    return min(100, int(score))


def _build_match_reasons(current: dict, candidate: dict) -> list:
    """Generate human-readable reasons why a candidate is recommended."""
    reasons = []
    cur_skills = set(_skills(current))
    cand_skills = set(_skills(candidate))
    cur_dept = (current.get("department") or "").lower().strip()
    cand_dept = (candidate.get("department") or "").lower().strip()
    cur_sem = current.get("semester")
    cand_sem = candidate.get("semester")

    # Shared skills
    shared = cur_skills & cand_skills
    if shared:
        reasons.append({
            "type": "shared_skills",
            "label": "Shared Skills",
            "icon": "zap",
            "value": sorted(shared)[:4],
        })

    # Same department
    if cur_dept and cand_dept and cur_dept == cand_dept:
        reasons.append({
            "type": "same_department",
            "label": "Same Department",
            "icon": "map_pin",
            "value": candidate.get("department", ""),
        })

    # Close semester
    if cur_sem is not None and cand_sem is not None:
        try:
            diff = abs(int(cur_sem) - int(cand_sem))
            if diff == 0:
                reasons.append({
                    "type": "same_semester",
                    "label": "Same Semester",
                    "icon": "clock",
                    "value": f"Semester {cand_sem}",
                })
            elif diff <= 2:
                reasons.append({
                    "type": "close_semester",
                    "label": "Similar Year",
                    "icon": "clock",
                    "value": f"Semester {cand_sem}",
                })
        except (ValueError, TypeError):
            pass

    # Complementary skills — skills the candidate has that the current user lacks
    complementary = cand_skills - cur_skills
    if complementary and len(complementary) >= 2:
        reasons.append({
            "type": "complementary_skills",
            "label": "Complementary Skills",
            "icon": "award",
            "value": sorted(complementary)[:3],
        })

    return reasons


# ── Endpoints ──────────────────────────────────────────────

@router.get("/home/stats")
async def get_home_stats(
    request: Request,
    db=Depends(get_database),
):
    current_user = await _try_get_user(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    uid = ObjectId(current_user["id"])
    stats = {"projects_joined": 0, "teammates": 0, "messages": 0, "invitations": 0}

    try:
        stats["projects_joined"] = await db.projects.count_documents({
            "$or": [{"owner_id": uid}, {"member_ids": uid}]
        })
    except Exception:
        pass

    try:
        stats["teammates"] = await db.connection_requests.count_documents({
            "$or": [
                {"from_user_id": uid, "status": "accepted"},
                {"to_user_id": uid, "status": "accepted"},
            ]
        })
    except Exception:
        pass

    try:
        convs = await db.conversations.find(
            {"participants": uid}, {"_id": 1}
        ).to_list(length=200)
        if convs:
            conv_ids = [c["_id"] for c in convs]
            stats["messages"] = await db.messages.count_documents(
                {"conversation_id": {"$in": conv_ids}}
            )
    except Exception:
        pass

    try:
        stats["invitations"] = await db.connection_requests.count_documents({
            "to_user_id": uid,
            "status": "pending"
        })
    except Exception:
        pass

    return stats


@router.get("/home/partner-recommendations")
async def get_partner_recommendations(
    request: Request,
    db=Depends(get_database),
):
    """Rich partner recommendations with match reasons."""
    current_user = await _try_get_user(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    uid = ObjectId(current_user["id"])

    # Collect IDs to exclude: self + connected + pending
    exclude_ids = {uid}
    try:
        connected = await db.connection_requests.find(
            {
                "$or": [{"from_user_id": uid}, {"to_user_id": uid}],
                "status": {"$in": ["accepted", "pending"]}
            },
            {"from_user_id": 1, "to_user_id": 1}
        ).to_list(length=300)
        for c in connected:
            fid = c.get("from_user_id")
            tid = c.get("to_user_id")
            if fid:
                exclude_ids.add(fid)
            if tid:
                exclude_ids.add(tid)
    except Exception:
        pass

    # Fetch candidates
    try:
        candidates = await db.users.find(
            {"_id": {"$nin": list(exclude_ids)}},
            {"password_hash": 0}
        ).to_list(length=120)
    except Exception:
        return []

    # Score, build reasons, sort
    results = []
    for c in candidates:
        doc = _ser(c)
        skills = _skills(doc)
        doc["skills"] = skills
        doc["match_score"] = _match_score(current_user, doc)
        doc["match_reasons"] = _build_match_reasons(current_user, doc)
        results.append(doc)

    results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    return results[:8]


@router.get("/home/recommended-teammates")
async def get_recommended_teammates(
    request: Request,
    db=Depends(get_database),
):
    """Kept for backward compatibility — lightweight version."""
    current_user = await _try_get_user(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    uid = ObjectId(current_user["id"])

    exclude_ids = {uid}
    try:
        connected = await db.connection_requests.find(
            {
                "$or": [{"from_user_id": uid}, {"to_user_id": uid}],
                "status": {"$in": ["accepted", "pending"]}
            },
            {"from_user_id": 1, "to_user_id": 1}
        ).to_list(length=300)
        for c in connected:
            fid = c.get("from_user_id")
            tid = c.get("to_user_id")
            if fid:
                exclude_ids.add(fid)
            if tid:
                exclude_ids.add(tid)
    except Exception:
        pass

    try:
        candidates = await db.users.find(
            {"_id": {"$nin": list(exclude_ids)}},
            {"password_hash": 0}
        ).to_list(length=60)
    except Exception:
        return []

    scored = []
    for c in candidates:
        doc = _ser(c)
        doc["skills"] = _skills(doc)
        doc["match_score"] = _match_score(current_user, doc)
        scored.append(doc)

    scored.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    return scored[:6]


@router.get("/home/recent-projects")
async def get_recent_projects(
    request: Request,
    db=Depends(get_database),
):
    """Global — no auth needed, shows latest 5 projects."""
    pipeline = [
        {"$addFields": {"_mc": {"$size": {"$ifNull": ["$member_ids", []]}}}},
        {"$sort": {"created_at": -1}},
        {"$limit": 5},
    ]

    try:
        docs = await db.projects.aggregate(pipeline).to_list(length=5)
    except Exception:
        return []

    results = []
    for d in docs:
        doc = _ser(d)
        if not doc.get("title"):
            doc["title"] = doc.get("name") or doc.get("project_name") or "Untitled Project"
        doc["skills"] = _skills(doc)
        doc["member_count"] = doc.pop("_mc", 0)
        doc["max_members"] = doc.get("max_members") or 5
        results.append(doc)

    oids = list({r.get("owner_id") for r in results if r.get("owner_id")})
    owner_map = {}
    if oids:
        try:
            obj_ids = [ObjectId(o) for o in oids]
            owners = await db.users.find(
                {"_id": {"$in": obj_ids}}, {"name": 1}
            ).to_list(length=len(obj_ids))
            owner_map = {str(o["_id"]): o.get("name", "Unknown") for o in owners}
        except Exception:
            pass

    for r in results:
        r["owner_name"] = owner_map.get(str(r.get("owner_id", "")), "Unknown")

    return results


@router.get("/home/trending-skills")
async def get_trending_skills(
    db=Depends(get_database),
):
    """Global — no auth needed, aggregates skills from all users."""
    pipeline = [
        {
            "$addFields": {
                "skills_array": {
                    "$cond": {
                        "if": {"$isArray": "$skills"},
                        "then": "$skills",
                        "else": {
                            "$split": [
                                {"$toString": {"$ifNull": ["$skills", ""]}},
                                ","
                            ]
                        }
                    }
                }
            }
        },
        {"$unwind": "$skills_array"},
        {"$addFields": {"skills_array": {"$trim": {"input": "$skills_array"}}}},
        {"$match": {"skills_array": {"$ne": ""}}},
        {"$group": {"_id": "$skills_array", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]

    try:
        result = await db.users.aggregate(pipeline).to_list(length=8)
    except Exception:
        return []

    return [{"name": r["_id"], "count": r["count"]} for r in result]