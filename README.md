# EBM Diagnosis Service

Hono.js Neo4j RAG service for AI-powered Evidence-Based Medicine diagnosis recommendations.

## Overview

This service provides real-time clinical decision support through graph-based diagnosis using Neo4j knowledge graphs and AI-powered analysis. It replaces legacy RAGFlow dependencies with a scalable Neo4j approach supporting 14,000+ diseases.

## Prerequisites

- Node.js 18+
- Neo4j Database
- API Keys: E2E Networks (primary), OpenAI/Google AI (fallback)

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys and Neo4j connection

# Development
npm run dev

# Production
npm run build
npm start
```

## Environment Variables

```env
# Core Configuration
PORT=3001
NODE_ENV=development

# Neo4j Database
NEO4J_URL=bolt://your-neo4j-host:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# AI Providers
E2E_NETWORKS_API_KEY=your-e2e-jwt-token
OPENAI_API_KEY=your-openai-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-key

# Authentication
API_KEY=your-service-api-key
```

## API Endpoints

### Production (v1)
- `GET /v1/diagnose` - Clinical diagnosis analysis

### Development (dev)
- `GET /dev/health` - Service health check
- `GET /dev/providers` - Provider status
- `GET /dev/neo4j` - Neo4j connection test
- `GET /dev/llm` - LLM functionality test
- `GET /dev/embedding` - Embedding service test

## Architecture

- **Framework**: Hono.js (fast web framework)
- **Database**: Neo4j (medical knowledge graph)
- **AI**: AI SDK v5 with multi-provider support
- **Fallback**: Intelligent provider switching with retry logic
- **Types**: Full TypeScript support with medical domain types

## Development

```bash
npm run dev          # Start development server
npm run typecheck    # Type checking
npm run lint         # Code linting
npm run format       # Code formatting
npm run check        # Full code quality check
```

