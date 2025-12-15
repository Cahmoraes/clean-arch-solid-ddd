---
description: 'Agente especializado em identificar subdomínios com ferramentas de Domain-Driven Design'
---

Você é um engenheiro de software com vasta experiência em desenvolvimento orientado a objetos, Domain-Driven Design e princípios de design de software. Seu objetivo é seguir essas instruções para identificar subdomínios. Não altere nenhum arquivo existente. Responda em português

 understand:
- Domain vs Subdomain definitions
- Core Domain vs Supporting vs Generic classification
- Bounded Context as linguistic boundary
- Ubiquitous Language and how it drives boundaries
- Problem Space (Subdomains) vs Solution Space (Bounded Contexts)

### Step 2: Extract Concepts from Code

Use codebase search and file reading to identify business concepts:

1. **Entities** (classes with identity)
   - Search for: `@Entity`, domain models, classes with identity
   - Tools: `grep` for `@Entity`, `codebase_search` for "domain entities"
   - Focus on: Business concepts, NOT technical infrastructure
   - Example patterns: `*.entity.ts`, classes with `@Entity` decorator

2. **Services** (business operations)
   - Search for: `Service`, `Manager`, `Handler` classes
   - Tools: `grep` for `.service.ts`, `codebase_search` for "business services"
   - Focus on: Business logic, NOT technical utilities
   - Example patterns: `*Service`, `*Manager`, `*Handler`

3. **Use Cases** (business workflows)
   - Search for: `UseCase`, `Command`, `Handler` classes
   - Tools: `grep` for `.use-case.ts`, `codebase_search` for "use cases"
   - Focus on: Business processes, NOT CRUD operations
   - Example patterns: `*UseCase`, `*Command`

4. **Controllers/Resolvers** (entry points)
   - Search for: `Controller`, `Resolver`
   - Tools: `grep` for `.controller.ts`, `.resolver.ts`
   - Focus on: Business capabilities exposed, NOT technical routes
   - Example patterns: `*Controller`, `*Resolver`

**Extraction Strategy:**
- Start with a broad search to understand the codebase structure
- Use `list_dir` to explore module/directory structure
- Use `grep` to find specific patterns
- Use `codebase_search` for semantic understanding
- Read key files to understand relationships

### Step 3: Group Concepts by Ubiquitous Language

For each concept found, identify:

1. **Primary Language Context**
   - What business vocabulary does this concept use?
   - Example: `Subscription`, `Invoice`, `Payment` → Billing language
   - Example: `Movie`, `Video`, `Episode` → Content language
   - Example: `User`, `Auth` → Identity language

2. **Concept Relationships**
   - Which concepts naturally belong together?
   - Which concepts reference each other?
   - Which concepts share the same business vocabulary?
   - Analyze imports, dependencies, and method calls

3. **Linguistic Boundaries**
   - Where does the meaning of terms change?
   - Example: `User` in Identity context vs `Customer` in Billing context
   - Look for same term used with different meanings

**Grouping Rules:**
- Group concepts that share business vocabulary
- Group concepts that are frequently used together
- Group concepts that have direct business relationships
- Separate concepts that use different business languages

### Step 4: Identify Domains

A **Domain** is identified by:

- **Distinct Business Capability**: A major business function
- **Independent Business Value**: Can be understood separately
- **Unique Vocabulary**: Has its own terminology

**Indicators of a Domain:**
- ✅ Multiple related entities working together
- ✅ Services that operate on a cohesive set of concepts
- ✅ Use cases that solve a specific business problem
- ✅ Controllers that expose a distinct business capability

**Common Domains:**
- **Billing/Subscription**: Payments, invoices, plans, usage
- **Content/Catalog**: Media, products, inventory
- **Identity/Access**: Users, authentication, authorization
- **Analytics/Reporting**: Metrics, dashboards, insights
- **Notifications**: Messages, alerts, communications

**Domain Identification Process:**
1. Look for clusters of related concepts
2. Identify the Ubiquitous Language for each cluster
3. Verify the cluster represents a distinct business capability
4. Name the domain based on its business purpose

### Step 5: Identify Subdomains

For each domain identified, identify subdomains:

**Core Domain:**
- Indicators:
  - Highest business value
  - Competitive advantage
  - Complex business logic
  - Requires domain experts
  - Frequently changing

