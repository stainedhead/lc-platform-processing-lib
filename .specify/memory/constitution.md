<!--
Sync Impact Report - Constitution v1.0.0
========================================
Version change: [INITIAL] → v1.0.0
Modified principles: N/A (initial creation)
Added sections:
  - Core Principles (7 principles: Clean Architecture, DDD, Cloud-Agnostic, TDD, CLI-First, Type Safety, Versioning)
  - Quality Standards (Code Quality, Documentation, Performance, Security)
  - Development Workflow (Branch Strategy, Review Requirements, Ecosystem Integration, Release Process)
  - Governance (Amendment Process, Compliance, Continuous Improvement)
Templates requiring updates:
  ✅ plan-template.md - UPDATED (Constitution Check section expanded with specific gates)
  ✅ spec-template.md - COMPATIBLE (Requirements section aligns with constitution)
  ✅ tasks-template.md - UPDATED (Test-first mandatory, Clean Architecture paths, layer-based task organization)
Additional files created:
  ✅ CHANGELOG.md - CREATED (Required by Versioning principle)
Follow-up TODOs: None
-->

# LC Platform Processing Library Constitution

## Core Principles

### I. Clean Architecture Layers (NON-NEGOTIABLE)

This library MUST strictly enforce Clean Architecture layer boundaries with the Dependency Rule: dependencies only point inward, never outward.

**Layer Structure**:
- **Domain** (`src/domain/`): Entities, Value Objects, Domain Services - NO dependencies on other layers
- **Use Cases** (`src/use-cases/`): Application business rules, orchestration - depends ONLY on Domain
- **Adapters** (`src/adapters/`): Interface implementations, DTOs, mappers - depends on Domain and Use Cases
- **Infrastructure** (`src/infrastructure/`): External concerns (CLI, config, I/O) - depends on all inner layers

**Rules**:
- Domain layer MUST NOT import from use-cases, adapters, or infrastructure
- Use Cases layer MUST NOT import from adapters or infrastructure
- Adapters layer MUST NOT import from infrastructure
- All cross-layer communication through interfaces defined in inner layers
- Dependency injection MUST be used at composition root
- Port-Adapter pattern MUST be used for external integrations

**Rationale**: Clean Architecture ensures testability, maintainability, and independence from frameworks, databases, and external agencies. Layer violations create coupling that destroys these benefits.

### II. Domain-Driven Design Boundaries

The library manages Applications, Versions, and Deployments as distinct bounded contexts with clear domain models.

**Rules**:
- Each aggregate (Application, Version, Deployment) MUST have a dedicated root entity in `src/domain/`
- Business rules MUST live in domain entities, NOT in use cases or services
- Value objects MUST be used for domain concepts (e.g., AppId, VersionNumber, DeploymentStatus)
- Domain events MUST be used to communicate between aggregates
- Ubiquitous language from domain experts MUST be reflected in code (no technical jargon for domain concepts)
- Domain models MUST be persistence-agnostic (no database annotations or framework dependencies)

**Rationale**: DDD ensures the code reflects business reality and domain expertise. Rich domain models prevent anemic data structures and scattered business logic.

### III. Cloud-Agnostic Design

The library MUST remain independent of any specific cloud provider, supporting multi-cloud and on-premises deployments.

**Rules**:
- NO direct dependencies on AWS SDK, Azure SDK, GCP SDK, etc. in domain or use-cases layers
- Cloud-specific implementations MUST be in `src/infrastructure/` behind port interfaces
- Platform abstractions (Server, Client) from lc-platform-dev-accelerators MUST be used
- Configuration MUST support multiple cloud providers without code changes
- Cloud provider selection MUST be runtime configuration, not compile-time decision
- Infrastructure adapters MUST implement common interfaces (e.g., IDeploymentProvider, IStorageProvider)

**Rationale**: Cloud-agnostic design prevents vendor lock-in, enables hybrid deployments, and allows customers to choose their preferred infrastructure.

### IV. Test-First Development (NON-NEGOTIABLE)

Tests MUST be written before implementation. This is the foundation of quality and design.

**Rules**:
- Red-Green-Refactor cycle strictly enforced: Write test → Verify failure → Implement → Verify pass → Refactor
- Tests MUST be reviewed and approved by user before implementation begins
- Every domain entity, use case, and adapter MUST have corresponding unit tests
- Contract tests REQUIRED for all CLI commands and public API boundaries
- Integration tests REQUIRED for workflows involving multiple components (Application → Version → Deployment)
- Test organization MUST mirror layer structure: `tests/domain/`, `tests/use-cases/`, `tests/adapters/`, `tests/integration/`, `tests/contract/`
- Test framework: Bun's built-in test runner
- Domain tests MUST have zero external dependencies (pure unit tests)
- Use case tests MAY use test doubles for ports/adapters
- Integration tests MUST use real or realistic implementations

**Rationale**: Test-first ensures we build what's needed, validates architecture boundaries, prevents regression, and serves as executable documentation.

### V. CLI-First Interface

Management operations MUST be exposed through a command-line interface before any programmatic API.

**Rules**:
- Every use case MUST have a corresponding CLI command in `src/infrastructure/cli/`
- CLI commands MUST follow text I/O protocol: args/stdin → stdout (success), stderr (errors)
- Output formats MUST support both JSON (machine-readable) and human-readable text
- CLI MUST be the composition root for dependency injection
- Exit codes MUST follow conventions: 0 = success, 1 = user error, 2 = system error
- Commands MUST be self-documenting with help text and examples
- Integration with lcp CLI (../lc-platform-dev-cli) MUST be seamless

