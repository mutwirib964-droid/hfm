# Implementation Plan: Advanced Trade History Reporting System

## 1. Objective
Implement a professional-grade trade history reporting system allowing users to filter closed trade data by time intervals (Day, Week, Month) and view aggregated Profit/Loss metrics for the selected period.

## 2. Technical Scope
- **Data Aggregation**: Move from client-side filtering to SQL-based aggregation using the existing `closed_trades` table in Supabase.
- **Reporting UI**: Introduce a new filtering component in the `TradesTab` with selectors: `Today`, `Last 7 Days`, `Last 30 Days`.
- **Metrics Engine**: Calculate `Total PnL`, `Win/Loss Ratio`, and `Total Trade Count` dynamically based on the selected time range.

## 3. Implementation Steps

### Phase 1: Database & Backend (Supabase)
- Add specialized SQL View or Function to fetch aggregated trade data:
  ```sql
  -- Example of a function to fetch aggregated PnL by range
  create or replace function get_trade_history_stats(
    user_email_param text,
    start_date timestamptz
  ) returns table(total_pnl numeric, trade_count bigint, win_count bigint) as $$
  begin
    return query
    select
      sum(pnl),
      count(*),
      count(*) filter (where pnl > 0)
    from public.closed_trades
    where user_email = user_email_param and created_at >= start_date;
  end;
  $$ language plpgsql;
  ```

### Phase 2: Frontend Implementation
- **UI Component**: Create a `DateRangeFilter` dropdown in `TradesTab`.
- **State Management**: Introduce `selectedDateRange` state in `TradesTab` to trigger refetching/re-filtering.
- **Data Display**: Add a "Performance Summary" banner that updates dynamically to show `$Total PnL` and `Trade Count` for the selected range.

## 4. Verification
- Validate aggregated PnL matches the sum of individual trade records.
- Ensure the trade list filters correctly based on the selected time window.
- Verify UI performance with large trade histories.

---
**Do you approve this implementation plan?**
If approved, I will proceed with applying these changes.
