# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**lc-platform-processing-lib** (`@stainedhead/lc-platform-processing-lib`) is a TypeScript library that provides core processing logic for managing Applications, Versions, and Deployments in the Low Code Dev Platform ecosystem. Built with Clean Architecture and Domain-Driven Design principles.

**Runtime**: Bun 1.0+ (not Node.js) - Modern JavaScript runtime with native TypeScript support and built-in test runner.

**Current Status**: v0.2.0 - Core implementation complete with domain entities, use cases, and deployment automation (179 tests, 94% coverage).

**Ecosystem Context**: This library is a foundational component used by:
- **lcp CLI** (`../lc-platform-dev-cli`) - Command-line interface for platform management
- **lc-platform-dev-accelerators** (`../lc-platform-dev-accelerators`) - Cloud-agnostic service wrappers

## Architecture

### Core Design Pattern: Clean Architecture with Domain-Driven Design

The codebase strictly enforces **Clean Architecture** layer boundaries with the Dependency Rule: dependencies only point inward, never outward.

```
src/
├── domain/                    # Entities, Value Objects, Domain Services
│   ├── entities/              # Application, Version, Deployment aggregates
│   ├── value-objects/         # AppId, VersionNumber, DeploymentStatus, etc.
│   └── types.ts               # Domain type definitions
│
├── use-cases/                 # Application business rules (orchestration)
│   ├── applications/          # Application management use cases
│   ├── versions/              # Version management use cases
│   ├── deployments/           # Deployment management use cases
│   ├── ports.ts               # Port interfaces for adapters
│   └── types.ts               # Use case DTOs and types
│
├── adapters/                  # Interface implementations, DTOs, mappers
│   └── types.ts               # Adapter-specific types
│
├── infrastructure/            # External concerns (CLI, config, I/O)
│   ├── cli/                   # CLI commands (composition root)
│   │   └── commands/
│   └── config/                # Configuration management
│
└── index.ts                   # Public API exports

tests/
├── domain/                    # Pure unit tests (zero external dependencies)
├── use-cases/                 # Use case tests (may use test doubles)
├── adapters/                  # Adapter implementation tests
├── contract/                  # Contract tests for CLI/API boundaries
└── integration/               # Multi-component workflow tests
```

### Key Architectural Principles (from Constitution v1.0.0)

1. **Clean Architecture Layers (NON-NEGOTIABLE)**: Domain → Use Cases → Adapters → Infrastructure
2. **Domain-Driven Design Boundaries**: Application, Version, Deployment as distinct aggregates
3. **Cloud-Agnostic Design**: Uses platform abstractions from lc-platform-dev-accelerators
4. **Test-First Development (NON-NEGOTIABLE)**: Red-Green-Refactor cycle mandatory
5. **CLI-First Interface**: Every use case exposed via CLI before programmatic API
6. **TypeScript Type Safety (NON-NEGOTIABLE)**: Strict mode, Result types, discriminated unions
7. **Versioning & Breaking Changes**: Semantic versioning for ecosystem stability

See `.specify/memory/constitution.md` for complete constitutional principles.

### Domain Model

The library manages three core domain aggregates:

- **Application**: Represents a deployable application in the platform (web app, batch job, function)
- **Version**: Represents a specific version of an application with configuration and dependencies
- **Deployment**: Represents a deployment instance of a version to a specific environment

**Key Domain Concepts**:
- Applications can have multiple Versions
- Versions define dependencies (secrets, databases, queues, storage, etc.)
- Deployments track the runtime state of a Version in an environment
- Business rules live in domain entities, NOT in use cases

## Development Workflow

This project uses **SpecKit** for feature development. Key commands are in `.specify/templates/commands/` (managed via skills):

### SpecKit Workflow Commands

- `/speckit.specify` - Create/update feature specification from natural language
- `/speckit.plan` - Generate implementation plan with design artifacts
- `/speckit.tasks` - Generate dependency-ordered tasks for implementation
- `/speckit.implement` - Execute implementation from tasks.md
- `/speckit.clarify` - Ask targeted questions to refine underspecified areas
- `/speckit.analyze` - Run consistency checks across spec/plan/tasks
- `/speckit.constitution` - Create/update project constitution

**Typical flow**:
1. `/speckit.specify` to create feature spec
2. `/speckit.clarify` if needed for ambiguities
3. `/speckit.plan` to design implementation (includes Constitution Check)
4. `/speckit.tasks` to break down into actionable items
5. `/speckit.implement` to execute

### When to Use Each Command

