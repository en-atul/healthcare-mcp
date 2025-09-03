# Healthcare MCP App

A NestJS-based healthcare application with patient authentication, therapist management, appointment scheduling, and **MCP (Model Context Protocol) server for chat-based interactions**.

## Features

- **Patient Authentication**: Register and login with JWT tokens
- **Therapist Management**: View available therapists and their specializations
- **Appointment Scheduling**: Create, view, and manage appointments
- **MongoDB Integration**: Persistent data storage
- **JWT Security**: Secure authentication without Passport complexity
- **🆕 MCP Server**: Chat interface for patient interactions via AI assistants

## Prerequisites

- Node.js (v18 or higher)
- pnpm
- Docker and Docker Compose
- MongoDB (via Docker)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start MongoDB:
   ```bash
   docker-compose up -d
   ```

4. Seed therapist data:
   ```bash
   pnpm run seed:therapists
   ```

5. Start the application:
   ```bash
   pnpm run start:dev
   ```

The app will be available at `http://localhost:3000`

## 🆕 MCP Server Features

The healthcare app now implements the **proper Model Context Protocol (MCP)** architecture with a separate MCP server process.

### Architecture Flow:
```
User → Frontend → NestJS Backend → LLM → MCP Server → Result → LLM → NestJS → Frontend
```

### **What We've Built:**

1. **🏗️ Separate MCP Server** (`mcp-server.js`) - Runs as a separate process
2. **🔌 MCP Client Service** - NestJS service that connects to the MCP server
3. **🧠 LLM Service** - OpenAI integration for planning and formatting
4. **💬 Chat Controller** - Main endpoint that orchestrates the entire pipeline

### **Available MCP Tools:**

#### **`list_therapists`**
- Lists all available therapists with specializations
- No parameters required
- Example: "Show me all available therapists"

#### **`book_appointment`**
- Books an appointment with a therapist
- Parameters: `therapistId`, `appointmentDate`, `duration`, `notes?`
- Example: "Book me an appointment with Dr. Smith tomorrow at 2 PM for 60 minutes"

#### **`list_appointments`**
- Shows all upcoming appointments for a patient
- Parameters: `patientId`
- Example: "Show me my upcoming appointments"

#### **`cancel_appointment`**
- Cancels an existing appointment
- Parameters: `appointmentId`, `cancellationReason?`
- Example: "Cancel my appointment with ID abc123"

#### **`get_profile`**
- Retrieves patient profile information
- Parameters: `patientId`
- Example: "Show me my profile"

### **How It Works:**

1. **User sends message** to `/chat` endpoint
2. **OpenAI analyzes** the message and determines which MCP tool to call
3. **MCP Client** connects to the external MCP server process
4. **MCP Server** executes the tool and returns results
5. **OpenAI formats** the result into friendly text
6. **Response returned** to the user

### **Setup Instructions:**

1. **Start MCP Server** (in separate terminal):
   ```bash
   pnpm run mcp:server
   ```

2. **Start NestJS App** (in another terminal):
   ```bash
   pnpm run start:dev
   ```

3. **Test the Pipeline**:
   ```bash
   curl -X POST http://localhost:3000/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Show me available therapists"}'
   ```

### **Benefits of This Architecture:**

- ✅ **True MCP Protocol** - Follows the actual MCP specification
- ✅ **Separate Processes** - MCP server can run independently
- ✅ **Scalable** - Multiple NestJS instances can connect to one MCP server
- ✅ **Standard Compliant** - Works with any MCP-compatible client
- ✅ **Clean Separation** - Each component has a single responsibility

## API Endpoints

### Authentication

#### Register Patient
```
POST /auth/register
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "phone": "+1234567890",
  "address": "123 Main St"
}
```

#### Login Patient
```
POST /auth/login
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "password123"
}
```

### Therapists

#### List All Therapists
```
GET /therapists
```

#### Get Therapist by ID
```
GET /therapists/:id
```

