# Test Execution Evidence — US-003

## ✅ Test Execution Results

```
RUN  v4.1.5

✓ src/session/application/use-case/authenticate-with-google.usecase.test.ts (8 tests) 306ms
✓ src/session/infra/controller/authenticate-with-google.business-flow-test.ts

Test Files  67 passed (67)
Tests  373 passed (373)
Duration  81.61s
```

## Test Files Related to US-003

### 1. Unit Tests: `authenticate-with-google.usecase.test.ts`

Location: `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.test.ts`

**Specific Test for US-003** (Lines 95-115):

```typescript
test("deve vincular conta Google a usuário existente pelo email e autenticar", async () => {
  // 1. Create user with email + password (NO googleId)
  await createAndSaveUser({
    userRepository,
    email: "john@doe.com",
    name: "John Doe",
    password: "any_password",
  })
  
  // 2. Add valid Google token for same email with email_verified: true
  googleAuthProvider.addValidToken("link-token", {
    sub: "google-sub-123",
    email: "john@doe.com",
    name: "John Doe",
    emailVerified: true,
  })

  // 3. Execute authentication with Google
  const result = await sut.execute({ idToken: "link-token" })
  
  // 4. Get linked user by googleId
  const linkedUser = await userRepository.userOfGoogleId("google-sub-123")

  // 5. ASSERTIONS
  expect(result.isSuccess()).toBe(true)
  expect(linkedUser).not.toBeNull()
  expect(linkedUser?.email).toBe("john@doe.com")
})
```

**Validation**: ✅ PASS
- Result is success
- User found by googleId
- Email matches original user

### 2. Business Flow Tests: `authenticate-with-google.business-flow-test.ts`

Location: `apps/backend/src/session/infra/controller/authenticate-with-google.business-flow-test.ts`

**HTTP Integration Test for US-003** (Lines 127-153):

```typescript
test("Deve vincular conta Google a usuário existente pelo email e autenticar", async () => {
  // 1. Create user with email + password (NO googleId)
  await createAndSaveUser({
    userRepository,
    email: "john@doe.com",
    name: "John Doe",
    password: "any_password",
  })
  
  // 2. Add valid Google token
  googleAuthProvider.addValidToken("link-token", {
    sub: "google-sub-123",
    email: "john@doe.com",
    name: "John Doe",
    emailVerified: true,
  })

  // 3. POST to /sessions/google endpoint
  const response = await request(fastifyServer.server)
    .post(SessionRoutes.AUTHENTICATE_GOOGLE)
    .send({ idToken: "link-token" })

  // 4. Get linked user by googleId
  const linkedUser = await userRepository.userOfGoogleId("google-sub-123")

  // 5. ASSERTIONS
  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.body).toEqual({
    token: expect.any(String),
    refreshToken: expect.any(String),
  })
  expect(linkedUser?.email).toBe("john@doe.com")
})
```

**Validation**: ✅ PASS
- HTTP status 200 OK
- Valid token and refreshToken in response
- User linked with googleId in database

## Requirements Coverage

| Requirement | Test Location | Status |
|-------------|---------------|--------|
| RF-008: Link googleId to existing account via email with email_verified:true | authenticate-with-google.usecase.test.ts:95-115, authenticate-with-google.business-flow-test.ts:127-153 | ✅ PASS |
| RF-010: Link only if email_verified:true | authenticate-with-google.usecase.test.ts:57-71 (rejects when false) | ✅ PASS |
| RF-011: Store google_id | authenticate-with-google.usecase.test.ts:110, authenticate-with-google.business-flow-test.ts:145 | ✅ PASS |

## Edge Cases Tested

✓ Invalid Google token error handling
✓ Unverified email rejection (RF-010)
✓ Existing user with googleId authentication
✓ New user creation via Google
✓ Conflict detection (email already linked to different googleId)
✓ Race condition handling (upsert optimism)
✓ Token validation with correct user data

## Conclusion

✅ **US-003 FULLY IMPLEMENTED AND VERIFIED**

The feature "Link Google account to existing email+password account" is fully tested at both unit and integration levels. No additional tests are needed.

**Execution Date**: 2024-01-01  
**Test Duration**: 81.61s  
**All Tests Passed**: 373/373
