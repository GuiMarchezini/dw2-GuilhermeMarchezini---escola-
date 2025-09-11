// Configuração inicial do aplicativo
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Teste de conexão com o backend
    fetch('http://localhost:8000/health')
        .then(response => response.json())
        .then(data => {
            console.log('Backend está funcionando:', data);
        })
        .catch(error => {
            console.error('Erro ao conectar com o backend:', error);
        });

    // Inicializar busca
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Inicializar formulário de cadastro
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', handleStudentRegistration);
    }

    // Carregar turmas para o select
    loadTurmas();
}

// Função para lidar com a busca
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    // Implementar lógica de busca
}

// Funções para gerenciamento de alunos
async function fetchAlunos() {
    try {
        const response = await fetch('http://localhost:8000/alunos');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao buscar alunos:', error);
        return [];
    }
}

// Funções para gerenciamento de turmas
async function fetchTurmas() {
    try {
        const response = await fetch('http://localhost:8000/turmas');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao buscar turmas:', error);
        return [];
    }
}

// Funções de utilidade
function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

// Gerenciamento de estado da aplicação
const state = {
    alunos: [],
    turmas: [],
    filtros: {
        turma: null,
        status: null,
        texto: ''
    }
};

// Funções do Modal
function openModal() {
    document.getElementById('registrationModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('registrationModal').style.display = 'none';
}

// Carregar turmas no select
async function loadTurmas() {
    try {
        // Primeiro, tenta carregar as turmas existentes
        const turmas = await fetchTurmas();
        const turmaSelect = document.getElementById('turma');
        
        // Limpa as opções existentes, mantendo apenas a opção padrão
        turmaSelect.innerHTML = '<option value="">Selecione uma turma</option>';
        
        if (turmas.length === 0) {
            // Se não houver turmas, tenta criar as turmas iniciais
            try {
                await fetch('http://localhost:8000/turmas/seed', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                // Recarrega as turmas após criar
                const newTurmas = await fetchTurmas();
                populateTurmasSelect(newTurmas, turmaSelect);
            } catch (error) {
                console.error('Erro ao criar turmas iniciais:', error);
            }
        } else {
            // Se já existem turmas, apenas popula o select
            populateTurmasSelect(turmas, turmaSelect);
        }
    } catch (error) {
        console.error('Erro ao carregar turmas:', error);
    }
}

// Função auxiliar para popular o select de turmas
function populateTurmasSelect(turmas, turmaSelect) {
    turmas.forEach(turma => {
        const option = document.createElement('option');
        option.value = turma.id;
        option.textContent = turma.nome;
        turmaSelect.appendChild(option);
    });
}

// Validação de data de nascimento (mínimo 5 anos)
function validateBirthDate(birthDate) {
    const today = new Date();
    const date = new Date(birthDate);
    const age = today.getFullYear() - date.getFullYear();
    return age >= 5;
}

// Manipular envio do formulário
async function handleStudentRegistration(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const birthDate = formData.get('data_nascimento');
    
    if (!validateBirthDate(birthDate)) {
        alert('O aluno deve ter no mínimo 5 anos de idade.');
        return;
    }
    
    const turmaId = formData.get('turma_id');
    
    // Valida os campos obrigatórios
    const nome = formData.get('nome').trim();
    if (nome.length < 3 || nome.length > 80) {
        alert('O nome deve ter entre 3 e 80 caracteres');
        return;
    }

    const email = formData.get('email').trim();
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        alert('Por favor, insira um email válido');
        return;
    }

    const studentData = {
        nome: nome,
        data_nascimento: formData.get('data_nascimento'),
        email: email || null,
        turma_id: turmaId ? parseInt(turmaId) : null,
        status: 'inativo' // status inicial
    };
    
    try {
        const response = await fetch('http://localhost:8000/alunos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(studentData)
        });

        const data = await response.json();
        if (response.ok) {
            alert('Aluno cadastrado com sucesso!');
            closeModal();
            event.target.reset();
            // Atualizar lista de alunos
            const alunos = await fetchAlunos();
            state.alunos = alunos;
            // Aqui você pode adicionar a lógica para atualizar a exibição dos alunos
        } else {
            console.error('Resposta da API:', data);
            alert(`Erro ao cadastrar aluno: ${data.detail || JSON.stringify(data)}`);
        }
    } catch (error) {
        console.error('Erro ao cadastrar aluno:', error);
        alert('Erro ao cadastrar aluno. Por favor, tente novamente.');
    }
}
