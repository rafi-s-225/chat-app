# 💬 ChatApp — Modern Glassmorphic Real-Time Platform

A feature-packed, production-ready full-stack real-time chat application built with the **MERN Stack** (MongoDB, Express, React, Node.js), **Socket.io**, and **Nodemailer**. Features glassmorphic UI design, DNS MX email validation, 6-digit OTP verification, Forgot/Reset password flows, multiple chat channels, live message search, and customizable user profiles.

---

## ✨ Features

### 🎨 Frontend & Design
- **Modern Glassmorphic UI**: Ambient mesh gradient glows, frosted glass panels, smooth keyframe animations, and custom scrollbars.
- **Typography & Icons**: Built using Google Font (*Plus Jakarta Sans*) with expressive UI feedback.
- **Multiple Chat Channels**: Segregated rooms (`# general`, `# tech-talk`, `# random`, `# design`) with live room switching.
- **Live Message Search**: Instant real-time message filtering by text content or sender username.
- **Typing Indicators**: Real-time feedback when other channel members are typing.
- **Custom Avatars & Settings**: Profile modal allowing users to edit display names, choose vibrant avatar color themes, or update passwords.
- **Mobile Responsive**: Includes collapsible sidebar and mobile overlay drawer menu.

### 🔐 Security & Email Validation
- **Real Email Exist Verification**: Automatic **DNS MX record lookup** (`dns.promises.resolveMx`) ensuring users can only register with real, existing email domains configured to receive mail.
- **6-Digit OTP Email Verification**: 2-Step signup flow requiring OTP verification dispatched via Nodemailer.
- **Forgot & Reset Password**: Full password recovery flow with email OTP verification and secure bcrypt hashing.
- **JWT Authentication**: Secure token-based session management with protected routes and auto-logout handle.
- **Dev Mode Fallback**: Automatically logs OTP codes to the server console when SMTP credentials are not configured in environment variables.

---

## 🛠️ Tech Stack

- **Frontend:** React 19 (Vite), React Router v7, Socket.io-client, Axios, Vanilla CSS Variables & Glassmorphism.
- **Backend:** Node.js, Express 5, Socket.io 4, Nodemailer.
- **Database:** MongoDB Atlas, Mongoose.
- **Security & Validation:** JWT (JsonWebToken), BcryptJS, Node `dns` MX Resolver.

---

## 📁 Directory Structure

```text
chat-app/
├── client/                     # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/         # ProtectedRoute & Layout components
│   │   ├── context/            # AuthContext & SocketContext providers
│   │   ├── pages/              # Login, Register, ForgotPassword, Chat pages
│   │   ├── App.jsx             # Main router configuration
│   │   ├── index.css           # Glassmorphic Design System & Tokens
│   │   └── main.jsx
│   ├── index.html              # Font links & metadata
│   ├── package.json
│   └── vite.config.js          # API proxy configuration
│
└── server/                     # Express + Socket.io Backend API
    ├── config/                 # Database connection (Mongoose)
    ├── middleware/             # JWT auth middleware
    ├── models/                 # User & Message Mongoose Schemas
    ├── routes/                 # Auth & Message API endpoints
    ├── utils/                  # Email service (Nodemailer + DNS MX resolver)
    ├── server.js               # Entry point & Socket.io event handling
    ├── .env                    # Environment configuration
    └── package.json
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **MongoDB Atlas** database connection string (or local MongoDB)

---

### 1. Backend Setup

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create or update the `.env` file in `server/.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/chatapp?retryWrites=true&w=majority
   JWT_SECRET=your_jwt_secret_key_here
   CLIENT_URL=http://localhost:5173

   # Optional: Nodemailer SMTP Configuration for Real Emails
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_specific_password
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   ```
   > *Note: If `EMAIL_USER` and `EMAIL_PASS` are omitted, OTP codes will cleanly log to the server console in Dev Mode.*

4. Start the server:
   ```bash
   npm run dev
   # or
   npm run start
   ```

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

---

## 📡 API Endpoints Summary

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Validates email domain via DNS MX, creates account, sends 6-digit OTP |
| `POST` | `/api/auth/verify-otp` | Confirms OTP code and activates user account |
| `POST` | `/api/auth/resend-otp` | Dispatches a new OTP verification code |
| `POST` | `/api/auth/login` | Authenticates email & password, issues JWT token |
| `POST` | `/api/auth/forgot-password` | Checks email existence and sends reset password OTP |
| `POST` | `/api/auth/verify-reset-otp` | Verifies validity of reset OTP code |
| `POST` | `/api/auth/reset-password` | Resets user password with bcrypt hashing |
| `GET`  | `/api/auth/profile` | Returns logged-in user profile (Protected) |
| `PUT`  | `/api/auth/profile` | Updates username, avatar color, or password (Protected) |

### Message Routes (`/api/messages`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/messages/:room` | Fetches historical messages for specified chat channel (Protected) |

---

## 📜 License
ISC License — Feel free to use and modify for learning and internship projects!
