import json
import logging
import sqlite3
from typing import List, Optional
from .models import WasteRegistration, Report, Location, User

logger = logging.getLogger(__name__)


def date_to_quarter(date_str: str) -> str:
    """Convert YYYY-MM-DD to YYYY-Qn."""
    year, month, _ = date_str.split("-")
    q = (int(month) - 1) // 3 + 1
    return f"{year}-Q{q}"


class UserStorage:
    def __init__(self, path: str):
        logger.info("opening user sqlite database at %s", path)
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init()

    def _init(self) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                is_admin INTEGER NOT NULL DEFAULT 0,
                is_super_admin INTEGER NOT NULL DEFAULT 0,
                password TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        cur.execute("PRAGMA table_info(users)")
        columns = {row[1] for row in cur.fetchall()}
        if "password" not in columns:
            cur.execute("ALTER TABLE users ADD COLUMN password TEXT")
        if "is_super_admin" not in columns:
            cur.execute("ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0")
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS locations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS location_users (
                location_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                PRIMARY KEY (location_id, user_id),
                FOREIGN KEY (location_id) REFERENCES locations(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        self.conn.commit()

    # ---------- users ----------

    def create_user(self, user_id: str, is_admin: bool, password: Optional[str] = None, is_super_admin: bool = False) -> None:
        cur = self.conn.cursor()
        from datetime import datetime
        created_at = datetime.utcnow().isoformat()
        cur.execute(
            "INSERT INTO users (id, is_admin, is_super_admin, password, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, 1 if is_admin else 0, 1 if is_super_admin else 0, password, created_at),
        )
        self.conn.commit()
        logger.debug("created user %s (is_admin=%s, is_super_admin=%s)", user_id, is_admin, is_super_admin)

    def get_user(self, user_id: str) -> Optional[User]:
        cur = self.conn.cursor()
        cur.execute("SELECT id, is_admin, is_super_admin FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        if row:
            return User(id=row["id"], isAdmin=bool(row["is_admin"]), isSuperAdmin=bool(row["is_super_admin"]))
        return None

    def user_exists(self, user_id: str) -> bool:
        cur = self.conn.cursor()
        cur.execute("SELECT 1 FROM users WHERE id = ?", (user_id,))
        return cur.fetchone() is not None

    def check_password(self, user_id: str, password: str) -> bool:
        cur = self.conn.cursor()
        cur.execute("SELECT password FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        return row and row["password"] == password if row else False

    def list_users(self) -> List[User]:
        cur = self.conn.cursor()
        cur.execute("SELECT id, is_admin, is_super_admin FROM users ORDER BY id")
        return [
            User(id=row["id"], isAdmin=bool(row["is_admin"]), isSuperAdmin=bool(row["is_super_admin"]))
            for row in cur.fetchall()
        ]

    def delete_user(self, user_id: str) -> None:
        cur = self.conn.cursor()
        cur.execute("DELETE FROM location_users WHERE user_id = ?", (user_id,))
        cur.execute("DELETE FROM users WHERE id = ?", (user_id,))
        self.conn.commit()
        logger.debug("deleted user %s", user_id)

    # ---------- locations ----------

    def create_location(self, name: str) -> str:
        cur = self.conn.cursor()
        from datetime import datetime
        cur.execute("SELECT MAX(CAST(id AS INTEGER)) FROM locations")
        row = cur.fetchone()
        next_id = str((row[0] or 0) + 1)
        created_at = datetime.utcnow().isoformat()
        cur.execute(
            "INSERT INTO locations (id, name, created_at) VALUES (?, ?, ?)",
            (next_id, name, created_at),
        )
        self.conn.commit()
        logger.debug("created location %s (%s)", next_id, name)
        return next_id

    def location_name_exists(self, name: str) -> bool:
        cur = self.conn.cursor()
        cur.execute("SELECT 1 FROM locations WHERE LOWER(name) = LOWER(?)", (name,))
        return cur.fetchone() is not None

    def get_location_by_name(self, name: str) -> Optional[Location]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT id, name, created_at FROM locations WHERE LOWER(name) = LOWER(?)", (name,)
        )
        row = cur.fetchone()
        return Location(id=row["id"], name=row["name"], createdAt=row["created_at"]) if row else None

    def get_location(self, location_id: str) -> Optional[Location]:
        cur = self.conn.cursor()
        cur.execute("SELECT id, name, created_at FROM locations WHERE id = ?", (location_id,))
        row = cur.fetchone()
        if row:
            return Location(id=row["id"], name=row["name"], createdAt=row["created_at"])
        return None

    def list_locations(self) -> List[Location]:
        cur = self.conn.cursor()
        cur.execute("SELECT id, name, created_at FROM locations ORDER BY created_at DESC")
        return [
            Location(id=row["id"], name=row["name"], createdAt=row["created_at"])
            for row in cur.fetchall()
        ]

    def location_exists(self, location_id: str) -> bool:
        cur = self.conn.cursor()
        cur.execute("SELECT 1 FROM locations WHERE id = ?", (location_id,))
        return cur.fetchone() is not None

    def delete_location(self, location_id: str) -> None:
        cur = self.conn.cursor()
        cur.execute("DELETE FROM location_users WHERE location_id = ?", (location_id,))
        cur.execute("DELETE FROM locations WHERE id = ?", (location_id,))
        self.conn.commit()
        logger.debug("deleted location %s", location_id)

    # ---------- location_users ----------

    def add_user_to_location(self, location_id: str, user_id: str) -> None:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO location_users (location_id, user_id) VALUES (?, ?)",
            (location_id, user_id),
        )
        self.conn.commit()
        logger.debug("added user %s to location %s", user_id, location_id)

    def remove_user_from_location(self, location_id: str, user_id: str) -> bool:
        cur = self.conn.cursor()
        cur.execute(
            "DELETE FROM location_users WHERE location_id = ? AND user_id = ?",
            (location_id, user_id),
        )
        self.conn.commit()
        return cur.rowcount > 0

    def location_has_access(self, location_id: str, user_id: str) -> bool:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT 1 FROM location_users WHERE location_id = ? AND user_id = ?",
            (location_id, user_id),
        )
        return cur.fetchone() is not None

    def get_user_locations(self, user_id: str) -> List[Location]:
        cur = self.conn.cursor()
        user = self.get_user(user_id)
        if user and user.isSuperAdmin:
            return self.list_locations()
        cur.execute(
            """
            SELECT l.id, l.name, l.created_at FROM locations l
            INNER JOIN location_users lu ON l.id = lu.location_id
            WHERE lu.user_id = ?
            ORDER BY l.created_at DESC
            """,
            (user_id,),
        )
        return [
            Location(id=row["id"], name=row["name"], createdAt=row["created_at"])
            for row in cur.fetchall()
        ]

    def list_users_in_location(self, location_id: str) -> List[str]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT user_id FROM location_users WHERE location_id = ? ORDER BY user_id",
            (location_id,),
        )
        return [row["user_id"] for row in cur.fetchall()]



