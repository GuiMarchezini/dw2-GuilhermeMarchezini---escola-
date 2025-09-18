from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import date
from models import Aluno, Turma
from database import engine, SessionLocal
import models

class AlunoCreate(BaseModel):
    nome: str
    data_nascimento: date
    email: Optional[str] = None
    status: str = "inativo"
    turma_id: Optional[int] = None

    class Config:
        orm_mode = True


class AlunoResponse(AlunoCreate):
    id: int

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
@app.post("/alunos", response_model=AlunoResponse)
async def create_aluno(
    aluno: AlunoCreate,
    db: Session = Depends(get_db)
):
    try:
        print(f"Recebendo dados do aluno: {aluno.dict()}")

        # Validações básicas
        if not aluno.nome or len(aluno.nome.strip()) < 3:
            raise HTTPException(status_code=400, detail="Nome deve ter pelo menos 3 caracteres")

        if not aluno.data_nascimento:
            raise HTTPException(status_code=400, detail="Data de nascimento é obrigatória")

        # Validar data de nascimento (mínimo 5 anos)
        hoje = date.today()
        idade = hoje.year - aluno.data_nascimento.year - ((hoje.month, hoje.day) < (aluno.data_nascimento.month, aluno.data_nascimento.day))
        if idade < 5:
            raise HTTPException(status_code=400, detail="O aluno deve ter no mínimo 5 anos de idade")

        # Validar turma se fornecida
        if aluno.turma_id is not None:
            turma = db.query(Turma).filter(Turma.id == aluno.turma_id).first()
            if not turma:
                raise HTTPException(status_code=400, detail=f"Turma com ID {aluno.turma_id} não encontrada")
            
            # Verifica capacidade da turma
            alunos_na_turma = db.query(Aluno).filter(Aluno.turma_id == turma.id).count()
            if alunos_na_turma >= turma.capacidade:
                raise HTTPException(status_code=400, detail=f"Turma {turma.nome} já está em sua capacidade máxima")

        # Verificar se já existe aluno com o mesmo email
        if aluno.email:
            existing_email = db.query(Aluno).filter(Aluno.email == aluno.email).first()
            if existing_email:
                raise HTTPException(status_code=400, detail="Este email já está cadastrado")

        # Criar o aluno
        try:
            db_aluno = Aluno(
                nome=aluno.nome,
                data_nascimento=aluno.data_nascimento,
                email=aluno.email,
                status=aluno.status,
                turma_id=aluno.turma_id
            )
            db.add(db_aluno)
            db.commit()
            db.refresh(db_aluno)
            print(f"Aluno criado com sucesso: {db_aluno.id}")
            return db_aluno
        except Exception as e:
            db.rollback()
            print(f"Erro ao salvar no banco: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro ao salvar no banco de dados: {str(e)}")

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Erro inesperado: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro inesperado: {str(e)}")

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
class TurmaBase(BaseModel):
    nome: str
    capacidade: int

    class Config:
        orm_mode = True

class TurmaCreate(TurmaBase):
    pass

class TurmaResponse(TurmaBase):
    id: int

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

@app.get("/turmas", response_model=List[TurmaResponse])
async def read_turmas(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    try:
        turmas = db.query(Turma).offset(skip).limit(limit).all()
        return turmas
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar turmas: {str(e)}")


@app.delete('/alunos/{aluno_id}', status_code=204)
async def delete_aluno(aluno_id: int, db: Session = Depends(get_db)):
    try:
        aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
        if not aluno:
            raise HTTPException(status_code=404, detail=f'Aluno com id {aluno_id} não encontrado')
        db.delete(aluno)
        db.commit()
        return
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao excluir aluno: {str(e)}')
