# Replace Subclass with Delegate

**Formerly:** — | **Inverse of:** —

## When to Use
Use this when inheritance starts to hurt: you need another axis of
variation, you need to change roles dynamically, or the superclass
and subclass are coupled too tightly. Replace the subclass with a
delegate object and route the varying behavior through it.

## Code Smells Addressed
- Refused Bequest
- An inheritance hierarchy carrying more than one axis of
  variation

## Example

### Before
```typescript
class Booking {
  constructor(protected show: Show, protected date: Date) {}

  get hasTalkback() {
    return 'talkback' in this.show && !this.isPeakDay;
  }

  get isPeakDay() {
    return false;
  }
}

class PremiumBooking extends Booking {
  constructor(show: Show, date: Date, private extras: Extras) {
    super(show, date);
  }

  get hasTalkback() {
    return 'talkback' in this.show;
  }

  get hasDinner() {
    return 'dinner' in this.extras && !this.isPeakDay;
  }
}
```

### After
```typescript
class PremiumBookingDelegate {
  constructor(private host: Booking, private extras: Extras) {}

  get hasTalkback() {
    return 'talkback' in this.host.show;
  }

  get hasDinner() {
    return 'dinner' in this.extras && !this.host.isPeakDay;
  }
}

class Booking {
  private premiumDelegate?: PremiumBookingDelegate;

  constructor(public show: Show, public date: Date) {}

  bePremium(extras: Extras) {
    this.premiumDelegate = new PremiumBookingDelegate(this, extras);
  }

  get hasTalkback() {
    return this.premiumDelegate
      ? this.premiumDelegate.hasTalkback
      : 'talkback' in this.show && !this.isPeakDay;
  }

  get hasDinner() {
    return this.premiumDelegate
      ? this.premiumDelegate.hasDinner
      : undefined;
  }

  get isPeakDay() {
    return false;
  }
}
```

## Mechanics
1. If many callers use the constructors, apply Replace Constructor
   with Factory Function first.

2. Create an empty delegate class. Its constructor should take
   subclass-specific data and usually a back-reference to the
   superclass.

3. Add a field on the superclass to hold the delegate.

4. Change subclass creation so it initializes the delegate field
   with a delegate instance. Do this in a factory function or in
   the constructor if the constructor can reliably tell when to
   create the delegate.

5. Choose one subclass method to move.

6. Use Move Function to move it to the delegate. Do not remove the
   source dispatch code yet.

7. If the moved method needs data that should remain on the
   superclass, add a back-reference from the delegate to the
   superclass.

8. If the source method has outside callers, move the dispatching
   method from the subclass to the superclass and guard it with a
   delegate check. Otherwise apply Remove Dead Code.

9. If several subclasses begin to duplicate delegate code, use
   Extract Superclass on the delegates.

10. Test.

11. Repeat until every subclass method has moved.

12. Find all callers of the subclass constructor and change them
    to use the superclass constructor.

13. Test.

14. Apply Remove Dead Code to the subclass.

## Notes
- This refactoring does not automatically make the code simpler.
  Fowler says inheritance often handles the original case well,
  while delegation adds dispatch logic and two-way references.

- It becomes worthwhile when you need mutable roles, such as
  turning a regular booking into a premium booking without
  rebuilding every reference to it.

- Avoid explicit class checks on delegates. In the bird example,
  Fowler extracts a delegate superclass instead of writing
  instanceof guards.

- If a subclass method used super, extract the base calculation or
  turn the delegate method into an extension method so you do not
  recurse forever.

## Related Refactorings
- Replace Constructor with Factory Function
- Move Function
- Remove Dead Code
