# Serverless Framework Fine-Grained Authorization Example

This project demonstrates how to implement fine-grained authorization in a serverless application using Permit.io. It showcases both Attribute-Based Access Control (ABAC) and Relationship-Based Access Control (ReBAC) patterns.

## Features

- Document and Folder management with fine-grained access control
- User authentication with JWT
- ABAC implementation based on user attributes (department and classification)
- ReBAC implementation with role derivation between Folders and Documents
- Serverless deployment using AWS Lambda and DynamoDB
- Policy Decision Point (PDP) using Permit.io

## Prerequisites

- Node.js 20.x
- AWS Account
- Permit.io Account
- Docker (for running PDP locally)
- Serverless Framework CLI

## Project Structure

```
.
├── src/
│   ├── auth/              # Authentication related files
│   ├── handlers/          # Lambda function handlers
│   └── helper_functions/  # Utility functions
├── scripts/              # Setup scripts
├── serverless.yml       # Serverless Framework configuration
├── docker-compose.yml   # PDP container configuration
└── init_permit.js       # Permit.io initialization
```

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd documan
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PERMIT_SDK_TOKEN=<your-permit-sdk-token>
PERMIT_PDP_URL=<your-pdp-url>
```

4. Start the PDP container:
```bash
docker-compose up -d
```

5. Set up Permit.io policies:
```bash
node scripts/setup-permit-poilicies.js
```

6. Deploy the application:
```bash
serverless deploy
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token

### Documents
- `POST /document` - Create a new document
- `GET /documents/{id}` - Get a document by ID

### Folders
- `POST /folders` - Create a new folder

## Authorization Model

### ABAC (Attribute-Based Access Control)
- Documents have a `department` attribute
- Users have `department` and `classification` attributes
- Only users with matching department and "Admin" classification can create/read documents

### ReBAC (Relationship-Based Access Control)
- Documents can belong to Folders (parent-child relationship)
- Folder admins automatically get owner access to documents within the folder
- Folder editors automatically get editor access to documents within the folder

## Testing

1. Register a user:
```bash
curl -X POST <your-url>/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password",
    "department": "Engineering",
    "classification": "Admin"
  }'
```

2. Login to get JWT token:
```bash
curl -X POST <your-url>/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

3. Use the JWT token in subsequent requests:
```bash
curl -X POST <your-url>/dev/document \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Document",
    "content": "Test Content"
  }'
```

