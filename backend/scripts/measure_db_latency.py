import pyodbc
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.pyodbc_connection import get_connection_string

def run_db_benchmarks():
    print("=========================================================")
    print("       DATABASE PERFORMANCE & EXECUTION PLAN ANALYSIS    ")
    print("=========================================================\n")
    
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    
    # 1. Resolve an active organization with reviews
    cursor.execute("""
        SELECT TOP 1 s.organization_id, o.organization_name, COUNT(*) as cnt
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        JOIN dbo.organization o ON s.organization_id = o.organization_id
        GROUP BY s.organization_id, o.organization_name
        ORDER BY COUNT(*) DESC
    """)
    org_row = cursor.fetchone()
    if not org_row:
        # Fall back to any org or dummy query if no reviews exist
        cursor.execute("SELECT TOP 1 organization_id, organization_name FROM dbo.organization")
        dummy_row = cursor.fetchone()
        if not dummy_row:
            print("No organization found in database.")
            return
        org_id = str(dummy_row.organization_id)
        org_name = dummy_row.organization_name
        num_reviews = 0
    else:
        org_id = str(org_row.organization_id)
        org_name = org_row.organization_name
        num_reviews = org_row.cnt
        
    print(f"Benchmark context resolved:")
    print(f" -> Org Name : {org_name}")
    print(f" -> Org ID   : {org_id}")
    print(f" -> Reviews in Org dataset: {num_reviews}")
    
    queries = {
        "KPIs Average & Count": f"""
            SELECT COUNT(*), AVG(CAST(r.rating AS FLOAT)) 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = '{org_id}'
        """,
        "Alerts Pending count": f"""
            SELECT COUNT(*) 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE r.[status] = 'Pending' AND s.organization_id = '{org_id}'
        """,
        "Latest Reviews Selection": f"""
            SELECT TOP 10 
                r.id, r.rating, r.reviewerName, r.text, 
                r.sentiment, r.reviewDate, r.[status], 
                p.platform_name
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            JOIN dbo.platform p ON s.platform_id = p.platform_id
            WHERE s.organization_id = '{org_id}'
            ORDER BY r.reviewDate DESC
        """
    }
    
    # 2. Extract and print the actual query plan to confirm seeks and sort elimination
    print("\n--- QUERY PLAN VERIFICATION ---")
    for name, sql in queries.items():
        print(f"\nPlan for: {name}")
        cursor.execute("SET SHOWPLAN_TEXT ON")
        cursor.execute(sql)
        plan_lines = []
        while True:
            try:
                rows = cursor.fetchall()
                for r in rows:
                    line = r[0].strip()
                    if line and not any(line.startswith(p) for p in ["SELECT", "INSERT", "UPDATE", "SET"]):
                        plan_lines.append(r[0])
                if not cursor.nextset():
                    break
            except Exception:
                break
        cursor.execute("SET SHOWPLAN_TEXT OFF")
        
        plan_text = "\n".join(plan_lines)
        print(plan_text)
        
        # Check if Index Seek is present on processed_review
        if "IX_processed_review_source_date" in plan_text:
            print(" -> [OK] INDEX USAGE CONFIRMED: IX_processed_review_source_date")
            if "Seek" in plan_text or "Index Seek" in plan_text:
                print(" -> [OK] INDEX SEEK CONFIRMED (O(log N))")
            else:
                print(" -> ! Index Scan used")
        else:
            print(" -> [WARN] Warning: Index IX_processed_review_source_date not used in this plan!")
            
        # For Latest Reviews check sort elimination
        if "Latest" in name:
            if "Sort" in plan_text:
                print(" -> ! Sort operator present (sorting required)")
            else:
                print(" -> [OK] SORT ELIMINATED: SQL Server reads sorted data directly from index leaf pages!")

    # 3. Measure Latencies over 100 iterations
    print("\n--- RAW LATENCY MEASUREMENT (Averaged over 100 Runs) ---")
    for name, sql in queries.items():
        # Warmup run
        cursor.execute(sql)
        cursor.fetchall()
        
        start = time.perf_counter()
        for _ in range(100):
            cursor.execute(sql)
            cursor.fetchall()
        elapsed = (time.perf_counter() - start) * 1000 / 100.0
        print(f" -> {name:25} : {elapsed:.3f} ms")
        
    # 4. Check sys.dm_db_index_usage_stats to confirm seeks are increasing
    print("\n--- LIVE INDEX USAGE STATISTICS (sys.dm_db_index_usage_stats) ---")
    cursor.execute("""
        SELECT 
            OBJECT_NAME(s.object_id) AS TableName,
            i.name AS IndexName,
            s.user_seeks,
            s.user_scans,
            s.user_lookups,
            s.user_updates
        FROM sys.dm_db_index_usage_stats s
        INNER JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
        WHERE s.database_id = DB_ID() 
          AND s.object_id = OBJECT_ID('dbo.processed_review')
          AND i.name = 'IX_processed_review_source_date'
    """)
    row = cursor.fetchone()
    if row:
        print(f"Table Name    : {row.TableName}")
        print(f"Index Name    : {row.IndexName}")
        print(f"User Seeks    : {row.user_seeks} (Seek operations resolved)")
        print(f"User Scans    : {row.user_scans} (Scan operations resolved)")
        print(f"User Lookups  : {row.user_lookups} (Lookups resolved)")
        print(f"User Updates  : {row.user_updates} (Scraper writes/updates)")
    else:
        print("No index usage stats found yet (might require more query activity).")
        
    conn.close()

if __name__ == '__main__':
    run_db_benchmarks()
