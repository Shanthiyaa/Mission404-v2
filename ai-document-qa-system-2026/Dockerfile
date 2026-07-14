# Use official slim Python image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# ── LAYER 1: Install heavy/stable base packages (cached separately) ───────────
# Copy base requirements first. This layer is only re-built if requirements-base.txt changes.
COPY requirements-base.txt .
RUN pip install --no-cache-dir -r requirements-base.txt

# ── LAYER 2: Install lightweight/frequently-changed packages ──────────────────
# This layer is re-built when requirements.txt changes, but it's fast (small packages).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose the API port
EXPOSE 8001

# Command to run the application
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8001"]
