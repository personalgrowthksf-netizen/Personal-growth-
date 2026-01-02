# Personal Growth & Career Operating System

## Overview

This is a full-stack web application for managing premium access codes at live event registration counters. The system allows administrators to generate one-time access codes for attendees, which are delivered via WhatsApp. Attendees use these codes to unlock a personal growth assessment system that provides customized career direction recommendations.

The project contains two parallel implementations:
1. **React/TypeScript SPA** (`client/src/`) - Modern stack with Vite, React, Tailwind CSS, and shadcn/ui components
2. **Vanilla HTML/CSS/JS** (`client/*.html`, `client/script.js`, `client/style.css`) - Standalone pages for admin, login, questions, and results

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React SPA**: Built with Vite, React 18, TypeScript, and wouter for routing
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom color theming via CSS variables
- **State Management**: TanStack React Query for server state, local component state for UI
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Build System**: esbuild for server bundling, Vite for client bundling
- **Development**: tsx for TypeScript execution, Vite dev server with HMR
- **API Pattern**: RESTful routes prefixed with `/api`

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains table definitions
- **Migrations**: Generated to `./migrations` directory via `drizzle-kit push`
- **In-Memory Fallback**: `MemStorage` class provides in-memory storage when database unavailable

### Code Organization
```
client/           # Frontend code
  src/            # React application
    components/ui # shadcn/ui components
    hooks/        # Custom React hooks
    lib/          # Utility functions
    pages/        # Route components
  *.html          # Vanilla HTML pages
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route definitions
  storage.ts      # Data access layer
  vite.ts         # Vite dev server setup
  static.ts       # Production static file serving
shared/           # Shared code between client/server
  schema.ts       # Drizzle database schema
```

### Build Process
- **Development**: `npm run dev` runs tsx with Vite middleware
- **Production**: `npm run build` compiles client with Vite, bundles server with esbuild
- **Output**: Built files go to `dist/` with client assets in `dist/public/`

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management
- **connect-pg-simple**: PostgreSQL session store for Express

### UI Framework
- **Radix UI**: Headless component primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-styled component library built on Radix
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Build Tools
- **Vite**: Frontend bundler with React plugin and HMR
- **esbuild**: Fast JavaScript bundler for server code
- **TypeScript**: Type checking across the codebase

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development banner display