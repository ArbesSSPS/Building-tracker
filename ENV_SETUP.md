# Environment Variables Setup

Tento dokument popisuje nastavení environment proměnných pro trvalé přihlášení a další funkce.

## Povinné proměnné

### NextAuth Configuration
```bash
NEXTAUTH_URL="http://localhost:3000"  # V produkci: https://yourdomain.com
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
```

### Database
```bash
DATABASE_URL="file:./dev.db"  # V produkci: PostgreSQL/MySQL URL
```

### Encryption (pro alarm kódy)
```bash
ENCRYPTION_KEY="your-32-character-secret-key-here!"
```

## Volitelné proměnné

### Email Configuration
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="your-email@gmail.com"
FROM_NAME="Building Tracker"
```

### API URL (pro cron joby)
```bash
API_URL="http://localhost:3000"  # V produkci: https://yourdomain.com
```

## Nastavení pro produkci

1. **NEXTAUTH_SECRET**: Vygenerujte silný, náhodný klíč
   ```bash
   openssl rand -base64 32
   ```

2. **NEXTAUTH_URL**: Nastavte na vaši produkční doménu
   ```bash
   NEXTAUTH_URL="https://yourdomain.com"
   ```

3. **ENCRYPTION_KEY**: Použijte silný klíč pro šifrování alarm kódů
   ```bash
   ENCRYPTION_KEY="your-very-secure-32-character-key-here!"
   ```

## Bezpečnostní doporučení

- Nikdy necommitněte `.env.local` do gitu
- Používejte silné, náhodné klíče v produkci
- Pravidelně rotujte klíče
- Zálohujte klíče na bezpečném místě

## Trvalé přihlášení

S novou konfigurací:
- **Bez "Zůstat přihlášen"**: Session trvá 24 hodin
- **S "Zůstat přihlášen"**: Session trvá 30 dní
- Session se automaticky obnovuje při aktivitě
- Funguje i po restartu serveru a nových verzích
