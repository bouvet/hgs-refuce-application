from fastapi import FastAPI, HTTPException
from .models import DataPoint, DataPointInDB
from .storage import Storage

app = FastAPI(title="hgs-refuce-application")
storage = Storage("data.db")

@app.post("/add_datapoint", response_model=DataPointInDB)
def add_datapoint(dp: DataPoint):
    saved = storage.add_datapoint(dp)
    return saved

@app.get("/get_datapoint/{id}", response_model=DataPointInDB)
def get_datapoint(id: int):
    dp = storage.get_datapoint(id)
    if not dp:
        raise HTTPException(status_code=404, detail="Not found")
    return dp

@app.get("/get_datapoints")
def get_datapoints():
    return storage.list_datapoints()
