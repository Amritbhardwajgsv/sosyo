# Sosyo Chat and Nearby Friends Application

## Project Overview

Sosyo is a real-time private chatting application with an optional nearby
friends feature.

Users can find people, send friend requests, accept or reject requests, and
chat after the request has been accepted. Accepted friends who are currently
active can also appear in a nearby friends list when both users have enabled
location sharing.

The application must never reveal a user's location to strangers or to users
whose friend request has not been accepted.

## Product Goals

1. Provide secure user registration and login.
2. Allow users to search for other users.
3. Support sending, accepting, rejecting, and cancelling friend requests.
4. Allow private one-to-one chat only between accepted friends.
5. Show active accepted friends within a configurable distance.
6. Give users complete control over location visibility.
7. Deliver messages, presence, and nearby updates in real time.
8. Keep the first version simple while allowing future scaling.

## Core User Flow

```txt
Register or log in
        |
Search for another user
        |
Send friend request
        |
Other user accepts request
        |
Users become friends
        |
Private chat becomes available
        |
If both enable location sharing and are active,
they may appear in each other's nearby friends list
```

## Main Features

### 1. Authentication

- Register with username, email, password, and optional phone number.
- Log in with username and password.
- Request and verify a phone OTP.
- Hash passwords with bcrypt.
- Use JWT access tokens for authenticated requests.
- Add authentication middleware for protected APIs and sockets.

### 2. User Profiles and Search

- View and update a profile.
- Search users by username.
- Display only safe public fields such as username, display name, and avatar.
- Do not expose email, phone number, exact location, or other private fields.

### 3. Friend Requests

- Send a friend request.
- List incoming and outgoing requests.
- Accept or reject an incoming request.
- Cancel an outgoing request.
- Remove or block a friend.
- Prevent duplicate and self-directed friend requests.

Friend request states:

```txt
pending
accepted
rejected
cancelled
blocked
```

An accepted relationship is required before users can chat or share nearby
status with each other.

### 4. Private Chat

- Create or reuse a one-to-one conversation between accepted friends.
- Send and receive text messages.
- Load message history with pagination.
- Show typing indicators.
- Show delivered and read status.
- Edit or delete messages.
- Display online or last-seen presence according to privacy settings.
- Add image and file attachments in a later phase.

### 5. Nearby Friends

The nearby friends feature lists accepted friends who:

1. Have location sharing enabled.
2. Are currently active.
3. Shared a recent location update.
4. Are within the configured radius, initially 5 km.

Each result can contain:

```json
{
  "user_id": 42,
  "username": "alex",
  "avatar_url": "https://example.com/avatar.jpg",
  "distance_meters": 850,
  "last_location_update": "2026-06-13T10:30:00Z"
}
```

The API should return distance rather than another user's exact latitude and
longitude. Results should be sorted nearest first and paginated.

### 6. Privacy and Safety

- Location sharing is off by default.
- Users can disable location sharing at any time.
- Only accepted friends can receive nearby information.
- Exact coordinates are not returned to another user.
- A blocked or removed friend immediately loses chat and location access.
- Location cache entries expire after 10 minutes without an update.
- Users can hide online status and last seen.
- Rate limiting is required for login, OTP, user search, friend requests, and
  location updates.
- Authorization must be checked on every conversation and friendship action.

## Recommended Technology Stack

### Frontend

- React or React Native
- Redux Toolkit or Zustand
- Socket.io Client
- Browser or mobile geolocation APIs
- IndexedDB or device storage for a local message cache

### Backend

- Node.js
- Express.js
- PostgreSQL
- PostGIS for efficient geographic distance queries when needed
- Socket.io
- JWT authentication
- Redis for OTPs, presence, location cache, and pub/sub
- Twilio for phone OTP messages

### DevOps

- Docker and Docker Compose
- Nginx as a reverse proxy
- GitHub Actions for tests and deployment
- Kubernetes only when traffic requires horizontal scaling

## Current Implementation Status

### Implemented

- Express server and JSON request parsing.
- Health route at `GET /`.
- PostgreSQL connection and startup check.
- Redis connection and startup check.
- Redis Docker Compose service with persistent storage.
- User registration with bcrypt password hashing.
- Username and password login.
- JWT generation with a one-day expiry.
- Phone OTP generation and delivery through Twilio.
- OTP storage in Redis with a five-minute expiry.
- OTP verification and phone-based login.
- PostgreSQL user lookup by username, email, and phone number.

