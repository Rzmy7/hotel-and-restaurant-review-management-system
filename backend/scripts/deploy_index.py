import pyodbc
import sys
import os

# Align path to load backend app core
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.pyodbc_connection import get_connection_string

def deploy_index():
    print("=========================================================")
    print("      PRODUCTION COVERING INDEX DEPLOYMENT SCRIPT        ")
    print("=========================================================\n")
    
    # Connect with autocommit=True for index creation
    conn = pyodbc.connect(get_connection_string(), autocommit=True)
    cursor = conn.cursor()
    
    # 1. Inspect Engine Edition and Version
    cursor.execute("SELECT @@VERSION")
    version = cursor.fetchone()[0]
    print(f"Database Server Version:\n{version}\n")
    
    cursor.execute("SELECT CAST(SERVERPROPERTY('EngineEdition') AS INT)")
    engine_edition = cursor.fetchone()[0]
    # Engine editions:
    # 1 = Personal/Desktop
    # 2 = Standard
    # 3 = Enterprise/Developer/Azure SQL
    # 4 = Express
    print(f"SQL Server Engine Edition Code: {engine_edition}")
    
    # 2. Deploy index using dynamic SQL
    sql_script = """
    IF NOT EXISTS (
        SELECT 1 
        FROM sys.indexes 
        WHERE object_id = OBJECT_ID('dbo.processed_review') 
          AND name = 'IX_processed_review_source_date'
    )
    BEGIN
        DECLARE @sql NVARCHAR(MAX);
        
        -- Check if Engine Edition is 3 (Enterprise, Developer, or Azure SQL)
        IF SERVERPROPERTY('EngineEdition') = 3
        BEGIN
            PRINT 'Enterprise/Developer Edition detected. Building covering index ONLINE...';
            SET @sql = N'
                CREATE NONCLUSTERED INDEX IX_processed_review_source_date 
                ON dbo.processed_review (source_id, reviewDate DESC)
                INCLUDE (rating, sentiment, status)
                WITH (ONLINE = ON, DATA_COMPRESSION = PAGE, FILLFACTOR = 90);';
        END
        ELSE
        BEGIN
            PRINT 'Standard/Express Edition detected. Building covering index with default lock mode...';
            SET @sql = N'
                CREATE NONCLUSTERED INDEX IX_processed_review_source_date 
                ON dbo.processed_review (source_id, reviewDate DESC)
                INCLUDE (rating, sentiment, status)
                WITH (FILLFACTOR = 90);';
        END

        EXEC sp_executesql @sql;
        PRINT 'SUCCESS: Index IX_processed_review_source_date created successfully!';
    END
    ELSE
    BEGIN
        PRINT 'NOTICE: Index IX_processed_review_source_date already exists.';
    END
    """
    
    print("\nExecuting deployment script...")
    cursor.execute(sql_script)
    
    # Fetch print output messages from SQL Server connection (messages queue)
    while True:
        try:
            # Check for messages or any print output
            if cursor.messages:
                for msg in cursor.messages:
                    print(f"SQL Server Msg: {msg[1]}")
            if not cursor.nextset():
                break
        except Exception:
            break
            
    # 3. Double check index was successfully registered
    print("\nVerifying index registration...")
    cursor.execute("""
        SELECT i.name, i.type_desc, i.fill_factor, i.is_unique,
               STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE i.object_id = OBJECT_ID('dbo.processed_review') 
          AND i.name = 'IX_processed_review_source_date'
        GROUP BY i.name, i.type_desc, i.fill_factor, i.is_unique
    """)
    row = cursor.fetchone()
    if row:
        print("✓ VERIFICATION SUCCESSFUL!")
        print(f"  Index Name  : {row.name}")
        print(f"  Index Type  : {row.type_desc}")
        print(f"  Fill Factor : {row.fill_factor}%")
        print(f"  Key Columns : {row.columns}")
        
        # Verify included columns as well
        cursor.execute("""
            SELECT c.name
            FROM sys.index_columns ic
            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE ic.object_id = OBJECT_ID('dbo.processed_review') 
              AND ic.index_id = (SELECT index_id FROM sys.indexes WHERE name = 'IX_processed_review_source_date' AND object_id = OBJECT_ID('dbo.processed_review'))
              AND ic.is_included_column = 1
        """)
        inc_cols = [r[0] for r in cursor.fetchall()]
        print(f"  Included Columns: {', '.join(inc_cols)}")
        
        # Check compression on the index
        cursor.execute("""
            SELECT p.data_compression_desc
            FROM sys.partitions p
            INNER JOIN sys.indexes i ON p.object_id = i.object_id AND p.index_id = i.index_id
            WHERE i.object_id = OBJECT_ID('dbo.processed_review') AND i.name = 'IX_processed_review_source_date'
        """)
        compression = cursor.fetchone()[0]
        print(f"  Compression : {compression}")
        
    else:
        print("❌ VERIFICATION FAILED: Index was not found on dbo.processed_review.")
        sys.exit(1)
        
    conn.close()
    print("\n=========================================================")
    print("            DEPLOYMENT OPERATION COMPLETED               ")
    print("=========================================================")

if __name__ == '__main__':
    deploy_index()
