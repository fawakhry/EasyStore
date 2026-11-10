import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from customer_import import read_customers, generate_sql, sql_text

class CustomerImportTest(unittest.TestCase):
 def test_arabic_and_text_identifiers(self):
  r=read_customers('customer_id,name,phone\n0007,عميل تجريبي,01001230000\n')[0]
  self.assertEqual((r['customer_id'],r['mobile']),('0007','01001230000'))
 def test_bom_and_semicolon(self):
  self.assertEqual(read_customers('\ufeffمعرف العميل;اسم العميل\nA-1;تجريبي\n')[0]['name'],'تجريبي')
 def test_quoted_multiline(self):
  self.assertEqual(read_customers('customer_id,name,address\nA,Test,"one\ntwo"\n')[0]['address'],'one\ntwo')
 def test_missing_stable_id(self):
  with self.assertRaises(ValueError): read_customers('name,phone\nTest,0123\n')
 def test_duplicate_identity_rejected(self):
  with self.assertRaises(ValueError): read_customers('id,name\nA,One\nA,Two\n')
 def test_same_phone_not_merged(self):
  self.assertEqual(len(read_customers('id,name,phone\nA,One,012\nB,Two,012\n')),2)
 def test_empty_name(self):
  with self.assertRaises(ValueError): read_customers('id,name\nA,\n')
 def test_bad_rows(self):
  with self.assertRaises(ValueError): read_customers('id,name\nA,B,C\n')
 def test_ambiguous_columns(self):
  with self.assertRaises(ValueError): read_customers('id,customer_id,name\nA,B,C\n')
 def test_length_counts_utf16(self):
  with self.assertRaises(ValueError): read_customers('id,name,mobile\nA,Test,'+'😀'*26+'\n')
 def test_sqlcmd_and_quote_injection(self):
  val="'\nGO\n:r secrets\n'); DROP TABLE Clients; --"
  literal=sql_text(val)
  self.assertNotIn('GO',literal); self.assertNotIn('DROP',literal)
  self.assertEqual(bytes.fromhex(literal.split('0x')[1][:-1]).decode('utf-16le'),val)
 def test_preview_and_transaction_boundaries(self):
  s=generate_sql(read_customers('id,name\nA,Test\n'))
  self.assertIn('SET @Apply = 0',s)
  self.assertLess(s.index('IF @Apply=0'),s.index('BEGIN TRANSACTION'))
  self.assertIn('ROLLBACK TRANSACTION',s)
  self.assertIn('SCOPE_IDENTITY()',s)
  self.assertIn('WITH(UPDLOCK,HOLDLOCK)',s)
 def test_mutation_allowlist(self):
  import re
  s=generate_sql(read_customers('id,name\nA,Test\n'))
  writes=re.findall(r'INSERT INTO\s+([^\s(]+)',s,re.I)
  self.assertEqual(set(writes),{'#Incoming','dbo.Clients','dbo.TrendOSCustomerLink'})
  self.assertFalse(re.search(r'\b(?:UPDATE|DELETE|MERGE|ALTER)\b',s,re.I))
 def test_backup_precedes_customer_transaction_and_follows_preview(self):
  s=generate_sql(read_customers('id,name\nA,Test\n'))
  self.assertLess(s.index('IF @Apply=0'),s.index('BACKUP DATABASE'))
  self.assertLess(s.index('BACKUP DATABASE'),s.index('RESTORE VERIFYONLY'))
  self.assertLess(s.index('RESTORE VERIFYONLY'),s.index('BEGIN TRANSACTION'))

if __name__=='__main__':unittest.main()
