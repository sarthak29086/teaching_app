
import requests

BASE_URL = "http://localhost:8000"

def test_login():
    try:
        # Try to login with a known user (or just check health)
        # Note: we need a user to test login. 
        # I'll just check if the backend is reachable first.
        print(f"Checking connection to {BASE_URL}...")
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print("Backend is reachable!")
        else:
            print(f"Backend returned status: {response.status_code}")
            
        # Register a temp user to test
        import uuid
        email = f"test_{uuid.uuid4().hex[:6]}@example.com"
        password = "password123"
        
        print("\nAttempting registration...")
        reg_payload = {"email": email, "password": password, "role": "student"}
        try:
             # This might fail if user exists, which is fine
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
        login_payload = {"username": email, "password": password} # OAuth2 uses form data usually, but let's check path
        # Check login endpoint: /api/auth/login or /token?
        # Main.py usually has /api/auth/login
        
        # Checking main.py: 
        # @app.post("/api/auth/login", response_model=Token)
        # def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
        
        # It expects form data!
        response = requests.post(f"{BASE_URL}/api/auth/login", data=login_payload)
        
        if response.status_code == 200:
            print("Login SUCCESSFUL!")
            print(f"Token: {response.json().get('access_token')[:20]}...")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_login()
