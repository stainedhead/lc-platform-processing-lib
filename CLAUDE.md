# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of Truth

**IMPORTANT**: This file references **AGENTS.md** as the single source of truth for all development rules, practices, and guidelines in this project. When rules need to be updated, modify AGENTS.md, not this file.

Read AGENTS.md for comprehensive guidance on:
- Project architecture (Clean Architecture + Domain-Driven Design)
- Constitutional principles (7 core principles from `.specify/memory/constitution.md`)
- SpecKit workflow commands
- Test-First Development (TDD) requirements
- Quality standards and CI/CD pipeline
- Ecosystem integration (lcp CLI, lc-platform-dev-accelerators)

## Quick Reference

### Runtime Environment

**CRITICAL**: This project uses **Bun runtime**, not Node.js.
- Use `bun` commands, not `npm` or `node`
- Bun provides native TypeScript support and built-in test runner
- No transpilation needed for local development

### Essential Commands

```bash
# Development
bun install              # Install dependencies
bun run build           # Compile TypeScript (tsc)
bun run watch           # Watch mode for development
bun test                # Run all tests with coverage
bun test --watch        # Run tests in watch mode

# Testing (layer-specific)
bun test tests/domain        # Domain layer tests only
bun test tests/use-cases     # Use case tests only
bun test tests/integration   # Integration tests only
bun test tests/contract      # Contract tests only

# Code Quality
bun run format          # Format code with Prettier (run FIRST)
bun run lint            # Run ESLint
bun run lint:fix        # Auto-fix linting issues
bun run typecheck       # Type-check without building

# Pre-Commit Workflow (MANDATORY)
bun run format && git add -A && bun run lint && bun test
```

### Repository Structure (Clean Architecture)

```
src/
├── domain/              # Pure business logic (NO external dependencies)
│   ├── entities/        # Application, Version, Deployment aggregates
│   ├── value-objects/   # AppId, VersionNumber, DeploymentStatus
│   └── types.ts         # Domain types
│
├── use-cases/           # Application workflows (depends on Domain only)
│   ├── applications/    # Application management
│   ├── versions/        # Version management
│   ├── deployments/     # Deployment management
│   ├── ports.ts         # Adapter interfaces
│   └── types.ts         # Use case DTOs
│
├── adapters/            # Interface implementations (depends on Domain + Use Cases)
│   └── types.ts         # Adapter types
│
├── infrastructure/      # External concerns (depends on all inner layers)
│   ├── cli/             # CLI commands (composition root)
│   └── config/          # Configuration
│
└── index.ts            # Public exports

tests/
├── domain/             # Pure unit tests (zero dependencies)
├── use-cases/          # Use case tests (test doubles allowed)
├── adapters/           # Adapter tests
├── contract/           # CLI/API boundary tests
└── integration/        # Multi-component workflow tests
```

### Architectural Constraints (NON-NEGOTIABLE)

**Layer Dependency Rule**: Dependencies point inward only
- Domain → NOTHING (pure business logic)
- Use Cases → Domain ONLY
- Adapters → Domain + Use Cases ONLY
- Infrastructure → ALL layers

**Test-First Development**: Write tests BEFORE implementation
1. Write test
2. Verify test FAILS
3. Implement feature
4. Verify test PASSES
5. Refactor

**Cloud-Agnostic Design**: No cloud-specific dependencies in domain/use-cases layers
- Use abstractions from `@stainedhead/lc-platform-dev-accelerators`
- Cloud-specific code only in infrastructure/adapters

### Domain Model (DDD)

This library manages three core aggregates:
- **Application**: Deployable application (web app, batch job, function)
- **Version**: Specific version with configuration and dependencies
- **Deployment**: Runtime instance of a Version in an environment

Business rules MUST live in domain entities, NOT in use cases or services.

### SpecKit Workflow

Use SpecKit commands for feature development:
```bash
/speckit.specify      # Create feature spec
/speckit.clarify      # Resolve ambiguities
/speckit.plan         # Design implementation (includes Constitution Check)
/speckit.tasks        # Generate task breakdown
/speckit.implement    # Execute tasks
```

Every feature MUST pass Constitution Check in plan.md (7 principles).

### Pre-Commit Checklist

Before every commit, run in order:
1. `bun run format` - Format code (fixes most linting issues)
2. `git add -A` - Stage changes
3. `bun run lint` - Check code quality
4. `bun test` - Verify all tests pass
5. `bun run typecheck` - Verify type safety
6. Commit with conventional commit message (feat:, fix:, docs:, etc.)

### Ecosystem Context

This library is consumed by:
- **lcp CLI** (`../lc-platform-dev-cli`) - Breaking changes require coordination
- Depends on **lc-platform-dev-accelerators** (`../lc-platform-dev-accelerators`) for cloud abstractions

### Versioning (Semantic)

- **MAJOR**: Breaking changes to public API, CLI interface, domain exports
- **MINOR**: New features, use cases, domain entities (backward-compatible)
- **PATCH**: Bug fixes, documentation, refactoring
- Pre-1.0.0 (current: v0.1.0): Breaking changes allowed in MINOR
- Update CHANGELOG.md with all changes

### Key Files

- **AGENTS.md** - Complete development rules (SOURCE OF TRUTH)
- **`.specify/memory/constitution.md`** - Constitutional principles (v1.0.0)
- **CHANGELOG.md** - Version history
- **README.md** - Project documentation
- **package.json** - Dependencies and scripts
- **tsconfig.json** - TypeScript strict configuration

## For Detailed Guidance

**Read AGENTS.md** for:
- Complete architectural principles
- Detailed testing strategy
- CI/CD pipeline configuration
- Documentation maintenance rules
- Quality standards and coverage requirements
- Design decision rationale
