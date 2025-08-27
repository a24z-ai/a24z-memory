# Node.js API Project Note Guidelines

## Preferred Note Types

### 🏗️ API Architecture Decisions

- REST vs GraphQL design choices
- Database schema and migration strategies
- Authentication and authorization patterns
- Middleware and routing decisions
- **Tags**: `architecture`, `api`, `decision`

### 🔧 Backend Patterns

- Request/response handling patterns
- Error handling and logging strategies
- Database query patterns and optimization
- Service layer organization
- **Tags**: `pattern`, `backend`, `nodejs`

### 🔒 Security Implementations

- Authentication flow documentation
- Input validation and sanitization
- Rate limiting and protection mechanisms
- **Tags**: `security`, `authentication`, `validation`

### 🗄️ Database Insights

- Schema design decisions and rationale
- Query optimization techniques
- Migration strategies and gotchas
- **Tags**: `database`, `schema`, `optimization`

### 🐛 API Gotchas

- Common request/response issues
- Database connection and pooling problems
- Async/await patterns and error handling
- **Tags**: `gotcha`, `api`, `async`

## Preferred Tags

### API & HTTP

- `api`, `rest`, `graphql`, `endpoints`
- `middleware`, `routing`, `cors`
- `request`, `response`, `validation`

### Database

- `database`, `sql`, `prisma`, `mongoose`
- `migrations`, `schema`, `queries`
- `optimization`, `indexing`

### Authentication & Security

- `authentication`, `authorization`, `jwt`
- `security`, `validation`, `sanitization`
- `rate-limiting`, `cors`, `csrf`

### Node.js Ecosystem

- `nodejs`, `express`, `fastify`, `koa`
- `async`, `promises`, `streams`
- `npm`, `dependencies`, `modules`

## API Specific Guidelines

### Endpoint Documentation

```markdown
## POST /api/users Authentication

Located in `src/routes/users.ts` - handles user creation with email verification.

**Flow**:

1. Validate input with Joi schema
2. Check for existing email
3. Hash password with bcrypt
4. Send verification email
5. Return sanitized user data

**Security**: Uses rate limiting (5 attempts/hour) and input sanitization.

**Tags**: api, authentication, validation
```

### Database Pattern Notes

```markdown
## Database Transaction Pattern

Pattern used in `src/services/userService.ts` for multi-table operations.

**Why**: Ensures data consistency when creating users with related profile data.

**Implementation**: Uses Prisma transaction API with rollback on any failure.

**Example**: User creation + profile setup + initial preferences in single transaction.

**Tags**: database, pattern, transactions
```

### Error Handling Notes

```markdown
## Global Error Handler Middleware

Located in `src/middleware/errorHandler.ts` - centralized error processing.

**Features**:

- Logs all errors with request context
- Returns appropriate HTTP status codes
- Sanitizes error messages for production
- Integrates with monitoring service

**Usage**: Applied globally in `app.ts` as final middleware.

**Tags**: error-handling, middleware, logging
```

## Note Quality Guidelines

- **Include endpoint examples**: Show request/response formats
- **Document error cases**: What can go wrong and how it's handled
- **Reference middleware**: Link to relevant middleware implementations
- **Show database relationships**: Explain schema connections
- **Include performance notes**: Query optimization, caching strategies
