(function () {
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
try { if (typeof VIEW_LABELS === "object") VIEW_LABELS.editor = "SQL Practice Editor"; } catch (e) {}
/* ============================================================
   Live SQL Practice Editor (in-browser SQLite via sql.js) +
   "Today's 3 problems" daily challenge (DailySQL-style).
   ============================================================ */
const PRACTICE_PROBLEMS = [
 {
  "id": "e1",
  "topic": "Aggregations",
  "level": "Easy",
  "mins": 3,
  "t": "Headline order KPIs",
  "tables": [
   "fact_orders"
  ],
  "task": "Return one row with orders (count of orders), revenue (SUM of revenue, 0 decimals) and gross_margin_pct = (revenue - cogs) / revenue x 100, 1 decimal. Columns: orders, revenue, gross_margin_pct.",
  "hint": "COUNT(*), SUM(revenue) and SUM(revenue - cogs) over the whole table. Multiply by 100.0 before dividing.",
  "sol": "SELECT COUNT(*) AS orders,\n       ROUND(SUM(revenue), 0) AS revenue,\n       ROUND(100.0 * SUM(revenue - cogs) / SUM(revenue), 1) AS gross_margin_pct\nFROM fact_orders;"
 },
 {
  "id": "e2",
  "topic": "Aggregations",
  "level": "Easy",
  "mins": 3,
  "t": "Orders by delivery status",
  "tables": [
   "fact_orders"
  ],
  "task": "Count orders per delivery_status and their share of all orders (%, 1 decimal). Return delivery_status, orders, pct. Biggest first.",
  "hint": "GROUP BY delivery_status. The total can come from a scalar subquery: (SELECT COUNT(*) FROM fact_orders).",
  "sol": "SELECT delivery_status, COUNT(*) AS orders,\n       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM fact_orders), 1) AS pct\nFROM fact_orders\nGROUP BY delivery_status\nORDER BY orders DESC;"
 },
 {
  "id": "e3",
  "topic": "Conditional Logic",
  "level": "Easy",
  "mins": 4,
  "t": "On-time delivery % by ship mode",
  "tables": [
   "fact_orders"
  ],
  "task": "On-time delivery % = orders with delay_days = 0 divided by all orders x 100 (1 decimal), per ship_mode. Return ship_mode, orders, on_time_pct. Highest on_time_pct first.",
  "hint": "AVG(CASE WHEN delay_days = 0 THEN 1 ELSE 0 END) gives the share; multiply by 100. Look closely at Same-day.",
  "sol": "SELECT ship_mode, COUNT(*) AS orders,\n       ROUND(100.0 * AVG(CASE WHEN delay_days = 0 THEN 1 ELSE 0 END), 1) AS on_time_pct\nFROM fact_orders\nGROUP BY ship_mode\nORDER BY on_time_pct DESC;"
 },
 {
  "id": "e4",
  "topic": "Filtering",
  "level": "Easy",
  "mins": 4,
  "t": "Average delay of late orders",
  "tables": [
   "fact_orders"
  ],
  "task": "delay_days is 0 for every on-time order, so a plain average hides how late the late ones are. For late orders only (delay_days > 0), return ship_mode, late_orders and avg_delay_days (2 decimals). Longest average delay first.",
  "hint": "Filter with WHERE delay_days > 0 before grouping by ship_mode.",
  "sol": "SELECT ship_mode, COUNT(*) AS late_orders, ROUND(AVG(delay_days), 2) AS avg_delay_days\nFROM fact_orders\nWHERE delay_days > 0\nGROUP BY ship_mode\nORDER BY avg_delay_days DESC;"
 },
 {
  "id": "e5",
  "topic": "Sorting & Limits",
  "level": "Easy",
  "mins": 3,
  "t": "The 5 most delayed orders",
  "tables": [
   "fact_orders"
  ],
  "task": "The 5 orders with the largest delay_days. Return order_id, ship_mode, carrier, delay_days. Ties: lower order_id first.",
  "hint": "ORDER BY delay_days DESC, then order_id as a tie-breaker, and LIMIT 5.",
  "sol": "SELECT order_id, ship_mode, carrier, delay_days\nFROM fact_orders\nORDER BY delay_days DESC, order_id\nLIMIT 5;"
 },
 {
  "id": "e6",
  "topic": "Aggregations",
  "level": "Easy",
  "mins": 4,
  "t": "Network fill rate",
  "tables": [
   "fact_orders"
  ],
  "task": "Fill rate % = total shipped_quantity / total order_quantity x 100 (2 decimals). Also count short-shipped orders (shipped_quantity < order_quantity). Return fill_rate_pct, short_orders.",
  "hint": "Divide the two SUMs (not an average of per-order rates). Count short orders with SUM(CASE WHEN ... THEN 1 ELSE 0 END).",
  "sol": "SELECT ROUND(100.0 * SUM(shipped_quantity) / SUM(order_quantity), 2) AS fill_rate_pct,\n       SUM(CASE WHEN shipped_quantity < order_quantity THEN 1 ELSE 0 END) AS short_orders\nFROM fact_orders;"
 },
 {
  "id": "e7",
  "topic": "Filtering",
  "level": "Easy",
  "mins": 3,
  "t": "Tier C suppliers",
  "tables": [
   "dim_supplier"
  ],
  "task": "List the suppliers with supplier_tier = 'C'. Return supplier_id, supplier_name, supplier_country, reliability_score. Least reliable first.",
  "hint": "WHERE supplier_tier = 'C' ORDER BY reliability_score ascending.",
  "sol": "SELECT supplier_id, supplier_name, supplier_country, reliability_score\nFROM dim_supplier\nWHERE supplier_tier = 'C'\nORDER BY reliability_score, supplier_id;"
 },
 {
  "id": "e8",
  "topic": "Dates",
  "level": "Easy",
  "mins": 4,
  "t": "Orders and revenue by year",
  "tables": [
   "fact_orders"
  ],
  "task": "Orders and revenue (0 decimals) per order year. Return order_year (text 'YYYY'), orders, revenue. Oldest first.",
  "hint": "strftime('%Y', order_date) extracts the year from the text date.",
  "sol": "SELECT strftime('%Y', order_date) AS order_year, COUNT(*) AS orders, ROUND(SUM(revenue), 0) AS revenue\nFROM fact_orders\nGROUP BY order_year\nORDER BY order_year;"
 },
 {
  "id": "m1",
  "topic": "Joins",
  "level": "Medium",
  "mins": 6,
  "t": "Revenue and margin by category",
  "tables": [
   "fact_orders",
   "dim_product"
  ],
  "task": "Per product category: orders, revenue (0 decimals) and gross_margin_pct = (revenue - cogs) / revenue x 100 (1 decimal). Return category, orders, revenue, gross_margin_pct. Highest revenue first.",
  "hint": "JOIN dim_product ON product_id, then GROUP BY category.",
  "sol": "SELECT p.category, COUNT(*) AS orders, ROUND(SUM(o.revenue), 0) AS revenue,\n       ROUND(100.0 * SUM(o.revenue - o.cogs) / SUM(o.revenue), 1) AS gross_margin_pct\nFROM fact_orders o\nJOIN dim_product p ON p.product_id = o.product_id\nGROUP BY p.category\nORDER BY revenue DESC;"
 },
 {
  "id": "m2",
  "topic": "Joins",
  "level": "Medium",
  "mins": 6,
  "t": "Delivery performance by supplier tier",
  "tables": [
   "fact_orders",
   "dim_supplier"
  ],
  "task": "Per supplier_tier: orders, on_time_pct (delay_days = 0, %, 1 decimal) and avg_late_delay (average delay_days of late orders only, 2 decimals). Return supplier_tier, orders, on_time_pct, avg_late_delay, ordered by tier A, B, C.",
  "hint": "JOIN dim_supplier on supplier_id. For the late average use AVG(CASE WHEN delay_days > 0 THEN delay_days END): the missing ELSE gives NULL, which AVG ignores.",
  "sol": "SELECT s.supplier_tier, COUNT(*) AS orders,\n       ROUND(100.0 * AVG(CASE WHEN o.delay_days = 0 THEN 1 ELSE 0 END), 1) AS on_time_pct,\n       ROUND(AVG(CASE WHEN o.delay_days > 0 THEN o.delay_days END), 2) AS avg_late_delay\nFROM fact_orders o\nJOIN dim_supplier s ON s.supplier_id = o.supplier_id\nGROUP BY s.supplier_tier\nORDER BY s.supplier_tier;"
 },
 {
  "id": "m3",
  "topic": "Joins",
  "level": "Medium",
  "mins": 5,
  "t": "Revenue by customer region",
  "tables": [
   "fact_orders",
   "dim_customer"
  ],
  "task": "Per customer_region: active customers (distinct customer_id with orders), orders and revenue (0 decimals). Return customer_region, customers, orders, revenue. Highest revenue first.",
  "hint": "JOIN dim_customer on customer_id; COUNT(DISTINCT o.customer_id) for customers.",
  "sol": "SELECT c.customer_region, COUNT(DISTINCT o.customer_id) AS customers, COUNT(*) AS orders,\n       ROUND(SUM(o.revenue), 0) AS revenue\nFROM fact_orders o\nJOIN dim_customer c ON c.customer_id = o.customer_id\nGROUP BY c.customer_region\nORDER BY revenue DESC;"
 },
 {
  "id": "m4",
  "topic": "Conditional Logic",
  "level": "Medium",
  "mins": 6,
  "t": "Delay buckets",
  "tables": [
   "fact_orders"
  ],
  "task": "Bucket orders by delay_days: 'On time' (0), '1-3 days', '4-7 days', '8+ days'. Return delay_bucket and orders, in that bucket order.",
  "hint": "CASE WHEN delay_days = 0 ... WHEN delay_days <= 3 ... ; ORDER BY MIN(delay_days) keeps the buckets in sequence.",
  "sol": "SELECT CASE WHEN delay_days = 0 THEN 'On time'\n            WHEN delay_days <= 3 THEN '1-3 days'\n            WHEN delay_days <= 7 THEN '4-7 days'\n            ELSE '8+ days' END AS delay_bucket,\n       COUNT(*) AS orders\nFROM fact_orders\nGROUP BY delay_bucket\nORDER BY MIN(delay_days);"
 },
 {
  "id": "m5",
  "topic": "Conditional Logic",
  "level": "Medium",
  "mins": 6,
  "t": "Carrier scorecard",
  "tables": [
   "fact_orders"
  ],
  "task": "Per carrier: ship_mode, orders, on_time_pct (delay_days = 0, %, 1 decimal) and avg_ship_cost (average shipping_cost per order, 2 decimals). Return carrier, ship_mode, orders, on_time_pct, avg_ship_cost. Best on_time_pct first, ties by carrier name.",
  "hint": "Each carrier serves exactly one ship_mode, so you can GROUP BY carrier, ship_mode.",
  "sol": "SELECT carrier, ship_mode, COUNT(*) AS orders,\n       ROUND(100.0 * AVG(CASE WHEN delay_days = 0 THEN 1 ELSE 0 END), 1) AS on_time_pct,\n       ROUND(AVG(shipping_cost), 2) AS avg_ship_cost\nFROM fact_orders\nGROUP BY carrier, ship_mode\nORDER BY on_time_pct DESC, carrier;"
 },
 {
  "id": "m6",
  "topic": "Joins",
  "level": "Medium",
  "mins": 7,
  "t": "Warehouse utilisation at the latest snapshot",
  "tables": [
   "fact_inventory",
   "dim_warehouse"
  ],
  "task": "Inventory is a monthly snapshot, so use only the latest snapshot_date. Per warehouse: total stock_on_hand vs capacity_units, utilisation_pct = stock / capacity x 100 (1 decimal). Return warehouse_id, warehouse_city, capacity_units, stock, utilisation_pct for the 5 most utilised warehouses.",
  "hint": "Filter snapshot_date = (SELECT MAX(snapshot_date) FROM fact_inventory), join dim_warehouse, group per warehouse. Do not add stock across months.",
  "sol": "SELECT w.warehouse_id, w.warehouse_city, w.capacity_units, SUM(i.stock_on_hand) AS stock,\n       ROUND(100.0 * SUM(i.stock_on_hand) / w.capacity_units, 1) AS utilisation_pct\nFROM fact_inventory i\nJOIN dim_warehouse w ON w.warehouse_id = i.warehouse_id\nWHERE i.snapshot_date = (SELECT MAX(snapshot_date) FROM fact_inventory)\nGROUP BY w.warehouse_id, w.warehouse_city, w.capacity_units\nORDER BY utilisation_pct DESC, w.warehouse_id\nLIMIT 5;"
 },
 {
  "id": "m7",
  "topic": "Joins",
  "level": "Medium",
  "mins": 6,
  "t": "Fill rate by customer segment",
  "tables": [
   "fact_orders",
   "dim_customer"
  ],
  "task": "Per customer_segment: orders, short_orders (shipped_quantity < order_quantity) and fill_rate_pct = SUM(shipped_quantity) / SUM(order_quantity) x 100 (2 decimals). Return customer_segment, orders, short_orders, fill_rate_pct. Lowest fill rate first.",
  "hint": "JOIN dim_customer on customer_id and use ratio of sums for the fill rate.",
  "sol": "SELECT c.customer_segment, COUNT(*) AS orders,\n       SUM(CASE WHEN o.shipped_quantity < o.order_quantity THEN 1 ELSE 0 END) AS short_orders,\n       ROUND(100.0 * SUM(o.shipped_quantity) / SUM(o.order_quantity), 2) AS fill_rate_pct\nFROM fact_orders o\nJOIN dim_customer c ON c.customer_id = o.customer_id\nGROUP BY c.customer_segment\nORDER BY fill_rate_pct;"
 },
 {
  "id": "m8",
  "topic": "Subqueries",
  "level": "Medium",
  "mins": 6,
  "t": "Customers who never ordered",
  "tables": [
   "dim_customer",
   "fact_orders"
  ],
  "task": "Some customers in dim_customer have no orders at all. Count them per customer_region. Return customer_region, inactive_customers. Biggest first, ties by region.",
  "hint": "WHERE customer_id NOT IN (SELECT customer_id FROM fact_orders), or a LEFT JOIN that keeps the NULL matches.",
  "sol": "SELECT customer_region, COUNT(*) AS inactive_customers\nFROM dim_customer\nWHERE customer_id NOT IN (SELECT customer_id FROM fact_orders)\nGROUP BY customer_region\nORDER BY inactive_customers DESC, customer_region;"
 },
 {
  "id": "a1",
  "topic": "Window Functions",
  "level": "Advanced",
  "mins": 10,
  "t": "2024 monthly revenue with running total",
  "tables": [
   "fact_orders"
  ],
  "task": "For orders placed in 2024: revenue per month ('YYYY-MM') and the year-to-date running total, both 0 decimals. Return order_month, revenue, running_revenue. Oldest first.",
  "hint": "Aggregate by SUBSTR(order_date, 1, 7) in a CTE, then SUM(revenue) OVER (ORDER BY order_month).",
  "sol": "WITH m AS (\n  SELECT SUBSTR(order_date, 1, 7) AS order_month, SUM(revenue) AS rev\n  FROM fact_orders\n  WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31'\n  GROUP BY order_month\n)\nSELECT order_month, ROUND(rev, 0) AS revenue,\n       ROUND(SUM(rev) OVER (ORDER BY order_month), 0) AS running_revenue\nFROM m\nORDER BY order_month;"
 },
 {
  "id": "a2",
  "topic": "Window Functions",
  "level": "Advanced",
  "mins": 11,
  "t": "Year-over-year revenue by category",
  "tables": [
   "fact_orders",
   "dim_product"
  ],
  "task": "Revenue per category per year, then compare 2024 with 2023 using LAG(). Return category, rev_2023, rev_2024 (both 0 decimals) and yoy_pct = (2024 - 2023) / 2023 x 100 (1 decimal). Highest yoy_pct first.",
  "hint": "CTE 1: category + strftime('%Y', order_date) + SUM(revenue). CTE 2: LAG(revenue) OVER (PARTITION BY category ORDER BY yr). Keep the 2024 rows.",
  "sol": "WITH y AS (\n  SELECT p.category, strftime('%Y', o.order_date) AS yr, SUM(o.revenue) AS rev\n  FROM fact_orders o\n  JOIN dim_product p ON p.product_id = o.product_id\n  GROUP BY p.category, yr\n), l AS (\n  SELECT category, yr, rev, LAG(rev) OVER (PARTITION BY category ORDER BY yr) AS prev_rev FROM y\n)\nSELECT category, ROUND(prev_rev, 0) AS rev_2023, ROUND(rev, 0) AS rev_2024,\n       ROUND(100.0 * (rev - prev_rev) / prev_rev, 1) AS yoy_pct\nFROM l\nWHERE yr = '2024'\nORDER BY yoy_pct DESC;"
 },
 {
  "id": "a3",
  "topic": "Window Functions",
  "level": "Advanced",
  "mins": 11,
  "t": "Top 2 products per category",
  "tables": [
   "fact_orders",
   "dim_product"
  ],
  "task": "For each category, the 2 products with the highest revenue. Some product names repeat, so identify products by product_id. Return category, rn (1 or 2), product_id, product_name and revenue (0 decimals). Order by category, then rn.",
  "hint": "Sum revenue per category + product in a CTE, then ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, product_id) and keep rn <= 2. Group by product_id, not just product_name.",
  "sol": "WITH s AS (\n  SELECT p.category, p.product_id, p.product_name, SUM(o.revenue) AS rev\n  FROM fact_orders o\n  JOIN dim_product p ON p.product_id = o.product_id\n  GROUP BY p.category, p.product_id, p.product_name\n), r AS (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY rev DESC, product_id) AS rn FROM s\n)\nSELECT category, rn, product_id, product_name, ROUND(rev, 0) AS revenue\nFROM r\nWHERE rn <= 2\nORDER BY category, rn;"
 },
 {
  "id": "a4",
  "topic": "Dates",
  "level": "Advanced",
  "mins": 10,
  "t": "Order cycle time by ship mode",
  "tables": [
   "fact_orders"
  ],
  "task": "Compute the timings from the dates with julianday() (not from the stored day columns). Per ship_mode, averages in days (1 decimal): processing (order_date to ship_date), transit (ship_date to actual_delivery_date) and cycle (order_date to actual_delivery_date). Return ship_mode, avg_processing, avg_transit, avg_cycle. Longest avg_cycle first.",
  "hint": "julianday(ship_date) - julianday(order_date) gives days between two text dates. Average each difference separately.",
  "sol": "SELECT ship_mode,\n       ROUND(AVG(julianday(ship_date) - julianday(order_date)), 1) AS avg_processing,\n       ROUND(AVG(julianday(actual_delivery_date) - julianday(ship_date)), 1) AS avg_transit,\n       ROUND(AVG(julianday(actual_delivery_date) - julianday(order_date)), 1) AS avg_cycle\nFROM fact_orders\nGROUP BY ship_mode\nORDER BY avg_cycle DESC;"
 },
 {
  "id": "a5",
  "topic": "Conditional Logic",
  "level": "Advanced",
  "mins": 10,
  "t": "QA check: can the stored fill rate and delay be trusted?",
  "tables": [
   "fact_orders"
  ],
  "task": "Before using two stored columns in a dashboard, recompute them and count mismatches (zero means the stored column can be trusted). fill_rate_mismatches: orders where fill_rate_pct differs from 100 x shipped_quantity / order_quantity (not rounded) by more than 1 percentage point. delay_mismatches: orders where delay_days differs from MAX(0, julianday(actual_delivery_date) - julianday(promised_delivery_date)). Return one row: fill_rate_mismatches, delay_mismatches.",
  "hint": "Two SUM(CASE WHEN ... THEN 1 ELSE 0 END) columns. Use ABS(...) > 1 for the fill rate check and multiply by 100.0 to avoid integer division. Scalar MAX(a, b) works in SQLite.",
  "sol": "SELECT SUM(CASE WHEN ABS(fill_rate_pct - 100.0 * shipped_quantity / order_quantity) > 1 THEN 1 ELSE 0 END) AS fill_rate_mismatches,\n       SUM(CASE WHEN delay_days <> MAX(0, julianday(actual_delivery_date) - julianday(promised_delivery_date)) THEN 1 ELSE 0 END) AS delay_mismatches\nFROM fact_orders;"
 },
 {
  "id": "a6",
  "topic": "CTEs & Unions",
  "level": "Advanced",
  "mins": 11,
  "t": "Supplier reliability score vs actual on-time %",
  "tables": [
   "fact_orders",
   "dim_supplier"
  ],
  "task": "For suppliers with at least 100 orders, compare reliability_score with their actual on-time % (delay_days = 0, 1 decimal). gap = on_time_pct - reliability_score (1 decimal). Return supplier_id, supplier_tier, reliability_score, orders, on_time_pct, gap for the 5 most negative gaps.",
  "hint": "Aggregate orders per supplier_id in a CTE with HAVING COUNT(*) >= 100, then join dim_supplier and sort by gap ascending, supplier_id as tie-breaker.",
  "sol": "WITH s AS (\n  SELECT supplier_id, COUNT(*) AS orders,\n         ROUND(100.0 * AVG(CASE WHEN delay_days = 0 THEN 1 ELSE 0 END), 1) AS on_time_pct\n  FROM fact_orders\n  GROUP BY supplier_id\n  HAVING COUNT(*) >= 100\n)\nSELECT d.supplier_id, d.supplier_tier, d.reliability_score, s.orders, s.on_time_pct,\n       ROUND(s.on_time_pct - d.reliability_score, 1) AS gap\nFROM s\nJOIN dim_supplier d ON d.supplier_id = s.supplier_id\nORDER BY gap, d.supplier_id\nLIMIT 5;"
 },
 {
  "id": "a7",
  "topic": "Subqueries",
  "level": "Advanced",
  "mins": 10,
  "t": "Days of supply by category (latest snapshot)",
  "tables": [
   "fact_inventory",
   "dim_product"
  ],
  "task": "At the latest snapshot_date only, per category: stock (SUM stock_on_hand), shipped (SUM units_shipped in that month) and days_of_supply = stock / shipped x 30 (1 decimal). Return category, stock, shipped, days_of_supply. Highest days_of_supply first.",
  "hint": "Filter snapshot_date with a MAX() subquery, join dim_product for category, and compute the ratio from the sums rather than averaging the stored days_of_supply.",
  "sol": "SELECT p.category, SUM(i.stock_on_hand) AS stock, SUM(i.units_shipped) AS shipped,\n       ROUND(30.0 * SUM(i.stock_on_hand) / SUM(i.units_shipped), 1) AS days_of_supply\nFROM fact_inventory i\nJOIN dim_product p ON p.product_id = i.product_id\nWHERE i.snapshot_date = (SELECT MAX(snapshot_date) FROM fact_inventory)\nGROUP BY p.category\nORDER BY days_of_supply DESC;"
 },
 {
  "id": "a8",
  "topic": "Window Functions",
  "level": "Advanced",
  "mins": 12,
  "t": "Days between repeat orders by segment",
  "tables": [
   "fact_orders",
   "dim_customer"
  ],
  "task": "For each customer, the gap in days between an order and their previous order. Average those gaps (1 decimal) per customer_segment and count the repeat orders used. Return customer_segment, repeat_orders, avg_days_between. Shortest gap first.",
  "hint": "LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id), then julianday(order_date) - julianday(prev_date). A customer's first order has no previous order, so drop the NULL gaps.",
  "sol": "WITH g AS (\n  SELECT customer_id,\n         julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id)) AS gap\n  FROM fact_orders\n)\nSELECT c.customer_segment, COUNT(*) AS repeat_orders, ROUND(AVG(g.gap), 1) AS avg_days_between\nFROM g\nJOIN dim_customer c ON c.customer_id = g.customer_id\nWHERE g.gap IS NOT NULL\nGROUP BY c.customer_segment\nORDER BY avg_days_between;"
 }
];
const ED_KEY = "scm_hub_editor_v1";
let edDb = null, edLoading = null, edCur = null, psLevel = "All", psTopic = "All", psTable = "All";
function edState() { try { const s = JSON.parse(lsGet(ED_KEY)); return s && s.solved ? s : { solved: {}, drafts: {} }; } catch (e) { return { solved: {}, drafts: {} }; } }
function edSave(s) { lsSet(ED_KEY, JSON.stringify(s)); }
const localDay = (d) => { const x = d || new Date(); return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
function todaysProblems() {
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const pick = (lv, k) => { const L = PRACTICE_PROBLEMS.filter(p => p.level === lv); return L[(day * k) % L.length]; };
  return [pick("Easy", 1), pick("Medium", 3), pick("Advanced", 5)];
}
function solveDays() { const st = edState(); return new Set(Object.values(st.solved)); }
function solveStreak() {
  const set = solveDays(); let n = 0; const d = new Date();
  if (!set.has(localDay(d))) d.setDate(d.getDate() - 1);           // streak survives until today ends
  while (set.has(localDay(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function loadSqlEngine() {
  if (edDb) return Promise.resolve(edDb);
  if (edLoading) return edLoading;
  edLoading = new Promise((res, rej) => {
    const go = () => window.initSqlJs({}).then(SQL => {
      const db = new SQL.Database(); const T = window.PRACTICE_DB || {};
      db.run("BEGIN");
      Object.entries(T).forEach(([name, t]) => {
        const types = t.cols.map((c, i) => { const vals = t.rows.map(r => r[i]).filter(v => v !== null); if (!vals.length || typeof vals[0] !== "number") return "TEXT"; return vals.every(Number.isInteger) && !/inr|rate|pct/.test(c) ? "INTEGER" : "REAL"; });
        db.run(`CREATE TABLE ${name} (${t.cols.map((c, i) => `"${c}" ${types[i]}`).join(", ")})`);
        const st = db.prepare(`INSERT INTO ${name} VALUES (${t.cols.map(() => "?").join(",")})`);
        t.rows.forEach(r => st.run(r)); st.free();
      });
      db.run("COMMIT"); edDb = db; res(db);
    }).catch(rej);
    const eng = () => { if (window.initSqlJs) go(); else { const s = document.createElement("script"); s.src = "assets/vendor/sql-asm.js"; s.onload = go; s.onerror = () => rej(new Error("Could not load the SQL engine")); document.head.appendChild(s); } };
    loadPracticeData().then(eng).catch(rej);
  });
  return edLoading;
}
let pdLoading = null;
function loadPracticeData() {
  if (window.PRACTICE_DB) return Promise.resolve();
  if (!pdLoading) pdLoading = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "assets/practice-db.js?v=" + (window.SITE_V || "1"); s.onload = () => { res(); renderProblemset(); }; s.onerror = () => { pdLoading = null; rej(new Error("Could not load the practice tables")); }; document.head.appendChild(s); });
  return pdLoading;
}
function edRun(sql) { const res = edDb.exec(sql); return res.length ? res[res.length - 1] : { columns: [], values: [] }; }
function edNorm(r, ordered) {
  const rows = r.values.map(row => row.map(v => v === null ? "∅" : (typeof v === "number" ? (Math.round(v * 100) / 100).toFixed(2) : String(v).trim())).join("¦"));
  return ordered ? rows : rows.slice().sort();
}
function edTable(r) {
  if (!r.columns.length) return `<div class="ed-empty">Query ran. No rows returned.</div>`;
  const head = `<tr>${r.columns.map(c => `<th>${esc(c)}</th>`).join("")}</tr>`;
  const body = r.values.slice(0, 200).map(row => `<tr>${row.map(v => `<td>${v === null ? '<span class="ed-null">NULL</span>' : esc(typeof v === "number" ? (Number.isInteger(v) ? v.toLocaleString("en-IN") : (Math.round(v * 100) / 100).toLocaleString("en-IN")) : v)}</td>`).join("")}</tr>`).join("");
  return `<div class="ed-rowcount">${r.values.length} row${r.values.length === 1 ? "" : "s"}${r.values.length > 200 ? " (showing 200)" : ""}</div><div class="ed-table-wrap"><table class="dtable ed-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}
const lvlBadge = (l) => `<span class="lvl lvl-${l.toLowerCase()}">${l === "Medium" ? "Med." : l === "Advanced" ? "Hard" : l}</span>`;

/* ---------------- Problemset (browse) ---------------- */
function renderProblemset() {
  const rowsEl = document.getElementById("ps-rows"); if (!rowsEl) return;
  const st = edState(); const solvedN = Object.keys(st.solved).length; const today = todaysProblems();
  document.getElementById("ps-progress").textContent = `${solvedN} / ${PRACTICE_PROBLEMS.length} Solved`;
  document.getElementById("ps-streak").textContent = `${solveStreak()} day streak · ${today.filter(p => st.solved[p.id]).length}/3 of today's set`;
  document.getElementById("ps-today-sub").textContent = today.map(p => p.t).join(" · ");
  const topics = ["All", ...new Set(PRACTICE_PROBLEMS.map(p => p.topic))];
  document.getElementById("ps-topics").innerHTML = topics.map(t => `<button class="ps-chip ${t === psTopic ? "on" : ""}" data-topic="${esc(t)}">${t === "All" ? "All Topics" : esc(t)} <small>(${t === "All" ? PRACTICE_PROBLEMS.length : PRACTICE_PROBLEMS.filter(p => p.topic === t).length})</small></button>`).join("");
  const tabs = ["All", "fact_orders", "fact_inventory", "dim_customer", "dim_product", "dim_supplier", "dim_warehouse"];
  const tlabel = { All: "All Tables", fact_orders: "Orders", fact_inventory: "Inventory", dim_customer: "Customers", dim_product: "Products", dim_supplier: "Suppliers", dim_warehouse: "Warehouses" };
  document.getElementById("ps-tables").innerHTML = tabs.map(t => `<button class="ps-disc ${t === psTable ? "on" : ""}" data-tab="${t}">${tlabel[t]}</button>`).join("");
  document.getElementById("ps-levels").innerHTML = ["All", "Easy", "Medium", "Advanced"].map(l => `<button class="${l === psLevel ? "on" : ""}" data-lv="${l}">${l === "Advanced" ? "Hard" : l}</button>`).join("");
  const q = (document.getElementById("ps-search").value || "").toLowerCase(); const stf = document.getElementById("ps-status").value;
  const list = PRACTICE_PROBLEMS.map((p, i) => ({ ...p, n: i + 1 })).filter(p => (psLevel === "All" || p.level === psLevel) && (psTopic === "All" || p.topic === psTopic) && (psTable === "All" || p.tables.includes(psTable))
    && (!q || (p.n + " " + p.t + " " + p.task).toLowerCase().includes(q)) && (stf === "all" || (stf === "done") === !!st.solved[p.id]));
  rowsEl.innerHTML = list.length ? list.map(p => `<tr data-open="${p.id}">
      <td>${st.solved[p.id] ? '<span class="ps-st done">✓</span>' : '<span class="ps-st"></span>'}</td>
      <td><div class="ps-title">${p.n}. ${esc(p.t)}${today.some(x => x.id === p.id) ? ' <span class="ps-todaytag">TODAY</span>' : ""}</div><div class="ps-tags"><span class="ps-tag2">▤ SQL</span>${p.tables.map(t => `<span class="ps-tag2 grey">${t}</span>`).join("")}</div></td>
      <td class="ps-time">${p.mins} min</td><td>${lvlBadge(p.level)}</td><td class="ps-arrow">→</td></tr>`).join("")
    : `<tr><td colspan="5" class="ed-empty">No problems match these filters.</td></tr>`;
  rowsEl.querySelectorAll("[data-open]").forEach(r => r.addEventListener("click", () => openProblem(r.dataset.open)));
  document.querySelectorAll("#ps-topics [data-topic]").forEach(b => b.addEventListener("click", () => { psTopic = b.dataset.topic; renderProblemset(); }));
  document.querySelectorAll("#ps-tables [data-tab]").forEach(b => b.addEventListener("click", () => { psTable = b.dataset.tab; renderProblemset(); }));
  document.querySelectorAll("#ps-levels [data-lv]").forEach(b => b.addEventListener("click", () => { psLevel = b.dataset.lv; renderProblemset(); }));
  renderCalendar();
  const tl = document.getElementById("ps-tablelist");
  if (tl && !window.PRACTICE_DB) { tl.innerHTML = '<div class="ps-tl"><span>Loading tables…</span></div>'; loadPracticeData().catch(() => {}); }
  else if (tl) tl.innerHTML = Object.entries(window.PRACTICE_DB || {}).map(([n, t]) => `<div class="ps-tl"><code>${n}</code><span>${t.rows.length} rows · ${t.cols.length} cols</span></div>`).join("");
}
function renderCalendar() {
  const w = document.getElementById("ps-cal"); if (!w) return;
  const days = solveDays(); const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate(); const todayN = now.getDate();
  let cells = ""; for (let i = 0; i < first; i++) cells += "<span></span>";
  for (let d = 1; d <= n; d++) { const key = localDay(new Date(y, m, d)); cells += `<span class="${d === todayN ? "today" : ""} ${days.has(key) ? "solved" : ""}">${d}</span>`; }
  let last7 = 0; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (days.has(localDay(d))) last7++; }
  const solvedToday = days.has(localDay());
  w.innerHTML = `<div class="ps-cal-head"><span class="ps-fire">🔥</span><div><strong>${now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }).toUpperCase()}</strong><small>${days.size} days solved · ${solveStreak()} day streak</small></div><span class="ps-badge ${solvedToday ? "ok" : ""}">${solvedToday ? "Done today" : "Not yet today"}</span></div>
    <div class="ps-cal-grid">${["S", "M", "T", "W", "T", "F", "S"].map(x => `<b>${x}</b>`).join("")}${cells}</div>
    <div class="ps-cal-foot"><span>Last 7 days</span><strong>${last7} / 7 Days</strong></div><div class="ps-cal-bar"><i style="width:${Math.round(last7 / 7 * 100)}%"></i></div>`;
}

/* ---------------- Solve view ---------------- */
function renderSchema() {
  const w = document.getElementById("ed-schema"); if (!w) return;
  const T = window.PRACTICE_DB || {};
  w.innerHTML = Object.entries(T).map(([n, t]) => `<details ${edCur && edCur.tables.includes(n) ? "open" : ""}><summary><code>${n}</code> <span>${t.rows.length} rows</span></summary><div class="ed-cols">${t.cols.map(c => `<button class="ed-col" data-ins="${c}">${c}</button>`).join("")}</div></details>`).join("");
  w.querySelectorAll("[data-ins]").forEach(b => b.addEventListener("click", () => { const ta = document.getElementById("ed-sql"); const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + b.dataset.ins + ta.value.slice(ta.selectionEnd); ta.focus(); ta.selectionStart = ta.selectionEnd = p + b.dataset.ins.length; }));
}
function showBrowse() { const b = document.getElementById("ed-browse"), s = document.getElementById("ed-solve"); if (!b) return; b.style.display = ""; s.style.display = "none"; renderProblemset(); }
function openProblem(id) {
  initEditor();
  edCur = PRACTICE_PROBLEMS.find(p => p.id === id) || PRACTICE_PROBLEMS[0];
  document.getElementById("ed-browse").style.display = "none"; document.getElementById("ed-solve").style.display = "";
  const st = edState(); const idx = PRACTICE_PROBLEMS.indexOf(edCur);
  document.getElementById("ed-pos").textContent = `Problem ${idx + 1} of ${PRACTICE_PROBLEMS.length} · ${edCur.topic}`;
  document.getElementById("ed-title").innerHTML = `${lvlBadge(edCur.level)} ${idx + 1}. ${esc(edCur.t)} <span class="ed-mins">⏱ ${edCur.mins} min</span>${st.solved[edCur.id] ? ' <span class="ps-badge ok">Solved</span>' : ""}`;
  document.getElementById("ed-task").textContent = edCur.task;
  document.getElementById("ed-tables").innerHTML = "Tables: " + edCur.tables.map(t => `<code>${t}</code>`).join(" ");
  document.getElementById("ed-sql").value = st.drafts[edCur.id] || `-- ${edCur.t}\nSELECT *\nFROM ${edCur.tables[0]}\nLIMIT 10;`;
  document.getElementById("ed-out").innerHTML = `<div class="ed-empty">Write your query, then press <kbd>Run</kbd> (Ctrl + Enter) and <kbd>Submit</kbd>.</div>`;
  document.getElementById("ed-msg").innerHTML = "";
  renderSchema(); window.scrollTo({ top: 0, behavior: "auto" });
}
function edMsg(kind, html) { document.getElementById("ed-msg").innerHTML = `<div class="ed-msg ${kind}">${html}</div>`; }
function initEditor() {
  const run = document.getElementById("ed-run"); if (!run) return;
  if (run._b) { if (document.getElementById("ed-solve").style.display === "none") renderProblemset(); return; }
  run._b = true;
  const ta = document.getElementById("ed-sql");
  const withDb = (fn) => { edMsg("info", "⏳ Loading the SQL engine (first time only)…"); loadSqlEngine().then(() => { document.getElementById("ed-msg").innerHTML = ""; fn(); }).catch(e => edMsg("bad", "⚠ " + esc(e.message) + ". Open the site from a web server (or check your connection)."));
  };
  const doRun = () => withDb(() => { const st = edState(); st.drafts[edCur.id] = ta.value; edSave(st);
    try { document.getElementById("ed-out").innerHTML = edTable(edRun(ta.value)); } catch (e) { edMsg("bad", "❌ " + esc(e.message)); } });
  run.addEventListener("click", doRun);
  ta.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); doRun(); }
    if (e.key === "Tab") { e.preventDefault(); const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + "  " + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = p + 2; }
  });
  document.getElementById("ed-check").addEventListener("click", () => withDb(() => {
    let mine;
    try { mine = edRun(ta.value); } catch (e) { edMsg("bad", "❌ Your query has an error: " + esc(e.message)); return; }
    const exp = edRun(edCur.sol); document.getElementById("ed-out").innerHTML = edTable(mine);
    const ordered = /order\s+by[^()]*;?\s*$/i.test(edCur.sol);
    const ok = mine.columns.length === exp.columns.length && JSON.stringify(edNorm(mine, ordered)) === JSON.stringify(edNorm(exp, ordered));
    if (ok) { const st = edState(); if (!st.solved[edCur.id]) st.solved[edCur.id] = localDay(); st.drafts[edCur.id] = ta.value; edSave(st);
      const t3 = todaysProblems(); const done = t3.filter(p => st.solved[p.id]).length;
      edMsg("good", `✅ Correct · ${done} of 3 today · 🔥 ${solveStreak()} day streak`); renderHeroCards(); }
    else edMsg("bad", `✗ Not quite. Expected ${exp.values.length} row(s) × ${exp.columns.length} column(s); you returned ${mine.values.length} × ${mine.columns.length}. ${mine.columns.length === exp.columns.length ? "Check your values, rounding and filters." : "Check the columns you SELECT."}`);
  }));
  document.getElementById("ed-hint").addEventListener("click", () => edMsg("info", "💡 " + esc(edCur.hint)));
  document.getElementById("ed-solution").addEventListener("click", () => { ta.value = edCur.sol; edMsg("info", "🔓 Solution loaded. Run it and compare with your approach."); });
  document.getElementById("ed-reset").addEventListener("click", () => { const st = edState(); delete st.drafts[edCur.id]; edSave(st); openProblem(edCur.id); });
  document.getElementById("ed-back").addEventListener("click", showBrowse);
  const step = (k) => { const i = PRACTICE_PROBLEMS.indexOf(edCur); openProblem(PRACTICE_PROBLEMS[(i + k + PRACTICE_PROBLEMS.length) % PRACTICE_PROBLEMS.length].id); };
  document.getElementById("ed-prev").addEventListener("click", () => step(-1));
  document.getElementById("ed-next").addEventListener("click", () => step(1));
  document.getElementById("ps-search").addEventListener("input", renderProblemset);
  document.getElementById("ps-status").addEventListener("change", renderProblemset);
  document.getElementById("ps-random").addEventListener("click", () => { const st = edState(); const L = PRACTICE_PROBLEMS.filter(p => !st.solved[p.id]); const pool = L.length ? L : PRACTICE_PROBLEMS; openProblem(pool[Math.floor(Math.random() * pool.length)].id); });
  document.getElementById("ps-today-go").addEventListener("click", () => { const st = edState(); const t = todaysProblems(); openProblem((t.find(p => !st.solved[p.id]) || t[0]).id); });
  renderProblemset();
}

/* ---------------- Hero floating cards (DailySQL-style) ---------------- */
function renderHeroCards() {}
function renderDailyCard() { renderHeroCards(); }
function renderIntegrity() {}
document.addEventListener("DOMContentLoaded", () => {
  renderHeroCards(); renderIntegrity();
  document.querySelectorAll("[data-scroll]").forEach(b => b.addEventListener("click", () => { const t = document.getElementById(b.dataset.scroll); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  document.querySelectorAll('.ds-announce [data-goto="editor"]').forEach(b => b.addEventListener("click", () => switchView("editor")));
});

/* open the editor when its tab is chosen (the site's own switchView doesn't know about it) */
(function () {
  const orig = window.switchView;
  if (typeof orig === "function") window.switchView = function (v) { orig.apply(this, arguments); if (v === "editor") initEditor(); };
  document.addEventListener("click", (ev) => { const b = ev.target.closest && ev.target.closest('[data-view="editor"],[data-goto="editor"]'); if (b) setTimeout(initEditor, 0); });
})();

})();
