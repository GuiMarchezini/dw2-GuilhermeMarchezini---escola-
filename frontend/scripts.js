// Configuração inicial do aplicativo
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Teste de conexão com o backend e atualiza UI
    checkBackendHealth();

    // Atualiza badge da fila offline
    updateQueueBadge();
    setHeaderQueueCount();

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

// Offline queue stored in localStorage
const OFFLINE_QUEUE_KEY = 'offline_alunos_queue';

function getOfflineQueue() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); }
    catch { return []; }
}

function pushOfflineQueue(item) {
    const q = getOfflineQueue();
    q.push(item);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
    updateQueueBadge();
}

function clearOfflineQueue() {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    updateQueueBadge();
}

function updateQueueBadge() {
    const q = getOfflineQueue();
    const statusEl = document.getElementById('backendStatus');
    if (!statusEl) return;
    const msg = document.getElementById('backendStatusMsg');
    const syncBtn = document.getElementById('syncQueueBtn');
    if (q.length > 0) {
        msg.textContent = `Backend offline — ${q.length} cadastro(s) pendente(s).`;
        if (syncBtn) syncBtn.classList.remove('hidden');
    }
}

// update badge in header for queue count
function setHeaderQueueCount() {
    const q = getOfflineQueue();
    const badge = document.getElementById('queueCount');
    if (!badge) return;
    badge.textContent = q.length;
    if (q.length === 0) badge.style.display = 'none'; else badge.style.display = 'inline-block';
}

// Queue modal controls ---------------------------------------------------
// Elements exist in index.html: #queueModal, #queueList, #closeQueueBtn, #syncNowBtn
function openQueueModal() {
    const queueModal = document.getElementById('queueModal');
    if (!queueModal) return;
    renderQueueItems();
    queueModal.classList.remove('hidden');
    queueModal.setAttribute('aria-hidden', 'false');
}

function closeQueueModal() {
    const queueModal = document.getElementById('queueModal');
    if (!queueModal) return;
    queueModal.classList.add('hidden');
    queueModal.setAttribute('aria-hidden', 'true');
}

function renderQueueItems() {
    const queueListEl = document.getElementById('queueList');
    if (!queueListEl) return;
    const items = getOfflineQueue() || [];
    queueListEl.innerHTML = '';
    if (items.length === 0) {
        queueListEl.innerHTML = '<p style="color:#555">Nenhum cadastro pendente.</p>';
        return;
    }
    items.forEach((it, idx) => {
        const row = document.createElement('div');
        row.className = 'queue-item';
        const left = document.createElement('div');
        left.innerHTML = `<div><strong>${escapeHtml(it.nome)}</strong></div><div class="queue-meta">${escapeHtml(it.email || '')} — Turma: ${escapeHtml(it.turma_nome || String(it.turma_id) || 'N/A')}</div>`;
        const right = document.createElement('div');
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-secondary';
        removeBtn.textContent = 'Remover';
        removeBtn.onclick = () => { removeQueueItem(idx); };
        right.appendChild(removeBtn);
        row.appendChild(left);
        row.appendChild(right);
        queueListEl.appendChild(row);
    });
}

function removeQueueItem(index) {
    const q = getOfflineQueue();
    if (!q || index < 0 || index >= q.length) return;
    q.splice(index, 1);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
    updateQueueBadge();
    renderQueueItems();
    showToast('Item removido da fila');
}

// Wire buttons if present
document.addEventListener('DOMContentLoaded', () => {
    const openQueueBtn = document.getElementById('openQueueBtn');
    if (openQueueBtn) openQueueBtn.addEventListener('click', openQueueModal);
    const closeQueueBtn = document.getElementById('closeQueueBtn');
    if (closeQueueBtn) closeQueueBtn.addEventListener('click', closeQueueModal);
    const syncNowBtn = document.getElementById('syncNowBtn');
    if (syncNowBtn) syncNowBtn.addEventListener('click', async () => {
        await syncOfflineQueue();
        renderQueueItems();
    });
});

// small helper to escape text for insertion
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe).replace(/[&<>"']/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]; });
}

function showBackendStatus(available) {
    const statusEl = document.getElementById('backendStatus');
    const msg = document.getElementById('backendStatusMsg');
    const retryBtn = document.getElementById('retryBackendBtn');
    const syncBtn = document.getElementById('syncQueueBtn');
    if (!statusEl) return;

    if (available) {
        backendAvailable = true;
        statusEl.classList.add('hidden');
        if (retryBtn) retryBtn.removeEventListener('click', checkBackendHealth);
        if (syncBtn) syncBtn.classList.add('hidden');
    } else {
        backendAvailable = false;
        msg.textContent = 'Backend offline — algumas funcionalidades estão indisponíveis.';
        statusEl.classList.remove('hidden');
        if (retryBtn) retryBtn.addEventListener('click', checkBackendHealth);
        if (syncBtn) {
            syncBtn.classList.remove('hidden');
            syncBtn.addEventListener('click', async () => {
                await syncOfflineQueue();
            });
        }
    }
    // update queue counts in UI
    updateQueueBadge();
    setHeaderQueueCount();
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
// Toast utility
function showToast(message, timeout = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) {
        alert(message);
        return;
    }
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), timeout);
}