class DataStorage:
    def __init__(self, path: str):
        logger.info("opening data sqlite database at %s", path)
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init()

    def _init(self) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
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
            """
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_registrations_location_date ON registrations(location_id, date)"
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                period TEXT NOT NULL,
                location_id TEXT NOT NULL,
                id TEXT NOT NULL,
                submitted_at TEXT NOT NULL,
                submitted_by TEXT NOT NULL,
                PRIMARY KEY (period, location_id),
                FOREIGN KEY (location_id) REFERENCES locations(id)
            )
            """
        )
        self.conn.commit()

    # ---------- registrations ----------

    def _row_to_registration(self, row: sqlite3.Row) -> WasteRegistration:
        return WasteRegistration(
            id=row["id"],
            date=row["date"],
            entries=json.loads(row["entries"]),
            createdAt=row["created_at"],
            updatedAt=row["updated_at"],
            createdBy=row["created_by"],
        )

    def list_registrations(
        self,
        location_id: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> List[WasteRegistration]:
        cur = self.conn.cursor()
        sql = "SELECT * FROM registrations WHERE location_id = ?"
        params: list = [location_id]
        if date_from is not None:
            sql += " AND date >= ?"
            params.append(date_from)
        if date_to is not None:
            sql += " AND date <= ?"
            params.append(date_to)
        sql += " ORDER BY date DESC"
        logger.debug("list_registrations location=%s from=%s to=%s", location_id, date_from, date_to)
        cur.execute(sql, params)
        return [self._row_to_registration(r) for r in cur.fetchall()]

    def get_registration(self, location_id: str, id_: str) -> Optional[WasteRegistration]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM registrations WHERE location_id = ? AND id = ?",
            (location_id, id_),
        )
        row = cur.fetchone()
        return self._row_to_registration(row) if row else None

    def get_registration_by_date(self, location_id: str, date_: str) -> Optional[WasteRegistration]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM registrations WHERE location_id = ? AND date = ? LIMIT 1",
            (location_id, date_),
        )
        row = cur.fetchone()
        return self._row_to_registration(row) if row else None

    def insert_registration(self, location_id: str, reg: WasteRegistration) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT INTO registrations (id, location_id, date, entries, created_at, updated_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                reg.id,
                location_id,
                reg.date,
                json.dumps([e.model_dump() for e in reg.entries]),
                reg.createdAt,
                reg.updatedAt,
                reg.createdBy,
            ),
        )
        self.conn.commit()
        logger.debug("inserted registration %s to location %s", reg.id, location_id)

    def update_registration(self, location_id: str, reg: WasteRegistration) -> bool:
        cur = self.conn.cursor()
        cur.execute(
            """
            UPDATE registrations
            SET date = ?, entries = ?, created_at = ?, updated_at = ?, created_by = ?
            WHERE location_id = ? AND id = ?
            """,
            (
                reg.date,
                json.dumps([e.model_dump() for e in reg.entries]),
                reg.createdAt,
                reg.updatedAt,
                reg.createdBy,
                location_id,
                reg.id,
            ),
        )
        self.conn.commit()
        return cur.rowcount > 0

    def delete_registration(self, location_id: str, id_: str) -> bool:
        cur = self.conn.cursor()
        cur.execute(
            "DELETE FROM registrations WHERE location_id = ? AND id = ?",
            (location_id, id_),
        )
        self.conn.commit()
        return cur.rowcount > 0

    # ---------- reports ----------

    def _row_to_report(self, row: sqlite3.Row) -> Report:
        return Report(
            id=row["id"],
            period=row["period"],
            submittedAt=row["submitted_at"],
            submittedBy=row["submitted_by"],
        )

    def list_reports(self, location_id: str) -> List[Report]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM reports WHERE location_id = ? ORDER BY period DESC",
            (location_id,),
        )
        return [self._row_to_report(r) for r in cur.fetchall()]

    def get_report(self, location_id: str, period: str) -> Optional[Report]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM reports WHERE location_id = ? AND period = ?",
            (location_id, period),
        )
        row = cur.fetchone()
        return self._row_to_report(row) if row else None

    def insert_report(self, location_id: str, report: Report) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT INTO reports (period, location_id, id, submitted_at, submitted_by)
            VALUES (?, ?, ?, ?, ?)
            """,
            (report.period, location_id, report.id, report.submittedAt, report.submittedBy),
        )
        self.conn.commit()
        logger.debug("inserted report %s to location %s", report.period, location_id)

    def delete_report(self, location_id: str, period: str) -> bool:
        cur = self.conn.cursor()
        cur.execute(
            "DELETE FROM reports WHERE location_id = ? AND period = ?",
            (location_id, period),
        )
        self.conn.commit()
        return cur.rowcount > 0

    def is_period_locked(self, location_id: str, period: str) -> bool:
        return self.get_report(location_id, period) is not None

    def is_date_locked(self, location_id: str, date_: str) -> bool:
        return self.is_period_locked(location_id, date_to_quarter(date_))

    def delete_registrations_for_location(self, location_id: str) -> None:
        cur = self.conn.cursor()
        cur.execute("DELETE FROM registrations WHERE location_id = ?", (location_id,))
        self.conn.commit()
        logger.debug("deleted all registrations for location %s", location_id)

    def delete_reports_for_location(self, location_id: str) -> None:
        cur = self.conn.cursor()
        cur.execute("DELETE FROM reports WHERE location_id = ?", (location_id,))
        self.conn.commit()
        logger.debug("deleted all reports for location %s", location_id)
