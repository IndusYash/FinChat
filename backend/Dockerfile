# Use python 3.11 slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/home/user/.cache/huggingface \
    PATH="/home/user/.local/bin:${PATH}"

# Install basic compiler tools for pip packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user (Hugging Face Spaces default UID is 1000)
RUN useradd -m -u 1000 user
USER user
WORKDIR /home/user/app

# Install CPU-only PyTorch first to save disk space and limit download size
RUN pip install --no-cache-dir --user torch --index-url https://download.pytorch.org/whl/cpu

# Copy dependencies list
COPY --chown=user:user requirements.txt .

# Install other requirements
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy backend files
COPY --chown=user:user main.py .

# Expose port 7860 (Hugging Face Spaces default)
EXPOSE 7860

# Run FastAPI app
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
