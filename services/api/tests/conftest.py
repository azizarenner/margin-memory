import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from alembic import command
from alembic.config import Config
from app.db import get_db
from app.main import app
from app import providers

@pytest.fixture
def client(tmp_path, monkeypatch):
    url = os.getenv("TEST_DATABASE_URL", f"sqlite:///{tmp_path}/test.db")
    engine = create_engine(url, connect_args={"check_same_thread":False} if url.startswith("sqlite") else {})
    if url.startswith("sqlite"):
        @event.listens_for(engine,"connect")
        def fk(connection,_): connection.execute("PRAGMA foreign_keys=ON")
    from app import db as database
    monkeypatch.setattr(database,"engine",engine)
    command.upgrade(Config(str(Path(__file__).resolve().parents[1]/"alembic.ini")),"head")
    factory = sessionmaker(engine, expire_on_commit=False)
    def override():
        with factory() as db: yield db
    app.dependency_overrides[get_db] = override
    monkeypatch.setattr(providers.settings,"ai_provider","mock")
    with TestClient(app) as http:
        yield http, factory
    app.dependency_overrides.clear()
    command.downgrade(Config(str(Path(__file__).resolve().parents[1]/"alembic.ini")),"base")
    engine.dispose()