**Rationale**: CLI-first ensures operations are scriptable, testable, and composable. It also forces clear interface design before building programmatic APIs.

### VI. TypeScript Type Safety (NON-NEGOTIABLE)

All code MUST leverage TypeScript's strict type system to catch errors at compile time and provide excellent developer experience.

**Rules**:
- `strict: true` in tsconfig.json is NON-NEGOTIABLE (already configured)
- No `any` types except when interfacing with truly dynamic external data (must be documented with // eslint-disable-line)
- All public APIs and domain models MUST have explicit type annotations
- Complex types MUST be organized by layer: `src/domain/types.ts`, `src/use-cases/types.ts`, etc.
- Type exports MUST be as intentional as function exports
- Discriminated unions MUST be used for polymorphic domain concepts (e.g., DeploymentStatus)
- Result types (Either/Result pattern) MUST be used for operations that can fail

**Rationale**: Type safety prevents runtime errors, improves refactoring confidence, and makes architecture boundaries explicit through the type system.

### VII. Versioning & Breaking Changes

As a foundational library in the LC Platform ecosystem, versioning discipline is critical for dependent projects (lcp CLI, accelerators).

**Rules**:
- Semantic versioning (MAJOR.MINOR.PATCH) MUST be strictly followed
- MAJOR bump: Breaking changes to public API, CLI interface, or domain model exports
- MINOR bump: New features, new use cases, new domain entities in backward-compatible manner
- PATCH bump: Bug fixes, documentation, internal refactoring, performance improvements
- CHANGELOG.md MUST document all changes with version, date, and categorization (Breaking, Added, Fixed, Changed, Deprecated)
- Deprecation warnings MUST precede removal by at least one MINOR version
- Pre-1.0.0 allows breaking changes in MINOR bumps (we are currently pre-1.0.0: v0.1.0)
- CLI command changes (new flags, removed options) are breaking changes requiring MAJOR bump
- Internal architecture changes (layer refactoring) are NOT breaking if public API unchanged

**Rationale**: The lcp CLI and accelerators depend on this library. Unpredictable breaking changes disrupt the entire ecosystem. Clear versioning enables coordinated releases.

## Quality Standards

### Code Quality

- ESLint/Prettier MUST be configured and passing
- No warnings in TypeScript compilation (`bun run build`)
- Code reviews MUST verify adherence to all constitution principles
- Circular dependencies between layers MUST be prevented (use dependency-cruiser or similar)
- Complexity violations MUST be documented in plan.md Complexity Tracking section

### Documentation

- README.md MUST contain: installation, basic usage, link to architecture docs
- Each layer MUST have a README.md explaining its purpose and key abstractions
- Domain models MUST have JSDoc explaining business rules and invariants
- Use cases MUST have JSDoc explaining workflow and error scenarios
- CLI commands MUST have `--help` output with examples
- Breaking changes MUST include migration guide in CHANGELOG.md

### Performance

- Library MUST have minimal runtime dependencies (review each addition)
- Build output MUST be optimized (tree-shakeable exports)
- Synchronous operations MUST NOT block event loop (use async/await for I/O)
- Deployment operations MUST provide progress feedback (no silent long-running tasks)

### Security

- Secrets (API keys, credentials) MUST NEVER be in domain or use-cases layers
- Credential handling MUST be in infrastructure layer only
- Environment variables for sensitive config MUST use validation
- Dependency vulnerabilities MUST be monitored (`bun audit`)

## Development Workflow

### Branch Strategy

- `main` branch is production-ready
- Feature branches: `###-feature-name` (### = issue/task number)
- All changes MUST go through pull requests
- No direct commits to `main`

### Review Requirements

- All PRs MUST verify constitution compliance (especially layer boundaries)
- Breaking changes MUST be explicitly called out and justified
- Test coverage MUST be maintained or improved
- Documentation MUST be updated before merge
- Layer boundary violations MUST be rejected

### Integration with Ecosystem

- Changes affecting lcp CLI MUST be coordinated with ../lc-platform-dev-cli team
- Changes affecting accelerators MUST be coordinated with ../lc-platform-dev-accelerators team
- Breaking changes REQUIRE ecosystem-wide migration plan

### Release Process

1. Version bump in package.json following semantic versioning
2. Update CHANGELOG.md with categorized changes
3. Tag release with `vX.Y.Z`
4. Publish to npm registry (or internal registry) with `bun run prepublishOnly` validation
5. Notify dependent projects of new release

## Governance

This constitution supersedes all other practices and documentation. When in conflict, constitution principles take precedence.

### Amendment Process

1. Proposed changes MUST be documented with rationale
2. Team review and approval REQUIRED
3. Version bump according to semantic versioning:
   - MAJOR: Principle removal or fundamental redefinition (e.g., dropping Clean Architecture)
   - MINOR: New principle or significant expansion (e.g., adding Security principle)
   - PATCH: Clarification, wording, typo fixes
4. All dependent templates and documentation MUST be updated
5. Migration plan REQUIRED for breaking governance changes

### Compliance

- All code reviews MUST check constitution adherence
- Pull requests violating principles MUST be rejected or justify complexity in plan.md
- Constitution check is a mandatory gate in the planning phase (see plan-template.md)
- Layer boundary violations are automatic PR rejection

### Continuous Improvement

- Constitution MUST be reviewed when new patterns emerge
- Retrospectives SHOULD identify constitution gaps or conflicts
- Amendments MUST preserve backward compatibility in governance where possible
- Ecosystem changes (new dependent projects) MAY require constitution updates

**Version**: 1.0.0 | **Ratified**: 2025-12-19 | **Last Amended**: 2025-12-19
