import json
import logging
from typing import List, Optional
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from .models import WasteRegistration, Report, Location, User

logger = logging.getLogger(__name__)


def date_to_quarter(date_str: str) -> str:
    """Convert YYYY-MM-DD to YYYY-Qn."""
    year, month, _ = date_str.split("-")
    q = (int(month) - 1) // 3 + 1
    return f"{year}-Q{q}"


class DatabaseConnection:
    def __init__(self, database_url: str):
        logger.info("connecting to database at %s", database_url)
        self.engine = create_engine(
            database_url,
            echo=False,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
        )
        self.SessionLocal = sessionmaker(bind=self.engine)
        self._init_schema()

    def _init_schema(self) -> None:
        with self.engine.connect() as conn:
            # Create users table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    is_admin INTEGER NOT NULL DEFAULT 0,
                    is_super_admin INTEGER NOT NULL DEFAULT 0,
                    password TEXT,
                    created_at TEXT NOT NULL
                )
            """))

            # Create locations table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS locations (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """))

            # Create location_users table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS location_users (
                    location_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    PRIMARY KEY (location_id, user_id),
                    FOREIGN KEY (location_id) REFERENCES locations(id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """))

            # Create registrations table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS registrations (
                    id TEXT PRIMARY KEY,
                    location_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    entries TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    FOREIGN KEY (location_id) REFERENCES locations(id)
                )
            """))

            # Create index on registrations
            try:
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_registrations_location_date
                    ON registrations(location_id, date)
                """))
            except Exception:
                pass

            # Create reports table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS reports (
                    period TEXT NOT NULL,
                    location_id TEXT NOT NULL,
                    id TEXT NOT NULL,
                    submitted_at TEXT NOT NULL,
                    submitted_by TEXT NOT NULL,
                    PRIMARY KEY (period, location_id),
                    FOREIGN KEY (location_id) REFERENCES locations(id)
                )
            """))

            conn.commit()


