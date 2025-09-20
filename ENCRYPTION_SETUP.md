# Šifrování alarm kódů

Tento dokument popisuje implementaci šifrování alarm kódů v systému Building Tracker.

## Přehled

Alarm kódy jsou nyní šifrovány v databázi pomocí AES-256-CBC šifrování. To znamená, že v databázi nejsou uloženy plaintext kódy jako "1234", ale jejich zašifrované verze.

## Implementace

### Šifrovací utility (`src/lib/encryption.ts`)

- **Algoritmus**: AES-256-CBC
- **Klíč**: Generován z `ENCRYPTION_KEY` pomocí `crypto.scryptSync()`
- **Formát**: `iv:encryptedData` (hex)

### API endpointy

- **GET `/api/user/profile`**: Automaticky dešifruje alarm kód při čtení
- **PUT `/api/user/profile`**: Automaticky šifruje alarm kód při ukládání

### Migrace

Existující alarm kódy byly migrovány pomocí skriptu `scripts/migrate-alarm-codes.js`.

## Konfigurace

### Environment proměnné

```bash
# V produkci nastavte silný klíč (32+ znaků)
ENCRYPTION_KEY=your-very-secure-32-character-key-here!
```

### Bezpečnostní doporučení

1. **Nikdy necommitněte ENCRYPTION_KEY do gitu**
2. **Použijte silný, náhodný klíč v produkci**
3. **Pravidelně rotujte klíče**
4. **Zálohujte klíče na bezpečném místě**

## Testování

### Spuštění testů

```bash
# Test šifrování/desifrování
node scripts/test-encryption.js

# Migrace existujících kódů
node scripts/migrate-alarm-codes.js
```

### Ověření v databázi

```sql
-- Alarm kódy jsou nyní šifrované
SELECT name, alarmCode FROM users WHERE alarmCode IS NOT NULL;
```

## Struktura dat

### Před šifrováním
```json
{
  "alarmCode": "1234"
}
```

### Po šifrování
```json
{
  "alarmCode": "6c991893970a6d16da7e:encrypted_data_here"
}
```

## Troubleshooting

### Problém: "Invalid encrypted format"
- **Příčina**: Alarm kód není ve správném formátu
- **Řešení**: Zkontrolujte, zda byl kód správně zašifrován

### Problém: "Decryption error"
- **Příčina**: Nesprávný klíč nebo poškozená data
- **Řešení**: Zkontrolujte ENCRYPTION_KEY

### Problém: "Invalid key length"
- **Příčina**: ENCRYPTION_KEY je příliš krátký
- **Řešení**: Použijte klíč o délce alespoň 32 znaků

## Bezpečnostní poznámky

1. **Alarm kódy jsou nyní bezpečně uloženy** - v databázi nejsou viditelné plaintext kódy
2. **Šifrování je transparentní** - aplikace automaticky šifruje/dešifruje při čtení/zápisu
3. **Klíč je kritický** - bez správného klíče nelze dešifrovat kódy
4. **Zálohování** - nezapomeňte zálohovat ENCRYPTION_KEY

## Migrace z plaintext

Pokud máte existující plaintext alarm kódy, spusťte:

```bash
node scripts/migrate-alarm-codes.js
```

Tento skript:
- Najde všechny uživatele s alarm kódy
- Zašifruje jejich kódy
- Aktualizuje databázi
- Poskytne podrobný report

## Verze

- **v1.0**: Implementace AES-256-CBC šifrování
- **Migrace**: Automatická migrace existujících kódů
