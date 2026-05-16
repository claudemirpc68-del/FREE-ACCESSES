# Usar uma imagem Python oficial
FROM python:3.10-slim

# Instalar dependências do sistema necessárias para OpenCV e DeepFace
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar o arquivo de requisitos e instalar as dependências
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o código do backend e do frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Expor a porta que o FastAPI usa
EXPOSE 8000

# Comando para rodar a aplicação
CMD ["python", "backend/main.py"]