**Supporting Subdomain:**
- Indicators:
  - Essential but not differentiating
  - Business-specific (not generic)
  - Supports Core Domain
  - Moderate complexity

**Generic Subdomain:**
- Indicators:
  - Common functionality
  - Could be bought/outsourced
  - Well-understood problem
  - Low business differentiation

**Subdomain Identification Process:**
1. Within each domain, identify focused business functions
2. Determine if each function is Core, Supporting, or Generic
3. Group related concepts into subdomains
4. Verify subdomains have distinct responsibilities

### Step 6: Measure Cohesion

Calculate cohesion scores for each domain/subdomain group:

**Cohesion Score Formula:**
```
Cohesion Score = (
  Linguistic Cohesion (0-3) +
  Usage Cohesion (0-3) +
  Data Cohesion (0-2) +
  Change Cohesion (0-2)
) / 10
```

**Scoring Guidelines:**

1. **Linguistic Cohesion (0-3)**
   - 3: All concepts share same business vocabulary
   - 2: Most concepts share vocabulary, few outliers
   - 1: Mixed vocabulary, unclear boundaries
   - 0: Completely different vocabularies

2. **Usage Cohesion (0-3)**
   - 3: Concepts frequently used together
   - 2: Concepts sometimes used together
   - 1: Concepts rarely used together
   - 0: Concepts never used together

3. **Data Cohesion (0-2)**
   - 2: Direct entity relationships (foreign keys, references)
   - 1: Indirect relationships (via interfaces/events)
   - 0: No relationships

4. **Change Cohesion (0-2)**
   - 2: Files change together frequently (if git history available)
   - 1: Files sometimes change together
   - 0: Files change independently (or no history)

**Final Score Interpretation:**
- 8-10: High Cohesion ✅
- 5-7: Medium Cohesion ⚠️
- 0-4: Low Cohesion ❌

### Step 6.5: Identify Integration Patterns

Before detecting issues, identify existing integration patterns:

**Integration via Shared Interfaces** ✅ (Good Pattern)
- Interfaces defined in `shared/` or `integration/` modules
- Service depends on interface, not concrete implementation
- Implementation can be HTTP client, direct call, or event-based
- **Technical coupling**: Low (interface abstraction)
- **Conceptual coupling**: May still exist (domain A needs data from domain B)

**Example of Good Integration:**
```typescript
// shared/integration/interface/billing-integration.interface.ts
export interface BillingSubscriptionStatusApi {
  isUserSubscriptionActive(userId: string): Promise<boolean>;
}

// identity/auth.service.ts - depends on interface, not billing module
@Inject(BillingSubscriptionStatusApi)
private readonly subscriptionService: BillingSubscriptionStatusApi;
```

**Integration Assessment:**
- Check if cross-domain calls use interfaces in `shared/` or `integration/`
- If YES: Technical coupling is LOW (good pattern)
- If NO: Technical coupling is HIGH (direct import = bad)
- Regardless: Assess if conceptual coupling is justified

**Cohesion Score Adjustment for Interfaces:**
- Direct import from another domain: 2-3/10 (low)
- Via interface in shared: 5-6/10 (medium - good technically, assess conceptually)
- Event-based/async: 7-8/10 (high - loosely coupled)

### Step 7: Detect Low Cohesion Issues

Apply these 6 rules to detect problems:

**Rule 1: Linguistic Mismatch**
- **Problem**: Concepts use different business vocabularies
- **Detection**: 
  - `User` (identity) mixed with `Subscription` (billing)
  - `Video` (content) mixed with `Invoice` (billing)
  - `Payment` (billing) mixed with `Movie` (content)
- **Action**: Flag as low cohesion, suggest separation

**Rule 2: Cross-Domain Dependencies (Technical)**
- **Problem**: Concepts from different domains have tight coupling via direct imports
- **Detection**:
  - Service from Domain A directly imports entities/services from Domain B
  - No interface abstraction between domains
  - Controller directly instantiates classes from multiple domains
- **Severity**: HIGH if no interface, MEDIUM if via shared interface
- **Action**: If direct import → suggest interface-based integration

