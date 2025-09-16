// Configuração inicial do aplicativo
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Teste de conexão com o backend e atualiza UI
    checkBackendHealth();

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

// Estado simples para backend disponível
let backendAvailable = false;

function showBackendStatus(available) {
    const statusEl = document.getElementById('backendStatus');
    const msg = document.getElementById('backendStatusMsg');
    const retryBtn = document.getElementById('retryBackendBtn');
    if (!statusEl) return;

    if (available) {
        backendAvailable = true;
        statusEl.classList.add('hidden');
        if (retryBtn) retryBtn.removeEventListener('click', checkBackendHealth);
    } else {
        backendAvailable = false;
        msg.textContent = 'Backend offline — algumas funcionalidades estão indisponíveis.';
        statusEl.classList.remove('hidden');
        if (retryBtn) retryBtn.addEventListener('click', checkBackendHealth);
    }
}

async function checkBackendHealth() {
    try {
        const res = await fetch('http://localhost:8000/health', {cache: 'no-store'});
        if (!res.ok) throw new Error('health check failed ' + res.status);
        const data = await res.json();
        console.log('Backend está funcionando:', data);
        showBackendStatus(true);
    } catch (err) {
        console.error('Erro ao conectar com o backend:', err);
        showBackendStatus(false);
    }
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
        console.log('Buscando turmas...');
        const response = await fetch('http://localhost:8000/turmas');
        console.log('Resposta da API:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Turmas recebidas:', data);
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
        const turmaSelect = document.getElementById('turma');
        if (!turmaSelect) {
            console.error('Elemento select de turma não encontrado');
            return;
        }
        
        // Limpa as opções existentes, mantendo apenas a opção padrão
        turmaSelect.innerHTML = '<option value="">Selecione uma turma</option>';
        
        // Primeiro, tenta carregar as turmas existentes
        let turmas = await fetchTurmas();
        console.log('Turmas carregadas inicialmente:', turmas);
        
        if (!turmas || turmas.length === 0) {
            console.log('Nenhuma turma encontrada, tentando criar turmas iniciais...');
            try {
                const seedResponse = await fetch('http://localhost:8000/turmas/seed', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                if (!seedResponse.ok) {
                    throw new Error('Falha ao criar turmas iniciais');
                }
                
                console.log('Turmas iniciais criadas, recarregando...');
                turmas = await fetchTurmas();
            } catch (error) {
                console.error('Erro ao criar turmas iniciais:', error);
                console.warn('Backend inacessível — usando turmas locais (fallback).');
                // Fallback local seed para quando backend estiver offline
                turmas = [
                    { id: 1001, nome: '1º Ano A (local)', capacidade: 30 },
                    { id: 1002, nome: '1º Ano B (local)', capacidade: 30 },
                    { id: 1003, nome: '2º Ano A (local)', capacidade: 25 },
                    { id: 1004, nome: '2º Ano B (local)', capacidade: 25 }
                ];
                // avisar o usuário de que dados são locais
                const turmaSelect = document.getElementById('turma');
                if (turmaSelect) {
                    const infoOpt = document.createElement('option');
                    infoOpt.value = '';
                    infoOpt.textContent = 'Dados locais (modo offline)';
                    infoOpt.disabled = true;
                    turmaSelect.appendChild(infoOpt);
                }
                // não interrompe a execução — popula select com fallback
                return;
            }
        }
        
        populateTurmasSelect(turmas, turmaSelect);
        console.log('Select de turmas atualizado com', turmas.length, 'opções');
    } catch (error) {
        console.error('Erro ao carregar turmas:', error);
        alert('Erro ao carregar turmas. Por favor, recarregue a página.');
    }
}

// Função auxiliar para popular o select de turmas
function populateTurmasSelect(turmas, turmaSelect) {
    if (!Array.isArray(turmas)) {
        console.error('Turmas deve ser um array:', turmas);
        return;
    }
    
    // Garantir que o select existe
    if (!turmaSelect) {
        console.error('Select de turmas não encontrado');
        return;
    }
    
    // Limpar opções existentes, mantendo apenas a primeira (default)
    while (turmaSelect.options.length > 1) {
        turmaSelect.remove(1);
    }
    
    // Adicionar novas opções
    turmas.forEach(turma => {
        if (!turma || !turma.id || !turma.nome) {
            console.error('Turma inválida:', turma);
            return;
        }
        
        const option = document.createElement('option');
        option.value = turma.id;
        option.textContent = `${turma.nome} (${turma.capacidade} vagas)`;
        turmaSelect.appendChild(option);
    });
    
    console.log(`Adicionadas ${turmas.length} turmas ao select`);
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
    const nome = formData.get('nome')?.trim();
    if (!nome || nome.length < 3 || nome.length > 80) {
        alert('O nome deve ter entre 3 e 80 caracteres');
        return;
    }

    const email = formData.get('email')?.trim();
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        alert('Por favor, insira um email válido');
        return;
    }

    // Garantir que a data de nascimento está presente
    const dataNascimento = formData.get('data_nascimento');
    if (!dataNascimento) {
        alert('Por favor, insira a data de nascimento');
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
        console.log('Enviando dados do aluno:', studentData);
        
        const response = await fetch('http://localhost:8000/alunos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(studentData)
        });

        console.log('Status da resposta:', response.status);
        const data = await response.json();
        console.log('Resposta completa:', data);

        if (response.ok) {
            alert('Aluno cadastrado com sucesso!');
            closeModal();
            event.target.reset();
            // Atualizar lista de alunos
            const alunos = await fetchAlunos();
            state.alunos = alunos;
        } else {
            console.error('Erro da API:', data);
            if (data.detail) {
                alert(`Erro ao cadastrar aluno: ${data.detail}`);
            } else if (typeof data === 'object') {
                // Mostrar todos os erros de validação
                const errors = Object.entries(data)
                    .map(([campo, erro]) => `${campo}: ${erro}`)
                    .join('\n');
                alert(`Erros de validação:\n${errors}`);
            } else {
                alert(`Erro ao cadastrar aluno: ${JSON.stringify(data)}`);
            }
        }
    } catch (error) {
        console.error('Erro ao cadastrar aluno:', error);
        alert('Erro ao cadastrar aluno. Verifique o console para mais detalhes.');
    }
}
