// Detecção robusta da URL da API
const getApiUrl = () => {
    const origin = window.location.origin;
    // Se estiver rodando via file:// ou em uma porta comum de dev (5500, 3000), 
    // aponta para o backend padrão no localhost:8000
    if (origin.includes('file://') || origin.includes(':5500') || origin.includes(':3000')) {
        return 'http://127.0.0.1:8000';
    }
    return origin;
};

const API_URL = getApiUrl();
const video = document.getElementById('video-preview');
const canvas = document.getElementById('capture-canvas');
const btnRecognize = document.getElementById('btn-recognize');
const btnRegister = document.getElementById('btn-register');
const resultStatus = document.getElementById('gate-label');
const resultMsg = document.getElementById('gate-message');
const welcomeName = document.getElementById('user-welcome-name');
const welcomeTicket = document.getElementById('user-welcome-ticket');
const genderIcon = document.getElementById('user-gender-icon');
const logContainer = document.getElementById('log-container');
const gateVisual = document.getElementById('gate-visual');
const gateLabel = document.getElementById('gate-label');
const accessHistory = document.getElementById('access-history');
const autoScanToggle = document.getElementById('auto-scan-toggle');
const appBody = document.getElementById('app-body');

let isProcessing = false;

// Inicializar Câmera
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user"
            } 
        });
        video.srcObject = stream;
        addLog('[INFO] Câmera inicializada com sucesso.');
    } catch (err) {
        addLog('[ERRO] Falha ao acessar câmera: ' + err.message);
        resultStatus.innerText = 'Erro de Câmera';
        resultMsg.innerText = 'Certifique-se de que a câmera está conectada e permitida.';
    }
}

function addLog(msg) {
    const div = document.createElement('div');
    div.innerText = `${new Date().toLocaleTimeString()} ${msg}`;
    logContainer.prepend(div);
}

function setUIState(state, statusText = '', msgText = '', iconName = 'user', gender = 'Man') {
    // Limpeza rigorosa de classes de estado
    appBody.classList.remove('scanning');
    appBody.classList.remove('success');
    appBody.classList.remove('error');
    
    if (state) {
        appBody.classList.add(state);
        addLog(`[UI] Estado alterado para: ${state}`);
        
        // Lógica visual da catraca
        if (state === 'success') {
            gateLabel.innerText = 'LIBERADA';
            document.getElementById('gate-icon').innerHTML = '<i data-lucide="unlock"></i>';
            resultMsg.style.display = 'block';
            welcomeName.innerText = statusText;
            welcomeTicket.innerText = msgText;
            welcomeName.style.color = 'var(--success)';
            
            // Definir ícone por gênero (mais flexível)
            const g = (gender || 'Man').toLowerCase();
            genderIcon.innerText = (g === 'woman' || g === 'feminino' || g === 'f') ? '👗' : '🎩';
            genderIcon.style.display = 'block';
        } else if (state === 'error') {
            gateLabel.innerText = 'BLOQUEADA';
            document.getElementById('gate-icon').innerHTML = '<i data-lucide="lock"></i>';
            resultMsg.style.display = 'block';
            welcomeName.innerText = statusText;
            welcomeTicket.innerText = msgText;
            welcomeName.style.color = 'var(--danger)';
            genderIcon.style.display = 'none';
        } else {
            gateLabel.innerText = 'BLOQUEADA';
            document.getElementById('gate-icon').innerHTML = '<i data-lucide="lock"></i>';
            resultMsg.style.display = 'none';
        }
    } else {
        gateLabel.innerText = 'BLOQUEADA';
        gateVisual.innerHTML = '<i data-lucide="lock"></i>';
        resultMsg.style.display = 'none';
    }
    
    // Removido ícone de resultado redundante
    if (window.lucide) lucide.createIcons();
}

