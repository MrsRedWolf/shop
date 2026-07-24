from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Замени данные подключения на свои
DATABASE_USER = "rgsu_user"
DATABASE_PASSWORD = "2002"
DATABASE_HOST = "localhost"  # или IP-адрес сервера
DATABASE_PORT = "5432"       # стандартный порт PostgreSQL
DATABASE_NAME = "rgsu"

SQLALCHEMY_DATABASE_URL = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()