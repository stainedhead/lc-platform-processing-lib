# LC Platform Processing Library

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange.svg)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Core processing logic library for managing Applications, Versions, and Deployments in the Low Code Dev Platform ecosystem. Built with Clean Architecture and Domain-Driven Design principles.

## Overview

**lc-platform-processing-lib** (`@stainedhead/lc-platform-processing-lib`) provides the foundational domain models and business logic for platform and environment management in the LC Platform. This library is designed to be consumed by the [lcp CLI](https://github.com/stainedhead/lc-platform-dev-cli) and other platform management tools.

### Key Features

- 🏗️ **Clean Architecture** - Strict layer boundaries with dependency inversion
- 🎯 **Domain-Driven Design** - Rich domain models with business rules in entities
- ☁️ **Cloud-Agnostic** - Platform-independent using [lc-platform-dev-accelerators](https://github.com/stainedhead/lc-platform-dev-accelerators)
- ✅ **Test-First Development** - Comprehensive test coverage with TDD approach
- 🔧 **CLI-First Interface** - Operations exposed via command-line before programmatic API
- 🔒 **Type-Safe** - Strict TypeScript with Result types and discriminated unions
- 📦 **Semantic Versioning** - Predictable releases for ecosystem stability

## Architecture

### Clean Architecture Layers

The library strictly enforces the Dependency Rule: dependencies point inward only.

```
src/
├── domain/              # Pure business logic (NO external dependencies)
│   ├── entities/        # Application, Version, Deployment aggregates
│   ├── value-objects/   # AppId, VersionNumber, DeploymentStatus
│   └── types.ts         # Domain type definitions
│
├── use-cases/           # Application workflows (depends on Domain only)
│   ├── applications/    # Application management use cases
│   ├── versions/        # Version management use cases
│   ├── deployments/     # Deployment management use cases
│   ├── ports.ts         # Port interfaces for adapters
│   └── types.ts         # Use case DTOs
│
├── adapters/            # Interface implementations
│   └── types.ts         # Adapter-specific types
│
├── infrastructure/      # External concerns (CLI, config, I/O)
│   ├── cli/             # CLI commands (composition root)
│   └── config/          # Configuration management
│
└── index.ts            # Public API exports
```

### Domain Model

The library manages three core domain aggregates:

- **Application**: Represents a deployable application in the platform (web app, batch job, function)
- **Version**: Represents a specific version of an application with configuration and dependencies
- **Deployment**: Represents a deployment instance of a version to a specific environment

Business rules live in domain entities, ensuring the code reflects business reality and domain expertise.

## Installation

```bash
bun add @stainedhead/lc-platform-processing-lib
```

## Usage

> **Note**: This library is currently in v0.2.0 (pre-release). The API is subject to change.

### Quick Start

```typescript
import {
  LCPlatformAppConfigurator,
  LCPlatformAppVersionConfigurator,
  DeployDependencies,
  DeployApplication,
  AcceleratorStorageAdapter,
  AcceleratorPolicyAdapter,
  AcceleratorDeploymentAdapter,
} from '@stainedhead/lc-platform-processing-lib';

// Initialize adapters
const storage = new AcceleratorStorageAdapter();
const policy = new AcceleratorPolicyAdapter();
const deployment = new AcceleratorDeploymentAdapter();

// Create configurators
const appConfig = new LCPlatformAppConfigurator(storage);
const versionConfig = new LCPlatformAppVersionConfigurator(storage, policy, deployment);
```

### Application Management

```typescript
// Initialize a new application
const appResult = await appConfig.init({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  metadata: {
    description: 'My application',
    owner: 'platform-team',
  },
});

if (appResult.success) {
  console.log('Application created:', appResult.value.id);
}

// Read application
const readResult = await appConfig.read({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
});

// Update application metadata
const updateResult = await appConfig.update({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  metadata: {
    description: 'Updated description',
  },
});

// Check if application exists
const exists = await appConfig.exists({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
});
```

### Version Management

```typescript
// Initialize a new version
const versionResult = await versionConfig.init({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  versionNumber: '1.0.0',
  dependencies: [
    { type: 'database', name: 'postgres', version: '14' },
    { type: 'queue', name: 'rabbitmq', version: '3.11' },
  ],
  metadata: {
    description: 'Initial release',
  },
});

// Cache application artifact
import { createReadStream } from 'fs';

const stream = createReadStream('./my-app.zip');
const cacheResult = await versionConfig.cache({
  identifier: {
    account: '123456789012',
    team: 'platform',
    moniker: 'my-app',
    version: '1.0.0',
  },
  stream,
  metadata: {
    contentType: 'application/zip',
    size: 1024000,
  },
});

// Generate IAM policy for application runtime
const policyResult = await versionConfig.generateAppPolicy({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  version: '1.0.0',
});

if (policyResult.success) {
  console.log('Policy:', JSON.stringify(policyResult.value, null, 2));
}
```

### Deployment Management

```typescript
// Deploy dependencies (with automatic rollback on failure)
const deployDeps = new DeployDependencies(storage, deployment);
const depsResult = await deployDeps.execute({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  version: '1.0.0',
  environment: 'production',
  tags: {
    'custom:cost-center': 'engineering',
  },
});

// Deploy application with IAM policies and resource tags
const deployApp = new DeployApplication(storage, policy, deployment);
const appDeployResult = await deployApp.execute({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  version: '1.0.0',
  environment: 'production',
  tags: {
    'custom:owner': 'john-doe',
  },
});

if (appDeployResult.success) {
  console.log('Deployment ID:', appDeployResult.value.deploymentId);
  console.log('Status:', appDeployResult.value.status);
  console.log('Applied tags:', appDeployResult.value.appliedTags);
}
```

### Error Handling

The library uses Result types for type-safe error handling:

```typescript
const result = await appConfig.init({
  account: '123456789012',
  team: 'platform',
  moniker: 'my-app',
  metadata: {},
});

if (!result.success) {
  // Handle error
  switch (result.error) {
    case ConfigurationError.AlreadyExists:
      console.error('Application already exists');
      break;
    case ConfigurationError.ValidationFailed:
      console.error('Validation failed');
      break;
    case ConfigurationError.NotFound:
      console.error('Not found');
      break;
    default:
      console.error('Unknown error:', result.error);
  }
} else {
  // Success - use result.value
  console.log('Application:', result.value);
}
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) 1.0 or higher (not Node.js)
- TypeScript 5.9+

### Setup

```bash
# Clone the repository
git clone https://github.com/stainedhead/lc-platform-processing-lib.git
cd lc-platform-processing-lib

# Install dependencies
bun install
```

### Development Workflow

```bash
# Build
bun run build          # Compile TypeScript
bun run watch          # Watch mode for development

# Testing (Test-First Development is mandatory)
bun test               # Run all tests with coverage
bun test --watch       # Watch mode for tests
bun test tests/domain  # Run domain layer tests only

# Code Quality
bun run format         # Format code with Prettier (run FIRST)
bun run lint           # Run ESLint
bun run typecheck      # Type-check without building
```

### Pre-Commit Workflow

Before committing, **always** run this sequence:

```bash
bun run format && git add -A && bun run lint && bun test
```

### SpecKit Workflow

This project uses [SpecKit](https://github.com/stainedhead/speckit) for feature development:

```bash
/speckit.specify      # Create feature specification
/speckit.clarify      # Resolve ambiguities
/speckit.plan         # Design implementation (includes Constitution Check)
/speckit.tasks        # Generate task breakdown
/speckit.implement    # Execute implementation
```

Every feature must pass the Constitution Check verifying compliance with all 7 core principles.

## Constitutional Principles

The project follows strict governance defined in [`.specify/memory/constitution.md`](.specify/memory/constitution.md) v1.0.0:

1. **Clean Architecture Layers** *(NON-NEGOTIABLE)* - Domain → Use Cases → Adapters → Infrastructure
2. **Domain-Driven Design Boundaries** - Application, Version, Deployment as distinct aggregates
3. **Cloud-Agnostic Design** - No vendor lock-in, multi-cloud support
4. **Test-First Development** *(NON-NEGOTIABLE)* - Red-Green-Refactor cycle mandatory
5. **CLI-First Interface** - Use cases exposed via CLI before programmatic API
6. **TypeScript Type Safety** *(NON-NEGOTIABLE)* - Strict mode, Result types, no `any`
7. **Versioning & Breaking Changes** - Semantic versioning for ecosystem stability

See the [constitution](.specify/memory/constitution.md) for complete details.

## Testing

**Test-First Development (TDD) is non-negotiable** in this project:

1. Write test
2. Verify test **fails**
3. Implement feature
4. Verify test **passes**
5. Refactor

### Test Organization

Tests mirror the layer structure:

- `tests/domain/` - Pure unit tests (zero external dependencies)
- `tests/use-cases/` - Use case tests (test doubles allowed)
- `tests/adapters/` - Adapter implementation tests
- `tests/contract/` - Contract tests for CLI/API boundaries
- `tests/integration/` - Multi-component workflow tests

### Coverage Requirements

- **Domain layer**: 100% (pure business logic)
- **Use cases layer**: 90%+
- **Adapters/Infrastructure**: 80%+

## Ecosystem

### Dependencies

- [**lc-platform-dev-accelerators**](https://github.com/stainedhead/lc-platform-dev-accelerators) - Cloud-agnostic service wrappers

### Consumers

- [**lcp CLI**](https://github.com/stainedhead/lc-platform-dev-cli) - Command-line interface for platform management

### Breaking Change Coordination

Breaking changes require coordination across the ecosystem. See [versioning guidelines](CHANGELOG.md) for details.

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes to public API, CLI interface, or domain model exports
- **MINOR**: New features, use cases, domain entities (backward-compatible)
- **PATCH**: Bug fixes, documentation, internal refactoring

**Current version**: 0.2.0 (pre-1.0.0 - breaking changes allowed in MINOR bumps)

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Documentation

- [**AGENTS.md**](AGENTS.md) - Comprehensive development guidance (source of truth for rules)
- [**CLAUDE.md**](CLAUDE.md) - Claude Code quick reference
- [**.github/copilot-instructions.md**](.github/copilot-instructions.md) - GitHub Copilot guidance
- [**Constitution**](.specify/memory/constitution.md) - Governance and principles (v1.0.0)
- [**CHANGELOG.md**](CHANGELOG.md) - Version history

### Future Documentation (Coming Soon)

- `documentation/product-summary.md` - High-level overview for stakeholders
- `documentation/product-details.md` - Detailed specifications and API reference
- `documentation/technical-details.md` - Clean Architecture implementation details

## Contributing

### Development Guidelines

1. **Read [AGENTS.md](AGENTS.md)** for complete development guidance
2. **Follow Test-First Development** - Write tests before implementation
3. **Respect layer boundaries** - Domain layer has zero external dependencies
4. **Use SpecKit workflow** - `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`
5. **Pass Constitution Check** - Every feature must comply with all 7 principles
6. **Update documentation** - Part of definition of done

### Pull Request Process

1. Format code: `bun run format`
2. Pass linting: `bun run lint`
3. Pass all tests: `bun test`
4. Update CHANGELOG.md
5. Ensure Constitution compliance
6. Submit PR with conventional commit message

## License

MIT © [stainedhead](https://github.com/stainedhead)

## Project Status

**Current Phase**: Core Implementation Complete (v0.2.0)

### Completed

- ✅ Constitution v1.0.0 established
- ✅ Repository structure defined
- ✅ Development workflow documented
- ✅ Quality standards established (ESLint, Prettier, strict TypeScript)
- ✅ Domain entities (Application, Version, Deployment)
- ✅ Value objects (AppId, VersionNumber, DeploymentStatus, ResourceTags, etc.)
- ✅ Application management use cases (CRUD + validation)
- ✅ Version management use cases (CRUD + artifact caching + policy generation)
- ✅ Deployment use cases (dependencies + application deployment)
- ✅ Reference adapters (AcceleratorStorageAdapter, AcceleratorPolicyAdapter, AcceleratorDeploymentAdapter)
- ✅ Comprehensive test suite (179 tests, 94% function coverage, 93% line coverage)
- ✅ Public API with JSDoc documentation
- ✅ README with usage examples

### Planned

- 📋 CLI interface (using lcp CLI)
- 📋 Lifecycle management enhancements
- 📋 Advanced validation features
- 📋 Performance optimizations
- 📋 Additional adapter implementations

### Test Coverage

- **Functions**: 94.06%
- **Lines**: 93.23%
- **Total tests**: 179 passing
- **Test types**: Domain, Use Case, Integration, Contract

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

**Built with Clean Architecture principles** | **Powered by [Bun](https://bun.sh/)** | **Part of the LC Platform Ecosystem**