// Sincroniza fila offline
async function syncOfflineQueue() {
    const q = getOfflineQueue();
    if (!q.length) return;
    console.log('Sincronizando fila offline:', q.length);
    for (const item of q) {
        try {
            // Suporta operações de delete enfileiradas: { op: 'delete', id: number }
            if (item && item.op === 'delete' && item.id) {
                const res = await fetch(`http://localhost:8000/alunos/${item.id}`, { method: 'DELETE' });
                if (res.ok || res.status === 204) {
                    console.log('Delete sincronizado:', item.id);
                } else {
                    console.warn('Falha ao sincronizar delete:', await res.text());
                }
                continue;
            }

            // default: create aluno
            const res = await fetch('http://localhost:8000/alunos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (res.ok) {
                console.log('Item sincronizado:', item.nome);
            } else {
                console.warn('Falha ao sincronizar item:', await res.text());
            }
        } catch (err) {
            console.error('Erro ao sincronizar item:', err);
            return; // se der erro de rede, interrompe para tentar depois
        }
    }
    clearOfflineQueue();
    showToast('Fila offline sincronizada.');
}

// Renderiza lista de alunos simples
function renderStudents(alunos) {
    const container = document.getElementById('studentsList');
    const totalEl = document.getElementById('totalAlunos');
    const ativosEl = document.getElementById('ativosAlunos');
    if (!container) return;
    container.innerHTML = '';
    const ativos = alunos.filter(a => a.status === 'ativo').length;
    if (totalEl) totalEl.textContent = `Total: ${alunos.length}`;
    if (ativosEl) ativosEl.textContent = `Ativos: ${ativos}`;
    alunos.forEach(a => {
        const card = document.createElement('div');
        card.className = 'student-card';
    const alunoId = a.id ? String(a.id) : '';
    card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;"><strong>${escapeHtml(a.nome)}</strong><button class=\"btn-secondary\" data-id=\"${alunoId}\">Excluir</button></div><div>${escapeHtml(a.email || '')}</div><div>Turma: ${escapeHtml(String(a.turma_id || '—'))}</div>`;
    // wire delete button
    const delBtn = card.querySelector('button[data-id]');
    if (delBtn) delBtn.addEventListener('click', deleteStudent);
        container.appendChild(card);
    });
}

// Manipular envio do formulário
async function handleStudentRegistration(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const birthDate = formData.get('data_nascimento');

    if (!validateBirthDate(birthDate)) {
        showToast('O aluno deve ter no mínimo 5 anos de idade.');
        return;
    }

    const turmaId = formData.get('turma_id');

    // Valida os campos obrigatórios
    const nome = formData.get('nome')?.trim();
    if (!nome || nome.length < 3 || nome.length > 80) {
        showToast('O nome deve ter entre 3 e 80 caracteres');
        return;
    }

    const email = formData.get('email')?.trim();
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        showToast('Por favor, insira um email válido');
        return;
    }

    const dataNascimento = formData.get('data_nascimento');
    if (!dataNascimento) {
        showToast('Por favor, insira a data de nascimento');
        return;
    }

    const studentData = {
        nome: nome,
        data_nascimento: dataNascimento,
        email: email || null,
        turma_id: turmaId ? parseInt(turmaId) : null,
        status: 'inativo'
    };

    try {
        console.log('Enviando dados do aluno:', studentData);

        if (!backendAvailable) {
            pushOfflineQueue(studentData);
            showToast('Salvo offline — será sincronizado quando o backend voltar.');
            closeModal();
            event.target.reset();
            state.alunos.push(studentData);
            renderStudents(state.alunos);
            return;
        }

        const response = await fetch('http://localhost:8000/alunos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(studentData)
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Aluno cadastrado com sucesso!');
            closeModal();
            event.target.reset();
            const alunos = await fetchAlunos();
            state.alunos = alunos;
            renderStudents(alunos);
        } else {
            console.error('Erro da API:', data);
            const message = data.detail || JSON.stringify(data) || 'Erro desconhecido';
            showToast(`Erro ao cadastrar: ${message}`, 5000);
        }
    } catch (error) {
        console.error('Erro ao cadastrar aluno:', error);
        showToast('Erro ao cadastrar aluno. Verifique o console.', 5000);
    }
}

// delete student handler
async function deleteStudent(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const id = btn.getAttribute('data-id');
    // if no id then it's a local-only entry; attempt to remove from offline queue
    if (!id) {
        const name = btn.closest('.student-card')?.querySelector('strong')?.textContent;
        // remove from offline queue where matches nome
        const q = getOfflineQueue();
        const idx = q.findIndex(x => x && x.nome === name && !x.op);
        if (idx >= 0) {
            q.splice(idx, 1);
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
            updateQueueBadge();
            setHeaderQueueCount();
        }
        btn.closest('.student-card')?.remove();
        showToast('Cadastro local removido');
        return;
    }

    if (!backendAvailable) {
        // queue delete op
        pushOfflineQueue({ op: 'delete', id: parseInt(id) });
        btn.closest('.student-card')?.remove();
        showToast('Remoção salva na fila — será processada quando online');
        return;
    }

    try {
        const res = await fetch(`http://localhost:8000/alunos/${id}`, { method: 'DELETE' });
        if (res.status === 204 || res.ok) {
            showToast('Aluno excluído');
            const alunos = await fetchAlunos();
            state.alunos = alunos;
            renderStudents(alunos);
        } else {
            const text = await res.text();
            showToast('Falha ao excluir: ' + text, 5000);
        }
    } catch (err) {
        console.error('Erro ao excluir aluno:', err);
        showToast('Erro ao excluir aluno. Verifique o console.');
    }
}