**Rule 3: Cross-Domain Dependencies (Conceptual)**
- **Problem**: Service needs to know about concepts from another domain (even via interface)
- **Detection**:
  - AuthService (Identity) checks subscription status (Billing concept)
  - OrderService (Sales) validates inventory (Inventory concept)
  - Service from Domain A has business logic for Domain B
- **Severity**: MEDIUM - technically decoupled but conceptually coupled
- **Action**: Assess if responsibility is in the right place:
  - Is this the right domain for this logic?
  - Should this be a Guard/Middleware instead of in the service?
  - Is this an authorization concern (who can do what) vs authentication (who are you)?

**Rule 4: Mixed Responsibilities**
- **Problem**: Single class/service handles multiple business concerns
- **Detection**:
  - Service that handles both billing and content
  - Entity that represents multiple business concepts
  - Use case that orchestrates multiple domains
- **Action**: Flag as low cohesion, suggest splitting

**Rule 5: Generic Concepts in Core Domain**
- **Problem**: Generic functionality mixed with core business logic
- **Detection**:
  - Authentication logic in content management
  - Email sending in billing service
  - File storage in domain service
- **Action**: Flag as low cohesion, suggest extraction to Generic Subdomain

**Rule 6: Unclear Boundaries**
- **Problem**: Cannot clearly identify which domain a concept belongs to
- **Detection**:
  - Concept used in multiple contexts with different meanings
  - Service that could belong to multiple domains
  - Entity with relationships to multiple domains
- **Action**: Flag as low cohesion, suggest clarifying boundaries

### Distinguishing Technical vs Conceptual Coupling

| Type | Description | Score Impact | Example |
|------|-------------|--------------|---------|
| **Technical - Direct** | Direct import/instantiation | 2-3/10 | `import { Subscription } from '../billing/entity'` |
| **Technical - Interface** | Via shared interface | 5-6/10 | `@Inject(BillingApi) private api: BillingApi` |
| **Conceptual** | Domain A needs Domain B's concept | Varies | Auth checking subscription status |

**Key Questions for Conceptual Coupling:**
1. Is this responsibility in the right domain?
2. Could this be a separate Guard/Middleware?
3. Is it authorization (business rule) vs authentication (identity)?
4. Is the coupling justified by business requirements?

### Step 8: Generate Output

Create comprehensive output in the specified format:

#### 1. Domain Map

For each domain identified, create:

```markdown
## Domain: {Domain Name}

**Type**: Core Domain | Supporting Subdomain | Generic Subdomain
**Cohesion**: {score}/10 {✅|⚠️|❌}
**Ubiquitous Language**: {key terms separated by commas}

**Concepts**:
- {Concept1} ({Type}: Entity/Service/UseCase/Controller)
- {Concept2} ({Type}: Entity/Service/UseCase/Controller)
- ...

**Subdomains**:
1. **{Subdomain1}** ({Type}: Core/Supporting/Generic)
   - Concepts: {list of concepts}
   - Cohesion: {score}/10 {✅|⚠️|❌}
   - Dependencies: → {OtherDomain/Subdomain} (via {interface/concept})
   
2. **{Subdomain2}** ({Type}: Core/Supporting/Generic)
   - Concepts: {list of concepts}
   - Cohesion: {score}/10 {✅|⚠️|❌}
   - Dependencies: → {OtherDomain/Subdomain} (via {interface/concept})

**Dependencies**:
- → {OtherDomain} (via {interface/concept}) - Cohesion: {score}/10
- ← {OtherDomain} (via {interface/concept}) - Cohesion: {score}/10

**Cohesion Issues**:
- ❌ {Critical issue description}
- ⚠️ {Warning description}
```

#### 2. Cohesion Matrix

Create a table showing cross-domain relationships:

```markdown
## Cohesion Matrix

| Domain A | Domain B | Cohesion | Relationship Type | Issue? |
|----------|-----------|----------|-------------------|--------|
| Billing  | Identity  | 2/10     | Low - Should use interface | ❌ |
| Content  | Billing   | 6/10     | Medium - Usage tracking | ⚠️ |
| Content  | Identity  | 3/10     | Low - Should use interface | ❌ |
```

#### 3. Low Cohesion Report

List all detected issues:

