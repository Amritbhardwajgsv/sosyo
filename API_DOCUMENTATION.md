# Sosyo API Documentation

## Overview

Sosyo currently provides authentication, user search, friend requests,
friendships, and user blocking.

Default local base URL:

```txt
http://localhost:3000
```

If `PORT` is set in the environment, use that port instead.

## Required Environment Variables

```txt
JWT_SECRET
DATABASE_URL
REDIS_URL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

Twilio variables are required only for phone OTP delivery.

## Authentication

Protected APIs require the JWT returned by registration, login, or OTP
verification.

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

The authentication middleware verifies the token and places the logged-in
user's `id` and `email` in `req.user`.

## Required Database Tables

```txt
xsah_user
xsah_friends_request_tab
xsah_friendship_tab
xsah_user_blocks_tab
```

Table purposes:

- `xsah_user`: user accounts and credentials.
- `xsah_friends_request_tab`: pending and historical friend requests.
- `xsah_friendship_tab`: active accepted friendships.
- `xsah_user_blocks_tab`: active user blocks.

## Project Files

### Entry Point

`index.js`

- Creates the Express application.
- Enables JSON request parsing.
- Registers all route groups.
- Checks PostgreSQL and Redis before starting the server.

### Configuration

`config/db.js`

- Creates the PostgreSQL connection pool.

`config/redis.js`

- Creates the Redis connection used for OTP storage.

### Middleware

`middleware/auth.middleware.js`

- Reads the Bearer token.
- Verifies the JWT.
- Rejects missing or invalid tokens.
- Sets `req.user` for protected controllers.

### Authentication Files

```txt
routes/auth.routes.js
controllers/auth.controller.js
services/auth.services.js
```

- Routes define authentication URLs.
- The controller validates requests and returns HTTP responses.
- The service reads and writes users in PostgreSQL.

### User Files

```txt
routes/user.routes.js
controllers/user.controller.js
services/user.services.js
```

- User search.
- Blocked-user listing.
- Block and unblock actions.

### Friend Files

```txt
routes/friend.routes.js
routes/friends.routes.js
controllers/friends.controller.js
services/friend.services.js
```

- Friend requests use `friend.routes.js`.
- Active friendships use `friends.routes.js`.
- The controller handles validation and HTTP responses.
- The service manages request, friendship, and block records.

### Database Migrations

```txt
migrations/001_create_users.sql
migrations/002_create_friend_requests.sql
migrations/003_create_friendships.sql
migrations/004_create_user_blocks.sql
```

Run migrations in numerical order in the same Supabase project used by
`DATABASE_URL`. See `migrations/README.md` before applying them to an existing
database.

## Health API

### Check Backend

```http
GET /
```

Purpose: confirms that the Express server is running.

Successful response:

```txt
Backend is running
```

## Authentication APIs

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "phone_number": "+919876543210"
}
```

Purpose:

- Creates a user.
- Hashes the password.
- Returns a JWT.

Important responses:

- `201`: registration successful.
- `400`: required data missing or password too short.
- `409`: email or another unique field already exists.

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "username": "testuser",
  "password": "password123"
}
```

Purpose: verifies username and password and returns a JWT.

Important responses:

- `200`: login successful.
- `400`: username or password missing.
- `401`: invalid credentials.

### Send Phone OTP

```http
POST /api/auth/send-otp
Content-Type: application/json
```

```json
{
  "Phone_number": "+919876543210"
}
```

Purpose:

- Generates a six-digit OTP.
- Stores it in Redis for five minutes.
- Sends it through Twilio.

### Verify Phone OTP

```http
POST /api/auth/verify-otp
Content-Type: application/json
```

```json
{
  "Phone_number": "+919876543210",
  "otp": "123456"
}
```

Purpose: verifies the Redis OTP and returns a JWT for an existing user.

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer TOKEN
```

Purpose: returns the authenticated user's safe profile data.

### Logout Current Device

```http
POST /api/auth/logout
Authorization: Bearer TOKEN
```

Purpose:

- Revokes only the supplied JWT.
- Stores its unique `jti` in Redis until the token's original expiry time.
- Other devices remain logged in.
- The client should delete its local token after success.

### Logout All Devices

```http
POST /api/auth/logout-all
Authorization: Bearer TOKEN
```

Purpose:

- Increments the authenticated user's token version in Redis.
- Immediately invalidates all existing JWTs for that user.
- Requires a new login on every device.

Every newly issued JWT contains a unique `jti` and the user's current Redis
token version. The authentication middleware rejects revoked token IDs and old
token versions.

## User APIs

### Search Users

```http
GET /api/users/search?q=test
Authorization: Bearer TOKEN
```

Purpose:

- Searches usernames case-insensitively.
- Excludes the logged-in user.
- Returns only public fields.

Response:

```json
{
  "success": true,
  "users": [
    {
      "id": "USER_UUID",
      "username": "testuser1"
    }
  ]
}
```

