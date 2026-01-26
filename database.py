"""
CRGM ERP - Database Configuration
SQLAlchemy setup para PostgreSQL con arquitectura Multi-Tenant
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Obtener variables de entorno para la conexión a PostgreSQL
POSTGRES_USER = os.getenv("POSTGRES_USER", "crgm_admin")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "crgm_secure_2024")
POSTGRES_DB = os.getenv("POSTGRES_DB", "crgm_erp")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

# Construir URL de conexión
DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Crear engine de SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verificar conexiones antes de usar
    echo=False  # Cambiar a True para debug SQL
)

# SessionLocal class para transacciones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarativa para los modelos
Base = declarative_base()

# Dependency para FastAPI
def get_db():
    """
    Generador de sesiones de base de datos para usar como dependencia en FastAPI.
    Asegura que la sesión se cierre después de cada request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
