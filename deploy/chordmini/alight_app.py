"""Gunicorn entrypoint for Alight's ChordMini deployment.

Imports ChordMini's configured Flask app unchanged and registers Alight's one
extra ingest route on it. Run with: gunicorn ... alight_app:app
"""
from app import app  # ChordMini's app = create_app(), imported untouched
from alight_ingest import bp as alight_bp

app.register_blueprint(alight_bp)