### List Blocked Users

```http
GET /api/users/blocked
Authorization: Bearer TOKEN
```

Purpose: lists users blocked by the authenticated user.

Response fields:

```txt
block_id
user_id
username
blocked_at
```

### Block User

```http
POST /api/users/:username/block
Authorization: Bearer TOKEN
```

Purpose:

- Creates a persistent block.
- Removes an active friendship.
- Cancels pending requests in both directions.
- Prevents future friend requests while either user has blocked the other.

No request body is required. The server resolves the username to its stable
UUID before storing the block.

### Unblock User

```http
DELETE /api/users/:username/block
Authorization: Bearer TOKEN
```

Purpose: removes the authenticated user's block against the selected user.

Unblocking does not restore a friendship or create a new friend request.

## Friend Request APIs

### Send Friend Request

```http
POST /api/friend-requests
Authorization: Bearer TOKEN
Content-Type: application/json
```

```json
{
  "receiverUsername": "testuser1"
}
```

Purpose:

- Resolves the receiver by username.
- Prevents self-requests.
- Prevents requests involving blocked users.
- Prevents duplicate pending requests in either direction.
- Creates a pending request using user UUIDs.

Important responses:

- `201`: request created.
- `400`: username missing or self-request.
- `403`: one user has blocked the other.
- `404`: receiver not found.
- `409`: pending request already exists.

### List Incoming Requests

```http
GET /api/friend-requests/incoming
Authorization: Bearer TOKEN
```

Purpose: lists pending requests received by the authenticated user.

Response fields:

```txt
request_id
sender_id
sender_username
status
created_at
```

### List Outgoing Requests

```http
GET /api/friend-requests/outgoing
Authorization: Bearer TOKEN
```

Purpose: lists pending requests sent by the authenticated user.

Response fields:

```txt
request_id
receiver_id
receiver_username
status
created_at
```

### Accept Friend Request

```http
PATCH /api/friend-requests/:requestId/accept
Authorization: Bearer RECEIVER_TOKEN
```

Purpose:

- Allows only the receiver to accept a pending request.
- Creates an active record in `xsah_friendship_tab`.
- Updates the request status to `accepted`.
- Sets `responded_at`.
- Uses a PostgreSQL transaction.

### Reject Friend Request

```http
PATCH /api/friend-requests/:requestId/reject
Authorization: Bearer RECEIVER_TOKEN
```

Purpose:

- Allows only the receiver to reject.
- Changes a pending request to `rejected`.
- Sets `responded_at`.
- Does not create a friendship.

### Cancel Friend Request

```http
DELETE /api/friend-requests/:requestId
Authorization: Bearer SENDER_TOKEN
```

Purpose:

- Allows only the sender to cancel.
- Changes a pending request to `cancelled`.
- Preserves request history.

## Friendship APIs

### List Friends

```http
GET /api/friends
Authorization: Bearer TOKEN
```

Purpose: lists all active accepted friends of the authenticated user.

Response:

```json
{
  "success": true,
  "friends": [
    {
      "friendship_id": 1,
      "friend_id": "USER_UUID",
      "username": "testuser1",
      "friends_since": "2026-06-14T09:22:38.441Z"
    }
  ]
}
```

### Remove Friend

```http
DELETE /api/friends/:username
Authorization: Bearer TOKEN
```

Purpose:

- Deletes the active friendship.
- Keeps historical friend requests.
- Does not block the user.
- Allows a new request later unless either user is blocked.

## Friend Request Statuses

```txt
pending
accepted
rejected
cancelled
```

Meaning:

- `pending`: waiting for the receiver.
- `accepted`: friendship was created.
- `rejected`: receiver declined.
- `cancelled`: sender cancelled or a block cancelled the pending request.

## Common HTTP Responses

```txt
200 OK             Successful read or update
201 Created        Resource created
400 Bad Request    Invalid or missing input
401 Unauthorized   Missing, invalid, or expired JWT
403 Forbidden      Operation blocked by relationship rules
404 Not Found      User, request, friendship, or block not found
409 Conflict       Duplicate request or unique database conflict
500 Server Error   Unexpected application or database failure
```

## Recommended Test Order

1. Register two users.
2. Log in and save both JWTs.
3. Search for the second username.
4. Send a friend request.
5. Check outgoing requests as the sender.
6. Check incoming requests as the receiver.
7. Accept or reject as the receiver.
8. List friends from both accounts after acceptance.
9. Remove the friendship.
10. Block a user.
11. Confirm friend requests are forbidden.
12. List blocked users.
13. Unblock the user.

## Security Rules

- Never accept the sender ID from request JSON; derive it from the JWT.
- Never expose password hashes, OTPs, tokens, exact locations, or private fields.
- Only the receiver can accept or reject a request.
- Only the sender can cancel a pending request.
- Either friend can remove an active friendship.
- Only the blocker can list or remove their own blocks.
- Blocked users cannot create friend requests with each other.
