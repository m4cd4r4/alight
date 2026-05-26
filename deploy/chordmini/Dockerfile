# Lean ChordMini backend for Alight - CPU only.
#
# Derived from ChordMiniApp's python_backend/Dockerfile, trimmed to exactly what
# Alight's play-along needs:
#   - chord recognition  -> Chord-CNN-LSTM (PyTorch; weights vendored in the
#                           models/Chord-CNN-LSTM submodule)
#   - beat / BPM          -> madmom (compiled from source; ships its own models)
#   - synced lyrics       -> LRCLIB (an outbound HTTP call; no model)
#
# Dropped vs upstream: TensorFlow and Spleeter (both imported lazily and unused
# for these endpoints - confirmed no eager imports tree-wide) and the default
# CUDA Torch wheel, replaced with the CPU-only wheel. This roughly halves the
# image and build time and keeps the container small enough to run hard-capped
# beside the VPS's production services.
#
# Build context: ChordMiniApp/python_backend (this file is copied in as
# Dockerfile.lean). Build: docker build -f Dockerfile.lean -t chordmini-lean .

# Stage 1: builder
FROM python:3.10-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl build-essential libsndfile1-dev ffmpeg git pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .

# Pin setuptools so pkg_resources stays available for madmom/librosa.
RUN pip install --no-cache-dir --upgrade pip "setuptools==79.0.1" wheel
RUN pip install --no-cache-dir "Cython>=0.29.0" numpy==1.26.4

# CPU-only Torch. The bare torch==2.6.0 in requirements would pull the multi-GB
# CUDA wheel; production is CPU, so take the CPU index explicitly.
RUN pip install --no-cache-dir torch==2.6.0 torchaudio==2.6.0 \
    --index-url https://download.pytorch.org/whl/cpu

# madmom compiled from source (needs numpy + Cython already present).
RUN pip install --no-cache-dir git+https://github.com/CPJKU/madmom

# Everything else, minus the packages handled above or unused (TensorFlow,
# Spleeter and its norbert dep, typer pinned without deps).
RUN grep -v -E '^(spleeter|typer|tensorflow|torch|torchaudio|norbert)' requirements.txt > requirements_lean.txt \
    && pip install --no-cache-dir -r requirements_lean.txt \
    && pip install --no-cache-dir --no-deps typer==0.9.0

# Stage 2: runtime
FROM python:3.10-slim AS runtime
RUN apt-get update && apt-get install -y \
    curl libsndfile1 ffmpeg \
    && rm -rf /var/lib/apt/lists/* && apt-get clean
WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Fail the build early if the legacy pkg_resources path madmom needs is gone.
RUN python -c "import pkg_resources; import madmom; print('madmom runtime import ok', getattr(madmom, '__version__', 'unknown'))"

COPY app.py .
COPY app_factory.py .
COPY config.py .
COPY config/ config/
COPY services/ services/
COPY blueprints/ blueprints/
COPY models/ models/
COPY utils/ utils/
COPY extensions.py .
COPY error_handlers.py .
COPY compat/ compat/
RUN rm -f /app/scipy_patch.py || true

RUN useradd --create-home --shell /bin/bash --uid 1001 app && chown -R app:app /app
USER app

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

ENV FLASK_ENV=production \
    FLASK_DEBUG=False \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# One worker keeps memory predictable under the runtime --memory cap; this is a
# personal, low-concurrency tool. Long timeout for cold-model CPU inference.
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--timeout", "600", \
     "--worker-class", "sync", "--max-requests", "500", "--preload", "app:app"]
