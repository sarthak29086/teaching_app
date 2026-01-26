import requests
import uuid

BASE_URL = "http://localhost:8000"

def test_login():
    try:
        print(f"Checking connection to {BASE_URL}...")
        try:
            response = requests.get(f"{BASE_URL}/docs")
            if response.status_code == 200:
                print("Backend is reachable!")
            else:
                print(f"Backend returned status: {response.status_code}")
                return
        except requests.exceptions.ConnectionError:
            print("Backend not reachable (ConnectionError). Is it running?")
            return

        # Register a temp user to test
        email = f"test_{uuid.uuid4().hex[:6]}@example.com"
        password = "password123"
        
        print("\nAttempting registration...")
        reg_payload = {"email": email, "password": password, "role": "student"}
        try:
            response = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
            if response.status_code in [200, 201]:
                print("Registration successful!")
            elif response.status_code == 400 and "registered" in response.text:
                 print("User likely already exists (expected).")
            else:
                 print(f"Registration failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Registration request failed: {e}")

        # Test Login
        print("\nAttempting login...")
        # The endpoint expects UserCreate which has email, password, full_name, role.
        # But for login, only email and password matter.
        login_payload = {"email": email, "password": password}
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        
        if response.status_code == 200:
            print("Login SUCCESSFUL!")
            print(f"Token: {response.json().get('access_token')[:20]}...")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_login()
