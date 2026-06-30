# GyanSetu - Virtual Classroom & Learning Management System

A modern, full-stack Virtual Classroom and Learning Management System (LMS) built with a **FastAPI** backend and a **React (Vite)** frontend. It features live video conferencing integration (via LiveKit), announcements, course management, student enrollment, and note uploads.

---

## 📂 Project Structure

```
teaching_app/
├── backend/            # FastAPI backend application
│   ├── app/            # Main FastAPI source code (routes, schemas, models)
│   ├── static/         # Directory for uploaded notes, files, and PDFs
│   ├── docker-compose.yml # PostgreSQL and local LiveKit server setup
│   ├── requirements.txt # Python dependencies
│   └── *.py            # Migration and database utility scripts
├── frontend/           # React + Vite frontend application
│   ├── src/            # React source code (components, pages, services)
│   ├── public/         # Static public assets
│   ├── tailwind.config.cjs # Tailwind CSS configuration
│   └── package.json    # Frontend scripts and dependencies
└── README.md           # Project documentation (this file)
```

---

## 🛠️ Technology Stack & Setup Answers

### 1. Is Docker being used in this project?
**Yes, Docker is the primary way to run the database.**
- There is a `backend/docker-compose.yml` configured to run:
  - A **PostgreSQL 16** database container (mapped to host port `5433`).
  - A **LiveKit Server** container.
- To run the PostgreSQL database, ensure Docker Desktop is started and run:
  ```bash
  cd backend
  docker compose up -d
  ```
- **SQLite Alternative:** If you ever need to run the application fully locally without Docker, the database engine is configured to dynamically support SQLite as well (`sqlite:///./teaching_app.db`) simply by updating your `.env` file.

### 2. Are we using n8n?
**No, the current codebase does not use n8n.**
- The **Forgot Password / OTP Login** flow generates a 4-digit code on the backend and sends it directly using **standard SMTP** (configured via Gmail SMTP details in your `backend/.env` file).
- The email-sending function is located in [email_utils.py](file:///c:/Users/Sarthak%20Kardam/Documents/Coding/teaching_app/backend/app/email_utils.py).
- If you previously used n8n to send these emails or route notifications via a webhook, you can easily replace the direct SMTP call in `email_utils.py` with an HTTP request to your local API or n8n workflow using standard Python library calls (e.g., using `requests` or `httpx`).

### 3. How to use Local AI (e.g., Ollama) instead of Cloud APIs / n8n?
If you want to add AI features (e.g., automatic notes summary, explanation bot, or question generator) running fully locally on your PC, you can call a local AI model provider (like **Ollama**) directly.

#### 💡 Option A: Calling Local AI from the FastAPI Backend (Python)
You can call Ollama's local server (default: `http://localhost:11434`) using standard libraries.

1. Install the `openai` or `httpx` package:
   ```bash
   pip install openai
   ```
2. Call your local Llama/Mistral model in a backend route:
   ```python
   from openai import OpenAI

   # Initialize client pointing to Ollama's local port
   client = OpenAI(
       base_url="http://localhost:11434/v1",
       api_key="ollama" # Required but ignored by Ollama
   )

   def generate_notes_summary(content: str):
       response = client.chat.completions.create(
           model="llama3", # Or whatever local model you have pulled in Ollama
           messages=[
               {"role": "system", "content": "You are a helpful teaching assistant."},
               {"role": "user", "content": f"Summarize this lecture material:\n\n{content}"}
           ]
       )
       return response.choices[0].message.content
   ```

#### 💡 Option B: Calling Local AI from the React Frontend (JavaScript)
You can fetch directly from your frontend components:
```javascript
async function askLocalAI(prompt) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt: prompt,
      stream: false
    })
  });
  const data = await response.json();
  return data.response;
}
```

---

## 🚀 How to Run the Application Locally

### 1. Running the Backend (FastAPI)

#### A. Configure your Environment Variables (`backend/.env`)
Make sure you have a `backend/.env` file. The application is configured to run with **PostgreSQL** by default, but you can also use **SQLite** if you need a zero-setup local database:

* **For PostgreSQL (Primary - Requires Docker PostgreSQL running on port 5433):**
  ```env
  DATABASE_URL=postgresql://postgres:postgres@localhost:5433/teaching_app
  SECRET_KEY=teaching_app
  ACCESS_TOKEN_EXPIRE_MINUTES=1440
  ```
* **For SQLite (Alternative - Local file database):**
  ```env
  DATABASE_URL=sqlite:///./teaching_app.db
  SECRET_KEY=teaching_app
  ACCESS_TOKEN_EXPIRE_MINUTES=1440
  ```

#### B. Install Python Dependencies
It is recommended to run within a virtual environment.
```bash
cd backend
python -m venv .venv
# On Windows (Command Prompt/PowerShell):
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

#### C. Run Database Initialization & Migrations
Verify the database connection and apply migrations:
```bash
python check_db.py
python migrate_class_session.py
```

#### D. Start the FastAPI Dev Server
```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
The backend API documentation will be available at `http://127.0.0.1:8000/docs`.

---

### 2. Running the Frontend (React + Vite)

#### A. Configure Frontend Environment (`frontend/.env`)
Ensure `frontend/.env` is pointing to your backend URL:
```env
VITE_API_URL=http://localhost:8000
VITE_LIVEKIT_URL=wss://teachingapp-v70u17fi.livekit.cloud
```

#### B. Install Node Packages
```bash
cd frontend
npm install
```

#### C. Start the Dev Server
```bash
npm run dev
```
The frontend application will be running at `http://localhost:5173`.

---

## 🛠️ Utility Scripts (Backend)

- **`check_db.py`**: Runs a check on your database connection, ensuring tables and the necessary live-classroom columns exist.
- **`migrate_class_session.py`**: Adds missing schema fields (like `room_name` and `participants`) for LiveKit sessions.
- **`reset_passwords.py`**: A utility script to reset all database user passwords to `password123` using secure Argon2 hashing. Useful if you lose access to dev accounts.
