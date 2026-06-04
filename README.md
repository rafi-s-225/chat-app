# Real-Time Chat App 💬

A full-stack real-time chat application built with the MERN stack and Socket.io.

## Features
- Real-time messaging with Socket.io
- User authentication with JWT
- Online users list
- Typing indicators
- Message persistence with MongoDB
- Protected routes

## Tech Stack
- **Frontend:** React (Vite), Socket.io-client, Axios, React Router
- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB Atlas, Mongoose
- **Auth:** JWT, bcryptjs

## Getting Started

### Backend Setup
cd server
npm install
npm run dev

### Frontend Setup
cd client
npm install
npm run dev

## Environment Variables
Create a `.env` file in the `server/` folder:
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
