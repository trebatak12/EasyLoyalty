# EasyLoyalty Keystore System

Centrální JWT keystore systém s kid-based key managementem pro EasyLoyalty café aplikaci.

## 🔑 Přehled

Tento systém implementuje:
- **ES256 JWS** podepisování/ověřování tokenů pomocí `jose` knihovny
- **Kid headers** pro identifikaci klíčů
- **Envelope encryption** privátních klíčů v databázi
- **JWKS endpoint** pro public key distribuce
- **Zpětná kompatibilita** s legacy tokeny
- **Audit logging** všech keystore operací
- **Metrics/telemetrie** pro monitoring

## 🏗️ Architektura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   TokenService  │ ←→ │   KeyManager     │ ←→ │    Database     │
│                 │    │                  │    │  (keys table)   │
│ - sign()        │    │ - getActiveKey() │    │                 │
│ - verify()      │    │ - createKey()    │    │                 │
│ - ES256 JWS     │    │ - rotateKey()    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│   Metrics       │    │   Audit Logs     │
│                 │    │                  │
│ - sign ops      │    │ - key lifecycle  │
│ - verify ops    │    │ - token operations│
│ - JWKS hits     │    │ - security events │
└─────────────────┘    └──────────────────┘
```

## 📋 Databázové schéma

### Keys tabulka
- `kid` - Unique key identifier
- `purpose` - access_jwt, refresh_jwt, qr_jwt, webhook_hmac
- `alg` - Kryptografický algoritmus (ES256)
- `status` - active, rotating, retired
- `privateMaterial` - Envelope-encrypted private key
- `publicMaterial` - Public key (JWK format)
- `createdAt`, `activatedAt`, `retiredAt`

### Key Audit tabulka
- Kompletní audit trail všech key operací
- Bez PII dat, pouze operační metadata

## 🚀 Použití

### Podepisování tokenů
```typescript
import { tokenService } from "./token-service";

// Access token s 2h TTL
const accessToken = await tokenService.sign(
  { sub: userId, roles: ["user"] },
  { purpose: "access_jwt", ttl: "2h" }
);

// QR token s 60s TTL
const qrToken = await tokenService.sign(
  { sub: userId, nonce: "abc123" },
  { purpose: "qr_jwt", ttl: "60s" }
);
```

### Ověřování tokenů
```typescript
// S fallback na legacy ENV klíče
const payload = await tokenService.verify(token, { 
  acceptFallbackEnvKey: true 
});

// Pouze keystore klíče
const payload = await tokenService.verify(token);
```

### Key management
```typescript
import { keyManager } from "./key-manager";

// Rotace klíče
await keyManager.rotateKey("access_jwt");

// Získání JWKS
const jwks = await keyManager.listJWKS();
```

## 🔒 Bezpečnost

### Envelope Encryption
Privátní klíče jsou šifrovány pomocí ENCRYPTION_MASTER_KEY:
```
encrypted_private_key = AES256(private_key, master_key)
```

### Environment Variables
```bash
# POVINNÉ v production
ENCRYPTION_MASTER_KEY=base64_encoded_32_bytes

# Legacy kompatibilita (fallback)
JWT_ACCESS_SECRET_PEM=-----BEGIN EC PRIVATE KEY-----...
JWT_REFRESH_SECRET_PEM=-----BEGIN EC PRIVATE KEY-----...

# Feature flags
ENABLE_METRICS=true
ENABLE_AUDIT=true
```

### Fail-fast v production
```typescript
if (process.env.NODE_ENV === "production" && !config.getConfig().encryptionMasterKey) {
  throw new Error("ENCRYPTION_MASTER_KEY required in production");
}
```

## 📊 Endpoints

### JWKS Discovery
```
GET /.well-known/jwks.json
```
Vrací public klíče se statusem `active` nebo `retiring`.

### Metrics (development only)
```
GET /metrics
```
Telemetrie operací a gauge active klíčů per purpose.

## 🔄 Key Lifecycle

```
pending → active → retiring → retired
    ↑         ↑        ↑         ↑
  create   activate  rotate   cleanup
```

**Constraint**: Maximálně 1 aktivní klíč per purpose současně.

## 📝 Audit Trail

Všechny operace jsou automaticky auditovány:
- `key_created`, `key_activated`, `key_retired`
- `sign_ok`, `sign_fail`, `verify_ok`, `verify_fail`
- `jwks_served`

Bez PII dat - pouze operační metadata.

## 🔧 Bootstrap

Při prvním spuštění se automaticky vytvoří:
- `access_jwt` ES256 key (active)
- `refresh_jwt` ES256 key (active)  
- `qr_jwt` ES256 key (active)

## 🧪 Testování

```bash
# Test JWKS endpoint
curl http://localhost:5000/.well-known/jwks.json

# Test metrics (development)
curl http://localhost:5000/metrics

# Test token signing/verification
npm test
```

## 📈 Monitoring

### Key Metrics
- `key_sign_total{purpose:kid}` - Úspěšné podepisování
- `key_verify_total{kid}` - Úspěšné ověřování
- `jwks_served_total` - JWKS endpoint přístupy
- `active_keys_per_purpose` - Gauge aktivních klíčů

### Audit Events
Všechny události v `key_audit` tabulce s:
- Kid, purpose, event type
- IP adresa, user agent (kde relevantní)
- Metadata bez PII

## 🔄 Migrace z Legacy

Systém podporuje plynulou migraci:

1. **Fáze 1**: Legacy + Keystore současně (fallback)
2. **Fáze 2**: Postupné přepnutí na keystore
3. **Fáze 3**: Odstranění legacy podpory

```typescript
// Kontrola feature flag
if (config.isFeatureEnabled("USE_KEYSTORE_AUTH")) {
  // Použij nové keystore funkce
} else {
  // Použij legacy auth
}
```

## ⚡ Performance

- **JWKS cache**: 5 minut na client straně
- **Key lookup**: Indexováno podle kid + purpose
- **Metrics**: In-memory (production by měl používat Redis/Prometheus)
- **Audit**: Asynchronní zápis bez blokování

## 🚨 Troubleshooting

### Chyby při spuštění
```
❌ ENCRYPTION_MASTER_KEY required in production
→ Nastav environment variable

❌ Failed to decrypt private key
→ Zkontroluj ENCRYPTION_MASTER_KEY

❌ No active key found for purpose
→ Spusť bootstrap nebo rotuj klíče
```

### Token chyby
```
❌ Invalid kid
→ Klíč neexistuje nebo je retired

❌ Token verification failed
→ Neplatný token nebo expirovaný

❌ Unsupported algorithm
→ Pouze ES256 je podporováno
```

## 🔮 Roadmap

- [ ] Key rotation scheduling
- [ ] Prometheus metrics export
- [ ] HSM/AWS KMS integrace
- [ ] Multi-tenant key isolation
- [ ] Key backup/recovery

---
**⚠️ DŮLEŽITÉ**: V production vždy nastav `ENCRYPTION_MASTER_KEY` na bezpečnou náhodnou hodnotu!