# Cron Job Setup - Týdenní Připomínky Úklidu

## Přehled
Cron job automaticky posílá týdenní emailové připomínky o tom, kdo má příští týden úklid.

## Konfigurace na Renderu

### 1. Automatické nastavení přes render.yaml
Cron job je již nakonfigurován v `render.yaml`:

```yaml
- type: cron
  name: weekly-cleaning-reminders
  env: node
  plan: starter
  schedule: "0 18 * * 0"  # Každou neděli v 18:00 UTC (19:00 českého času)
  buildCommand: npm install
  startCommand: node scripts/send-weekly-reminders.js
```

### 2. Environment Variables
Cron job používá stejné environment variables jako web aplikace:
- `DATABASE_URL` - připojení k databázi
- `API_URL` - URL web aplikace
- `SMTP_*` - email konfigurace
- `FROM_EMAIL`, `FROM_NAME` - odesílatel emailů

### 3. Plán spouštění
- **Čas:** Každou neděli v 18:00 UTC (19:00 českého času)
- **Frekvence:** Týdně
- **Cron výraz:** `0 18 * * 0`

## Testování

### Lokální test
```bash
# Test cron jobu
npm run cron:test

# Nebo přímo
node scripts/test-cron-job.js
```

### Manuální spuštění
```bash
# Spuštění týdenních připomínek
npm run cron:weekly

# Nebo přímo
node scripts/send-weekly-reminders.js
```

## Jak to funguje

1. **Cron job se spustí** každou neděli v 19:00 českého času
2. **Načte data** z databáze o tom, kdo má příští týden úklid
3. **Pošle emaily** všem zodpovědným osobám
4. **Loguje výsledky** pro monitoring

## Monitoring

### Logy na Renderu
- Jdi na Render Dashboard
- Vyber "weekly-cleaning-reminders" cron job
- Klikni na "Logs" pro zobrazení výstupu

### Očekávaný výstup
```
[2025-01-21T18:00:00.000Z] Starting weekly cleaning reminders...
[2025-01-21T18:00:01.000Z] ✅ Weekly reminders sent successfully!
[2025-01-21T18:00:01.000Z] Total sent: 3
[2025-01-21T18:00:01.000Z] Total failed: 0
```

## Troubleshooting

### Cron job se nespouští
1. Zkontroluj, že je cron job aktivní na Renderu
2. Zkontroluj environment variables
3. Zkontroluj logy pro chyby

### Emaily se neposílají
1. Zkontroluj SMTP konfiguraci
2. Zkontroluj, že jsou nastaveny `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`
3. Zkontroluj, že jsou v databázi uživatelé s přiřazenými místnostmi

### Testování bez čekání na neděli
```bash
# Spusť test lokálně
npm run cron:test
```

## Údržba

### Změna času spouštění
Uprav `schedule` v `render.yaml`:
- `"0 18 * * 0"` = neděle 18:00 UTC (19:00 českého času)
- `"0 17 * * 0"` = neděle 17:00 UTC (18:00 českého času)
- `"0 19 * * 0"` = neděle 19:00 UTC (20:00 českého času)

### Změna frekvence
- `"0 18 * * 0"` = týdně (neděle)
- `"0 18 1 * *"` = měsíčně (1. den v měsíci)
- `"0 18 * * 1"` = týdně (pondělí)

## Bezpečnost

- Cron job běží s minimálními oprávněními
- Používá stejné environment variables jako web app
- Automaticky se restartuje při změnách kódu
- Loguje všechny akce pro audit