Current authentication routes:

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/send-otp
POST /api/auth/verify-otp
```

### Partially Implemented

- A demo in-memory user controller exists but is not connected to routes.
- JWTs are generated, but protected-route middleware is not implemented.
- Docker Compose currently runs Redis only.

### Not Implemented Yet

- Authenticated profile endpoint.
- User search.
- Friend requests and friendships.
- Blocking and removing friends.
- Conversations and messages.
- Socket.io real-time messaging.
- Presence, typing indicators, and read receipts.
- Location sharing and nearby friends.
- Notifications.
- Automated tests.
- Database migrations.

## Functional Requirements

### Authentication

1. A user can register and log in.
2. A valid JWT is required for protected operations.
3. A user can retrieve and update their own profile.

### Friendships

1. A user can search for another user.
2. A user can send one pending request to another user.
3. The receiver can accept or reject the request.
4. Only accepted friends can start a conversation.
5. Either user can remove the friendship.
6. Blocking prevents future requests, chat, presence, and nearby visibility.

### Chat

1. Accepted friends can exchange messages.
2. Message history is stored in PostgreSQL.
3. New messages are delivered over Socket.io when the receiver is online.
4. Offline messages are available when the receiver reconnects.
5. Users can only access conversations in which they are participants.

### Nearby Friends

1. A user can enable or disable location sharing.
2. The client sends a location update approximately every 30 seconds while
   the app is active and permission is granted.
3. A user is considered inactive after 10 minutes without a heartbeat or
   location update.
4. Only active accepted friends within 5 km are returned.
5. The response includes approximate distance and update time, not coordinates.
6. The nearby list supports pagination, initially 20 friends per page.

## Non-Functional Requirements

- Low-latency message and presence delivery.
- Reliable message persistence.
- Eventual consistency is acceptable for presence and location updates.
- Secure handling of passwords, tokens, OTPs, and location data.
- Pagination for users, requests, conversations, messages, and nearby results.
- Horizontal scaling through Redis pub/sub when multiple backend instances are
  introduced.
- Structured logging and monitoring without logging passwords, OTPs, tokens, or
  exact coordinates.

## Database Design

PostgreSQL is the primary database. UUIDs may be used for public identifiers.

### Users

```txt
users
  id
  username
  email
  phone_number
  password_hash
  display_name
  avatar_url
  location_sharing_enabled
  show_online_status
  created_at
  updated_at
```

The existing project currently uses the table name `xsah_user`. It can either
be retained consistently or renamed through a controlled migration.

### Friend Requests

```txt
friend_requests
  id
  sender_id
  receiver_id
  status
  created_at
  responded_at
```

Important constraints:

- The sender and receiver cannot be the same user.
- Only one active pending request can exist for a user pair.
- A blocked relationship cannot receive a new request.

### Friendships

```txt
friendships
  id
  user_one_id
  user_two_id
  created_at
```

Store the smaller user ID in `user_one_id` and the larger in `user_two_id`.
A unique constraint on the pair prevents duplicate friendships.

### Blocks

```txt
user_blocks
  blocker_id
  blocked_id
  created_at
```

### Conversations

```txt
conversations
  id
  type
  created_at
  updated_at

conversation_participants
  conversation_id
  user_id
  joined_at
```

The first release supports `direct` conversations. A unique friendship pair
should map to only one direct conversation.

### Messages

```txt
messages
  id
  conversation_id
  sender_id
  content
  message_type
  edited_at
  deleted_at
  created_at

message_receipts
  message_id
  user_id
  delivered_at
  read_at
```

### Location History

```txt
location_history
  id
  user_id
  latitude
  longitude
  recorded_at
```

Location history should be retained only when there is a clear product need,
an explicit privacy policy, and a deletion schedule. For the first version,
storing only the latest short-lived Redis location is safer and simpler.

## Redis Data

Redis stores temporary, frequently changing information:

```txt
otp:{phone_number}            -> OTP, TTL 5 minutes
presence:{user_id}            -> online status, TTL 10 minutes
location:{user_id}            -> latitude, longitude, timestamp, TTL 10 minutes
socket:{user_id}              -> active socket identifiers
typing:{conversation_id}      -> short-lived typing state
```

At larger scale, Redis pub/sub or the Socket.io Redis adapter distributes chat,
presence, and location events between backend instances.

## REST API Design

### Authentication and Profile

```txt
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/send-otp
POST   /api/auth/verify-otp
GET    /api/auth/me
GET    /api/users/search?q=username
GET    /api/users/:userId
PATCH  /api/users/me
PATCH  /api/users/me/privacy
```

### Friend Requests and Friends

```txt
POST   /api/friend-requests
GET    /api/friend-requests/incoming
GET    /api/friend-requests/outgoing
PATCH  /api/friend-requests/:requestId/accept
PATCH  /api/friend-requests/:requestId/reject
DELETE /api/friend-requests/:requestId

