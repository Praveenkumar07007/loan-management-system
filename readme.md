# Loan Management System (LMS)

A full-stack Loan Management System built with Next.js, Express.js, TypeScript, MongoDB, and NextAuth for Google OAuth authentication.

### Demo Video

[![LMS Demo](https://img.youtube.com/vi/d1jaA67rFB4/0.jpg)](https://www.youtube.com/watch?v=d1jaA67rFB4)

https://www.youtube.com/watch?v=d1jaA67rFB4

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Praveenkumar07007/loan-management-system.git

```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Env Configuration

### Backend Environment Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a `.env` file by copying the example:
```bash
cp .env.example .env
```

3. Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/lms
# For MongoDB Atlas, use:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/lms

# JWT Secret (Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Seed Account Credentials (for development)
SEED_ADMIN_EMAIL=admin@lms.dev
SEED_ADMIN_PASSWORD=AdminPass123
SEED_SALES_EMAIL=sales@lms.dev
SEED_SALES_PASSWORD=SalesPass123
SEED_SANCTION_EMAIL=sanction@lms.dev
SEED_SANCTION_PASSWORD=SanctionPass123
SEED_DISBURSEMENT_EMAIL=disbursement@lms.dev
SEED_DISBURSEMENT_PASSWORD=DisbursementPass123
SEED_COLLECTION_EMAIL=collection@lms.dev
SEED_COLLECTION_PASSWORD=CollectionPass123
SEED_BORROWER_EMAIL=borrower@lms.dev
SEED_BORROWER_PASSWORD=BorrowerPass123
```

### Frontend Environment Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Create a `.env`:
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## DB Setup

### Option 1: Local MongoDB

1. Install MongoDB Community Server:
   - **Windows**: Download from [MongoDB Downloads](https://www.mongodb.com/try/download/community)
   - **Mac**: `brew install mongodb-community`
   - **Linux**: Follow [MongoDB Installation Guide](https://docs.mongodb.com/manual/administration/install-on-linux/)

2. Start MongoDB:
   ```bash
   # Windows
   mongod

   # Mac/Linux
   sudo mongod
   ```

3. MongoDB will run on `mongodb://localhost:27017` by default

### Option 2: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Create a database user
5. Whitelist your IP address (or allow all for development) imp**
6. Get your connection string
7. Update `MONGODB_URI` in backend `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/lms
   ```

### Seed the Database

After setting up MongoDB, seed the database with test users:

```bash
cd backend
npm run seed
```

This will create:
- 1 Admin user
- 1 Sales user
- 1 Sanction user
- 1 Disbursement user
- 1 Collection user
- 1 Borrower user


## Running the Application

### Start MongoDB (if not already running)

```bash
# Terminal 1
mongod
```

### Start Backend Server

```bash
# Terminal 2
cd backend
npm run dev
```

The backend will run on `http://localhost:3001`

### Start Frontend Server

```bash
# Terminal 3
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## Available Scripts

### Backend Scripts

```bash
cd backend

# Development server
npm run dev

# Seed database with test data
npm run seed
```

### Frontend Scripts

```bash
cd frontend

# Development server 
npm run dev

```

### Documents

#### Upload Salary Slip
for now uploaded documents will be saved in virtual machine or local system. later we can use s3 bucket or some binary file store

## 👥 User Roles & Credentials

### Default Seed Users

After running `npm run seed`, the following users are created:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lms.dev | AdminPass123 |
| Sales | sales@lms.dev | SalesPass123 |
| Sanction | sanction@lms.dev | SanctionPass123 |
| Disbursement | disbursement@lms.dev | DisbursementPass123 |
| Collection | collection@lms.dev | CollectionPass123 |
| Borrower | borrower@lms.dev | BorrowerPass123 |

### Role Permissions with dashboard screenshots

- **Admin**: Full access to all modules

- **Sales**: View and manage registered borrowers
- **Sanction**: Review, approve, or reject loan applications
- **Disbursement**: Disburse sanctioned loans
- **Collection**: Record payments and manage active loans
- **Borrower**: Apply for loans and view application status