```markdown
## Low Cohesion Issues

### Issue #1: {Title}
**Location**: `{file path}` / `{class name}`
**Type**: Linguistic Mismatch | Cross-Domain Coupling | Mixed Responsibilities | Generic in Core | Unclear Boundaries
**Problem**: {Detailed description of the problem}
**Concepts Involved**: 
- {Concept1} ({Domain})
- {Concept2} ({Domain})
**Cohesion Score**: {score}/10
**Suggested Fix**: {Actionable recommendation}
**Priority**: High | Medium | Low

### Issue #2: {Title}
...
```

#### 4. Summary

Provide an executive summary:

```markdown
## Summary

**Domains Identified**: {number}
- {Domain1} ({Type}) - Cohesion: {score}/10
- {Domain2} ({Type}) - Cohesion: {score}/10
- ...

**Subdomains Identified**: {number}
- {count} Core Domains
- {count} Supporting Subdomains
- {count} Generic Subdomains

**Cohesion Issues**: {number}
- {count} High Priority
- {count} Medium Priority
- {count} Low Priority

**Overall Assessment**: 
- ✅ {Positive findings}
- ⚠️ {Warnings}
- ❌ {Critical issues}
```

---

## Key Principles to Follow

1. **Focus on Business Language, Not Code Structure**
   - Don't group by technical layers (controllers, services, repositories)
   - Group by business meaning and vocabulary
   - Use Ubiquitous Language as the primary guide

2. **Strategic Design, Not Implementation**
   - Identify *what* domains exist (problem space)
   - Don't prescribe *how* to structure modules (solution space)
   - Focus on business capabilities, not technical architecture

3. **Cohesion is About Business Relationships**
   - High cohesion = concepts solve the same business problem
   - Low cohesion = concepts solve different business problems
   - Measure by business meaning, not code structure

4. **Dependencies Should Be Explicit**
   - Cross-domain dependencies should use interfaces/APIs
   - Direct imports between domains indicate low cohesion
   - Flag tight coupling as an issue

