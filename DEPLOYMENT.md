# Nasazení na Render

Tento dokument popisuje, jak nasadit Building Tracker aplikaci na Render.

## Požadavky

- Render účet
- PostgreSQL databáze (Render poskytuje)
- Environment proměnné

## Kroky nasazení

### 1. Příprava repozitáře

```bash
# Instalace závislostí
npm install

# Build projektu
npm run build
```

### 2. Vytvoření služby na Render

1. Přihlaste se na [Render.com](https://render.com)
2. Klikněte na "New +" → "Web Service"
3. Připojte GitHub repozitář
4. Vyberte branch (obvykle `main`)

### 3. Konfigurace služby

**Build Command:**
```bash
npm install && npm run db:generate && npm run build
```

**Start Command:**
```bash
npm run start
```

**Node Version:**
```
18
```

### 4. Environment proměnné

Nastavte následující proměnné v Render dashboardu:

```bash
NODE_ENV=production
NEXTAUTH_URL=https://your-app-name.onrender.com
NEXTAUTH_SECRET=your-secret-key-here
ENCRYPTION_KEY=your-32-character-encryption-key
DATABASE_URL=postgresql://user:password@host:port/database
API_URL=https://your-app-name.onrender.com
```

### 5. PostgreSQL databáze

1. Vytvořte novou PostgreSQL databázi na Render
2. Zkopírujte connection string do `DATABASE_URL`
3. Spusťte migrace po nasazení

### 6. Migrace databáze

Po nasazení spusťte migrace:

```bash
# Přes Render shell nebo lokálně s produkční DATABASE_URL
npx prisma migrate deploy
```

### 7. Seed databáze (volitelné)

```bash
npm run db:seed
```

## Environment proměnné

### Povinné

- `NEXTAUTH_URL` - URL vaší aplikace
- `NEXTAUTH_SECRET` - Tajný klíč pro NextAuth
- `ENCRYPTION_KEY` - 32-znakový klíč pro šifrování
- `DATABASE_URL` - PostgreSQL connection string

### Volitelné

- `SMTP_HOST` - SMTP server pro emaily
- `SMTP_PORT` - SMTP port
- `SMTP_USER` - SMTP uživatel
- `SMTP_PASS` - SMTP heslo
- `FROM_EMAIL` - Email odesílatele
- `FROM_NAME` - Jméno odesílatele
- `API_URL` - URL API pro cron joby

## Generování klíčů

### NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

### ENCRYPTION_KEY
```bash
openssl rand -base64 32
```

## Troubleshooting

### Databáze
- Zkontrolujte, že `DATABASE_URL` je správně nastaven
- Spusťte migrace: `npx prisma migrate deploy`
- Zkontrolujte Prisma client: `npx prisma generate`

### Build chyby
- Zkontrolujte Node.js verzi (18+)
- Zkontrolujte všechny závislosti v package.json
- Zkontrolujte TypeScript chyby

### Runtime chyby
- Zkontrolujte environment proměnné
- Zkontrolujte logy v Render dashboardu
- Zkontrolujte databázové připojení

## Monitoring

- Render poskytuje základní metriky
- Zkontrolujte logy v Render dashboardu
- Nastavte upozornění na chyby

## Backup

- Render automaticky zálohuje PostgreSQL databázi
- Zvažte pravidelné exporty dat
- Zálohujte environment proměnné
