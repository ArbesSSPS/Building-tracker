# Nastavení automatického posílání emailů

Tento dokument popisuje, jak nastavit automatické posílání cleaning reminder emailů každou neděli v 18:00 pražského času.

## Co systém dělá

- **Každou neděli v 18:00** se automaticky spustí script
- **Určí zodpovědné místnosti** pro příští týden na základě rotace
- **Pošle email** všem uživatelům v zodpovědných místnostech
- **Email obsahuje** správné údaje:
  - Datum: [DATUM_TÝDNE] - formátované období (např. "1. - 7. ledna 2025")
  - Odpovědní lidé: [ODPOVĚDNÍ_LIDÉ] - jména všech uživatelů v místnosti
  - Místnost: [MÍSTNOST] - název místnosti

## Dostupné scripty

### `test-weekly-recipients.js`
- **Účel:** Zobrazí kdo dostane emaily tento týden (bez odesílání)
- **Použití:** `node scripts/test-weekly-recipients.js`
- **Výstup:** Seznam příjemců, místností a období

### `next-week-recipients.js`
- **Účel:** Zobrazí kdo dostane emaily příští týden (bez odesílání)
- **Použití:** `node scripts/next-week-recipients.js`
- **Výstup:** Seznam příjemců pro příští týden

### `send-weekly-reminders.js`
- **Účel:** Skutečné odesílání emailů (používá se v cron jobu)
- **Použití:** `node scripts/send-weekly-reminders.js`
- **Výstup:** Odesílá skutečné emaily všem příjemcům

### `setup-cron.sh`
- **Účel:** Nastaví automatický cron job
- **Použití:** `./scripts/setup-cron.sh`
- **Výstup:** Přidá cron job do crontab

## Nastavení cron jobu

### Automatické nastavení (doporučeno)

```bash
# Spusť setup script
./scripts/setup-cron.sh
```

### Manuální nastavení

1. **Otevři crontab editor:**
   ```bash
   crontab -e
   ```

2. **Přidej tento řádek:**
   ```bash
   0 18 * * 0 cd /cesta/k/tvému/projektu && node scripts/send-weekly-reminders.js >> logs/cron.log 2>&1
   ```

3. **Ulož a zavři editor**

### Ověření nastavení

```bash
# Zobraz aktuální cron joby
crontab -l

# Zkontroluj logy
tail -f logs/cron.log
```

## Testování

### Test kdo dostane emaily (bez odesílání)

```bash
# Zobraz kdo dostane emaily tento týden
node scripts/test-weekly-recipients.js

# Zobraz kdo dostane emaily příští týden
node scripts/next-week-recipients.js
```

### Manuální test odesílání

```bash
# Spusť skutečné odesílání emailů
node scripts/send-weekly-reminders.js
```

### Test přes admin panel

1. Jdi na `/admin`
2. Klikni na tab "Emaily"
3. Klikni na "Odeslat týdenní připomínky"

### Test API endpointu

```bash
# Test endpoint (bez odesílání)
curl -X POST http://localhost:3000/api/email/send-weekly-reminders

# Test endpoint (s odesíláním)
curl -X POST http://localhost:3000/api/email/send-test-reminders
```

### Doporučený workflow testování

1. **Nejdříve zkontroluj kdo dostane emaily:**
   ```bash
   node scripts/test-weekly-recipients.js
   ```

2. **Zkontroluj příští týden:**
   ```bash
   node scripts/next-week-recipients.js
   ```

3. **Otestuj skutečné odesílání:**
   ```bash
   node scripts/send-weekly-reminders.js
   ```

4. **Nastav automatický cron job:**
   ```bash
   ./scripts/setup-cron.sh
   ```

## Konfigurace

### SMTP nastavení (.env)

```env
SMTP_HOST="smtp.websupport.cz"
SMTP_PORT=465
SMTP_USER="arbes@virtuex.cz"
SMTP_PASS="|S1NkY[+L]AoeR.ygYxP"
```

### Časové pásmo

Script používá systémové časové pásmo. Pro pražský čas (CET/CEST) ujisti se, že server běží v správném časovém pásmu:

```bash
# Zkontroluj časové pásmo
timedatectl

# Nastav pražské časové pásmo (pokud je potřeba)
sudo timedatectl set-timezone Europe/Prague
```

## Logy a monitoring

### Logy cron jobu

```bash
# Zobraz poslední logy
tail -f logs/cron.log

# Zobraz logy z posledních 24 hodin
grep "$(date +%Y-%m-%d)" logs/cron.log
```

### Monitoring

- **Úspěšné odeslání:** `✅ Weekly reminders sent successfully!`
- **Chyby:** `❌ Error sending weekly reminders`
- **Detaily:** Počet odeslaných a neúspěšných emailů

## Troubleshooting

### Cron job se nespouští

1. **Zkontroluj cron service:**
   ```bash
   sudo systemctl status cron
   sudo systemctl start cron
   ```

2. **Zkontroluj oprávnění:**
   ```bash
   chmod +x scripts/send-weekly-reminders.js
   ```

3. **Zkontroluj cestu k Node.js:**
   ```bash
   which node
   # Použij plnou cestu v crontab pokud je potřeba
   ```

### Emaily se neposílají

1. **Zkontroluj SMTP nastavení** v `.env`
2. **Otestuj SMTP připojení** v admin panelu
3. **Zkontroluj logy** v `logs/cron.log`

### Script se nespouští

1. **Zkontroluj Node.js verzi:**
   ```bash
   node --version
   ```

2. **Zkontroluj závislosti:**
   ```bash
   npm install
   ```

3. **Spusť script ručně** pro debug:
   ```bash
   node scripts/send-weekly-reminders.js
   ```

## Struktura souborů

```
scripts/
├── send-weekly-reminders.js    # Hlavní cron script pro skutečné odesílání
├── test-weekly-recipients.js   # Test script - zobrazí kdo dostane emaily
├── next-week-recipients.js     # Script pro zobrazení příštího týdne
└── setup-cron.sh              # Setup script pro cron

logs/
└── cron.log                   # Logy z cron jobu

src/app/api/email/
├── send-reminder/route.ts     # API pro jednotlivé emaily
├── send-weekly-reminders/     # API pro týdenní emaily (skutečné odesílání)
│   └── route.ts
└── send-test-reminders/       # API pro testovací emaily
    └── route.ts

src/lib/
└── email.ts                   # Email service

cleaning-reminder-email.html   # HTML template
```

## Bezpečnost

- **Heslo SMTP** je uloženo v `.env` souboru (necommitovat!)
- **Cron job** běží s oprávněními aktuálního uživatele
- **Logy** neobsahují citlivé informace
- **API endpointy** jsou chráněné NextAuth autentizací

## Podpora

Pro problémy nebo otázky:
1. Zkontroluj logy v `logs/cron.log`
2. Otestuj manuálně přes admin panel
3. Zkontroluj SMTP nastavení
4. Ověř, že aplikace běží na `http://localhost:3000`