GET    /api/friends
DELETE /api/friends/:friendId
POST   /api/users/:userId/block
DELETE /api/users/:userId/block
```

Example request:

```json
{
  "receiver_id": 42
}
```

### Conversations and Messages

```txt
POST   /api/conversations/direct/:friendId
GET    /api/conversations
GET    /api/conversations/:conversationId/messages
POST   /api/conversations/:conversationId/messages
PATCH  /api/messages/:messageId
DELETE /api/messages/:messageId
POST   /api/messages/:messageId/read
```

Use cursor pagination for message history:

```txt
GET /api/conversations/:id/messages?before=<message_id>&limit=30
```

### Nearby Friends

```txt
PATCH /api/users/me/location-sharing
POST  /api/location
GET   /api/friends/nearby?radius_km=5&limit=20&cursor=<cursor>
```

Example location update:

```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "recorded_at": "2026-06-13T10:30:00Z"
}
```

The server must validate coordinate ranges, enforce update rate limits, and
ignore updates when location sharing is disabled.

## Socket.io Events

### Connection and Presence

```txt
connection
presence:online
presence:heartbeat
presence:offline
disconnect
```

The JWT must be validated during the Socket.io handshake. The server derives
the user ID from the token and must not trust a client-provided user ID.

### Chat

```txt
conversation:join
conversation:leave
message:send
message:new
message:delivered
message:read
typing:start
typing:stop
```

Before joining a conversation or sending a message, the server verifies that
the user is a participant and that the friendship is still valid.

### Friends

```txt
friend_request:new
friend_request:accepted
friend_request:rejected
friend:removed
user:blocked
```

### Nearby Friends

```txt
location:update
nearby:initial
nearby:friend_entered
nearby:friend_updated
nearby:friend_left
```

For the first release, nearby friends can be fetched through HTTP after a
location update. Real-time nearby events should be added after the friendship,
chat, and privacy rules are stable.

## Nearby Friends Processing

### Initial Version

1. The authenticated client enables location sharing.
2. The client sends its current coordinates.
3. The server stores the coordinates in Redis with a 10-minute TTL.
4. The server loads the user's accepted friend IDs.
5. It retrieves recent locations only for those friends.
6. It calculates straight-line distance with the Haversine formula.
7. It returns active friends inside the selected radius, nearest first.

This approach is appropriate while each user has a manageable friend count.

### Scaled Version

When traffic grows:

1. Use PostGIS or Redis geospatial indexes for candidate lookup.
2. Intersect geographic candidates with accepted friend IDs.
3. Use the Socket.io Redis adapter for multiple socket servers.
4. Publish location changes through partitioned Redis channels.
5. Store analytical location history asynchronously only if required.
6. Introduce Kafka or another event stream only after measured load justifies
   the operational complexity.

## Backend Structure

```txt
config/
  db.js
  redis.js

controllers/
  auth.controller.js
  user.controller.js
  friend.controller.js
  conversation.controller.js
  message.controller.js
  location.controller.js

services/
  auth.services.js
  user.services.js
  friend.services.js
  conversation.services.js
  message.services.js
  location.services.js

routes/
  auth.routes.js
  user.routes.js
  friend.routes.js
  conversation.routes.js
  message.routes.js
  location.routes.js

middlewares/
  auth.middleware.js
  error.middleware.js
  rate-limit.middleware.js

sockets/
  index.js
  chat.socket.js
  presence.socket.js
  location.socket.js

migrations/
tests/
index.js
```

The project can keep its current top-level structure while it is small. It can
move into `src/` later if that improves deployment or tooling.

## Implementation Roadmap

### Phase 1: Complete Authentication

1. Add JWT authentication middleware.
2. Add `GET /api/auth/me`.
3. Normalize email, username, and phone number input.
4. Enforce unique username, email, and phone constraints.
5. Add validation, rate limiting, and authentication tests.

### Phase 2: Profiles and Friend Requests

1. Add user profile and search APIs.
2. Create friend request, friendship, and block tables.
3. Implement request lifecycle and authorization.
4. Implement list, remove-friend, and block operations.

### Phase 3: Persistent Private Chat

1. Create conversation and message tables.
2. Add conversation and message REST APIs.
3. Enforce accepted-friend and participant checks.
4. Add cursor pagination and read receipts.

### Phase 4: Real-Time Chat

1. Add Socket.io with JWT handshake authentication.
2. Deliver new messages in real time.
3. Add typing, presence, delivery, and read events.
4. Use Redis for presence and socket scaling.

### Phase 5: Nearby Friends

1. Add location-sharing privacy settings.
2. Store recent locations in Redis with TTL.
3. Return only active accepted friends within 5 km.
4. Add distance calculation, pagination, and tests.
5. Add real-time nearby updates after the HTTP flow is reliable.

### Phase 6: Notifications and Media

1. Add push notifications for requests and offline messages.
2. Add image and file attachments.
3. Add message reactions and replies.
4. Add reporting and moderation tools.

### Phase 7: Production Scaling

1. Containerize the backend and PostgreSQL.
2. Add logging, metrics, backups, and alerting.
3. Add the Socket.io Redis adapter and multiple backend instances.
4. Introduce PostGIS, queues, Kafka, or Kubernetes only when real traffic and
   performance measurements require them.

## Immediate Next Step

Complete the authentication foundation before implementing friends or chat:

```txt
1. Create JWT authentication middleware.
2. Add GET /api/auth/me.
3. Add database migrations and uniqueness constraints.
4. Add automated authentication tests.
5. Create friend_requests, friendships, and user_blocks tables.
```

Once these pieces are complete, implement the friend request flow. Chat and
nearby visibility must both depend on the same accepted friendship records.
