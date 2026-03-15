import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, configure_mappers
from core.config import setup_logger, config

logger = setup_logger("core_database")

Base = declarative_base()

def get_engine():
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
    """Creates all tables and seeds the sources registry."""
    logger.info("Initializing unified database tables if they do not exist.")
    try:
        # Import models so SQLAlchemy registers them with Base.metadata
        import core.models  # noqa: F401

        configure_mappers()
        engine = get_engine()
        Base.metadata.create_all(engine)

        # Seed the 3 platform sources if they don't exist
        _seed_sources()
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")

def _seed_sources():
    """Ensures Agoda, Booking, and Google exist in the sources table."""
    from core.models import Source
    session = get_session()
    try:
        platforms = [
            {"platform_name": "Agoda", "base_url": "https://www.agoda.com"},
            {"platform_name": "Booking", "base_url": "https://www.booking.com"},
            {"platform_name": "Google", "base_url": "https://maps.google.com"},
            {"platform_name": "TripAdvisor", "base_url": "https://www.tripadvisor.com"},
        ]
        for p in platforms:
            existing = session.query(Source).filter_by(platform_name=p["platform_name"]).first()
            if not existing:
                session.add(Source(**p))
                logger.info(f"Seeded source: {p['platform_name']}")
        session.commit()
    except Exception as e:
        session.rollback()
        logger.warning(f"Source seeding skipped or failed: {e}")
    finally:
        session.close()

def get_session():
    configure_mappers()
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session()
