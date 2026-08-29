from fastapi import APIRouter, Depends, Query, HTTPException, Request
from typing import Optional, List
from bson import ObjectId
from app.database import get_database

router = APIRouter(tags=["discover"])

try:
    from app.routers.auth import get_current_user
except ImportError:
    async def get_current_user(db=Depends(get_database)):
        raise HTTPException(status_code=401, detail="Auth not configured")


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


CATEGORIZED_SKILLS = {
    "Computer Science & IT": [
        "React", "Node.js", "Python", "FastAPI", "MongoDB", "Figma", "UI/UX",
        "Next.js", "Express.js", "SQL", "JavaScript", "TypeScript", "HTML/CSS",
        "Tailwind CSS", "Git", "Docker", "AWS", "Java", "Spring Boot", "C++", 
        "C#", "Dart", "Flutter", "React Native", "Swift", "Kotlin"
    ],
    "Business & Finance (ACCA/CA)": [
        "Financial Accounting", "Management Accounting", "Financial Reporting",
        "Taxation", "Auditing", "Corporate Finance", "Excel (Advanced)",
        "QuickBooks", "SAP", "Financial Analysis", "Cost Accounting",
        "Strategic Planning", "Risk Management", "Business Strategy",
        "Investment Banking", "Portfolio Management", "Audit Assurance",
        "Double-Entry Bookkeeping", "IFRS", "GAAP", "Tally ERP"
    ],
    "Medical & Health (MBBS)": [
        "Anatomy", "Physiology", "Biochemistry", "Pharmacology", "Pathology",
        "Microbiology", "Forensic Medicine", "Community Medicine", "Medicine",
        "Surgery", "Pediatrics", "Obstetrics & Gynecology", "Clinical Diagnostics",
        "Patient Care", "Medical Research", "Surgical Assistance", "First Aid / CPR",
        "ECG Interpretation", "Health Informatics", "Lab Reporting"
    ],
    "Arts & Creative": [
        "Graphic Design", "Illustration", "UI/UX Design", "Figma", "Adobe Photoshop",
        "Adobe Illustrator", "Adobe InDesign", "Adobe Premiere Pro", "Adobe After Effects",
        "3D Modeling", "Blender", "Maya", "Animation", "Fine Arts", "Digital Painting",
        "Sketching", "Typography", "Photography", "Video Editing", "Creative Writing",
        "CorelDraw", "Lightroom", "UX Research"
    ],
    "General / Engineering / Others": [
        "Technical Writing", "Project Management", "MATLAB", "AutoCAD",
        "SolidWorks", "LabVIEW", "Excel", "Data Analysis", "Communication",
        "Problem Solving", "Time Management", "Leadership", "Public Speaking",
        "Content Writing"
    ]
}


def _get_category_skills(user: dict) -> list:
    if not user:
        return CATEGORIZED_SKILLS["Computer Science & IT"]

    import re
    # Helper to check if any of the keywords match whole words in user fields
    def has_any_keyword(keywords):
        dept_words = set(re.findall(r'\b[a-z0-9\-]+\b', (user.get("department") or "").lower()))
        interest_words = set()
        for interest in (user.get("interests") or []):
            interest_words.update(re.findall(r'\b[a-z0-9\-]+\b', interest.lower()))
        
        all_words = dept_words.union(interest_words)
        return any(k.lower() in all_words for k in keywords)

    # 1. Tech & CS check (Checked first so CS students with UI/UX Design interests match CS)
    tech_keywords = ["computer", "software", "cs", "it", "developer", "web", "ai", "programming", "coding", "networks"]
    if has_any_keyword(tech_keywords):
        return CATEGORIZED_SKILLS["Computer Science & IT"]

    # 2. Medical & Health check
    medical_keywords = ["medical", "mbbs", "health", "medicine", "doctor", "anatomy", "physiology", "clinical", "surgery"]
    if has_any_keyword(medical_keywords):
        return CATEGORIZED_SKILLS["Medical & Health (MBBS)"]

    # 3. Business & Finance check
    business_keywords = ["business", "finance", "accounting", "acca", "ca", "tax", "audit", "management", "economics", "bba", "mba"]
    if has_any_keyword(business_keywords):
        return CATEGORIZED_SKILLS["Business & Finance (ACCA/CA)"]

    # 4. Arts & Creative check
    arts_keywords = ["art", "arts", "design", "graphic", "creative", "fine", "illustration", "fashion", "paint", "painting", "animation"]
    if has_any_keyword(arts_keywords):
        return CATEGORIZED_SKILLS["Arts & Creative"]

    # 5. Default
    return CATEGORIZED_SKILLS["General / Engineering / Others"]


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
        try:
            score += max(0, 20 - abs(int(cs) - int(ts)) * 5)
        except (ValueError, TypeError):
            pass
    return min(100, int(score))


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

        # Look up by email if sub is an email address, else by _id
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


@router.get("/discover/students")
async def search_students(
    request: Request,
    search: Optional[str] = Query(None, max_length=100),
    department: Optional[str] = Query(None, max_length=100),
    university: Optional[str] = Query(None, max_length=200),
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
            {"university": {"$regex": search, "$options": "i"}},
        ]
    if department:
        q["department"] = {"$regex": "^" + department + "$", "$options": "i"}
    if university:
        q["university"] = {"$regex": "^" + university + "$", "$options": "i"}
    if semester is not None:
        q["semester"] = {"$in": [semester, str(semester)]}
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

    total = await db.projects.count_documents(q)

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

    docs = await db.projects.aggregate(pipeline).to_list(length=limit)
    results = [_ser(d) for d in docs]

    for r in results:
        r["skills"] = _skills(r)
        r["member_count"] = r.pop("_mc", 0)
        r["max_members"] = r.get("max_members") or 5

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
    current_user = await _try_get_user(request, db)

    departments = await db.users.distinct("department")
    departments = sorted([d for d in departments if d])

    semesters = await db.users.distinct("semester")
    semesters = sorted([int(s) for s in semesters if isinstance(s, (int, float))])

    universities = await db.users.distinct("university")
    universities = sorted([u for u in universities if u])

    # Dynamic curated skills recommended based on student's field/profession category
    skills = _get_category_skills(current_user)

    return {"departments": departments, "semesters": semesters, "skills": skills, "universities": universities}