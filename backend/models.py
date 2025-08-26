from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Date
from sqlalchemy.orm import relationship
from database import Base

class Turma(Base):
    __tablename__ = "turmas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True)
    capacidade = Column(Integer)
    
    alunos = relationship("Aluno", back_populates="turma")

class Aluno(Base):
    __tablename__ = "alunos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    data_nascimento = Column(Date)
    email = Column(String, unique=True, index=True, nullable=True)
    status = Column(String)  # ativo/inativo
    turma_id = Column(Integer, ForeignKey("turmas.id"), nullable=True)

    turma = relationship("Turma", back_populates="alunos")