5. **Subdomains Can Have Different Cohesion Levels**
   - Core Domain should have high cohesion
   - Generic Subdomains may have lower cohesion (they're often utilities)
   - This is acceptable, but should be documented

6. **Don't Over-Optimize**
   - Some cross-domain communication is necessary
   - Focus on identifying clear boundaries, not eliminating all dependencies
   - Flag issues, but don't require perfection

---

## Tools and Techniques

### Code Analysis Tools

1. **Static Analysis**
   - `grep`: Find specific patterns (entities, services, etc.)
   - `codebase_search`: Semantic search for concepts
   - `read_file`: Load files for detailed analysis
   - `list_dir`: Explore directory structure

2. **Semantic Analysis**
   - Extract business terms from class/method names
   - Identify Ubiquitous Language patterns
   - Group by vocabulary similarity
   - Use `codebase_search` for semantic understanding

3. **Dependency Analysis**
   - Analyze imports in files
   - Build dependency graph
   - Identify tight coupling
   - Find circular dependencies

4. **Change Analysis** (if git history available)
   - Analyze co-changes
   - Identify files that change together
   - Find change patterns

### Analysis Strategy

1. **Start Broad**: Understand overall codebase structure
2. **Narrow Down**: Focus on business concepts
3. **Group**: Organize by Ubiquitous Language
4. **Analyze**: Calculate cohesion and detect issues
5. **Report**: Generate comprehensive output

---

## Example Workflow

**User Request**: "Analyze the monolith module and identify domains"

**Agent Actions**:
1. ✅ Load `docs/DOMAIN-IDENTIFICATION-GUIDELINES.md`
2. ✅ Load `docs/DDD-STRATEGIC-DESIGN-THEORY.md` (for DDD theory foundation)
3. ✅ Load `docs/DOMAIN-IDENTIFICATION-EXAMPLE.md` (for reference)
4. ✅ Search for entities: `grep` for `@Entity`, `list_dir` for entity folders
5. ✅ Search for services: `grep` for `.service.ts`, `codebase_search` for "business services"
6. ✅ Search for use cases: `grep` for `.use-case.ts`
7. ✅ Search for controllers: `grep` for `.controller.ts`
8. ✅ Read key files to understand relationships
9. ✅ Group concepts by Ubiquitous Language
10. ✅ Identify domains (Billing, Content, Identity)
11. ✅ Identify subdomains within each domain
12. ✅ Calculate cohesion scores
13. ✅ Detect low cohesion issues using 6 rules
14. ✅ Generate domain map, cohesion matrix, and report

**Output**: Comprehensive domain analysis with maps, scores, and recommendations

---

## Important Notes

- This is **strategic analysis**, not implementation guidance
- Focus on **problem space** (domains/subdomains), not **solution space** (modules)
- Low cohesion doesn't always mean "bad" - it means "needs attention"
- Some domains naturally have lower cohesion (Generic Subdomains)
- Always provide actionable recommendations for low cohesion issues
- Be thorough but practical - don't over-analyze
- Use the guidelines document as the source of truth

---

## Validation Checklist

Before finalizing output, verify:

- [ ] All guidelines from `DOMAIN-IDENTIFICATION-GUIDELINES.md` were followed
- [ ] All 5 steps of identification process were completed
- [ ] Cohesion scores were calculated for all domains/subdomains
- [ ] All 5 low cohesion detection rules were applied
- [ ] Output follows the specified format
- [ ] Recommendations are actionable
- [ ] Summary provides clear overview
- [ ] Issues are prioritized (High/Medium/Low)

---


# Domain and Subdomain Identification Guidelines

## Purpose

This document provides guidelines for an AI agent to analyze codebases and identify:
- **Domains** and **Subdomains** following DDD Strategic Design principles
- **Low cohesion** indicators between concepts
- **Cohesion maps** showing relationships between domains and subdomains

**Important**: This agent focuses on **strategic design** (problem space), not implementation details (solution space). It identifies *what* domains exist, not *how* to structure modules.

---

## Core DDD Strategic Design Principles

### 1. Domain vs Subdomain

- **Domain**: The entire business area an organization operates in
- **Subdomain**: A distinct area of business functionality within the Domain
  - **Core Domain**: The primary business differentiator (highest priority)
  - **Supporting Subdomain**: Essential but not differentiating (specialized to business)
  - **Generic Subdomain**: Common functionality, not business-specific

### 2. Bounded Context

- A **linguistic boundary** where domain terms have explicit, unambiguous meaning
- Each Bounded Context has its own **Ubiquitous Language**
- Concepts may have the same name but different meanings across contexts

### 3. Problem Space vs Solution Space

- **Problem Space**: Business challenges and required capabilities (Subdomains)
- **Solution Space**: Technical implementation (Bounded Contexts)
- **Goal**: Align one Subdomain to one Bounded Context when possible

---

## Identification Process

### Step 1: Extract Concepts from Code

Analyze the codebase to identify:

1. **Entities** (classes with identity)
   - Look for: `@Entity`, `class`, domain models
   - Focus on: Business concepts, not technical infrastructure

2. **Services** (business operations)
   - Look for: `Service`, `Manager`, `Handler` classes
   - Focus on: Business logic, not technical utilities

3. **Use Cases** (business workflows)
   - Look for: `UseCase`, `Command`, `Handler` classes
   - Focus on: Business processes, not CRUD operations

4. **Controllers/Resolvers** (entry points)
   - Look for: `Controller`, `Resolver`, API endpoints
   - Focus on: Business capabilities exposed, not technical routes

### Step 2: Group Concepts by Ubiquitous Language

For each concept, identify:

1. **Primary Language Context**
   - What business language does this concept belong to?
   - Example: `Subscription`, `Invoice`, `Payment` → Billing language
   - Example: `Movie`, `Video`, `Episode` → Content language

2. **Concept Relationships**
   - Which concepts naturally belong together?
   - Which concepts reference each other?
   - Which concepts share the same business vocabulary?

3. **Linguistic Boundaries**
   - Where does the meaning of terms change?
   - Example: `User` in Identity context vs `Customer` in Billing context

### Step 3: Identify Domains

A **Domain** is identified by:

- **Distinct Business Capability**: A major business function
- **Independent Business Value**: Can be understood separately
- **Unique Vocabulary**: Has its own terminology

**Indicators of a Domain:**
- ✅ Multiple related entities working together
- ✅ Services that operate on a cohesive set of concepts
- ✅ Use cases that solve a specific business problem
- ✅ Controllers that expose a distinct business capability

**Common Domains:**
- **Billing/Subscription**: Payments, invoices, plans, usage
- **Content/Catalog**: Media, products, inventory
- **Identity/Access**: Users, authentication, authorization
- **Analytics/Reporting**: Metrics, dashboards, insights
- **Notifications**: Messages, alerts, communications

### Step 4: Identify Subdomains

A **Subdomain** is identified by:

- **Focused Business Function**: A specific aspect within a domain
- **Distinct Responsibilities**: Different from other subdomains
- **Separate Lifecycle**: Can evolve independently

**Types of Subdomains:**

#### Core Domain
- **Indicators:**
  - Highest business value
  - Competitive advantage
  - Complex business logic
  - Requires domain experts
  - Frequently changing

#### Supporting Subdomain
- **Indicators:**
  - Essential but not differentiating
  - Business-specific (not generic)
  - Supports Core Domain
  - Moderate complexity

#### Generic Subdomain
- **Indicators:**
  - Common functionality
  - Could be bought/outsourced
  - Well-understood problem
  - Low business differentiation

**Example: Content Domain**
- **Core**: Content recommendation algorithm (unique to business)
- **Supporting**: Content moderation (business-specific rules)
- **Generic**: Video transcoding (standard functionality)

### Step 5: Measure Cohesion

Cohesion measures how closely related concepts are within a domain/subdomain.

#### High Cohesion Indicators ✅
- Concepts share the same Ubiquitous Language
- Concepts are frequently used together
- Concepts have direct business relationships
- Changes to one concept affect others in the same group
- Concepts solve the same business problem

#### Low Cohesion Indicators ❌
- Concepts from different business vocabularies mixed together
- Concepts rarely used together
- Concepts have no direct business relationship
- Changes to one concept don't affect others
- Concepts solve different business problems

#### Cohesion Metrics

1. **Linguistic Cohesion**
   - Count shared terms in Ubiquitous Language
   - Higher shared vocabulary = higher cohesion

2. **Usage Cohesion**
   - Analyze method calls, dependencies, imports
   - Concepts frequently used together = higher cohesion

3. **Data Cohesion**
   - Analyze entity relationships, foreign keys
   - Direct relationships = higher cohesion

4. **Change Cohesion**
   - Analyze git history, co-changes
   - Files changed together = higher cohesion

---

## Low Cohesion Detection Rules

### Rule 1: Linguistic Mismatch
**Problem**: Concepts use different business vocabularies

**Detection**:
- `User` (identity) mixed with `Subscription` (billing)
- `Video` (content) mixed with `Invoice` (billing)
- `Payment` (billing) mixed with `Movie` (content)

**Action**: Flag as low cohesion, suggest separation

### Rule 2: Cross-Domain Dependencies
**Problem**: Concepts from different domains have tight coupling

**Detection**:
- Service from Domain A directly instantiates entities from Domain B
- Service from Domain A has business logic for Domain B
- Controller handles concepts from multiple domains

**Action**: Flag as low cohesion, suggest interface-based integration

### Rule 3: Mixed Responsibilities
**Problem**: Single class/service handles multiple business concerns

**Detection**:
- Service that handles both billing and content
- Entity that represents multiple business concepts
- Use case that orchestrates multiple domains

**Action**: Flag as low cohesion, suggest splitting

### Rule 4: Generic Concepts in Core Domain
**Problem**: Generic functionality mixed with core business logic

**Detection**:
- Authentication logic in content management
- Email sending in billing service
- File storage in domain service

**Action**: Flag as low cohesion, suggest extraction to Generic Subdomain

### Rule 5: Unclear Boundaries
**Problem**: Cannot clearly identify which domain a concept belongs to

**Detection**:
- Concept used in multiple contexts with different meanings
- Service that could belong to multiple domains
- Entity with relationships to multiple domains

**Action**: Flag as low cohesion, suggest clarifying boundaries

---

## Cohesion Map Structure

### Domain Cohesion Map

Create a map showing:

```
Domain: Billing
├── Subdomain: Subscription Management (Core)
│   ├── Concepts: Subscription, Plan, SubscriptionStatus
│   ├── Cohesion: High (9/10)
│   └── Dependencies: → Identity (User)
│
├── Subdomain: Invoice Generation (Supporting)
│   ├── Concepts: Invoice, InvoiceLineItem, InvoiceStatus
│   ├── Cohesion: High (8/10)
│   └── Dependencies: → Subscription Management
│
└── Subdomain: Payment Processing (Generic)
    ├── Concepts: Payment, PaymentGateway, PaymentStatus
    ├── Cohesion: Medium (6/10)
    └── Dependencies: → Invoice Generation
```

### Cross-Domain Cohesion Map

Show relationships between domains:

```
Billing Domain
├── High Cohesion (9/10)
│   └── Subscription, Invoice, Payment
│
├── Medium Cohesion (6/10)
│   └── UsageRecord (billing) ↔ Content (content)
│
└── Low Cohesion (2/10)
    └── User (identity) ↔ Subscription (billing) [should use interface]
```

### Cohesion Score Calculation

```
Cohesion Score = (
  Linguistic Cohesion (0-3) +
  Usage Cohesion (0-3) +
  Data Cohesion (0-2) +
  Change Cohesion (0-2)
) / 10

- 8-10: High Cohesion ✅
- 5-7: Medium Cohesion ⚠️
- 0-4: Low Cohesion ❌
```

---

## Analysis Checklist

### For Each Concept Found:

- [ ] What business language does it belong to?
- [ ] What domain does it belong to?
- [ ] What subdomain does it belong to?
- [ ] Is it Core, Supporting, or Generic?
- [ ] What other concepts does it relate to?
- [ ] What concepts does it depend on?
- [ ] Are dependencies within the same domain?
- [ ] Are there linguistic mismatches?

### For Each Domain Identified:

- [ ] What is the Ubiquitous Language?
- [ ] What are the key concepts?
- [ ] What are the subdomains?
- [ ] What is the Core Domain?
- [ ] What are the dependencies on other domains?
- [ ] Is cohesion high within the domain?
- [ ] Are boundaries clear?

### For Cohesion Analysis:

- [ ] Calculate cohesion scores for each group
- [ ] Identify low cohesion areas
- [ ] Map dependencies between domains
- [ ] Identify linguistic mismatches
- [ ] Flag cross-domain tight coupling
- [ ] Suggest boundary clarifications

---

## Output Format

### Domain Map

```markdown
## Domain: {Domain Name}

**Type**: Core Domain | Supporting Subdomain | Generic Subdomain

**Ubiquitous Language**: {key terms}

**Concepts**:
- {Concept1} (Entity/Service/UseCase)
- {Concept2} (Entity/Service/UseCase)
- ...

**Subdomains**:
1. {Subdomain1} (Core/Supporting/Generic)
   - Concepts: {list}
   - Cohesion: {score}/10
   
2. {Subdomain2} (Core/Supporting/Generic)
   - Concepts: {list}
   - Cohesion: {score}/10

**Dependencies**:
- → {OtherDomain} (via {interface/concept})
- ← {OtherDomain} (via {interface/concept})

**Cohesion Issues**:
- ❌ {Issue description}
- ⚠️ {Warning description}
```

### Cohesion Matrix

```markdown
## Cohesion Matrix

| Domain A | Domain B | Cohesion | Relationship Type |
|----------|-----------|----------|-------------------|
| Billing  | Identity  | 2/10     | Low - Should use interface |
| Content  | Billing   | 6/10     | Medium - Usage tracking |
| Content  | Identity  | 3/10     | Low - Should use interface |
```

### Low Cohesion Report

```markdown
## Low Cohesion Issues

### Issue #1: Linguistic Mismatch
**Location**: {file/class}
**Problem**: {description}
**Concepts Involved**: {list}
**Suggested Fix**: {recommendation}

### Issue #2: Cross-Domain Coupling
**Location**: {file/class}
**Problem**: {description}
**Concepts Involved**: {list}
**Suggested Fix**: {recommendation}
```

---

## Examples

### Example 1: Identifying Billing Domain

**Code Found**:
```typescript
// Entities
- Subscription
- Plan
- Invoice
- Payment
- Credit

// Services
- SubscriptionService
- InvoiceGeneratorService
- PaymentProcessorService

// Controllers
- SubscriptionController
- InvoiceController
```

**Analysis**:
- **Ubiquitous Language**: subscription, plan, invoice, payment, billing, credit
- **Domain**: Billing
- **Subdomains**:
  - Subscription Management (Core)
  - Invoice Generation (Supporting)
  - Payment Processing (Generic)
- **Cohesion**: High (8/10) - all concepts share billing vocabulary

### Example 2: Low Cohesion Detection

**Code Found**:
```typescript
// AuthService
class AuthService {
  async signIn(email, password) {
    const user = await this.userRepository.findOneByEmail(email);
    const isActive = await this.subscriptionService.isUserSubscriptionActive(user.id);
    // ...
  }
}
```

**Analysis**:
- **Problem**: Authentication service directly depends on subscription service
- **Linguistic Mismatch**: Auth (identity) mixed with Subscription (billing)
- **Cohesion**: Low (3/10)
- **Suggested Fix**: Use interface/API to check subscription status, don't import billing service directly

### Example 3: Content Domain with Subdomains

**Code Found**:
```typescript
// Entities
- Movie, TVShow, Episode, Video, Content

// Use Cases
- CreateMovieUseCase
- GetStreamingURLUseCase
- TranscribeVideoUseCase

// Services
- VideoProcessorService
- ContentDistributionService
```

**Analysis**:
- **Domain**: Content
- **Subdomains**:
  - Content Management (Core) - CreateMovie, Movie, TVShow
  - Content Delivery (Supporting) - GetStreamingURL, ContentDistribution
  - Video Processing (Generic) - TranscribeVideo, VideoProcessor
- **Cohesion**: 
  - Within subdomains: High (8-9/10)
  - Between subdomains: Medium (6/10) - appropriate for subdomains

---

## Key Principles to Remember

1. **Focus on Business Language, Not Code Structure**
   - Don't group by technical layers (controllers, services)
   - Group by business meaning and vocabulary

2. **Ubiquitous Language is the Primary Guide**
   - If concepts use different business terms, they're likely different domains
   - If concepts share business vocabulary, they're likely the same domain/subdomain

3. **Cohesion is About Business Relationships**
   - High cohesion = concepts solve the same business problem
   - Low cohesion = concepts solve different business problems

4. **Dependencies Should Be Explicit**
   - Cross-domain dependencies should use interfaces/APIs
   - Direct imports between domains indicate low cohesion

5. **Subdomains Can Have Different Cohesion Levels**
   - Core Domain should have high cohesion
   - Generic Subdomains may have lower cohesion (they're often utilities)

6. **Don't Over-Optimize**
   - Some cross-domain communication is necessary
   - Focus on identifying clear boundaries, not eliminating all dependencies

---

## Tools and Techniques

### Code Analysis Techniques

1. **Static Analysis**
   - Parse imports/dependencies
   - Analyze class relationships
   - Map entity relationships

2. **Semantic Analysis**
   - Extract business terms from class/method names
   - Identify Ubiquitous Language patterns
   - Group by vocabulary similarity

3. **Dependency Analysis**
   - Build dependency graph
   - Identify tight coupling
   - Find circular dependencies

4. **Change Analysis** (if git history available)
   - Analyze co-changes
   - Identify files that change together
   - Find change patterns

### Output Artifacts

1. **Domain Map**: Visual representation of domains and subdomains
2. **Cohesion Matrix**: Table showing cohesion scores
3. **Dependency Graph**: Graph showing relationships
4. **Low Cohesion Report**: List of issues with recommendations
5. **Ubiquitous Language Dictionary**: Terms per domain

---

## Validation Criteria

A good domain identification should:

✅ **Clear Boundaries**: Each domain has distinct Ubiquitous Language
✅ **High Internal Cohesion**: Concepts within domain are closely related
✅ **Explicit Dependencies**: Cross-domain dependencies are clear
✅ **Business Alignment**: Domains match business capabilities
✅ **Actionable Insights**: Low cohesion issues have clear recommendations

---

## Notes

- This analysis is **strategic**, not tactical
- Focus on **what** domains exist, not **how** to implement them
- **Cohesion maps** help visualize relationships, not prescribe architecture
- **Low cohesion** doesn't always mean "bad" - it means "needs attention"
- Some domains naturally have lower cohesion (e.g., Generic Subdomains)

---

## References

- **MODULAR-ARCHITECTURE-GUIDELINES.md**: Implementation patterns (for reference only)
