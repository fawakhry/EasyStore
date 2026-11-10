-- Private customer data. Do not publish this generated file.
-- SQL Server 2005 compatible. Default is preview only.
-- This script never creates invoices, receipts, balances or stock movements.
USE [EasyStoreDBEmpty];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @Apply bit;
SET @Apply = 0; -- Change to 1 only after reviewing preview and taking a BAK.
IF DB_NAME() <> N'EasyStoreDBEmpty'
BEGIN RAISERROR('Wrong database. Import stopped.',16,1); RETURN; END;
IF CONVERT(nvarchar(128),SERVERPROPERTY('ServerName')) <> N'SERVER-PC\SQLEXPRESS'
BEGIN RAISERROR('Wrong server. Import stopped.',16,1); RETURN; END;
IF OBJECT_ID(N'dbo.Clients',N'U') IS NULL
 OR ISNULL(COLUMNPROPERTY(OBJECT_ID(N'dbo.Clients'),N'ID','IsIdentity'),0) <> 1
BEGIN RAISERROR('Expected Clients schema unavailable.',16,1); RETURN; END;
IF EXISTS (SELECT 1 FROM sys.triggers WHERE parent_id=OBJECT_ID(N'dbo.Clients') AND is_disabled=0)
BEGIN RAISERROR('Clients has enabled triggers. Review side effects before importing.',16,1); RETURN; END;
IF OBJECT_ID('tempdb..#Incoming') IS NOT NULL DROP TABLE #Incoming;
CREATE TABLE #Incoming (
 SourceId nvarchar(200) COLLATE Latin1_General_BIN2 NOT NULL PRIMARY KEY,
 Name nvarchar(max) NOT NULL, Mobile nvarchar(50) NOT NULL,
 TelNo nvarchar(50) NOT NULL, Address nvarchar(max) NOT NULL, Mail nvarchar(max) NOT NULL
);
-- INSERT_CUSTOMERS_HERE
SELECT COUNT(*) AS IncomingCustomers, @Apply AS ApplyMode FROM #Incoming;
IF @Apply=0
BEGIN
 SELECT TOP 20 SourceId,Name,Mobile,Address FROM #Incoming ORDER BY SourceId;
 PRINT 'PREVIEW ONLY: No persistent changes. Take a database backup before apply.';
 RETURN;
END;
BEGIN TRY
 -- Backup is mandatory before apply; failure stops before customer writes.
 DECLARE @BackupFile nvarchar(4000);
 SET @BackupFile=N'D:\Db\EasyStore_before_customers_'+REPLACE(CONVERT(nvarchar(36),NEWID()),N'-',N'')+N'.bak';
 BACKUP DATABASE [EasyStoreDBEmpty] TO DISK=@BackupFile WITH COPY_ONLY,CHECKSUM;
 RESTORE VERIFYONLY FROM DISK=@BackupFile WITH CHECKSUM;
 SELECT @BackupFile AS VerifiedBackupFile;
 BEGIN TRANSACTION;
 DECLARE @LockResult int;
 EXEC @LockResult=sys.sp_getapplock @Resource=N'TrendOS-Customer-Import-V1',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @LockResult<0 RAISERROR('Customer import lock unavailable.',16,1);
 IF OBJECT_ID(N'dbo.TrendOSCustomerLink',N'U') IS NULL
 BEGIN
  -- Refuse automatic name/phone matching against an existing customer population.
  IF EXISTS(SELECT 1 FROM dbo.Clients WITH (TABLOCKX,HOLDLOCK))
   RAISERROR('Existing customers require identity mapping before first import.',16,1);
  CREATE TABLE dbo.TrendOSCustomerLink (
   SourceId nvarchar(200) COLLATE Latin1_General_BIN2 NOT NULL PRIMARY KEY,
   ClientId int NOT NULL UNIQUE,
   ImportedAt datetime NOT NULL DEFAULT GETUTCDATE(),
   CONSTRAINT FK_TrendOSCustomerLink_Clients FOREIGN KEY(ClientId) REFERENCES dbo.Clients(ID)
  );
 END;
 IF EXISTS(SELECT 1 FROM dbo.TrendOSCustomerLink l LEFT JOIN dbo.Clients c ON c.ID=l.ClientId WHERE c.ID IS NULL)
  RAISERROR('Broken customer mapping. Import stopped.',16,1);
 DECLARE @SourceId nvarchar(200),@Name nvarchar(max),@Mobile nvarchar(50),
  @TelNo nvarchar(50),@Address nvarchar(max),@Mail nvarchar(max),@ClientId int,
  @Inserted int,@Skipped int;
 SET @Inserted=0; SET @Skipped=0;
 DECLARE incoming CURSOR LOCAL FAST_FORWARD FOR
  SELECT SourceId,Name,Mobile,TelNo,Address,Mail FROM #Incoming ORDER BY SourceId;
 OPEN incoming;
 FETCH NEXT FROM incoming INTO @SourceId,@Name,@Mobile,@TelNo,@Address,@Mail;
 WHILE @@FETCH_STATUS=0
 BEGIN
  IF EXISTS(SELECT 1 FROM dbo.TrendOSCustomerLink WITH(UPDLOCK,HOLDLOCK) WHERE SourceId=@SourceId)
   SET @Skipped=@Skipped+1;
  ELSE
  BEGIN
   -- Contact/master fields only. Do not initialize debt, credit, cash or stock.
   INSERT INTO dbo.Clients (Name,Mobile,TelNo,Address,Mail,Status)
    VALUES(@Name,@Mobile,@TelNo,@Address,@Mail,1);
   SET @ClientId=CONVERT(int,SCOPE_IDENTITY());
   INSERT INTO dbo.TrendOSCustomerLink(SourceId,ClientId) VALUES(@SourceId,@ClientId);
   SET @Inserted=@Inserted+1;
  END;
  FETCH NEXT FROM incoming INTO @SourceId,@Name,@Mobile,@TelNo,@Address,@Mail;
 END;
 CLOSE incoming; DEALLOCATE incoming;
 COMMIT TRANSACTION;
 SELECT @Inserted AS InsertedCustomers,@Skipped AS AlreadyLinkedCustomers;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
 DECLARE @Error nvarchar(4000); SET @Error=ERROR_MESSAGE();
 RAISERROR('%s',16,1,@Error);
END CATCH;
GO
