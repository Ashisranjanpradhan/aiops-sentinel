from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, ValidationError
from app.models.entities import Dataset
from app.schemas.domain import DatasetCreate, DatasetResponse


class DatasetService:
    async def list_datasets(
        self, db: AsyncSession, page: int = 1, page_size: int = 20
    ) -> tuple[list[DatasetResponse], int]:
        query = select(Dataset)
        count_res = await db.execute(select(func.count()).select_from(Dataset))
        total = count_res.scalar_one()

        query = (
            query.order_by(Dataset.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await db.execute(query)
        datasets = result.scalars().all()

        responses = [
            DatasetResponse(
                id=d.id,
                name=d.name,
                version=d.version,
                source_url=d.source_url,
                license_note=d.license_note,
                usage_restrictions=d.usage_restrictions,
                modalities_json=d.modalities_json or [],
                checksum_manifest=d.checksum_manifest,
                status=d.status,
                manifest_path=d.manifest_path,
                created_at=d.created_at,
                validated_at=d.validated_at,
            )
            for d in datasets
        ]
        return responses, total

    async def get_dataset(self, db: AsyncSession, dataset_id: str) -> DatasetResponse:
        result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
        d = result.scalar_one_or_none()
        if not d:
            raise NotFoundError("Dataset", dataset_id)

        return DatasetResponse(
            id=d.id,
            name=d.name,
            version=d.version,
            source_url=d.source_url,
            license_note=d.license_note,
            usage_restrictions=d.usage_restrictions,
            modalities_json=d.modalities_json or [],
            checksum_manifest=d.checksum_manifest,
            status=d.status,
            manifest_path=d.manifest_path,
            created_at=d.created_at,
            validated_at=d.validated_at,
        )

    async def register_dataset(self, db: AsyncSession, data: DatasetCreate) -> Dataset:
        # Check mandatory governance fields (Section 4.6 & 7.3 K)
        if not data.source_url.strip():
            raise ValidationError("Dataset source_url is required.")
        if not data.license_note.strip():
            raise ValidationError(
                "License and permitted use terms must be explicitly recorded before import."
            )

        dataset = Dataset(
            name=data.name.strip(),
            version=data.version.strip(),
            source_url=data.source_url.strip(),
            license_note=data.license_note.strip(),
            usage_restrictions=data.usage_restrictions.strip(),
            modalities_json=data.modalities_json,
            checksum_manifest=data.checksum_manifest
            or "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            status="ready",
            manifest_path=data.manifest_path
            or f"manifests/{data.name.lower()}_{data.version}.json",
            validated_at=datetime.now(UTC),
        )
        db.add(dataset)
        await db.commit()
        await db.refresh(dataset)
        return dataset


dataset_service = DatasetService()
