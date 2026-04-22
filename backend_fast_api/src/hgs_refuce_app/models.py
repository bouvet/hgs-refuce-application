from pydantic import BaseModel
from typing import Optional

class DataPoint(BaseModel):
    source: str
    value: float
    timestamp: Optional[str] = None

class DataPointInDB(DataPoint):
    id: int
