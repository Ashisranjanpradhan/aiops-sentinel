import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from sqlalchemy import delete
from app.db.session import AsyncSessionLocal
from app.models.entities import (
    Incident,
    IncidentEvidence,
    IncidentEvent,
    InvestigationJob,
    RootCauseCandidate,
    DeploymentEvent,
)


async def clean():
    print("Cleaning generated demo data...")
    async with AsyncSessionLocal() as db:
        await db.execute(delete(RootCauseCandidate))
        await db.execute(delete(InvestigationJob))
        await db.execute(delete(IncidentEvent))
        await db.execute(delete(IncidentEvidence))
        await db.execute(delete(Incident).where(Incident.source == "demo"))
        await db.execute(delete(DeploymentEvent))
        await db.commit()
    print("Demo data cleaned.")


if __name__ == "__main__":
    asyncio.run(clean())
