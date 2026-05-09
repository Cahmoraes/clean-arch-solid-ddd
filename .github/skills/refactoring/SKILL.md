---
name: refactoring
description: Apply Martin Fowler's refactoring catalog to improve code structure without changing behavior. Use when identifying code smells, applying specific refactoring techniques, planning a refactoring session, understanding when and how to restructure code, or reviewing code for design issues. Covers all 24 code smells from Chapter 3 and all 61 techniques from Chapters 6–12 of Refactoring (2nd ed.).
---

# Refactoring

Refactoring is a change to the internal structure of software that makes it easier to understand and cheaper to modify without changing its observable behavior.

## Refactoring Rhythm

- Work in small steps.
- Run tests before each step so you know the current behavior.
- Run tests after each step so every micro-change stays behavior-preserving.
- If a step feels risky, make the step smaller.

## Technique Categories

### First Set

- [Extract Function](references/first-set/extract-function.md)
- [Inline Function](references/first-set/inline-function.md)
- [Extract Variable](references/first-set/extract-variable.md)
- [Inline Variable](references/first-set/inline-variable.md)
- [Change Function Declaration](references/first-set/change-function-declaration.md)
- [Encapsulate Variable](references/first-set/encapsulate-variable.md)
- [Rename Variable](references/first-set/rename-variable.md)
- [Introduce Parameter Object](references/first-set/introduce-parameter-object.md)
- [Combine Functions into Class](references/first-set/combine-functions-into-class.md)
- [Combine Functions into Transform](references/first-set/combine-functions-into-transform.md)
- [Split Phase](references/first-set/split-phase.md)

### Encapsulation

- [Encapsulate Record](references/encapsulation/encapsulate-record.md)
- [Encapsulate Collection](references/encapsulation/encapsulate-collection.md)
- [Replace Primitive with Object](references/encapsulation/replace-primitive-with-object.md)
- [Replace Temp with Query](references/encapsulation/replace-temp-with-query.md)
- [Extract Class](references/encapsulation/extract-class.md)
- [Inline Class](references/encapsulation/inline-class.md)
- [Hide Delegate](references/encapsulation/hide-delegate.md)
- [Remove Middle Man](references/encapsulation/remove-middle-man.md)
- [Substitute Algorithm](references/encapsulation/substitute-algorithm.md)

### Moving Features

- [Move Function](references/moving-features/move-function.md)
- [Move Field](references/moving-features/move-field.md)
- [Move Statements into Function](references/moving-features/move-statements-into-function.md)
- [Move Statements to Callers](references/moving-features/move-statements-to-callers.md)
- [Replace Inline Code with Function Call](references/moving-features/replace-inline-code-with-function-call.md)
- [Slide Statements](references/moving-features/slide-statements.md)
- [Split Loop](references/moving-features/split-loop.md)
- [Replace Loop with Pipeline](references/moving-features/replace-loop-with-pipeline.md)
- [Remove Dead Code](references/moving-features/remove-dead-code.md)

### Organizing Data

- [Split Variable](references/organizing-data/split-variable.md)
- [Rename Field](references/organizing-data/rename-field.md)
- [Replace Derived Variable with Query](references/organizing-data/replace-derived-variable-with-query.md)
- [Change Reference to Value](references/organizing-data/change-reference-to-value.md)
- [Change Value to Reference](references/organizing-data/change-value-to-reference.md)

### Conditional Logic

- [Decompose Conditional](references/conditional-logic/decompose-conditional.md)
- [Consolidate Conditional Expression](references/conditional-logic/consolidate-conditional-expression.md)
- [Replace Nested Conditional with Guard Clauses](references/conditional-logic/replace-nested-conditional-with-guard-clauses.md)
- [Replace Conditional with Polymorphism](references/conditional-logic/replace-conditional-with-polymorphism.md)
- [Introduce Special Case](references/conditional-logic/introduce-special-case.md)
- [Introduce Assertion](references/conditional-logic/introduce-assertion.md)

### Refactoring APIs

- [Separate Query from Modifier](references/refactoring-apis/separate-query-from-modifier.md)
- [Parameterize Function](references/refactoring-apis/parameterize-function.md)
- [Remove Flag Argument](references/refactoring-apis/remove-flag-argument.md)
- [Preserve Whole Object](references/refactoring-apis/preserve-whole-object.md)
- [Replace Parameter with Query](references/refactoring-apis/replace-parameter-with-query.md)
- [Replace Query with Parameter](references/refactoring-apis/replace-query-with-parameter.md)
- [Remove Setting Method](references/refactoring-apis/remove-setting-method.md)
- [Replace Constructor with Factory Function](references/refactoring-apis/replace-constructor-with-factory-function.md)
- [Replace Function with Command](references/refactoring-apis/replace-function-with-command.md)
- [Replace Command with Function](references/refactoring-apis/replace-command-with-function.md)

### Inheritance

- [Pull Up Method](references/inheritance/pull-up-method.md)
- [Pull Up Field](references/inheritance/pull-up-field.md)
- [Pull Up Constructor Body](references/inheritance/pull-up-constructor-body.md)
- [Push Down Method](references/inheritance/push-down-method.md)
- [Push Down Field](references/inheritance/push-down-field.md)
- [Replace Type Code with Subclasses](references/inheritance/replace-type-code-with-subclasses.md)
- [Remove Subclass](references/inheritance/remove-subclass.md)
- [Extract Superclass](references/inheritance/extract-superclass.md)
- [Collapse Hierarchy](references/inheritance/collapse-hierarchy.md)
- [Replace Subclass with Delegate](references/inheritance/replace-subclass-with-delegate.md)
- [Replace Superclass with Delegate](references/inheritance/replace-superclass-with-delegate.md)

## Code Smell Index

- [Mysterious Name](references/code-smells/mysterious-name.md)
- [Duplicated Code](references/code-smells/duplicated-code.md)
- [Long Function](references/code-smells/long-function.md)
- [Long Parameter List](references/code-smells/long-parameter-list.md)
- [Global Data](references/code-smells/global-data.md)
- [Mutable Data](references/code-smells/mutable-data.md)
- [Divergent Change](references/code-smells/divergent-change.md)
- [Shotgun Surgery](references/code-smells/shotgun-surgery.md)
- [Feature Envy](references/code-smells/feature-envy.md)
- [Data Clumps](references/code-smells/data-clumps.md)
- [Primitive Obsession](references/code-smells/primitive-obsession.md)
- [Repeated Switches](references/code-smells/repeated-switches.md)
- [Loops](references/code-smells/loops.md)
- [Lazy Element](references/code-smells/lazy-element.md)
- [Speculative Generality](references/code-smells/speculative-generality.md)
- [Temporary Field](references/code-smells/temporary-field.md)
- [Message Chains](references/code-smells/message-chains.md)
- [Middle Man](references/code-smells/middle-man.md)
- [Insider Trading](references/code-smells/insider-trading.md)
- [Large Class](references/code-smells/large-class.md)
- [Alternative Classes with Different Interfaces](references/code-smells/alternative-classes-with-different-interfaces.md)
- [Data Class](references/code-smells/data-class.md)
- [Refused Bequest](references/code-smells/refused-bequest.md)
- [Comments](references/code-smells/comments.md)

## How to Navigate

1. Identify the smell that best matches the code you are reading.
2. Open the corresponding smell reference to understand the pressure it creates.
3. Follow the linked techniques that match the shape of the problem.
4. Apply one small refactoring at a time, running tests before and after each step.
