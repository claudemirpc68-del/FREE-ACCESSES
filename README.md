# 🚪 FREE ACCESS - Sistema de Acesso Facial Inteligente

O **FREE ACCESS** é uma solução premium de controle de acesso automatizado que utiliza Inteligência Artificial para reconhecimento facial e detecção de gênero em tempo real. O sistema simula uma catraca física com animações mecânicas e feedback visual personalizado.

![Dashboard Preview](https://img.shields.io/badge/Status-Conclu%C3%ADdo-success?style=for-the-badge)
![Tech](https://img.shields.io/badge/IA-DeepFace-blue?style=for-the-badge)
![UI](https://img.shields.io/badge/Design-Premium-gold?style=for-the-badge)

---

## ✨ Funcionalidades Principais

- **🔍 Reconhecimento Biométrico:** Identificação instantânea de usuários cadastrados com alta precisão.
- **🎭 Detecção de Gênero:** A IA detecta automaticamente se o usuário é Homem ou Mulher, exibindo ícones dinâmicos (🎩/👗) na tela de boas-vindas.
- **🚧 Catraca Virtual:** Animação física de uma barra metálica que gira 90º para simular a liberação do acesso.
- **🛠️ Cadastro Inteligente:** Sistema de registro rigoroso que impede cadastros sem detecção facial clara.
- **📱 Dashboard Responsivo:** Interface otimizada tanto para Desktop quanto para dispositivos móveis (Moto G56).

---

## 🚀 Tecnologias Utilizadas

### Backend
- **Python 3.10+**
- **FastAPI:** Framework web de alta performance.
- **DeepFace:** Biblioteca de IA para análise facial (Facenet/VGG-Face).
- **OpenCV:** Processamento de imagem.

### Frontend
- **HTML5 & CSS3:** Design moderno com efeitos de *glassmorphism* e animações *bounce*.
- **JavaScript (Vanilla):** Lógica de captura de câmera e integração com API.
- **Lucide Icons:** Ícones vetoriais elegantes.

---

## 🛠️ Como Instalar e Rodar

### 1. Clonar o Repositório
```bash
git clone https://github.com/claudemirpc68-del/FREE-ACCESSES.git
cd FREE-ACCESSES
```

### 2. Configurar o Backend
```bash
cd backend
python -m venv venv
# No Windows:
.\venv\Scripts\activate
# Instalar dependências:
pip install -r requirements.txt
```

### 3. Iniciar o Servidor
```bash
python main.py
```
O servidor estará rodando em `http://localhost:8000`.

### 4. Acessar o Frontend
Basta abrir o arquivo `frontend/index.html` no seu navegador ou acessar via IP da rede (ex: `http://192.168.18.163:8000`).

---

## 👤 Autor

Desenvolvido por **Claudemir** com auxílio de IA para criação de sistemas de segurança inteligentes.

---
*Este projeto é parte de uma solução de controle de acesso VIP para eventos e empresas.*
