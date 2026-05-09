# Encapsulate Record

**Formerly:** Replace Record with Data Class | **Inverse of:** —

## When to Use
Use this refactoring when a mutable record is shared across code that reads and writes fields directly.
Wrapping the record lets you control updates, rename fields safely, and hide whether data is stored or computed.

## Code Smells Addressed
- Exposed mutable record data
- Leaky representation details

## Example

### Before
```typescript
const organization = {
  name: 'Acme Gooseberries',
  country: 'GB'
}

function getRawDataOfOrganization() {
  return organization
}

function renameOrganization(newName: string) {
  getRawDataOfOrganization().name = newName
}

function organizationCountry() {
  return getRawDataOfOrganization().country
}

function organizationLabel() {
  const data = getRawDataOfOrganization()
  return `${data.name} (${data.country})`
}

const customer = {
  name: 'Alice',
  organization: getRawDataOfOrganization()
}

customer.organization.name = 'New Acme'
console.log(organizationLabel())
```

### After
```typescript
class Organization {
  private _name: string
  private _country: string

  constructor(data: { name: string; country: string }) {
    this._name = data.name
    this._country = data.country
  }

  get name() {
    return this._name
  }

  set name(value: string) {
    this._name = value
  }

  get country() {
    return this._country
  }
}

const organization = new Organization({
  name: 'Acme Gooseberries',
  country: 'GB'
})

function getOrganization() {
  return organization
}

function renameOrganization(newName: string) {
  getOrganization().name = newName
}

function organizationLabel() {
  const data = getOrganization()
  return `${data.name} (${data.country})`
}
```

## Mechanics
1. Apply **Encapsulate Variable** to the variable that holds the record.
2. Give the temporary raw-data accessors ugly, searchable names so you can find every caller fast.
3. Replace the record with a simple wrapper class and add one accessor that still returns the raw data.
4. Add new functions that return the wrapper object instead of the raw record.
5. Change each client to use the wrapper and add getters or setters as each use demands.
6. If the record is nested, update the clients that write first.
7. Remove the raw-data accessor and the temporary search-friendly functions.
8. Test, then encapsulate nested records or nested collections in the same way when needed.

## Notes
- This pays off most when the record is mutable. Immutable value data may not need a wrapper.
- For nested structures, return a deep copy or a read-only view if callers must inspect data without mutating it.
- Copy fields into private slots in the constructor if you want to break the direct link to the original record.
- Expect to add behavior later. The wrapper creates a home for validation and derived values.
- Use small, incremental client migrations. This refactoring is safer when you move one access at a time.

## Related Refactorings
- Encapsulate Variable
- Encapsulate Collection
- Extract Function
- Change Reference to Value
