# TrendOS contact import candidate

Status: generator tests pass; SQL has not run on SQL Server or the owner's database. No desktop EXE changes are included.

Input: private UTF-8 CSV exported from the authoritative TrendOS customer master, with a verified stable `customer_id`, `name`, and optional `mobile`, `telephone`, `address`, `email`. Do not use a phone-only marketing export as an identity master. Verify that any `id` alias is a stable customer ID rather than a spreadsheet row number.

Run on the preparation machine:

```sh
python customer_import.py customers.csv customers-preview.sql
python -m unittest discover -s tests -v
```

The generated SQL contains personal information and must remain private. It defaults to `@Apply=0`, binds the known `SERVER-PC\SQLEXPRESS` / `EasyStoreDBEmpty`, previews counts and 20 records, and does not connect to SQL itself. Do not upload customer data or generated SQL to the repository.

Before applying, obtain an actual BAK and review the preview. SQL runtime qualification on a restored test copy is still required. After review, `@Apply=1` adds contact fields in `dbo.Clients` plus a separate `dbo.TrendOSCustomerLink` identity map in one transaction. It does not insert financial balances or invoices, or overwrite existing contact data. Existing stable IDs are skipped on re-import. The first import refuses a nonempty unmapped Clients population instead of guessing matches by name or phone. Enabled Clients triggers cause a stop for review. Existing mapped contact updates and reconciliation of manually added duplicates are outside this first candidate.

Only these writes exist: temporary input rows, new Clients contact rows, and a dedicated identity mapping table. No financial formula or original financial routine is changed. The existing R1 desktop package remains untouched.

The order field is a separate pending desktop change: preserve the existing native invoice number, and store the TrendOS order reference independently. Do not treat free text in Notes or a new local sequence as completed order integration. No Windows order-field patch is delivered by this candidate.
