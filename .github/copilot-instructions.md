# GitHub Copilot Instructions

This file provides guidance to GitHub Copilot when working with code in this repository.

## Source of Truth

**IMPORTANT**: This file references **AGENTS.md** as the single source of truth for all development rules, practices, and guidelines in this project.

**DO NOT store new rules here** - all rules and updates MUST be added to AGENTS.md to maintain a single source of truth across all AI coding assistants (Claude Code, GitHub Copilot, etc.).

Read AGENTS.md for:
- Complete project architecture (Clean Architecture + DDD)
- Constitutional principles (`.specify/memory/constitution.md`)
- Test-First Development requirements
- Quality standards and code coverage rules
- Layer dependency constraints
- Ecosystem integration details

## Runtime & Technology Stack

- **Runtime**: Bun 1.0+ (NOT Node.js)
- **Language**: TypeScript 5.9.3 with strict mode
- **Testing**: Bun's built-in test runner (Jest-like API)
- **Package Manager**: bun (NOT npm/yarn/pnpm)

## Architecture Overview

**Clean Architecture with 4 Layers** (dependency rule: inward only):

1. **Domain** (`src/domain/`) - Pure business logic, zero external dependencies
   - Entities: Application, Version, Deployment
   - Value Objects: AppId, VersionNumber, DeploymentStatus
   - NO imports from other layers

2. **Use Cases** (`src/use-cases/`) - Application workflows
   - Depends ONLY on Domain layer
   - Defines port interfaces for adapters
   - No infrastructure concerns

3. **Adapters** (`src/adapters/`) - Interface implementations
   - Depends on Domain + Use Cases only
   - No infrastructure dependencies

4. **Infrastructure** (`src/infrastructure/`) - External concerns
   - CLI commands, config, I/O
   - Depends on all inner layers
   - Composition root for dependency injection

## Code Generation Rules

### When Generating Domain Code

```typescript
// ✅ CORRECT: Pure domain logic, no external dependencies
export class Application {
  constructor(
    private readonly id: AppId,
    private readonly name: string
  ) {
    if (name.length === 0) {
      throw new Error('Application name cannot be empty');
    }
  }

  // Business rules live here
}
```

```typescript
// ❌ WRONG: Domain layer importing from infrastructure
import { Logger } from '@/infrastructure/logger'; // NEVER!
```

### When Generating Use Cases

```typescript
// ✅ CORRECT: Define ports for adapters
export interface IApplicationRepository {
  save(app: Application): Promise<void>;
  findById(id: AppId): Promise<Application | null>;
}

export class CreateApplicationUseCase {
  constructor(private repo: IApplicationRepository) {}

  async execute(dto: CreateApplicationDTO): Promise<Application> {
    // Orchestration logic here
  }
}
```

### When Generating Tests

**ALWAYS generate tests BEFORE implementation** (TDD is non-negotiable):

```typescript
// ✅ CORRECT: Test-first approach
import { describe, it, expect, beforeEach } from 'bun:test';

describe('Application Entity', () => {
  it('should enforce business rule: name cannot be empty', () => {
    const appId = AppId.create('my-app');
    expect(() => new Application(appId, '')).toThrow('Application name cannot be empty');
  });
});
```

**Test organization mirrors layer structure**:
- `tests/domain/` - Pure unit tests (no dependencies)
- `tests/use-cases/` - Use case tests (test doubles allowed)
- `tests/adapters/` - Adapter tests
- `tests/contract/` - CLI/API boundary tests
- `tests/integration/` - Multi-component workflows

### Type Safety Requirements

```typescript
// ✅ CORRECT: Explicit types, no 'any'
export interface CreateApplicationDTO {
  name: string;
  type: ApplicationType;
}

export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

// ❌ WRONG: Using 'any'
function process(data: any): any { } // NEVER!
```

### Cloud-Agnostic Design

```typescript
// ✅ CORRECT: Use platform abstractions
import { IDeploymentProvider } from '@stainedhead/lc-platform-dev-accelerators';

// ❌ WRONG: Direct cloud SDK usage in domain/use-cases
import { S3Client } from '@aws-sdk/client-s3'; // Only in infrastructure!
import { BlobServiceClient } from '@azure/storage-blob'; // Only in infrastructure!
```

## Code Style Conventions

- **No `any` types** except for truly dynamic external data (must be documented)
- **Use discriminated unions** for polymorphic domain concepts
- **Use Result types** for operations that can fail
- **JSDoc comments** required for all public exports
- **Named exports only** (no default exports)
- **Max 3 parameters** per function (use options object if more needed)
- **Async/await** for all I/O operations (no blocking sync operations)

## Import Path Conventions

```typescript
// Use path aliases from tsconfig.json
import { Application } from '@/domain/entities/Application';
import { CreateApplicationUseCase } from '@/use-cases/applications/CreateApplication';

// NOT relative paths for cross-layer imports
import { Application } from '../../../domain/entities/Application'; // Avoid
```

## Essential Commands for Context

```bash
# Build and test
bun run build        # Compile TypeScript
bun test            # Run all tests
bun test --watch    # Watch mode

# Code quality (MUST run before commit)
bun run format      # Format with Prettier (run FIRST)
bun run lint        # Check with ESLint
bun run typecheck   # Type checking only
```

## Constitutional Constraints (Non-Negotiable)

From `.specify/memory/constitution.md` v1.0.0:

1. **Clean Architecture Layers** - Dependency rule strictly enforced
2. **Domain-Driven Design** - Business rules in entities, not use cases
3. **Cloud-Agnostic** - No vendor lock-in in domain/use-cases
4. **Test-First Development** - Tests before implementation, always
5. **CLI-First Interface** - Use cases exposed via CLI first
6. **TypeScript Type Safety** - Strict mode, no `any`
7. **Semantic Versioning** - Breaking changes require coordination with lcp CLI

## Ecosystem Context

- **Consumed by**: lcp CLI (`../lc-platform-dev-cli`)
- **Depends on**: lc-platform-dev-accelerators (`../lc-platform-dev-accelerators`)
- **Breaking changes** require ecosystem-wide coordination

## Domain Model (Quick Reference)

Three core aggregates:
- **Application**: Web app, batch job, or function definition
- **Version**: Specific version with config and dependencies
- **Deployment**: Runtime instance in an environment

## For Complete Guidance

**Read AGENTS.md** for:
- Detailed architecture principles
- SpecKit workflow commands
- Complete testing strategy
- CI/CD pipeline details
- Documentation maintenance rules
- Pre-commit verification steps
- Quality standards (80% coverage requirement)
- Design decision rationale

**Read `.specify/memory/constitution.md`** for:
- 7 constitutional principles
- Governance and compliance rules
- Amendment process
