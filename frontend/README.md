# RemindMe - Smart Task Manager

A modern, full-stack reminder application with secure authentication and persistent PostgreSQL storage.

## ✨ Key Features

- **Backend Persistence**: Your tasks are stored securely in PostgreSQL, ensuring reliability and structured data.
- **User Isolation**: Private accounts where each user sees only their own reminders.
- **Activity Logging**: Track user actions like logins, task creation, and updates.
- **Flexible Login**:
  - Standard Email/Password with OTP verification.
  - One-click **Google Sign-In**.
  - **Apple Sign-In** support.
- **Smart UI**: 
  - Real-time task syncing.
  - Intelligent auth error alerts (auto-hiding and specific messaging).
  - Modern dark/light mode surface.

## 🚀 Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express, Sequelize (PostgreSQL).
- **Security**: JWT (JSON Web Tokens), Bcryptjs for password hashing.

## 🛠 Setup Instructions

### 1. Prerequisites
- **Node.js** (v18+) installed.
- **PostgreSQL** installed and running.
- Create a database named `remind_app` in PostgreSQL.

### 2. Backend Configuration
Create a `.env` file in the `backend/` directory with the following:
```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=remind_app
PG_USER=postgres
PG_PASSWORD=your_postgresql_password
JWT_SECRET=your_jwt_secret
PORT=5000
GOOGLE_CLIENT_ID=your_google_id
```

### 3. Installation
Install dependencies for both frontend and backend:
```bash
# In the root directory (Frontend)
npm install

# In the backend directory
cd backend
npm install
```

### 4. Running the App
Start both servers:

**Backend:**
```bash
cd backend
npm run dev
```
*(The tables will be auto-created on the first run)*

**Frontend:**
```bash
# In the root directory
npm run dev
```

## 📝 Database Management
You can view user data and activity logs using **pgAdmin** or any PostgreSQL client. The tables `users`, `tasks`, and `activity_logs` are automatically synchronized by Sequelize.
