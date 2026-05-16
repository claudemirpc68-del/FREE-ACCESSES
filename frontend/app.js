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
const gateLabel = document.getElementById('gate-label');
const accessHistory = document.getElementById('access-history');
const autoScanToggle = document.getElementById('auto-scan-toggle');
const appBody = document.getElementById('app-body');
const statusIconMain = document.getElementById('status-icon-main');

let isProcessing = false;

// Lógica de Troca de Abas
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        
        // Atualizar botões nav
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Atualizar conteúdos das abas
        tabContents.forEach(tab => {
            tab.classList.remove('active');
            if (tab.id === targetTab) tab.classList.add('active');
        });
        
        addLog(`[UI] Mudou para aba: ${targetTab}`);
    });
});

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
        addLog('[INFO] Câmera pronta.');
    } catch (err) {
        addLog('[ERRO] Câmera: ' + err.message);
    }
}

function addLog(msg) {
    if (!logContainer) return;
    const div = document.createElement('div');
    div.innerText = `${new Date().toLocaleTimeString()} ${msg}`;
    logContainer.prepend(div);
}

function setUIState(state, statusText = '', msgText = '', iconName = 'lock', gender = 'Man') {
    appBody.classList.remove('scanning', 'success', 'error');
    
    if (state) {
        appBody.classList.add(state);
        
        if (state === 'success') {
            gateLabel.innerText = 'LIBERADA';
            statusIconMain.innerHTML = '<i data-lucide="unlock"></i>';
            resultMsg.style.display = 'block';
            welcomeName.innerText = statusText;
            welcomeTicket.innerText = msgText;
            
            const g = (gender || 'Man').toLowerCase();
            genderIcon.innerText = (g === 'woman' || g === 'feminino' || g === 'f') ? '👗' : '🎩';
        } else if (state === 'error') {
            gateLabel.innerText = 'BLOQUEADA';
            statusIconMain.innerHTML = '<i data-lucide="shield-alert"></i>';
            resultMsg.style.display = 'block';
            welcomeName.innerText = statusText;
            welcomeTicket.innerText = msgText;
            welcomeName.style.color = 'var(--danger)';
        } else if (state === 'scanning') {
            statusIconMain.innerHTML = '<i data-lucide="refresh-cw" class="spin"></i>';
        }
    } else {
        gateLabel.innerText = 'BLOQUEADA';
        statusIconMain.innerHTML = '<i data-lucide="lock"></i>';
        resultMsg.style.display = 'none';
    }
    
    if (window.lucide) lucide.createIcons();
}

async function captureFrame() {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
}

async function handleAction(endpoint, successMsg) {
    if (isProcessing) return;
    isProcessing = true;
    
    setUIState('scanning');
    
    const blob = await captureFrame();
    const formData = new FormData();
    formData.append('file', blob, 'capture.jpg');
    
    if (endpoint === '/register') {
        const nameInput = document.getElementById('user-name-input');
        const name = nameInput.value.trim() || 'Visitante';
        formData.append('name', name);
        formData.append('gender', document.getElementById('user-gender-select').value);
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
                setUIState('success', 
                    endpoint === '/register' ? 'SUCESSO!' : 'BEM-VINDO!', 
                    endpoint === '/register' ? `${name} cadastrado` : `${name}`, 
                    'unlock',
                    data.gender
                );
                
                if (endpoint === '/recognize') addToHistory(data.name, data.ticket);
                if (endpoint === '/register') document.getElementById('user-name-input').value = '';
                
                // Volta ao estado normal após 4 segundos
                setTimeout(() => setUIState(null), 4000);
            } else {
                setUIState('error', 'Acesso Negado', data.message || 'Rosto não identificado.');
                setTimeout(() => setUIState(null), 3000);
            }
        } else {
            throw new Error(data.detail || 'Erro na API');
        }
    } catch (err) {
        setUIState('error', 'Erro', err.message);
        addLog('[ERRO] ' + err.message);
        setTimeout(() => setUIState(null), 3000);
    } finally {
        isProcessing = false;
    }
}

function addToHistory(name, ticket) {
    const item = document.createElement('div');
    item.className = 'history-item';
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    item.innerHTML = `
        <div class="status-badge" style="background: rgba(168, 85, 247, 0.1); color: var(--primary); border: none;">
            <i data-lucide="user"></i>
        </div>
        <div class="history-info">
            <span class="history-name">${name}</span>
            <span class="history-ticket">${time} - ${ticket}</span>
        </div>
    `;
    
    accessHistory.prepend(item);
    if (accessHistory.childNodes.length > 5) accessHistory.removeChild(accessHistory.lastChild);
    if (window.lucide) lucide.createIcons();
}

btnRecognize.addEventListener('click', () => handleAction('/recognize', 'Acesso Liberado'));
btnRegister.addEventListener('click', () => handleAction('/register', 'Usuário Registrado'));

setInterval(() => {
    if (autoScanToggle.checked && !isProcessing) {
        if (!appBody.classList.contains('success') && !appBody.classList.contains('error')) {
            handleAction('/recognize', 'Acesso Liberado');
        }
    }
}, 3000);

initCamera();

