from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import cv2
import numpy as np
from deepface import DeepFace
import json
import os
import uuid
import random

# Lista de nomes fictícios para a simulação
FICTITIOUS_NAMES = [
    "Alexandre Silva", "Beatriz Santos", "Carlos Oliveira", "Daniela Lima", 
    "Eduardo Costa", "Fernanda Souza", "Gabriel Pereira", "Helena Rodrigues",
    "Ícaro Martins", "Juliana Alves", "Kevin Rocha", "Larissa Ferreira"
]

TICKET_TYPES = ["VIP ✨", "Pista 🎫", "Camarote 👑", "Backstage 🎸"]

from fastapi.responses import RedirectResponse
import threading

app = FastAPI(title="FREE ACCESS API", description="API de Biometria Facial para Eventos")

def warmup_model():
    """Pré-carrega o modelo de IA para que a primeira requisição seja rápida."""
    print("DEBUG: Aquecendo modelo de IA (Facenet)... Aguarde.")
    try:
        # Uma imagem preta pequena apenas para disparar o carregamento dos pesos
        dummy_img = np.zeros((160, 160, 3), dtype=np.uint8)
        DeepFace.represent(img_path=dummy_img, model_name="Facenet", detector_backend='opencv', enforce_detection=False)
        print("DEBUG: Modelo de IA carregado e pronto!")
    except Exception as e:
        print(f"DEBUG: Aviso no warmup: {e}")

@app.on_event("startup")
async def startup_event():
    # Executa o warmup em uma thread separada para não travar o início do servidor
    threading.Thread(target=warmup_model).start()

@app.get("/")
async def root():
    return RedirectResponse(url="/ui/")

# Montar a pasta frontend
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_path):
    app.mount("/ui", StaticFiles(directory=frontend_path, html=True), name="ui")

# Configurar CORS (para permitir que o App acesse a API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "database.json"

# Inicializar o "banco de dados" local (arquivo JSON)
if not os.path.exists(DB_FILE):
    with open(DB_FILE, "w") as f:
        json.dump({"users": []}, f)

def load_db():
    with open(DB_FILE, "r") as f:
        return json.load(f)

def save_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

@app.post("/register")
async def register_user(file: UploadFile = File(...), name: str = Form("Visitante"), gender: str = Form("auto")):
    """
    Cadastra um novo usuário extraindo as características faciais da imagem.
    """
    print(f"--- NOVO CADASTRO ---")
    print(f"Nome recebido: {name}")
    print(f"Gênero recebido do formulário: {gender}")
    
    try:
        # Ler a imagem
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Extrair características (embedding) usando DeepFace
        try:
            # Mudando para enforce_detection=True para garantir que só cadastre com rosto
            result = DeepFace.represent(img_path=img, model_name="Facenet", detector_backend='opencv', enforce_detection=True)
            
            if not result or len(result) == 0:
                raise HTTPException(status_code=400, detail="Não foi possível isolar um rosto. Tente focar melhor.")
        except HTTPException as e:
            raise e
        except Exception as e:
            print(f"DEBUG: Falha no represent: {str(e)}")
            raise HTTPException(status_code=400, detail="Erro ao analisar rosto. Verifique a iluminação.")
        
        embedding = result[0]["embedding"]
        
        user_id = str(uuid.uuid4())
        user_name = name
        ticket_type = "VIP ✨"

        # Lógica de Gênero: Manual ou Automático
        user_gender = gender
        if gender == "auto":
            try:
                analysis = DeepFace.analyze(img_path=img, actions=['gender'], detector_backend='opencv', enforce_detection=False)
                user_gender = analysis[0]["dominant_gender"]
            except:
                user_gender = "Unknown"

        # Salvar no BD
        db = load_db()
        db["users"].append({
            "id": user_id,
            "name": user_name,
            "ticket": ticket_type,
            "gender": user_gender,
            "embedding": embedding
        })
        save_db(db)

        print(f"DEBUG: Usuário {user_name} ({ticket_type}) cadastrado com sucesso!")
        return {
            "message": "Usuário registrado com sucesso", 
            "user_id": user_id,
            "name": user_name,
            "ticket": ticket_type
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"DEBUG: ERRO no processamento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

def euclidean_distance(source_representation, test_representation):
    euclidean_distance = source_representation - test_representation
    euclidean_distance = np.sum(np.multiply(euclidean_distance, euclidean_distance))
    euclidean_distance = np.sqrt(euclidean_distance)
    return euclidean_distance

@app.post("/recognize")
async def recognize_face(file: UploadFile = File(...)):
    """
    Recebe um frame da catraca e tenta reconhecer quem é o usuário.
    """
    print("DEBUG: Recebida requisição de reconhecimento...")
    try:
        # Ler a imagem
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Extrair embedding da pessoa na catraca
        print(f"DEBUG: Analisando rosto na imagem {img.shape[1]}x{img.shape[0]}...")
        try:
            result = DeepFace.represent(img_path=img, model_name="Facenet", detector_backend='opencv', enforce_detection=False)
            
            if not result or len(result) == 0:
                raise HTTPException(status_code=400, detail="Nenhum rosto identificado. Aproxime-se.")
        except Exception as e:
            print(f"DEBUG: Falha no represent: {str(e)}")
            raise HTTPException(status_code=400, detail="Erro ao analisar rosto.")

        target_embedding = result[0]["embedding"]

        db = load_db()
        best_match = None
        min_distance = float('inf')
        
        # Limite de distância para considerar "mesma pessoa" no Facenet (geralmente < 10)
        THRESHOLD = 10.0

        # Comparar com todos os usuários no BD
        # Comparar com todos os usuários no BD
        print(f"DEBUG: Comparando com {len(db['users'])} usuários cadastrados...")
        for user in db["users"]:
            dist = euclidean_distance(np.array(user["embedding"]), np.array(target_embedding))
            if dist < min_distance:
                min_distance = dist
                if dist < THRESHOLD:
                    best_match = user

        if best_match:
            print(f"DEBUG: Acesso LIBERADO para {best_match['name']} ({best_match['ticket']})")
            return {
                "status": "Acesso Liberado",
                "user_id": best_match["id"],
                "name": best_match["name"],
                "ticket": best_match["ticket"],
                "gender": best_match.get("gender", "Man"),
                "distance": float(min_distance)
            }
        else:
            print(f"DEBUG: Acesso NEGADO. Menor distância foi {min_distance:.2f}")
            return {"status": "Acesso Negado", "message": "Rosto não cadastrado no evento"}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"DEBUG: ERRO no reconhecimento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
