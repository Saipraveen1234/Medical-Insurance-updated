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

# Create SQLAlchemy engine with optimized connection pooling settings
engine = create_engine(
    DATABASE_URL,
    # Performance optimizations
    pool_size=20,              # Increased pool size for concurrent requests
    max_overflow=15,            # Allow more connections when pool is full
    pool_timeout=30,            # Connection timeout (seconds)
    pool_recycle=1800,          # Recycle connections every 30 minutes to prevent stale connections
    pool_pre_ping=True,         # Verify connection is alive before using it
    # Query optimizations
    execution_options={
        "isolation_level": "READ COMMITTED"  # Good balance between consistency and performance
    }
)

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    # Performance optimizations
    expire_on_commit=False      # Don't expire objects after commit (better performance)
)

# Create Base class
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()