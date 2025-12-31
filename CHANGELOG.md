# Changelog

All notable changes to the LC Platform Processing Library will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-12-28

### Added

#### Domain Layer
- **Entities**:
  - `Application` - Deployable application aggregate with CRUD operations
  - `Version` - Application version aggregate with semantic versioning support
  - `Deployment` - Deployment instance with state machine (pending → in-progress → completed/failed)

- **Value Objects**:
  - `AppId` - Unique application identifier with UUID generation
  - `TeamMoniker` - Team identifier with validation (lowercase alphanumeric + hyphens)
  - `StoragePath` - Cloud-agnostic storage path generator
  - `VersionNumber` - Semantic version parser with compatibility checking (0.x.x and 1.x.x+ support)
  - `DeploymentStatus` - Deployment state with terminal state enforcement
  - `ResourceTags` - Standard tag extraction (FR-035) with custom tag collision detection (FR-036)

#### Use Cases

- **Application Management**:
  - `InitApplication` - Create new application (FR-003)
  - `ReadApplication` - Retrieve application metadata (FR-008)
  - `UpdateApplication` - Update application metadata (FR-005)
  - `DeleteApplication` - Remove application (FR-007)
  - `ValidateApplication` - Validate configuration (FR-009, FR-010, FR-011)
  - `ApplicationConfigurator` - High-level orchestration API

- **Version Management**:
  - `InitVersion` - Create new version (FR-012)
  - `ReadVersion` - Retrieve version metadata (FR-016)
  - `UpdateVersion` - Update version configuration (FR-014)
  - `DeleteVersion` - Remove version (FR-015)
  - `CacheArtifact` - Upload and cache application artifacts (FR-026)
  - `VersionConfigurator` - High-level orchestration API with policy generation

- **Deployment**:
  - `DeployDependencies` - Deploy dependencies with automatic rollback on failure (FR-027, FR-027a, FR-027b)
  - `DeployApplication` - Deploy application with IAM policies (FR-028) and resource tags (FR-032)

#### Adapters

- `AcceleratorStorageAdapter` - In-memory storage implementation for testing
- `AcceleratorPolicyAdapter` - IAM policy generation from dependencies
- `AcceleratorDeploymentAdapter` - Mock deployment operations with state tracking

#### Documentation

- Comprehensive JSDoc comments for public API (`ApplicationConfigurator`, `VersionConfigurator`)
- Updated README.md with usage examples for all core features
- Error handling patterns and Result type examples

### Changed

- Improved error handling with proper type mapping (DeploymentError → ConfigurationError)
- Enhanced semantic versioning support with 0.x.x compatibility rules
- Code quality improvements (ESLint configuration with flat config format)

### Fixed

- TypeScript compilation errors in deployment use cases
- ESLint configuration migration to ESLint 9 flat config
- Unused variable warnings with proper underscore prefixing
- Type safety issues with Result type discriminated unions

### Testing

- **179 tests** across all layers (Domain, Use Case, Integration, Contract)
- **94.06% function coverage**, **93.23% line coverage**
- Test-Driven Development (TDD) approach throughout implementation
- Test categories:
  - Domain: 44 tests (pure business logic)
  - Use Cases: 89 tests (application workflows)
  - Integration: 6 tests (multi-component flows)
  - Contract: 40 tests (type contracts and validations)

### Development

- ESLint 9 configuration with TypeScript support
- Prettier code formatting
- Strict TypeScript mode with no explicit `any` types
- Pre-commit workflow documented

## [0.1.0] - 2025-12-19

### Added
- Initial package structure
- TypeScript configuration with strict mode
- Basic build and test scripts

[Unreleased]: https://github.com/stainedhead/lc-platform-processing-lib/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/stainedhead/lc-platform-processing-lib/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/stainedhead/lc-platform-processing-lib/releases/tag/v0.1.0
