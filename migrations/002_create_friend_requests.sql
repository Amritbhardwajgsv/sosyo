CREATE TABLE IF NOT EXISTS xsah_friends_request_tab (
    id BIGSERIAL PRIMARY KEY,
    sender_id UUID NOT NULL
        REFERENCES xsah_user(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL
        REFERENCES xsah_user(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,

    CONSTRAINT xsah_friend_request_different_users
        CHECK (sender_id <> receiver_id),

    CONSTRAINT xsah_friend_request_valid_status
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'))
);

-- Prevent A -> B and B -> A from existing as separate pending requests.
CREATE UNIQUE INDEX IF NOT EXISTS xsah_friend_request_unique_pending_pair
    ON xsah_friends_request_tab (
        LEAST(sender_id, receiver_id),
        GREATEST(sender_id, receiver_id)
    )
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS xsah_friend_request_receiver_status_idx
    ON xsah_friends_request_tab (receiver_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS xsah_friend_request_sender_status_idx
    ON xsah_friends_request_tab (sender_id, status, created_at DESC);
