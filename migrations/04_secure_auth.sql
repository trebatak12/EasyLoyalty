
-- Token blacklist for access tokens (short TTL)
CREATE TABLE IF NOT EXISTS token_blacklist (
    jti VARCHAR(32) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Enhanced refresh tokens with rotation detection
CREATE TABLE IF NOT EXISTS refresh_tokens_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_id VARCHAR(32) NOT NULL UNIQUE, -- JWT jti claim
    device_id VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_v2_user_id ON refresh_tokens_v2(user_id);
CREATE INDEX idx_refresh_tokens_v2_token_id ON refresh_tokens_v2(token_id);
CREATE INDEX idx_refresh_tokens_v2_expires ON refresh_tokens_v2(expires_at);

-- Enhanced audit log
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_log_event ON auth_audit_log(event);
CREATE INDEX idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- User roles for RBAC
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    PRIMARY KEY (user_id, role)
);

-- Insert default user roles
INSERT INTO user_roles (user_id, role) 
SELECT id, 'user' FROM users 
ON CONFLICT (user_id, role) DO NOTHING;

-- Admin users get admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM admin_users
ON CONFLICT (user_id, role) DO NOTHING;

-- Auto-cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() RETURNS void AS $$
BEGIN
    DELETE FROM token_blacklist WHERE expires_at < NOW();
    DELETE FROM refresh_tokens_v2 WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
