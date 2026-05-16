import requests
import os

# Configurações
BASE_URL = "http://127.0.0.1:8000"
# Caminhos das imagens (Apontando diretamente para onde foram geradas)
IMG_A = r"C:\Users\FAMÍLIA\.gemini\antigravity\brain\5fffc914-9809-4270-ac00-f2864329bc82\pessoa_a_1778712949289.png"
IMG_B = r"C:\Users\FAMÍLIA\.gemini\antigravity\brain\5fffc914-9809-4270-ac00-f2864329bc82\pessoa_b_1778713061611.png"

def test_register():
    print("\n--- Testando Registro (Pessoa A) ---")
    if not os.path.exists(IMG_A):
        print(f"Erro: Arquivo {IMG_A} não encontrado!")
        return
    
    with open(IMG_A, "rb") as f:
        files = {"file": f}
        response = requests.post(f"{BASE_URL}/register", files=files)
        print(f"Status: {response.status_code}")
        print(f"Resposta: {response.json()}")

def test_recognize_correct():
    print("\n--- Testando Reconhecimento (Pessoa A - Deve dar ACESSO LIBERADO) ---")
    if not os.path.exists(IMG_A):
        print(f"Erro: Arquivo {IMG_A} não encontrado!")
        return

    with open(IMG_A, "rb") as f:
        files = {"file": f}
        response = requests.post(f"{BASE_URL}/recognize", files=files)
        print(f"Status: {response.status_code}")
        print(f"Resposta: {response.json()}")

def test_recognize_wrong():
    print("\n--- Testando Reconhecimento (Pessoa B - Deve dar ACESSO NEGADO) ---")
    if not os.path.exists(IMG_B):
        print(f"Erro: Arquivo {IMG_B} não encontrado!")
        return

    with open(IMG_B, "rb") as f:
        files = {"file": f}
        response = requests.post(f"{BASE_URL}/recognize", files=files)
        print(f"Status: {response.status_code}")
        print(f"Resposta: {response.json()}")

if __name__ == "__main__":
    try:
        # Verifica se o servidor está online
        requests.get(BASE_URL)
        
        test_register()
        test_recognize_correct()
        test_recognize_wrong()
    except requests.exceptions.ConnectionError:
        print(f"Erro: Não foi possível conectar ao servidor em {BASE_URL}. Certifique-se de que o uvicorn está rodando!")