class UserStorage:
    def __init__(self, db: DatabaseConnection):
        self.engine = db.engine
        self.SessionLocal = db.SessionLocal

    def _get_session(self):
        return self.SessionLocal()

    def create_user(self, user_id: str, is_admin: bool, password: Optional[str] = None, is_super_admin: bool = False) -> None:
        with self.engine.connect() as conn:
            created_at = datetime.utcnow().isoformat()
            conn.execute(text("""
                INSERT INTO users (id, is_admin, is_super_admin, password, created_at)
                VALUES (:id, :is_admin, :is_super_admin, :password, :created_at)
            """), {
                "id": user_id,
                "is_admin": 1 if is_admin else 0,
                "is_super_admin": 1 if is_super_admin else 0,
                "password": password,
                "created_at": created_at
            })
            conn.commit()
            logger.debug("created user %s (is_admin=%s, is_super_admin=%s)", user_id, is_admin, is_super_admin)

    def get_user(self, user_id: str) -> Optional[User]:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, is_admin, is_super_admin FROM users WHERE id = :id
            """), {"id": user_id})
            row = result.fetchone()
            if row:
                return User(id=row[0], isAdmin=bool(row[1]), isSuperAdmin=bool(row[2]))
        return None

    def user_exists(self, user_id: str) -> bool:
        with self.engine.connect() as conn:
            result = conn.execute(text("SELECT 1 FROM users WHERE id = :id"), {"id": user_id})
            return result.fetchone() is not None

    def check_password(self, user_id: str, password: str) -> bool:
        with self.engine.connect() as conn:
            result = conn.execute(text("SELECT password FROM users WHERE id = :id"), {"id": user_id})
            row = result.fetchone()
            return bool(row and row[0] == password) if row else False

    def list_users(self) -> List[User]:
        with self.engine.connect() as conn:
            result = conn.execute(text("SELECT id, is_admin, is_super_admin FROM users ORDER BY id"))
            return [
                User(id=row[0], isAdmin=bool(row[1]), isSuperAdmin=bool(row[2]))
                for row in result.fetchall()
            ]

    def delete_user(self, user_id: str) -> None:
        with self.engine.connect() as conn:
            conn.execute(text("DELETE FROM location_users WHERE user_id = :id"), {"id": user_id})
            conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
            conn.commit()
            logger.debug("deleted user %s", user_id)

    def create_location(self, name: str) -> str:
        with self.engine.connect() as conn:
            result = conn.execute(text("SELECT MAX(CAST(id AS INTEGER)) FROM locations"))
            row = result.fetchone()
            next_id = str((row[0] or 0) + 1)
            created_at = datetime.utcnow().isoformat()
            conn.execute(text("""
                INSERT INTO locations (id, name, created_at) VALUES (:id, :name, :created_at)
            """), {"id": next_id, "name": name, "created_at": created_at})
            conn.commit()
            logger.debug("created location %s (%s)", next_id, name)
            return next_id

    def location_name_exists(self, name: str) -> bool:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 1 FROM locations WHERE LOWER(name) = LOWER(:name)
            """), {"name": name})
            return result.fetchone() is not None

    def get_location_by_name(self, name: str) -> Optional[Location]:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, name, created_at FROM locations WHERE LOWER(name) = LOWER(:name)
            """), {"name": name})
            row = result.fetchone()
            return Location(id=row[0], name=row[1], createdAt=row[2]) if row else None

    def get_location(self, location_id: str) -> Optional[Location]:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, name, created_at FROM locations WHERE id = :id
            """), {"id": location_id})
            row = result.fetchone()
            if row:
                return Location(id=row[0], name=row[1], createdAt=row[2])
        return None

    def list_locations(self) -> List[Location]:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, name, created_at FROM locations ORDER BY created_at DESC
            """))
            return [
                Location(id=row[0], name=row[1], createdAt=row[2])
                for row in result.fetchall()
            ]

    def location_exists(self, location_id: str) -> bool:
        with self.engine.connect() as conn:
            result = conn.execute(text("SELECT 1 FROM locations WHERE id = :id"), {"id": location_id})
            return result.fetchone() is not None

    def delete_location(self, location_id: str) -> None:
        with self.engine.connect() as conn:
            conn.execute(text("DELETE FROM location_users WHERE location_id = :id"), {"id": location_id})
            conn.execute(text("DELETE FROM locations WHERE id = :id"), {"id": location_id})
            conn.commit()
            logger.debug("deleted location %s", location_id)

    def add_user_to_location(self, location_id: str, user_id: str) -> None:
        with self.engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO location_users (location_id, user_id) VALUES (:location_id, :user_id)
            """), {"location_id": location_id, "user_id": user_id})
            conn.commit()
            logger.debug("added user %s to location %s", user_id, location_id)

    def remove_user_from_location(self, location_id: str, user_id: str) -> bool:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                DELETE FROM location_users WHERE location_id = :location_id AND user_id = :user_id
            """), {"location_id": location_id, "user_id": user_id})
            conn.commit()
            return result.rowcount > 0

    def location_has_access(self, location_id: str, user_id: str) -> bool:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 1 FROM location_users WHERE location_id = :location_id AND user_id = :user_id
            """), {"location_id": location_id, "user_id": user_id})
            return result.fetchone() is not None

    def get_user_locations(self, user_id: str) -> List[Location]:
        user = self.get_user(user_id)
        with self.engine.connect() as conn:
            if user and user.isSuperAdmin:
                result = conn.execute(text("SELECT id, name, created_at FROM locations ORDER BY created_at DESC"))
            else:
                result = conn.execute(text("""
                    SELECT l.id, l.name, l.created_at FROM locations l
                    INNER JOIN location_users lu ON l.id = lu.location_id
                    WHERE lu.user_id = :user_id
                    ORDER BY l.created_at DESC
                """), {"user_id": user_id})
            return [
                Location(id=row[0], name=row[1], createdAt=row[2])
                for row in result.fetchall()
            ]

    def list_users_in_location(self, location_id: str) -> List[str]:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT user_id FROM location_users WHERE location_id = :location_id ORDER BY user_id
            """), {"location_id": location_id})
            return [row[0] for row in result.fetchall()]


class DataStorage:
    def __init__(self, db: DatabaseConnection):
        self.engine = db.engine

    def _row_to_registration(self, row) -> WasteRegistration:
        return WasteRegistration(
            id=row[0],
            date=row[2],
            entries=json.loads(row[3]),
            createdAt=row[4],
            updatedAt=row[5],
            createdBy=row[6],
        )

    def list_registrations(
        self,
        location_id: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> List[WasteRegistration]:
        with self.engine.connect() as conn:
            sql = "SELECT * FROM registrations WHERE location_id = :location_id"
            params = {"location_id": location_id}
            if date_from is not None:
                sql += " AND date >= :date_from"
                params["date_from"] = date_from
            if date_to is not None:
                sql += " AND date <= :date_to"
                params["date_to"] = date_to
            sql += " ORDER BY date DESC"
            logger.debug("list_registrations location=%s from=%s to=%s", location_id, date_from, date_to)
            result = conn.execute(text(sql), params)
            return [self._row_to_registration(r) for r in result.fetchall()]

    def get_registration(self, location_id: str, id_: str) -> Optional[WasteRegistration]:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT * FROM registrations WHERE location_id = :location_id AND id = :id
            """), {"location_id": location_id, "id": id_})
            row = result.fetchone()
            return self._row_to_registration(row) if row else None

    def get_registration_by_date(self, location_id: str, date_: str) -> Optional[WasteRegistration]:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT * FROM registrations WHERE location_id = :location_id AND date = :date LIMIT 1
            """), {"location_id": location_id, "date": date_})
            row = result.fetchone()
            return self._row_to_registration(row) if row else None

    def insert_registration(self, location_id: str, reg: WasteRegistration) -> None:
        with self.engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO registrations (id, location_id, date, entries, created_at, updated_at, created_by)
                VALUES (:id, :location_id, :date, :entries, :created_at, :updated_at, :created_by)
            """), {
                "id": reg.id,
                "location_id": location_id,
                "date": reg.date,
                "entries": json.dumps([e.model_dump() for e in reg.entries]),
                "created_at": reg.createdAt,
                "updated_at": reg.updatedAt,
                "created_by": reg.createdBy,
            })
            conn.commit()
            logger.debug("inserted registration %s to location %s", reg.id, location_id)

    def update_registration(self, location_id: str, reg: WasteRegistration) -> bool:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                UPDATE registrations
                SET date = :date, entries = :entries, created_at = :created_at, updated_at = :updated_at, created_by = :created_by
                WHERE location_id = :location_id AND id = :id
            """), {
                "date": reg.date,
                "entries": json.dumps([e.model_dump() for e in reg.entries]),
                "created_at": reg.createdAt,
                "updated_at": reg.updatedAt,
                "created_by": reg.createdBy,
                "location_id": location_id,
                "id": reg.id,
            })
            conn.commit()
            return result.rowcount > 0

    def delete_registration(self, location_id: str, id_: str) -> bool:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                DELETE FROM registrations WHERE location_id = :location_id AND id = :id
            """), {"location_id": location_id, "id": id_})
            conn.commit()
            return result.rowcount > 0

    def _row_to_report(self, row) -> Report:
        return Report(
            id=row[2],
            period=row[0],
            submittedAt=row[3],
            submittedBy=row[4],
        )

    def list_reports(self, location_id: str) -> List[Report]:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT * FROM reports WHERE location_id = :location_id ORDER BY period DESC
            """), {"location_id": location_id})
            return [self._row_to_report(r) for r in result.fetchall()]

    def get_report(self, location_id: str, period: str) -> Optional[Report]:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT * FROM reports WHERE location_id = :location_id AND period = :period
            """), {"location_id": location_id, "period": period})
            row = result.fetchone()
            return self._row_to_report(row) if row else None

    def insert_report(self, location_id: str, report: Report) -> None:
        with self.engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO reports (period, location_id, id, submitted_at, submitted_by)
                VALUES (:period, :location_id, :id, :submitted_at, :submitted_by)
            """), {
                "period": report.period,
                "location_id": location_id,
                "id": report.id,
                "submitted_at": report.submittedAt,
                "submitted_by": report.submittedBy,
            })
            conn.commit()
            logger.debug("inserted report %s to location %s", report.period, location_id)

    def delete_report(self, location_id: str, period: str) -> bool:
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                DELETE FROM reports WHERE location_id = :location_id AND period = :period
            """), {"location_id": location_id, "period": period})
            conn.commit()
            return result.rowcount > 0

    def is_period_locked(self, location_id: str, period: str) -> bool:
        return self.get_report(location_id, period) is not None

    def is_date_locked(self, location_id: str, date_: str) -> bool:
        return self.is_period_locked(location_id, date_to_quarter(date_))

    def delete_registrations_for_location(self, location_id: str) -> None:
        with self.engine.connect() as conn:
            conn.execute(text("DELETE FROM registrations WHERE location_id = :location_id"), {"location_id": location_id})
            conn.commit()
            logger.debug("deleted all registrations for location %s", location_id)

    def delete_reports_for_location(self, location_id: str) -> None:
        with self.engine.connect() as conn:
            conn.execute(text("DELETE FROM reports WHERE location_id = :location_id"), {"location_id": location_id})
            conn.commit()
            logger.debug("deleted all reports for location %s", location_id)
