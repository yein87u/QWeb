import os
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = os.environ.get("DATABASE_PATH", "./quantum_lab.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Experiment(Base):
    __tablename__ = "experiments"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    quantumN = Column(Integer)
    input_data = Column(String, nullable=True)
    circuit_data = Column(String, nullable=True) # 儲存 JSON 字串
    status = Column(String, default="completed")

Base.metadata.create_all(bind=engine)