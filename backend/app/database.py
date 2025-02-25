import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL Database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:1234@localhost:5433/insurance_dashboard"
)

# Create SQLAlchemy engine with connection pooling and optimized settings
engine = create_engine(
    DATABASE_URL,
    pool_size=20,  # Increase connection pool size
    max_overflow=10,  # Allow extra connections when pool is full
    pool_timeout=30,  # Connection timeout in seconds
    pool_recycle=1800,  # Recycle connections after 30 mins to prevent stale connections
    pool_pre_ping=True  # Verify connection is still alive before using
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()