import multiprocessing

pythonpath = "src"
bind = "0.0.0.0:8000"
timeout = 230
worker_class = "uvicorn.workers.UvicornWorker"
workers = max(2, multiprocessing.cpu_count())
max_requests = 1000
max_requests_jitter = 50
