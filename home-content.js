/* Home sections content (journey, deliverables, before vs after) */
window.HOME_CONTENT = {
 "journey": [
  {
   "id": "j1",
   "track": "start",
   "go": "rules",
   "t": "Understand the Business Problem",
   "d": "Read the domain primer and the dashboard list on the Home page. Write down, in one line, what the supply chain head wants to decide: where orders slow down, which supplier hurts delivery, where stock sits wrong."
  },
  {
   "id": "j2",
   "track": "start",
   "go": "datadict",
   "t": "Explore the Dataset",
   "d": "Open all 6 tables: Fact_Orders (12,000), Fact_Inventory (6,200 snapshots), Dim_Customer (1,500), Dim_Product (92), Dim_Supplier (32) and Dim_Warehouse (20). Note the grains."
  },
  {
   "id": "j3",
   "track": "data",
   "go": "model",
   "t": "Build the Data Model",
   "d": "Fact_Orders is the hub, joined to Customer, Product, Supplier and Warehouse. Fact_Inventory shares only Product and Warehouse; never join the two facts directly."
  },
  {
   "id": "j4",
   "track": "data",
   "go": "sql",
   "t": "Clean & Validate the Data",
   "d": "Check row counts and 0 orphan keys, Delay_Days (only count rows above 0 for average delay), and the Stockout_Flag that is 0 on every row."
  },
  {
   "id": "j5",
   "track": "build",
   "go": "editor",
   "t": "Write SQL Queries",
   "d": "Load the 6 tables into MySQL and write the KPI queries: revenue, gross margin, on-time delivery, delay days, stockout and inventory turnover."
  },
  {
   "id": "j6",
   "track": "build",
   "go": "kpis",
   "t": "Create KPIs",
   "d": "Build the KPI list starting with revenue, OTD % and delay, then the supplier, inventory and warehouse KPIs."
  },
  {
   "id": "j7",
   "track": "dash",
   "go": "dashboards",
   "t": "Build the Tableau Dashboard",
   "d": "Tableau–SQL: connect Tableau to MySQL (not to the Excel file) and build the Executive Summary, Order & Delivery, Supplier, Inventory Health and Revenue & Customers pages."
  },
  {
   "id": "j8",
   "track": "dash",
   "go": "dashboards",
   "t": "Build the Power BI Dashboard",
   "d": "Power BI–SQL: the same dashboards on the same MySQL source, with a proper Date table and the DAX measures from the KPI list."
  },
  {
   "id": "j9",
   "track": "qa",
   "go": "sql",
   "t": "Perform QA",
   "d": "Reconcile every KPI between SQL, Tableau and Power BI. Document every number that didn't match and why."
  },
  {
   "id": "j10",
   "track": "present",
   "go": "interview",
   "t": "Present Your Business Insights",
   "d": "Build the final deck (problem → data → model → KPIs → dashboards → insights → recommendations), then drill the interview questions."
  }
 ],
 "deliverables": [
  {
   "id": "d1",
   "t": "Excel KPI workbook",
   "d": "The core KPIs built with formulas and pivots on the raw export.",
   "where": "KPI List"
  },
  {
   "id": "d2",
   "t": "MySQL database",
   "d": "All 6 tables loaded with keys, row counts verified, 0 orphan keys.",
   "where": "Data Model"
  },
  {
   "id": "d3",
   "t": "SQL script",
   "d": "KPI queries plus the validation and QA queries from the SQL & QA Lab.",
   "where": "SQL & QA Lab"
  },
  {
   "id": "d4",
   "t": "Tableau dashboard",
   "d": "Executive Summary, Order & Delivery, Supplier, Inventory Health and Revenue & Customers pages, connected to MySQL.",
   "where": "Sample Dashboards"
  },
  {
   "id": "d5",
   "t": "Power BI dashboard",
   "d": "The same pages in Power BI, with a Date table and DAX measures.",
   "where": "Sample Dashboards"
  },
  {
   "id": "d6",
   "t": "QA reconciliation sheet",
   "d": "Every KPI: SQL value vs Tableau vs Power BI, with the reason for any gap.",
   "where": "SQL & QA Lab"
  },
  {
   "id": "d7",
   "t": "Final presentation deck",
   "d": "The business story with insights and recommendations, rehearsed as a 90-second pitch.",
   "where": "Interview Prep"
  }
 ],
 "before": [
  "Procurement, warehousing, logistics and sales each on their own spreadsheet",
  "No single view of where an order slows down",
  "Supplier impact on late deliveries not measured",
  "Inventory snapshots summed like sales, so stock looks inflated"
 ],
 "after": [
  "MySQL supply chain mart (6 tables, 0 orphan keys)",
  "Validated revenue, OTD %, delay and inventory KPIs",
  "Supplier and warehouse performance side by side",
  "Tableau & Power BI dashboards reconciled with SQL"
 ]
};
