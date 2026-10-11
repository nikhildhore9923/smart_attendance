import requests
import base64
import cv2

URL = "http://localhost:8000/liveness"
TEST_IMAGE = r"D:\NUAA-Liveness\Detectedface\ClientFace\0001\0001_00_00_01_0.jpg"

def main():
    print("=== TASK 8.8: TEST LIVENESS ENDPOINT ===")
    
    with open(TEST_IMAGE, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
    payload = {
        "image": encoded_string
    }
    
    print("Sending POST request to /liveness...")
    try:
        response = requests.post(URL, json=payload)
        response.raise_for_status()
        data = response.json()
        print("Response received:")
        import json
        print(json.dumps(data, indent=2))
        
        if data.get('available') and 'is_live' in data:
            print("[SUCCESS] FastAPI Liveness Integration WORKS.")
        else:
            print("[ERROR] Issue with response format.")
            
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")

if __name__ == "__main__":
    main()
