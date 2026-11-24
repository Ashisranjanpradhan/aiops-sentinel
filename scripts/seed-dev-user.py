import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
)

from app.core.config import settings
from app.db.session import AsyncSessionLocal, init_db
from app.services.seed_service import seed_demo_data


async def seed():
    env = getattr(settings, "APP_ENV", getattr(settings, "ENVIRONMENT", "development"))
    if env.lower() in ("production", "staging"):
        print(
            "SECURITY ABORT: Refusing to seed default development accounts in production or staging environment."
        )
        sys.exit(1)

    print("Initializing database tables...")
    await init_db()

    async with AsyncSessionLocal() as db:
        print("Seeding demo microservices, topology, incidents, alerts, and experiments...")
        result = await seed_demo_data(db, force=True)
        print(f"Seeding completed successfully: {result}")


if __name__ == "__main__":
    asyncio.run(seed())
