from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import date
from models import Aluno, Turma
from database import engine, SessionLocal
import modelsapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from models import Aluno, Turma
from database import engine, SessionLocal
import models

from pydantic import EmailStr, constr

class AlunoCreate(BaseModel):
    nome: str
    data_nascimento: date
    email: Optional[str] = None
    status: str = "inativo"
    turma_id: Optional[int] = None

    class Config:
        orm_mode = True

app = FastAPI()

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar origens permitidas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Criar tabelas
models.Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Rotas para Alunos
@app.post("/alunos", response_model=AlunoCreate)
async def create_aluno(
    aluno: AlunoCreate,
    db: Session = Depends(get_db)
):
    try:
        # Validar data de nascimento (mínimo 5 anos)
        hoje = date.today()
        idade = hoje.year - aluno.data_nascimento.year - ((hoje.month, hoje.day) < (aluno.data_nascimento.month, aluno.data_nascimento.day))
        if idade < 5:
            raise HTTPException(status_code=400, detail="O aluno deve ter no mínimo 5 anos de idade")

        if aluno.turma_id:
            # Verifica se a turma existe
            turma = db.query(Turma).filter(Turma.id == aluno.turma_id).first()
            if not turma:
                raise HTTPException(status_code=400, detail="Turma não encontrada")
            
            # Verifica capacidade da turma
            alunos_na_turma = db.query(Aluno).filter(Aluno.turma_id == turma.id).count()
            if alunos_na_turma >= turma.capacidade:
                raise HTTPException(status_code=400, detail=f"Turma {turma.nome} já está em sua capacidade máxima")
        
        db_aluno = Aluno(**aluno.dict())
        db.add(db_aluno)
        db.commit()
        db.refresh(db_aluno)
        return db_aluno
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao criar aluno: {str(e)}")

@app.get("/alunos")
async def read_alunos(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    turma_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Aluno)
    
    if search:
        query = query.filter(Aluno.nome.ilike(f"%{search}%"))
    if turma_id:
        query = query.filter(Aluno.turma_id == turma_id)
    if status:
        query = query.filter(Aluno.status == status)
    
    alunos = query.offset(skip).limit(limit).all()
    return alunos

# Rotas para Turmas
class TurmaCreate(BaseModel):
    nome: str
    capacidade: int

    class Config:
        orm_mode = True

@app.post("/turmas/seed")
async def seed_turmas(db: Session = Depends(get_db)):
    turmas_data = [
        {"nome": "1º Ano A", "capacidade": 30},
        {"nome": "1º Ano B", "capacidade": 30},
        {"nome": "2º Ano A", "capacidade": 25},
        {"nome": "2º Ano B", "capacidade": 25},
    ]
    
    created_turmas = []
    try:
        for turma_data in turmas_data:
            # Verifica se a turma já existe
            existing = db.query(Turma).filter(Turma.nome == turma_data["nome"]).first()
            if not existing:
                db_turma = Turma(**turma_data)
                db.add(db_turma)
                created_turmas.append(db_turma)
        
        db.commit()
        return {"message": f"Criadas {len(created_turmas)} turmas com sucesso!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/turmas")
async def create_turma(
    turma: TurmaCreate,
    db: Session = Depends(get_db)
):
    try:
        db_turma = Turma(**turma.dict())
        db.add(db_turma)
        db.commit()
        db.refresh(db_turma)
        return db_turma
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/turmas")
async def read_turmas(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    turmas = db.query(Turma).offset(skip).limit(limit).all()
    return turmas
