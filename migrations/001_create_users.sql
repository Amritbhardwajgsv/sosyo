CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS xsah_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(30),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usernames and emails are treated as case-insensitively unique.
CREATE UNIQUE INDEX IF NOT EXISTS xsah_user_username_unique_lower
    ON xsah_user (LOWER(username));

CREATE UNIQUE INDEX IF NOT EXISTS xsah_user_email_unique_lower
    ON xsah_user (LOWER(email));

CREATE INDEX IF NOT EXISTS xsah_user_phone_number_idx
    ON xsah_user (phone_number);
