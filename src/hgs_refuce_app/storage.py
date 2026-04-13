import sqlite3
from typing import Optional, List
from .models import DataPoint, DataPointInDB

class Storage:
    def __init__(self, path: str = "data.db"):
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self._init()

    def _init(self) -> None:
        cur = self.conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS datapoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                value REAL NOT NULL,
                timestamp TEXT
            )
        """)
        self.conn.commit()

    def add_datapoint(self, dp: DataPoint) -> DataPointInDB:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO datapoints (source, value, timestamp) VALUES (?, ?, ?)",
            (dp.source, dp.value, dp.timestamp),
        )
        self.conn.commit()
        id_ = cur.lastrowid
        return DataPointInDB(id=id_, **dp.dict())

    def get_datapoint(self, id: int) -> Optional[DataPointInDB]:
        cur = self.conn.cursor()
        cur.execute("SELECT id, source, value, timestamp FROM datapoints WHERE id=?", (id,))
        row = cur.fetchone()
        if not row:
            return None
        id_, source, value, timestamp = row
        return DataPointInDB(id=id_, source=source, value=value, timestamp=timestamp)

    def list_datapoints(self) -> List[DataPointInDB]:
        cur = self.conn.cursor()
        cur.execute("SELECT id, source, value, timestamp FROM datapoints")
        rows = cur.fetchall()
        return [DataPointInDB(id=r[0], source=r[1], value=r[2], timestamp=r[3]) for r in rows]
