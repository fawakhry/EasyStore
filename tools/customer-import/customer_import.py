"""Generate a preview-first SQL Server 2005 customer import; never connects to SQL.
Input requires a stable TrendOS customer ID. No invoice or financial writes.
Generated SQL contains personal data: keep private, never commit it.
"""
import argparse
import csv
import io
from pathlib import Path

ALIASES = {
    'customer_id': ('customer_id', 'customerId', 'id', 'كود العميل', 'معرف العميل'),
    'name': ('name', 'customerName', 'اسم العميل'),
    'mobile': ('mobile', 'phone', 'customerPhone', 'رقم الهاتف', 'الموبايل'),
    'telephone': ('telephone', 'telNo', 'التليفون'),
    'address': ('address', 'العنوان'),
    'email': ('email', 'mail', 'البريد الإلكتروني'),
}
LIMITS = {'customer_id': 200, 'name': 1000, 'mobile': 50,
          'telephone': 50, 'address': 4000, 'email': 1000}


def read_customers(text):
    """Preserve textual IDs/phones and reject ambiguity instead of guessing identity."""
    text = text.lstrip('\ufeff')
    try:
        dialect = csv.Sniffer().sniff(text[:8192], delimiters=',;\t')
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect, strict=True)
    headers = reader.fieldnames or []
    if len(headers) != len(set(headers)):
        raise ValueError('Duplicate CSV headers')
    selected = {}
    for field, aliases in ALIASES.items():
        matches = [h for h in headers if h in aliases]
        if len(matches) > 1:
            raise ValueError('Ambiguous headers for ' + field)
        if matches:
            selected[field] = matches[0]
    if 'customer_id' not in selected or 'name' not in selected:
        raise ValueError('Export must include customer_id and name; phone is not a customer ID')
    rows, seen = [], set()
    for line, raw in enumerate(reader, 2):
        if None in raw or any(v is None for v in raw.values()):
            raise ValueError('Malformed CSV at row ' + str(line))
        row = {k: (raw.get(selected.get(k), '') or '').strip() for k in ALIASES}
        if not row['customer_id'] or not row['name']:
            raise ValueError('Missing ID/name at row ' + str(line))
        if row['customer_id'] in seen:
            raise ValueError('Duplicate customer ID at row ' + str(line))
        for k, v in row.items():
            if '\x00' in v or len(v.encode('utf-16le')) // 2 > LIMITS[k]:
                raise ValueError('Invalid or overlength ' + k + ' at row ' + str(line))
        seen.add(row['customer_id'])
        rows.append(row)
        if len(rows) > 25000:
            raise ValueError('Split exports larger than 25000 customers')
    if not rows:
        raise ValueError('Empty customer export')
    return rows


def sql_text(value):
    # Hex avoids SQLCMD/GO directives and Unicode/apostrophe quoting hazards.
    if not value:
        return "N''"
    return 'CONVERT(nvarchar(max),0x' + value.encode('utf-16le').hex() + ')'


def generate_sql(rows):
    preamble = Path(__file__).with_name('import_template.sql').read_text(encoding='utf-8')
    inserts = '\n'.join(
        'INSERT INTO #Incoming (SourceId,Name,Mobile,TelNo,Address,Mail) VALUES (' +
        ','.join(sql_text(r[k]) for k in ALIASES) + ');' for r in rows)
    return preamble.replace('-- INSERT_CUSTOMERS_HERE', inserts)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('csv_file', type=Path)
    p.add_argument('output_sql', type=Path)
    a = p.parse_args()
    if a.csv_file.resolve() == a.output_sql.resolve():
        p.error('Output must differ from input')
    if a.csv_file.stat().st_size > 20 * 1024 * 1024:
        p.error('Input exceeds 20 MiB')
    try:
        rows = read_customers(a.csv_file.read_text(encoding='utf-8-sig'))
        with a.output_sql.open('x', encoding='utf-8-sig', newline='') as f:
            f.write(generate_sql(rows).replace('\n', '\r\n'))
    except (ValueError, csv.Error, FileExistsError) as e:
        p.error(str(e))
    print('Prepared', len(rows), 'customers; preview mode enabled. No SQL connection was opened.')


if __name__ == '__main__':
    main()
