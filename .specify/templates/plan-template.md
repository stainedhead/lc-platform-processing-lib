# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

- [ ] **Clean Architecture Layers**: Does the feature respect layer boundaries (Domain → Use Cases → Adapters → Infrastructure)?
- [ ] **Domain-Driven Design**: Are domain models (Application, Version, Deployment) preserved? Are business rules in entities?
- [ ] **Cloud-Agnostic Design**: Does the feature avoid cloud-specific dependencies in domain/use-cases layers?
- [ ] **Test-First Development**: Is the test strategy defined (unit, contract, integration)? Are tests planned before implementation?
- [ ] **CLI-First Interface**: If adding operations, is CLI interface designed first?
- [ ] **TypeScript Type Safety**: Are types designed? Are Result types planned for fallible operations?
- [ ] **Versioning**: Is this change breaking, minor, or patch? Is versioning impact documented?

**Constitution Violations** (if any):
> If violations exist, document in Complexity Tracking section below with justification

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project with Clean Architecture (DEFAULT for this library)
src/
├── domain/              # Entities, Value Objects, Domain Services
│   ├── entities/
│   ├── value-objects/
│   └── types.ts
├── use-cases/           # Application business rules
│   ├── applications/
│   ├── versions/
│   ├── deployments/
│   └── types.ts
├── adapters/            # Interface implementations, DTOs, mappers
│   └── types.ts
├── infrastructure/      # CLI, config, external integrations
│   ├── cli/
│   └── config/
└── index.ts            # Public exports

tests/
├── domain/             # Pure unit tests for domain layer
├── use-cases/          # Use case tests (may use test doubles)
├── adapters/           # Adapter implementation tests
├── contract/           # Contract tests for CLI/API boundaries
└── integration/        # Multi-component workflow tests

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
