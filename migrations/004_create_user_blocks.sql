CREATE TABLE IF NOT EXISTS xsah_user_blocks_tab (
    id BIGSERIAL PRIMARY KEY,
    blocker_id UUID NOT NULL
        REFERENCES xsah_user(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL
        REFERENCES xsah_user(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT xsah_user_blocks_different_users
        CHECK (blocker_id <> blocked_id),

    CONSTRAINT xsah_user_blocks_unique_pair
        UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS xsah_user_blocks_blocker_idx
    ON xsah_user_blocks_tab (blocker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS xsah_user_blocks_blocked_idx
    ON xsah_user_blocks_tab (blocked_id);
