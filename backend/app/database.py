from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None


async def connect_db():
    global client
    client = AsyncIOMotorClient(
        settings.MONGO_URI,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=10000,
        waitQueueTimeoutMS=5000,
    )
    await client.admin.command("ping")
    print(f"[OK] URI being used: {settings.MONGO_URI[:40]}...", flush=True)


async def close_db():
    global client
    if client:
        client.close()


async def get_database():
    db = client[settings.DB_NAME]
    return db


async def create_indexes(db):
    """Create MongoDB indexes on startup."""
    await db.users.create_index("email", unique=True)
    await db.users.create_index("skills")
    await db.teams.create_index("owner_id")
    await db.teams.create_index("status")
    await db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.connection_requests.create_index([("from_user_id", 1), ("to_user_id", 1)])
