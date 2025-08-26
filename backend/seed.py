from database import SessionLocal, engine
import models
from datetime import date
import random

# Criar todas as tabelas
models.Base.metadata.create_all(bind=engine)

# Lista de nomes para gerar dados de exemplo
nomes = [
    "Ana Silva", "Bruno Santos", "Carla Oliveira", "Daniel Lima",
    "Elena Martins", "Felipe Costa", "Gabriela Sousa", "Hugo Pereira",
    "Isabel Ferreira", "João Ribeiro", "Karen Alves", "Lucas Rodrigues",
    "Maria Gomes", "Nathan Castro", "Olivia Cardoso", "Pedro Nunes",
    "Quitéria Dias", "Rafael Mendes", "Sofia Torres", "Thiago Moreira"
]

# Dados de exemplo para turmas
turmas_data = [
    {"nome": "1º Ano A", "capacidade": 30},
    {"nome": "1º Ano B", "capacidade": 30},
    {"nome": "2º Ano A", "capacidade": 25},
    {"nome": "2º Ano B", "capacidade": 25},
]

def seed_database():
    db = SessionLocal()
    try:
        # Criar turmas
        turmas = []
        for turma_data in turmas_data:
            turma = models.Turma(**turma_data)
            db.add(turma)
            turmas.append(turma)
        db.commit()

        # Criar alunos
        for nome in nomes:
            # Gerar data de nascimento aleatória entre 2010 e 2015
            ano = random.randint(2010, 2015)
            mes = random.randint(1, 12)
            dia = random.randint(1, 28)
            
            aluno = models.Aluno(
                nome=nome,
                data_nascimento=date(ano, mes, dia),
                email=f"{nome.lower().replace(' ', '.')}@escola.com",
                status="ativo" if random.random() > 0.2 else "inativo",
                turma_id=random.choice(turmas).id if random.random() > 0.1 else None
            )
            db.add(aluno)
        
        db.commit()
        print("Dados de exemplo inseridos com sucesso!")
        
    except Exception as e:
        print(f"Erro ao inserir dados: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