#### Seed Therapists (Admin)
```
POST /therapists/seed
```

### Appointments

**Note**: All appointment endpoints require JWT authentication via `Authorization: Bearer <token>` header.

#### Create Appointment
```
POST /appointments
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "therapistId": "therapist_id_here",
  "appointmentDate": "2024-01-15T10:00:00.000Z",
  "duration": 60,
  "notes": "Initial consultation"
}
```

#### Get My Appointments (Patient)
```
GET /appointments/my-appointments
Authorization: Bearer <jwt_token>
```

#### Get Appointments by Therapist
```
GET /appointments/therapist/:therapistId
Authorization: Bearer <jwt_token>
```

#### Get All Appointments
```
GET /appointments
Authorization: Bearer <jwt_token>
```

#### Get Appointment by ID
```
GET /appointments/:id
Authorization: Bearer <jwt_token>
```

#### Update Appointment
```
PATCH /appointments/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "status": "confirmed",
  "notes": "Updated notes"
}
```

#### Delete Appointment
```
DELETE /appointments/:id
Authorization: Bearer <jwt_token>
```

### Patients

**Note**: All patient endpoints require JWT authentication.

#### Get All Patients
```
GET /patients
Authorization: Bearer <jwt_token>
```

#### Get My Profile
```
GET /patients/profile
Authorization: Bearer <jwt_token>
```

#### Get Patient by ID
```
GET /patients/:id
Authorization: Bearer <jwt_token>
```

## JWT Token Structure

The JWT token contains:
```json
{
  "sub": "patient_id",
  "email": "patient@example.com",
  "role": "patient",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Database Schema

### Patient
- email (unique)
- password (hashed)
- firstName, lastName
- dateOfBirth, phone, address
- role (default: "patient")

### Therapist
- email (unique)
- firstName, lastName
- specialization
- phone, address
- role (default: "therapist")
- isActive

### Appointment
- patientId (ref: Patient)
- therapistId (ref: Therapist)
- appointmentDate
- duration (minutes)
- status (scheduled, confirmed, completed, cancelled)
- notes, cancellationReason

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation with class-validator
- CORS enabled
- Request sanitization
- MCP server with secure authentication

## Development

- **Start dev server**: `pnpm run start:dev`
- **Build**: `pnpm run build`
- **Test**: `pnpm run test`
- **Seed data**: `pnpm run seed:therapists`

## Environment Variables

Create a `.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://mongoadmin:secret@localhost:27017/healthcare?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=your-openai-api-key-here
```

## 🧠 **Intelligent Chat with OpenAI**

The healthcare app now uses **OpenAI GPT-3.5-turbo** to intelligently understand user requests:

### **How It Works:**

1. **User sends message** (e.g., "Book me an appointment with Dr. Smith tomorrow at 2 PM for 60 minutes")
2. **OpenAI analyzes** the message and extracts:
   - **Intent**: `book-appointment`
   - **Parameters**: `therapistId`, `appointmentDate`, `duration`, `notes`
   - **Authentication requirement**: `true`
3. **MCP Server executes** the appropriate tool with extracted parameters
4. **Result returned** to user through the chat interface

### **Example Conversations:**

```
User: "I need to see a therapist for anxiety"
Assistant: "I can help you find a therapist. Let me show you the available options..."
[Lists therapists]

User: "Book me an appointment with Dr. Johnson next Tuesday at 3 PM for 90 minutes"
Assistant: "I'll book that appointment for you. I need you to be logged in first..."
[Books appointment after authentication]

User: "Show me my upcoming appointments"
Assistant: "Here are your upcoming appointments..."
[Lists appointments]
```

### **Benefits:**

- ✅ **Natural language understanding** - No need for specific commands
- ✅ **Intelligent parameter extraction** - Automatically understands dates, times, durations
- ✅ **Context awareness** - Understands user intent from various phrasings
- ✅ **Professional responses** - Human-like conversation flow
- ✅ **Error handling** - Gracefully handles unclear requests
