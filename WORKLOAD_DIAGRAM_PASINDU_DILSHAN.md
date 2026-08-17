# Workload Diagram — Reviews, AI Reply & Insights Dashboard

| | |
|---|---|
| **Student** | P.D. Hettiarachchi |
| **Registration No.** | 234080F |
| **Project** | Hotel & Restaurant Review Analysis & Response System |
| **Team** | LETHYS |
| **Module** | Reviews, AI Reply & Insights Dashboard |

## System Diagram — My Module

```mermaid
flowchart TD
    CUST["Customer Review"] -->|"ingested · scraped"| REV_API

    subgraph FE["Frontend — React (my pages)"]
        DASH["/dashboard — KPIs · charts"]
        REVS["/reviews — table · filters"]
        DET["/reviews/[id] — AI reply editor"]
        INS["/insights — charts · word cloud"]
    end

    subgraph BE["Backend — FastAPI (my modules)"]
        REV_API["Reviews API"]
        SENT_API["Sentiment API"]
        REP_API["Review Replies API"]
        INS_API["Insights API"]
        ALERTS["Alert Rules"]
    end

    subgraph AI["AI / ML — inference only"]
        ANALYZE["/ml/analyze — sentiment · aspects"]
        REPLY["/ml/reply — AI reply"]
    end

    subgraph DATA["Data"]
        DB[("SQL Server — reviews · review_aspects · review_replies")]
        REDIS["Redis — review lists · AI summaries"]
    end

    REV_API -->|"list · filters"| REVS
    REVS -->|"open"| DET
    DET -->|"generate"| REPLY
    REPLY -->|"AI draft"| DET
    DET -->|"save · edit"| REP_API
    REV_API -->|"analyze content"| ANALYZE
    ANALYZE -->|"results"| SENT_API
    SENT_API -->|"trends"| INS_API
    INS_API -->|"KPIs · insights"| DASH
    INS_API -->|"analytics"| INS
    REV_API -->|"low rating"| ALERTS
    ALERTS -->|"alerts"| DASH
    REV_API -->|"store"| DB
    SENT_API -->|"aspects"| DB
    REP_API -->|"replies"| DB
    ALERTS -->|"trigger"| DB
    REV_API <-->|"cache · invalidate"| REDIS
    INS_API <-->|"cache · invalidate"| REDIS
```

**How it works:** Customer reviews are ingested by the Reviews API → stored in SQL Server (`reviews` · `review_aspects` · `review_replies`) → analyzed for sentiment and aspects through the LLM Gateway (`/ml/analyze`) → aggregated into KPIs, trends, and analytics for the Dashboard and Insights pages → AI replies are generated (`/ml/reply`), reviewed and edited by managers on the review detail page, then saved as the final response. Low ratings trigger automatic alert rules, and Redis caches review lists and AI summaries with automatic invalidation.

**Review lifecycle:** Customer Review → Review Storage → Sentiment / Aspect Analysis → Review Insights & Trends → AI Reply Generation → Manager Reviews / Edits Reply → Final Response

**Parallel flows:** Review Data → Aggregation → Dashboard KPIs → Charts → Insights · Low Rating → Alert Trigger
