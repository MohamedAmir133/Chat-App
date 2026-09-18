# 🚀 Sunday — Microservices Real-Time Chat & Messaging Platform

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js%2014-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

A production-ready, enterprise-grade real-time chat and group messaging application built using a **NestJS Microservices Monorepo** architecture and a modern **Next.js 14** web client.

Features real-time bi-directional messaging, group chats, live typing indicators, user presence tracking, rich media attachments, soft & permanent deletion controls, admin analytics, and cloud database integrations.

---

## 📑 Table of Contents
- [🏗️ Architecture Overview](#️-architecture-overview)
- [✨ Core Features](#-core-features)
- [🛠️ Tech Stack & Service Matrix](#️-tech-stack--service-matrix)
- [📡 REST API Endpoints Specification](#-rest-api-endpoints-specification)
- [🔌 WebSocket Real-Time Events (Socket.io)](#-websocket-real-time-events-socketio)
- [🐰 Microservices Event Patterns (RabbitMQ)](#-microservices-event-patterns-rabbitmq)
- [🗄️ Database Schemas & Models](#️-database-schemas--models)
- [📂 Project Directory Structure](#-project-directory-structure)
- [⚡ Quick Start (Local Development)](#-quick-start-local-development)
- [⚙️ Environment Variables Reference](#️-environment-variables-reference)
- [☁️ Cloud Deployment (Vercel + Railway)](#️-cloud-deployment-vercel--railway)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
- [🛡️ Security & Production Best Practices](#️-security--production-best-practices)
- [❓ Troubleshooting & FAQ](#-troubleshooting--faq)
- [📜 License](#-license)

---

## 🏗️ Architecture Overview

The system is decoupled into event-driven NestJS microservices communicating asynchronously via **RabbitMQ** message queues, with **Socket.io WebSockets** handling client connection state and live updates.

```mermaid
graph TD
    Client["💻 Next.js 14 Web Frontend"] -->|REST / HTTP| Gateway["⚡ API Gateway (NestJS)"]
    Client -->|WebSockets| SocketServer["🔌 Socket.io Gateway Server"]

    subgraph "Event-Driven Microservices Layer (RabbitMQ Broker)"
        Gateway -->|AMQP RPC| AuthMS["🔐 Auth Microservice"]
        Gateway -->|AMQP RPC| ChatMS["💬 Chat Microservice"]
        Gateway -->|AMQP RPC| UserMS["👤 User Microservice"]
        SocketServer -->|AMQP RPC| ChatMS
        SocketServer -->|AMQP RPC| UserMS
    end

    subgraph "Persistence & Cloud Layer"
        AuthMS -->|TypeORM| Postgres[("🐘 PostgreSQL / Supabase")]
        UserMS -->|TypeORM| Postgres
        ChatMS -->|TypeORM / Room Metadata| Postgres
        ChatMS -->|Mongoose| MongoDB[("🍃 MongoDB Atlas (Messages)")]
        SocketServer -->|ioredis| Redis[("🔴 Upstash Redis (Presence)")]
        Client -->|Direct Upload| Cloudinary["☁️ Cloudinary Media CDN"]
    end
```

---

## ✨ Core Features

### 💬 Real-Time Chat & Communications
- **Direct 1-on-1 Chats**: Automatic room creation upon messaging any user.
- **Group Conversations**: Group profile creation, avatar customizers, descriptions, owner role management, member add/remove.
- **Saved Messages**: Personal notepad room (`Own_<userName>_messages`) to save links, media, and private notes.
- **Live Typing Indicators**: Animated typing dots emitted via WebSockets.
- **Presence & Online Status**: Real-time connection tracking powered by Upstash Redis.
- **Unread Counters & Read Receipts**: Instant badges updating unread counts.

### 📝 Rich Content & Message Controls
- **Media Uploads**: Images and video attachments integrated directly with Cloudinary.
- **Inline Editing**: Edit existing text messages in real-time.
- **Soft Deletion**: Messages display `Message Deleted` in regular user streams while retaining audit logs.
- **Admin Inspector & Hard Deletion**: Admins can inspect original deleted message text and trigger permanent database purges.

### 🛡️ Security & Administration
- **JWT Authentication**: Secure stateless token authentication with guards across gateway and microservices.
- **User Block List**: Block/unblock users to filter out unwanted messages.
- **Admin Control Panel**: View platform metrics (total users, rooms, messages), room hierarchies, categorized chat logs, and perform soft/hard deletions.

### 📱 Responsive Desktop & Mobile UX
- **Desktop View**: Full-width/height layout (100vw / 100vh).
- **Mobile View**: Drawer-less smooth tab navigation with dedicated back-arrow support.

---

## 🛠️ Tech Stack & Service Matrix

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14, React 18, TypeScript | Modern UI with CSS variables, Lucide Icons & Responsive Layouts |
| **API Gateway** | NestJS, Express | REST Routing, Rate Limiting, CORS & Socket.io WebSockets |
| **Auth Microservice** | NestJS, Passport, JWT, Bcrypt | User authentication, token issuance & verification |
| **Chat Microservice** | NestJS, Mongoose, TypeORM | Room management, message persistence & soft/hard deletion |
| **User Microservice** | NestJS, TypeORM, Mongoose | Profile management, global user search & block list |
| **Message Broker** | RabbitMQ | RPC communication channels (`auth_queue`, `chat_queue`, `user_queue`) |
| **Relational Database** | PostgreSQL / Supabase | User accounts, profiles, room metadata & memberships |
| **Document Database** | MongoDB Atlas / Mongoose | High-throughput message storage and attachment history |
| **Cache & Presence** | Upstash Redis / ioredis | Fast key-value store for user connection tracking (`presence:userId`) |
| **Media Hosting** | Cloudinary CDN | Image & video attachment storage |

---

## 📡 REST API Endpoints Specification

### 🔐 Auth Endpoints (`/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | Public | Register a new user account |
| `POST` | `/auth/login` | Public | Authenticate user & return JWT token cookie |
| `POST` | `/auth/logout` | Authenticated | Clear user session & cookie |

### 👤 User & Profile Endpoints (`/user`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/user/profile` | Authenticated | Fetch current user's profile |
| `PUT` | `/user/profile` | Authenticated | Update user profile details (Name, Bio, Country) |
| `GET` | `/user/search?q=` | Authenticated | Global search for users by name or email |
| `POST` | `/user/:id/block` | Authenticated | Block a specific user |
| `DELETE` | `/user/:id/block` | Authenticated | Unblock a user |
| `GET` | `/user/blocked-users` | Authenticated | Get list of blocked user IDs |

### 💬 Rooms & Messages Endpoints (`/rooms`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/rooms/direct` | Authenticated | Get or create a 1-on-1 direct room (or self-room) |
| `GET` | `/rooms/my-rooms` | Authenticated | Fetch all rooms & active conversations for current user |
| `GET` | `/rooms/:roomId/messages` | Member | Fetch message history for a specific room |
| `POST` | `/rooms/group` | Authenticated | Create a new group room |
| `PUT` | `/rooms/group/:roomId` | Group Owner | Update group name, description, or group avatar |
| `POST` | `/rooms/group/:roomId/members` | Group Owner | Add members to group |
| `DELETE` | `/rooms/group/:roomId/members/:targetUserId` | Group Owner | Remove member from group |
| `PUT` | `/rooms/:roomId/messages/:messageId` | Sender | Edit message content |
| `DELETE` | `/rooms/:roomId/messages/:messageId` | Sender / Admin | Soft delete message (displays "Message Deleted") |

### ⚡ Admin Control Panel (`/admin`) — *(Role: ADMIN)*
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/stats` | Admin | Overview stats (Total Users, Rooms, Messages) |
| `GET` | `/admin/users` | Admin | List all registered users |
| `GET` | `/admin/rooms` | Admin | List all rooms and member rosters |
| `GET` | `/admin/messages` | Admin | List all room messages with original content inspector |
| `DELETE` | `/admin/rooms/:id` | Admin | Delete room and memberships |
| `DELETE` | `/admin/messages/:id` | Admin | Soft-delete message |
| `DELETE` | `/admin/messages/:id/permanent` | Admin | Hard purge message permanently from MongoDB |

---

## 🔌 WebSocket Real-Time Events (Socket.io)

### Client → Server Events
| Event Name | Payload Format | Description |
| :--- | :--- | :--- |
| `join_room` | `{ roomId: string }` | Join Socket.io room channel for real-time broadcasts |
| `send_message` | `{ recipientId: string, roomId: string, content: string, fileUrl?: string, messageType?: string }` | Send message to 1-on-1 or group room |
| `typing_start` | `{ recipientId: string, roomId: string }` | Notify active chat partner of typing state |
| `typing_stop` | `{ recipientId: string, roomId: string }` | Stop typing state notification |
| `mark_read` | `{ recipientId: string, roomId: string }` | Clear unread status |

### Server → Client Events
| Event Name | Payload Format | Description |
| :--- | :--- | :--- |
| `new_message` | `MessageObject` | Emitted instantly to room members on new message |
| `user_typing` | `{ senderId: string, isTyping: boolean }` | Broadcast typing status |
| `user_presence` | `{ userId: string, isOnline: boolean }` | Broadcast user online/offline status |
| `group_updated` | `{ roomId: string, updates: Object }` | Group metadata change alert |
| `member_added` | `{ roomId: string, newMember: Object }` | Member added to group alert |

---

## 🐰 Microservices Event Patterns (RabbitMQ)

| Target Service | RPC Pattern | Description |
| :--- | :--- | :--- |
| **`auth`** | `register` | Validate and register new user |
| **`auth`** | `login` | Verify credentials & issue JWT payload |
| **`user`** | `getUserProfile` | Fetch user entity & profile |
| **`user`** | `updateUserProfile` | Mutate user details |
| **`user`** | `searchUsers` | Execute partial search query |
| **`chat`** | `createDirectRoom` | Resolve 1-on-1 room or self-room |
| **`chat`** | `getRoomMessages` | Retrieve MongoDB message trajectory |
| **`chat`** | `deleteMessage` | Flag `isDeleted = true` |
| **`chat`** | `reallyDeleteMessage` | Execute `deleteOne` in MongoDB |
| **`chat`** | `admin.getAllRooms` | Admin query across room entities |

---

## 🗄️ Database Schemas & Models

### 🐘 PostgreSQL Tables (TypeORM Entities)
- **`users`**: `id` (UUID), `name`, `email`, `password_hash`, `role` (`user` / `admin`), `created_at`.
- **`user_profiles`**: `id`, `user_id`, `bio`, `country`, `profile_picture`.
- **`rooms`**: `id` (UUID), `name`, `description`, `type` (`direct` / `group`), `group_picture`, `owner_id`.
- **`room_members`**: `id`, `room_id`, `user_id`, `role` (`owner` / `member`), `joined_at`.

### 🍃 MongoDB Collections (Mongoose Schemas)
- **`messages`**:
  ```ts
  {
    chatRoomId: String,       // Index
    senderId: String,         // Index
    recipientId: String,
    content: String,
    fileUrl: String,
    messageType: String,      // 'text' | 'image' | 'video'
    isDeleted: Boolean,       // Soft delete flag
    isEdited: Boolean,
    createdAt: Date,
    updatedAt: Date
  }
  ```

### 🔴 Redis In-Memory Keys
- **`presence:{userId}`**: Set containing active Socket `clientId`s. Automatically expires when empty.

---

## 📂 Project Directory Structure

```
Chat-App/
├── apps/
│   ├── auth/                    # Auth Microservice (JWT, Passwords)
│   ├── chat/                    # Chat Microservice (Rooms, Messages, Deletion)
│   ├── chat-app_gateway/        # REST & Socket.io API Gateway & Admin Endpoints
│   ├── user/                    # User Microservice (Profiles, Search, Blocking)
│   └── web/                     # Next.js 14 Frontend Application
├── libs/
│   ├── common/                  # Shared DTOs, Utilities & Interfaces
│   ├── database/                # TypeORM Entities, MongoDB Schemas & DB Module
│   ├── Guards/                  # Auth Guards & Roles Guards
│   └── sockets/                 # Socket.io Gateway Config & Presence Service
├── docker-compose.yml           # Local Development Infrastructure (RabbitMQ, Postgres, Redis, Mongo)
├── nest-cli.json                # NestJS Monorepo CLI Configuration
└── package.json                 # Workspace Scripts & Monorepo Dependencies
```

---
<!-- 
## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Docker Desktop**: Required for local PostgreSQL, MongoDB, Redis, and RabbitMQ.

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/Chat-App.git
cd Chat-App

# Install Root Dependencies (Backend)
npm install

# Install Frontend Dependencies
cd apps/web
npm install
cd ../..
```

### 3. Start Local Infrastructure with Docker
```bash
docker-compose up -d
```
This spins up:
- **PostgreSQL** on `localhost:5433`
- **MongoDB** on `localhost:27017`
- **Redis** on `localhost:6379`
- **RabbitMQ** on `localhost:5672` (Management console on `http://localhost:15672`)

### 4. Run Microservices & Frontend

Start all 4 NestJS microservices:
```bash
# Terminal 1: Run all backend services concurrently
npm run build:all
npm run start:prod:all
```

Start the Next.js Frontend:
```bash
# Terminal 2: Run Web Client
cd apps/web
npm run dev
```

Open [http://localhost:3400](http://localhost:3400) in your browser!

---

## ⚙️ Environment Variables Reference

| Variable | Description | Local Default | Production Example |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `development` | `production` |
| `PORT` | API Gateway Port | `6000` | `6000` |
| `RABBITMQ_URL` | AMQP Broker URI | `amqp://guest:guest@localhost:5672` | `amqp://guest:guest@rabbitmq.railway.internal:5672` |
| `DB_HOST` | PostgreSQL Host | `localhost` | `aws-1-eu-west-1.pooler.supabase.com` |
| `DB_PORT` | PostgreSQL Port | `5433` | `5432` |
| `DB_USER` | PostgreSQL Username | `postgres` | `postgres.xbeanvhjsxpackawnhna` |
| `DB_PASSWORD` | PostgreSQL Password | `postgres` | `YOUR_SUPABASE_PASSWORD` |
| `DB_NAME` | PostgreSQL Database | `chatapp` | `postgres` |
| `DB_SSL` | Enable SSL for DB | `false` | `true` |
| `MONGO_URI` | MongoDB Connection URI | `mongodb://localhost:27017/chatapp` | `mongodb+srv://user:pass@cluster.mongodb.net/chatapp` |
| `REDIS_HOST` | Redis Cache Host | `localhost` | `great-chow-285578.upstash.io` |
| `REDIS_PORT` | Redis Cache Port | `6379` | `6379` |
| `REDIS_PASSWORD` | Redis Auth Password | - | `UPSTASH_TOKEN` |
| `REDIS_TLS` | Enable TLS for Redis | `false` | `true` |
| `JWT_SECRET` | Secret for signing tokens | `secret_key` | `crypto_random_hex_string` |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` | `1d` |

--- -->