- Use `/speckit.specify` when starting a new feature (e.g., adding deployment lifecycle management)
- Use `/speckit.clarify` when the spec lacks critical details (authentication, error handling, state transitions, etc.)
- Use `/speckit.plan` before implementing to design domain models, use cases, and layer structure
- Use `/speckit.tasks` to create an ordered checklist respecting Clean Architecture layers
- Use `/speckit.analyze` after task generation to verify consistency with constitution

### Constitution Compliance

**CRITICAL**: Every feature MUST pass the Constitution Check in `plan.md`:

- [ ] **Clean Architecture Layers**: Does the feature respect layer boundaries?
- [ ] **Domain-Driven Design**: Are domain models preserved? Are business rules in entities?
- [ ] **Cloud-Agnostic Design**: Does the feature avoid cloud-specific dependencies in domain/use-cases?
- [ ] **Test-First Development**: Is the test strategy defined? Are tests planned before implementation?
- [ ] **CLI-First Interface**: If adding operations, is CLI interface designed first?
- [ ] **TypeScript Type Safety**: Are types designed? Are Result types planned for fallible operations?
- [ ] **Versioning**: Is this change breaking, minor, or patch?

Violations MUST be documented in plan.md Complexity Tracking section with justification.

## Implementation Guidelines

### Adding a New Use Case

1. **Define domain concepts first** in `src/domain/entities/` and `src/domain/value-objects/`
2. **Write domain tests first** in `tests/domain/` (pure unit tests, zero dependencies)
3. **Define use case interface** in `src/use-cases/[feature]/index.ts`
4. **Define port interfaces** for adapters in `src/use-cases/[feature]/ports.ts`
5. **Write use case tests** in `tests/use-cases/` (may use test doubles for ports)
6. **Implement adapters** in `src/adapters/`
7. **Create CLI command** in `src/infrastructure/cli/commands/` (composition root)
8. **Write contract tests** in `tests/contract/` for CLI interface
9. **Write integration tests** in `tests/integration/` for complete workflows
10. **Document in README.md** with usage examples

### Layer Boundary Rules

- **Domain layer MUST NOT import** from use-cases, adapters, or infrastructure
- **Use Cases layer MUST NOT import** from adapters or infrastructure
- **Adapters layer MUST NOT import** from infrastructure
- **All cross-layer communication** through interfaces defined in inner layers
- **Dependency injection** MUST be used at composition root (infrastructure/cli)
- **Port-Adapter pattern** MUST be used for external integrations

### Testing Strategy

**Test Framework**: Bun's built-in test runner (compatible with Jest-like API)

**Test-First Development (NON-NEGOTIABLE)**:
- Write tests FIRST before implementation
- Tests MUST be reviewed and approved by user before implementation begins
- Red-Green-Refactor cycle strictly enforced

**Test Organization** (mirrors layer structure):
- **Domain tests** (`tests/domain/`): Pure unit tests, zero external dependencies
- **Use case tests** (`tests/use-cases/`): May use test doubles for ports/adapters
- **Adapter tests** (`tests/adapters/`): Test adapter implementations
- **Contract tests** (`tests/contract/`): Verify CLI command interfaces and public API boundaries
- **Integration tests** (`tests/integration/`): Test complete workflows (Application → Version → Deployment)

Example test pattern using Bun test:
```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { Application } from '@/domain/entities/Application';
import { AppId } from '@/domain/value-objects/AppId';

describe('Application Entity', () => {
  it('should create application with valid id', () => {
    const appId = AppId.create('my-app');
    const app = new Application(appId, 'My Application');

    expect(app.id.value).toBe('my-app');
    expect(app.name).toBe('My Application');
  });

  it('should enforce business rules for application naming', () => {
    const appId = AppId.create('my-app');
    expect(() => new Application(appId, '')).toThrow('Application name cannot be empty');
  });
});
```

### Cloud-Agnostic Design

This library MUST remain independent of cloud providers:

- **NO direct dependencies** on AWS SDK, Azure SDK, GCP SDK in domain or use-cases layers
- **Cloud-specific implementations** MUST be in `src/infrastructure/` or adapters
- **Use platform abstractions** from `@stainedhead/lc-platform-dev-accelerators`
- **Configuration** MUST support multiple cloud providers without code changes
- **Cloud provider selection** is runtime configuration, not compile-time decision

## Quality Standards

### Test-Driven Development (TDD)

This project **strictly follows TDD practices**:

- **Write tests first** before implementing features
- **All new features require test cases** focusing on:
  - Business rule correctness (domain layer)
  - Use case orchestration logic
  - Interface contracts (CLI, API)
  - Layer boundary integrity
  - Edge cases and error handling

### Code Coverage Requirements

- **Minimum 80% code coverage** for all layers
- Coverage measured separately by layer:
  - Domain layer: 100% (pure business logic)
  - Use cases layer: 90%+ (core workflows)
  - Adapters/Infrastructure: 80%+
