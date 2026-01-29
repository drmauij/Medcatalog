# MedCatalog

## Overview

MedCatalog is a B2B medical supplies ordering platform that connects medical product suppliers with clinics. The platform enables suppliers to manage their product catalogs and clinics to browse products, request quotations, and place orders. The application follows a role-based access model where users register as either a supplier or a clinic.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite for development and production builds

The frontend follows a feature-based structure with pages for different user roles (supplier and clinic dashboards), shared components, and custom hooks for common functionality like authentication and toast notifications.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **HTTP Server**: Node.js native HTTP server
- **API Design**: RESTful API with `/api` prefix for all endpoints
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL using connect-pg-simple

The backend uses a storage layer abstraction pattern (`IStorage` interface) to decouple data access logic from route handlers, making it easier to test and modify data sources.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM for type-safe database queries
- **Schema Validation**: Zod with drizzle-zod for runtime validation of insert schemas
- **Migrations**: Drizzle Kit for schema migrations (stored in `/migrations`)

Key database tables:
- `users` and `sessions` - Authentication (managed by Replit Auth)
- `suppliers` and `clinics` - Organization entities
- `user_roles` - Maps users to their organization role
- `categories` and `products` - Product catalog
- `quotation_requests` and `quotation_items` - Quote management (with user tracking: createdByUserId, respondedByUserId)
- `orders` and `order_items` - Order management (with user tracking: createdByUserId, confirmedByUserId)
- `supplier_invitations` - Team member invitations for suppliers
- `clinic_invitations` - Team member invitations for clinics

### Action History & Contact Visibility
The application tracks all user actions on quotations and orders:
- **createdByUserId**: Who created the quotation request
- **respondedByUserId**: Who responded with pricing (supplier)
- **createdByUserId** (orders): Who placed the order (clinic)
- **confirmedByUserId**: Who confirmed the order (supplier)

All quotation and order displays show:
- Inline summary of the latest action at the bottom
- Expandable full history showing all actions with contact details (name, email, phone)
- Linked order information for quotations that resulted in orders

### Authentication Flow
1. User authenticates via Replit Auth (OpenID Connect)
2. Session created and stored in PostgreSQL
3. User selects role (supplier or clinic) on first login
4. Role and entity association stored in `user_roles` table
5. Subsequent requests use session to identify user and their role

## External Dependencies

### Third-Party Services
- **Replit Auth**: Primary authentication provider using OpenID Connect protocol
- **PostgreSQL**: Database hosted via Replit's managed database service

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migration tools
- `passport` / `openid-client`: Authentication handling
- `express-session` / `connect-pg-simple`: Session management with PostgreSQL storage
- `@tanstack/react-query`: Frontend data fetching and caching
- `@radix-ui/*`: Accessible UI primitives
- `tailwindcss`: Utility-first CSS framework
- `zod`: Runtime type validation

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for signing session cookies
- `ISSUER_URL`: OpenID Connect issuer URL (defaults to Replit's OIDC)
- `REPL_ID`: Replit environment identifier