async function captureFrame() {
    // Garantir que o canvas tenha o tamanho real do vídeo
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    addLog(`[DEBUG] Capturando frame ${canvas.width}x${canvas.height}...`);
    
    return new Promise(resolve => {
        // Aumentar qualidade para 0.9 para ajudar a IA
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
}

async function handleAction(endpoint, successMsg) {
    if (isProcessing) return;
    isProcessing = true;
    
    setUIState('scanning', 'Processando...', 'Analisando características faciais...', 'loader');
    addLog(`[INFO] Enviando requisição para ${endpoint}...`);

    const blob = await captureFrame();
    const formData = new FormData();
    formData.append('file', blob, 'capture.jpg');
    
    // Se for cadastro, envia o nome e o gênero
    if (endpoint === '/register') {
        const nameInput = document.getElementById('user-name-input');
        const name = nameInput.value.trim() || 'Visitante';
        formData.append('name', name);
        
        const genderSelect = document.getElementById('user-gender-select');
        const selectedGender = genderSelect ? genderSelect.value : 'auto';
        formData.append('gender', selectedGender);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (response.ok) {
            if (data.status === "Acesso Liberado" || endpoint === '/register') {
                const name = data.name || 'Visitante';
                const ticket = data.ticket || 'Padrão';
                
                setUIState('success', 
                    endpoint === '/register' ? 'SUCESSO!' : 'BEM-VINDO!', 
                    endpoint === '/register' ? `${name} cadastrado` : `${name} [${ticket}]`, 
                    'check-circle',
                    data.gender
                );
                
                const distInfo = data.distance ? ` (Dist: ${data.distance.toFixed(2)})` : '';
                addLog(`[OK] ${name} ${ticket}${distInfo}`);

                // Adicionar ao histórico se for reconhecimento
                if (endpoint === '/recognize') {
                    addToHistory(data.name, data.ticket);
                }
                
                // Limpar campo de nome após cadastro
                if (endpoint === '/register') {
                    document.getElementById('user-name-input').value = '';
                }
            } else {
                const distLog = data.distance ? ` (Dist: ${data.distance.toFixed(2)})` : '';
                setUIState('error', 'Acesso Negado', (data.message || 'Rosto não identificado.') + distLog, 'x-circle');
                addLog(`[AVISO] Acesso Negado${distLog}`);
            }
        } else {
            // Pega a mensagem de erro detalhada da API (ex: "Nenhum rosto detectado")
            const errorDetail = data.detail || 'Falha na comunicação com a API.';
            throw new Error(errorDetail);
        }
    } catch (err) {
        console.error('API Error:', err);
        setUIState('error', 'Erro na API', err.message, 'alert-triangle');
        addLog('[ERRO] ' + err.message);
    } finally {
        isProcessing = false;
        // Reset automático removido a pedido do usuário
    }
}

function addToHistory(name, ticket) {
    const item = document.createElement('div');
    item.className = 'history-item';
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    item.innerHTML = `
        <div class="result-icon" style="width: 32px; height: 32px; font-size: 0.8rem; margin: 0;">
            <i data-lucide="user"></i>
        </div>
        <div class="history-info">
            <span class="history-name" style="font-size: 0.8rem;">${name}</span>
            <span class="history-ticket" style="font-size: 0.65rem; color: var(--text-dim);">${time} - ${ticket}</span>
        </div>
    `;
    
    accessHistory.prepend(item);
    if (accessHistory.childNodes.length > 5) {
        accessHistory.removeChild(accessHistory.lastChild);
    }
    if (window.lucide) lucide.createIcons();
}

btnRecognize.addEventListener('click', () => handleAction('/recognize', 'Acesso Liberado'));
btnRegister.addEventListener('click', () => handleAction('/register', 'Usuário Registrado'));

// Loop de Reconhecimento Automático
setInterval(() => {
    if (autoScanToggle.checked && !isProcessing) {
        // Verifica se a tela NÃO está em estado de sucesso/erro (espera o reset de 3s)
        if (!appBody.classList.contains('success') && !appBody.classList.contains('error')) {
            handleAction('/recognize', 'Acesso Liberado');
        }
    }
}, 2000);

// Iniciar app
initCamera();