- Coverage reports generated on every test run

### Code Quality & Linting

- **Auto-format code first** (`bun run format`) before any linting checks
- **Linting runs during local test phase** for all changes
- **Critical and High severity linting errors** must be corrected immediately
- **No commits allowed** with critical/high linting violations
- Use ESLint with TypeScript-specific rules
- Prettier for code formatting (enforced in pre-commit hooks)
- **Layer boundary violations** detected via dependency-cruiser (future)

## Development Workflow & CI/CD

### Source Control Management

- **Platform**: GitHub
- **Branch Strategy**: Standard Git Flow
  - `main` - production-ready code
  - `feature/###-feature-name` - feature branches (### = issue number)
  - `hotfix/*` - emergency fixes
- **No direct commits to `main`** - all changes via pull requests

### GitHub Actions CI/CD Pipeline

The CI/CD pipeline runs on every push and pull request:

1. **Build Stage**
   - Compile TypeScript (`tsc --noEmit` for type checking)
   - Build distributable package
   - Validate package.json and dependencies

2. **Test Stage**
   - Run all tests with coverage (domain, use-cases, adapters, contract, integration)
   - Enforce 80% coverage threshold
   - Auto-format code (`bun run format`) before linting
   - Run linting (ESLint)
   - Run formatter check (Prettier)
   - Verify constitution compliance (layer boundaries)

3. **Package Stage** (on main branch only)
   - Build npm package
   - Publish to **npm registry** (or internal registry)
   - Tag release with semantic version
   - Generate release notes from CHANGELOG.md

### Local Development Commands

Development commands using Bun runtime (in `package.json`):

```bash
bun run build          # Compile TypeScript
bun test               # Run all tests with coverage
bun test --watch       # Run tests in watch mode
bun test tests/domain  # Run domain layer tests only
bun test tests/use-cases # Run use case tests
bun test tests/integration # Run integration tests
bun run lint           # Run ESLint
bun run lint:fix       # Auto-fix linting issues
bun run format         # Format code with Prettier
bun run format:check   # Check formatting without changes
bun run typecheck      # Type-check without building
```

### Pre-Checkin Verification Steps

Before committing code, follow this mandatory sequence to ensure quality:

```bash
# 1. Format code first (fixes most linting issues automatically)
bun run format

# 2. Add all changes to staging
git add -A

# 3. Run linting checks (should pass after formatting)
bun run lint

# 4. Run tests to verify functionality
bun test

# 5. Verify type safety
bun run typecheck

# 6. Commit with descriptive message
git commit -m "feat: descriptive commit message"

# 7. Push to remote repository
git push origin feature/###-feature-name
```

**Note**: This project uses **Bun runtime**, not Node.js. Bun provides native TypeScript support and a built-in test runner that's significantly faster than Jest/Vitest.

## Documentation Structure

### Main Project Documentation

- **`/README.md`** (root) - **PRIMARY project documentation displayed on GitHub**
  - **ALWAYS update this file** when making documentation changes
  - Contains architecture overview, domain model, and usage examples
  - Installation and quick start guide

### Technical Documentation Directory

The `documentation/` directory will contain files that **MUST be kept updated** as architecture or code design changes:

1. **`product-summary.md`** (future) - High-level overview for stakeholders
2. **`product-details.md`** (future) - Detailed specifications and API reference
3. **`technical-details.md`** (future) - Clean Architecture implementation details

### Generated API Documentation

- **`/docs/`** (future) - TypeDoc-generated API documentation
  - **DO NOT manually edit** - auto-generated from code comments
  - Updated with `bun run docs` command

### Constitutional Documentation

- **`.specify/memory/constitution.md`** - Project governance and principles (v1.0.0)
  - 7 core principles (Clean Architecture, DDD, Cloud-Agnostic, TDD, CLI-First, Type Safety, Versioning)
  - Quality standards and development workflow
  - Amendment process and compliance rules

### Documentation Maintenance

- **Update documentation immediately** when making architectural changes
- **Keep examples current** with actual code implementations
- **Document breaking changes** in CHANGELOG.md
- Documentation updates are **part of the definition of done** for any feature

## Repository Configuration

### .gitignore

Configured for TypeScript package development:
- `node_modules/`
- `dist/` and `build/` directories
- Test coverage reports (`coverage/`)
- IDE-specific files (`.vscode/`, `.idea/`)
- Environment files (`.env`, `.env.local`)
- Log files (`*.log`)
- OS-specific files (`.DS_Store`, `Thumbs.db`)

### CHANGELOG.md

Maintained according to [Keep a Changelog](https://keepachangelog.com/):
- **Breaking**: Breaking changes requiring MAJOR version bump
- **Added**: New features (MINOR version bump)
- **Fixed**: Bug fixes (PATCH version bump)
- **Changed**: Non-breaking modifications
- **Deprecated**: Features to be removed (with migration path)

### Version Discipline

Semantic versioning (MAJOR.MINOR.PATCH) strictly followed:
- **MAJOR**: Breaking changes to public API, CLI interface, or domain model exports
- **MINOR**: New features, use cases, domain entities (backward-compatible)
- **PATCH**: Bug fixes, documentation, internal refactoring
- **Pre-1.0.0**: Breaking changes allowed in MINOR bumps (currently v0.1.0)
- CLI command changes (new flags, removed options) are **breaking changes**

## Ecosystem Integration

### Dependencies

- **lc-platform-dev-accelerators** (`@stainedhead/lc-platform-dev-accelerators`)
  - Cloud-agnostic service wrappers (Server, Client abstractions)
  - Used in adapters and infrastructure layers only
  - Coordination required for breaking changes

### Dependents

- **lcp CLI** (`../lc-platform-dev-cli`)
  - Command-line interface consuming this library
  - Breaking changes require coordinated release

### Breaking Change Coordination

When making breaking changes:
1. Document change in CHANGELOG.md under "Breaking"
2. Create migration guide
3. Coordinate with lcp CLI team
4. Update dependent projects before or simultaneously with release
5. Announce via ecosystem communication channels

## Important Files

### Primary Documentation (UPDATE THESE FIRST)
- **`README.md`** - Main project documentation (GitHub repository homepage)
- **`CHANGELOG.md`** - Version history and breaking change documentation
- **`.specify/memory/constitution.md`** - Constitutional principles (v1.0.0)
- **`AGENTS.md`** - This file (development guidance)

### Project Configuration
- `package.json` - Package metadata and scripts
- `tsconfig.json` - TypeScript strict mode configuration
- `.gitignore` - Version control exclusions
- `.specify/templates/` - SpecKit workflow templates

### SpecKit Templates
- `plan-template.md` - Implementation planning with Constitution Check
- `spec-template.md` - Feature specification template
- `tasks-template.md` - Task breakdown with Clean Architecture structure
- `checklist-template.md` - Quality and validation checklists

## Package Information

- **Package name**: `@stainedhead/lc-platform-processing-lib`
- **Current version**: 0.2.0 (pre-1.0.0 - breaking changes allowed in MINOR)
- **TypeScript version**: 5.9.3
- **Runtime**: Bun 1.0+ (not Node.js)
- **Package manager**: bun (replaces npm)
- **Registry**: npm (or internal registry)
- **Dependencies**: None (standalone library with reference adapters)
- **Dev dependencies**: TypeScript, ESLint, Prettier
- **Testing**: Bun's built-in test runner (179 tests, 94% coverage)

## Key Design Decisions

### Why Clean Architecture?

Ensures testability, maintainability, and independence from frameworks and external agencies. Layer boundaries prevent coupling between business logic and infrastructure concerns.

### Why Domain-Driven Design?

The platform management domain (Applications, Versions, Deployments) has complex business rules that belong in rich domain models, not scattered across services or use cases.

### Why Test-First Development?

TDD ensures we build what's needed, validates architecture boundaries, prevents regression, and serves as executable documentation. It's especially critical for library code consumed by other projects.

### Why CLI-First Interface?

CLI-first forces clear interface design and enables scriptable, testable operations. It also serves the lcp CLI use case directly while providing foundation for future programmatic APIs.

### Why Cloud-Agnostic?

The library manages platform concepts (applications, versions, deployments) independent of where they run. Cloud specifics are handled by lc-platform-dev-accelerators and should not leak into this library.

## Project Status

**Current Phase**: Core Implementation Complete (v0.2.0)

### Completed ✅
- Constitution v1.0.0 established
- Repository structure defined with Clean Architecture layers
- Development workflow and quality standards documented
- ESLint 9 + Prettier code quality tools configured
- **Domain Layer**: Application, Version, Deployment entities + 6 value objects
- **Use Cases**: Application management (7 ops), Version management (6 ops + policy gen), Deployment automation
- **Adapters**: AcceleratorStorageAdapter, AcceleratorPolicyAdapter, AcceleratorDeploymentAdapter
- **Testing**: 179 tests across all layers (Domain, Use Case, Integration, Contract)
- **Coverage**: 94.06% functions, 93.23% lines
- **Documentation**: Comprehensive JSDoc for public API, README with usage examples, CHANGELOG v0.2.0

### Planned 📋
- CLI interface integration (via lcp CLI)
- Lifecycle management enhancements
- Advanced validation features
- Performance optimizations
- Additional cloud provider adapters
