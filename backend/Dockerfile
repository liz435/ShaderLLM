FROM python:3.12-slim

# Install glslangValidator and curl (for healthcheck)
RUN apt-get update && \
    apt-get install -y --no-install-recommends glslang-tools curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything and install
COPY . .
RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
