# GyanSetu System Design & Technical Notes

This file compiles key technical highlights, system design decisions, and potential interview questions for the GyanSetu setup.

---

## 🏗️ Architectural Overview
GyanSetu utilizes a modern decoupled three-tier architecture:
-   **Frontend**: React (Vite) Single Page Application (SPA), state managed via Context and hooks, styled with TailwindCSS.
-   **Backend**: FastAPI, utilizing asynchronous path operations and Dependency Injection.
-   **Database**: PostgreSQL (hosted on Supabase) accessed via SQLModel/SQLAlchemy.
-   **Media Services**: WebRTC Selective Forwarding Unit (SFU) powered by LiveKit.

---

## 📝 Key Interview Topics & Design Decisons

### Topic 1: Directory Layout & System Architecture
-   **Decoupled Architecture**: Separating the frontend static hosting (Vercel) from the stateless API backend (Render) ensures scalability, independent resource sizing, and ease of cross-platform porting (e.g. mobile apps).

### Topic 2: Database Schema & Relational Integrity (SQLModel)
-   **SQLModel Integration**: We use SQLModel to merge Pydantic schemas (data validation) and SQLAlchemy models (database ORM) into single unified classes. This prevents schema mismatch bugs and duplicate code.
-   **Self-Referential Hierarchy (`DriveItem`)**: The Cloud Drive uses a parent-child model where `parent_id` is a foreign key pointing to `driveitem.id`. This represents an infinite nested folder tree within a single table.
-   **Many-to-Many Relationships (`Enrollment`)**: A junction table that resolves the many-to-many relationship between Students (`User.id`) and `Course.id`.
-   **Key Constraints**: Fields like `course_id` and `uploader_id` are explicitly declared as foreign keys to maintain referential integrity in PostgreSQL.

### Topic 3: Authentication & Security (Argon2, JWT, OTP Flow)
-   **Argon2id Cryptographic Hashing**: Chosen over standard SHA256 or legacy bcrypt because it is the state-of-the-art hashing algorithm (OWASP recommended). It utilizes configurable time complexity, memory cost, and parallelism lanes, rendering it highly resistant to GPU/ASIC brute-force dictionary attacks.
-   **JWT Token Architecture**: Stateless authentication. The token contains cryptographic signatures (`HS256`) containing the user's `sub` (email) and `role`. This allows the server to verify claims instantly without querying the database for every single API request.
-   **OTP Recovery Model**: Generates temporary, single-use, 4-digit numeric verification codes that are zero-padded (e.g. `0042`) and written with an explicit expiration datetime checking (`expires_at > datetime.utcnow()`). Once verified, the database sets the `used` flag to `True` to prevent replay attacks.

### Topic 4: Virtual Cloud Drive System (Self-referential models, operations)
-   **Recursive Access Check (`has_folder_access`)**: Traverses the parent hierarchy upwards from a folder to the root. This checks student enrollments or ownership at any level of nesting.
-   **Cycle Prevention Algorithm (DFS Loop-Check)**: When moving a folder, the backend checks that the destination is not the folder itself, nor a subfolder of the folder. It traverses the destination's parents upward: if it hits the moving folder's ID, it aborts the move, preventing folder tree corruption.
-   **Self-Healing Sync**: When listing the root drive, the API automatically checks if any newly created course is missing a root directory and creates it. This avoids database sync mismatches.
-   **Recursive Deletion**: Deleting a folder invokes a depth-first recursive deletion of all nested files (deleting database rows and removing physical files on disk) and subfolders, preventing orphaned files.

### Topic 5: Assignment & Grading Engine (File validations, lateness logic)
-   **Strict PDF Format Validation**: Enforced via server-side checks on the file extension (`.pdf`) and the MIME content-type (`application/pdf`) to prevent arbitrary file upload execution vulnerabilities (e.g. uploading a PHP/Python executable).
-   **Submission Replaced Mechanism**: If a student resubmits an assignment, the API automatically fetches the old submission, physically deletes the obsolete file from disk, deletes its matching `DriveItem` SQL record, and commits the new file to keep disk usage lean.
-   **Time-Bound Lateness Calculation**: Computes time deltas (`submitted_at - due_date`) dynamically at the database level. It formats the lateness string into readable indicators (e.g. `2d 4h 15m late`) to display to the teacher.
-   **Unified Storage Drive Integration**: When assignments are created, a subfolder is created in the course's cloud drive. Student submissions are saved as files inside this subfolder. This links the assignments portal directly to the folder manager.

### Topic 6: Live WebRTC Classrooms (LiveKit integration)
-   **SFU (Selective Forwarding Unit) Architecture**: Chosen over mesh (peer-to-peer WebRTC) because peer-to-peer bandwidth cost scale quadratically ($O(N^2)$). An SFU scales linearly ($O(N)$) because each participant sends their feed *once* to the LiveKit server, which forwards it to the others.
-   **Cryptographic Access Tokens**: Frontend clients cannot connect directly to LiveKit without authorization. The FastAPI server signs JWT tokens using the `LIVEKIT_API_SECRET`. These tokens bundle permission grants (e.g. `room_join=True`, `room=room_name`).
-   **Decoupled Frontend SDK Integration**: The frontend imports `@livekit/components-react`. It renders pre-built UI audio/video grids and handles WebRTC renegotiation internally once it is initialized with the signed token.

### Topic 7: Production Cloud Deployment Blueprint (Render, Supabase, Vercel)
-   **Static Frontend CDN Distribution**: The React code is compiled to raw static files and hosted on Vercel's Edge CDN servers. This provides global caching and rapid loading with automatic SSL certificates.
-   **Stateless Backend Hosting**: The backend runs as a containerized/virtualized Uvicorn process on Render. It receives variables like `DATABASE_URL` and `SECRET_KEY` from Render's secure secrets store rather than hardcoded environment files.
-   **Supabase Transaction/Session Connection Pooling**: Supabase default ports (`5432` / IPv6) are unreachable by Render's free tier (which lacks IPv6 support). We route traffic through Supabase's **Session Pooler** (running over IPv4 on port `5432`/`6543`), which acts as an proxy translator between Render and the core DB.
-   **Environment Separation**: Different variables are used in development (e.g. `localhost:8000`) and production (`gyansetu-backend.onrender.com`), enabling zero-downtime hot-reloads on Git pushes (CI/CD).
