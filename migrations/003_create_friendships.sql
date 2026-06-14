CREATE TABLE IF NOT EXISTS xsah_friendship_tab (
    id BIGSERIAL PRIMARY KEY,
    user_one_id UUID NOT NULL
        REFERENCES xsah_user(id) ON DELETE CASCADE,
    user_two_id UUID NOT NULL
        REFERENCES xsah_user(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT xsah_friendship_different_users
        CHECK (user_one_id <> user_two_id),

    CONSTRAINT xsah_friendship_ordered_users
        CHECK (user_one_id < user_two_id),

    CONSTRAINT xsah_friendship_unique_pair
        UNIQUE (user_one_id, user_two_id)
);

CREATE INDEX IF NOT EXISTS xsah_friendship_user_one_idx
    ON xsah_friendship_tab (user_one_id);

CREATE INDEX IF NOT EXISTS xsah_friendship_user_two_idx
    ON xsah_friendship_tab (user_two_id);
