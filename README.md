# 🐔 PoultryHub — Smart Broiler Farm Management System

> **Version 2.0** | Full-stack poultry farm management platform with AI assistant, real-time FCR tracking, PDF reports, and multi-role access control.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Database Setup](#database-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Default Accounts](#default-accounts)
- [Configuration](#configuration)
- [API Overview](#api-overview)
- [Screenshots](#screenshots)
- [Version History](#version-history)

---

## Overview

**PoultryHub** is a full-stack web application designed for broiler poultry farm management. It supports a **CEO/Admin** who oversees multiple farms and **Farmers** who log daily operations. The platform provides live FCR (Feed Conversion Ratio) calculations, batch lifecycle tracking, expense & sales management, automated PDF report generation, and an integrated **AI veterinary assistant** powered by Groq Cloud LLMs.

---

## ✨ Features

### 👨‍💼 CEO / Admin
- Dashboard with all farm and farmer summaries
- Approve / reject farmer batch requests
- View detailed reports for all batches across all farms
- Download PDF batch closing reports
- AI Assistant with RAG (Retrieval-Augmented Generation) on farm knowledge base
- Manage farmer profiles and farm details

### 👨‍🌾 Farmer
- Register and manage farm profile
- Create and manage broiler batches (BATCH-01, BATCH-02 … sequential codes)
- **Daily Records** — log mortality, feed consumed, body weight per day
- **Auto-calculated FCR** — `FCR = Cumulative Feed (kg) / Live Biomass (kg)`
- **Standard FCR** — auto-populated Cobb 500 benchmarks by flock age
- Feed load management with real-time stock tracking
- Sales records in **Indian Rupees (₹)**
- Expense tracking by category (Feed, Medicine, Labor, Utilities, Misc)
- Vaccine schedule logging
- Batch remarks / notes per day
- PDF batch closing report (with ₹ revenue summary)
- History of all past batches
- AI Veterinary Assistant (chat-based, context-aware)

### 🤖 AI Assistant
- Powered by **Groq Cloud** (Qwen / LLaMA models)
- RAG system with in-JVM ONNX embeddings (AllMiniLmL6V2)
- Context-aware answers about flock health, FCR, feed, disease
- Separate chat sessions for CEO and farmers
- Persistent conversation history

---

## 🛠 Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 4.1.0 |
| Security | Spring Security + JWT (HS384) |
| ORM | Hibernate / Spring Data JPA |
| Database | MySQL 8.0 |
| AI / LLM | LangChain4j + Groq Cloud API |
| Embeddings | ONNX AllMiniLmL6V2 (in-JVM, offline) |
| PDF Reports | iText / OpenPDF |
| Build | Maven (mvnw wrapper included) |

### Frontend
| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | React 18 + Vite |
| UI Library | Tailwind CSS + shadcn/ui |
| State | React Query (TanStack Query) |
| Routing | React Router v6 |
| Charts | Recharts |
| PDF Export | jsPDF + html2canvas |
| HTTP Client | Axios |

---

## 📁 Project Structure

```
PoultryHub/
├── backend/                          # Spring Boot API
│   ├── src/main/java/com/poultry/poultrymanagement/
│   │   ├── config/                   # Security, AI, Data initializer
│   │   ├── controller/               # REST controllers
│   │   ├── dto/                      # Request / Response DTOs
│   │   ├── entity/                   # JPA entities
│   │   ├── repository/               # Spring Data repositories
│   │   ├── security/                 # JWT filter, UserDetails
│   │   └── service/                  # Business logic, AI, PDF reports
│   ├── src/main/resources/
│   │   ├── application.properties    # App configuration
│   │   └── db/migration/             # SQL schema files
│   └── pom.xml
│
├── frontend/                         # React + Vite app
│   ├── src/
│   │   ├── components/               # Reusable UI components
│   │   ├── lib/
│   │   │   ├── api/                  # Axios API clients
│   │   │   └── reportExportUtils.ts  # PDF/CSV export helpers
│   │   ├── pages/
│   │   │   ├── ceo/                  # CEO dashboard pages
│   │   │   └── farmer/               # Farmer dashboard pages
│   │   └── App.tsx
│   ├── vite.config.ts                # Vite + API proxy config
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Java | 21+ |
| Maven | 3.9+ (or use `mvnw`) |
| Node.js | 18+ |
| npm | 9+ |
| MySQL | 8.0+ |

---

### Database Setup

1. Start MySQL and create the database:

```sql
CREATE DATABASE IF NOT EXISTS poultry_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

2. Run the schema SQL (located in `backend/src/main/resources/db/`):

```bash
mysql -u root -p poultry_management < backend/src/main/resources/db/schema.sql
```

> The app uses `spring.jpa.hibernate.ddl-auto=none` — schema must be created manually.

---

### Backend Setup

```bash
cd backend

# Configure your DB credentials and AI API key in:
# src/main/resources/application.properties

# Run with Maven wrapper
./mvnw spring-boot:run          # Linux/Mac
mvnw.cmd spring-boot:run        # Windows
```

Or build and run the JAR:

```bash
./mvnw package -DskipTests
java -jar target/poultry-management-0.0.1-SNAPSHOT.jar
```

Backend starts at: **http://localhost:8080**

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at: **http://localhost:5173**

The Vite dev server proxies all `/api` requests to `http://localhost:8080`.

---

## 🔐 Default Accounts

> These are seeded automatically on first backend startup.

| Role | Email | Password |
|---|---|---|
| CEO / Admin | `ceo@poultry.local` | `password123` |

Farmer accounts are created through the **Register** page, or seeded via SQL.

### Demo Farmer Accounts (seed data)

| Name | Email | Password | Batch |
|---|---|---|---|
| Rajan Kumar | `rajan@poultry.local` | `password123` | BATCH-01 (Completed, 42 days) |
| Priya Devi | `priya@poultry.local` | `password123` | BATCH-02 (Active, running) |

---

## ⚙️ Configuration

Edit `backend/src/main/resources/application.properties`:

```properties
# MySQL
spring.datasource.url=jdbc:mysql://localhost:3306/poultry_management
spring.datasource.username=root
spring.datasource.password=root

# JWT
jwt.secret=MyVeryLongDevelopmentSecretKeyForPoultryManagement2026
jwt.expiration-ms=86400000

# AI Provider (Groq Cloud — default)
ai.provider=groq
ai.api-key=YOUR_GROQ_API_KEY
ai.base-url=https://api.groq.com/openai/v1
ai.model-name=llama-3.3-70b-versatile
ai.temperature=0.2

# Other supported providers: gemini, openai, openrouter, ollama
```

> Get a free Groq API key at: https://console.groq.com

---

## 📡 API Overview

| Group | Base Path | Description |
|---|---|---|
| Auth | `/api/auth` | Login, Register |
| Farmers | `/api/farmers` | Farmer profile CRUD |
| Farms | `/api/farms` | Farm CRUD |
| Batches | `/api/batches` | Batch lifecycle |
| Daily Records | `/api/daily-records` | Per-day flock data |
| Feed Loads | `/api/feed-loads` | Feed delivery logs |
| Sales | `/api/sales` | Sale transactions |
| Expenses | `/api/expenses` | Cost tracking |
| Vaccines | `/api/vaccines` | Vaccination schedule |
| Remarks | `/api/remarks` | Batch notes |
| Reports | `/api/reports` | PDF report download |
| AI Chat | `/api/ai` | AI veterinary assistant |
| CEO | `/api/ceo` | Admin-only operations |

All endpoints (except `/api/auth/**`) require `Authorization: Bearer <JWT>`.

---

## 📊 Key Business Logic

### FCR Calculation
```
FCR = Cumulative Feed Consumed (kg)
      ─────────────────────────────
      Remaining Birds × Avg Weight (g) / 1000
```

### Standard FCR (Cobb 500 Benchmark)
Auto-populated by flock age in days — from 0.750 (Day 1) to 1.800 (Day 42+).

### Batch Code Generation
Sequential codes: `BATCH-01`, `BATCH-02`, `BATCH-03` … (never UUID hex strings)

### Currency
All monetary values displayed in **Indian Rupees (₹)**.

---

## 🗂 Version History

### v2.0 — November 2026 *(Current)*
- ✅ Fixed registration and login auth bugs
- ✅ FCR auto-calculation using live biomass formula
- ✅ Standard FCR auto-populated from Cobb 500 benchmarks
- ✅ All currency changed from USD (`$`) to INR (`₹`)
- ✅ Batch codes simplified: `BATCH-01` format (was UUID hex)
- ✅ Fixed `DecimalFormat` crash in PDF report (`Rs.` prefix quoting)
- ✅ CEO admin account seeded on startup — no manual DB entry needed
- ✅ Removed test/demo accounts from seed data
- ✅ AI assistant integrated: Groq Cloud + in-JVM ONNX embeddings (RAG)
- ✅ PDF batch closing report with ₹ revenue breakdown
- ✅ Farmer registration assigns farm ID and farmer ID automatically
- ✅ Daily record initialization fixed — no longer duplicates on batch start
- ✅ Feed stock correctly tracked per batch
- ✅ Demo data: 2 farmer accounts with realistic 42-day and 12-day batch data

### v1.0 — October 2026
- Initial commit — base CRUD for farms, batches, daily records
- Basic JWT auth, role-based routing (CEO / FARMER)
- Frontend scaffold with React + Tailwind

---

## 📄 License

This project is for academic and demonstration purposes.

---

## 👨‍💻 Author

**Kowshickkumar** — [GitHub](https://github.com/Kowshickkumar-26)
