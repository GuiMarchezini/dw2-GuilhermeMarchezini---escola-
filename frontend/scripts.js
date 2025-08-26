// Configuração inicial do aplicativo
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Inicializar busca
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
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
