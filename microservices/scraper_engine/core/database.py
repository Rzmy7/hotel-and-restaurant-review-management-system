"""
Database Engine & Session Management — Scraper Engine
=====================================================
Provides the SQLAlchemy engine, Base, session factory, and init_db()
which creates all tables on startup. No seeding needed — sources are
created organically via API requests.
"""
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, configure_mappers
from core.config import setup_logger, config

logger = setup_logger("core_database")

# Declarative base for all models
Base = declarative_base()


def get_engine():
    """Build a SQLAlchemy engine using ODBC connection string from .env."""
    params = urllib.parse.quote_plus(
        f"DRIVER={{{config.db_driver}}};"
        f"SERVER={config.db_server};"
        f"DATABASE={config.db_name};"
        f"UID={config.db_uid};"
        f"PWD={config.db_pwd};"
        f"TrustServerCertificate={config.trust_server_certificate};"
    )
    conn_str = f"mssql+pyodbc:///?odbc_connect={params}"
    return create_engine(conn_str, echo=False)


def init_db():
    """
    Creates all tables defined in core.models if they do not already exist.
    Called once on application startup.
    """
    logger.info("Initializing database tables...")
    try:
        import core.models  # noqa: F401 — triggers model registration
        configure_mappers()
        engine = get_engine()
        Base.metadata.create_all(engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")


def get_session():
    """Returns a new SQLAlchemy session bound to the engine."""
    configure_mappers()
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session()
