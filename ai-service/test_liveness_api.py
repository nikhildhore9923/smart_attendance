import requests
import base64
import json

URL = "http://localhost:8000/liveness"

def test_image(filepath, label):
    with open(filepath, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode('utf-8')
    
    payload = {"image": img_b64}
    try:
        response = requests.post(URL, json=payload)
        res_json = response.json()
        print(f"--- TEST: {label} ---")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(res_json, indent=2)}\n")
    except Exception as e:
        print(f"Error for {label}: {e}")

def test_invalid():
    payload = {"image": "invalid_base64_data_@@@!!!"}
    try:
        response = requests.post(URL, json=payload)
        print(f"--- TEST: Invalid Image ---")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}\n")
    except Exception as e:
        print(f"Error for Invalid: {e}")

if __name__ == "__main__":
    live_img = r"D:\NUAA-Liveness\Detectedface\ClientFace\0001\0001_00_00_01_0.jpg"
    spoof_img = r"D:\NUAA-Liveness\Detectedface\ImposterFace\0001\0001_00_00_01_0.jpg"
    
    test_image(live_img, "Live Image")
    test_image(spoof_img, "Spoof Image")
    test_invalid()
