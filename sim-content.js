/* Job Simulator content: every number comes from this project's own answer keys and gotchas. */
window.SIM_CONTENT = {
 "site": "Supply Chain Analytics",
 "intro": {
  "incident": "A stakeholder has spotted an alarming number and needs a decision today. Open the evidence, find the root cause, choose the fix and write the reply you would send.",
  "broken": "A leadership scorecard is about to go into the review meeting. Check every tile against the KPI definitions and flag each number you would not present.",
  "stakeholder": "Each stakeholder gives you a vague one-line request. Ask the questions that turn it into a clear brief, and skip the ones that waste their time."
 },
 "incidents": [
  {
   "id": "i1",
   "lvl": "Easy",
   "title": "“Only 1,837 orders were late”",
   "from": "Vikram Rathore · COO",
   "time": "Mon 9:05 AM",
   "msg": "The delivery report says only 1,837 of our 12,000 orders were late. That sounds small. Can I tell the board late deliveries are under control and drop the carrier escalation?",
   "metric": [
    [
     "Late orders on the report",
     "1,837"
    ]
   ],
   "evidence": [
    {
     "id": "e1",
     "rel": true,
     "t": "Delivery_Status distribution",
     "sql": "SELECT Delivery_Status, COUNT(*) FROM Fact_Orders GROUP BY Delivery_Status;",
     "res": [
      [
       "On-Time",
       "7,924"
      ],
      [
       "Slightly Delayed",
       "2,239"
      ],
      [
       "Delayed",
       "1,837"
      ],
      [
       "Total",
       "12,000"
      ]
     ],
     "note": "The report counted only the 'Delayed' bucket. 2,239 Slightly Delayed orders were left out, so 2,239 + 1,837 = 4,076 orders were late."
    },
    {
     "id": "e2",
     "rel": true,
     "t": "KPI document: Delayed Orders by Carrier",
     "sql": "-- KPI list → Logistics & Delivery",
     "res": [
      [
       "formula",
       "COUNT(Delivery_Status ≠ 'On-Time') GROUP BY Carrier"
      ],
      [
       "OTD formula",
       "COUNT(Delivery_Status='On-Time') ÷ COUNT(Orders) × 100"
      ]
     ],
     "note": "The KPI document counts every order that is not On-Time as late."
    },
    {
     "id": "e3",
     "rel": true,
     "t": "Data dictionary: Delay_Days and Delivery_Status",
     "sql": "-- Data Dictionary → Fact_Orders",
     "res": [
      [
       "Delay_Days",
       "max(0, Actual_Delivery − Promised_Delivery)"
      ],
      [
       "Delivery_Status",
       "On-Time / Slightly Delayed / Delayed, derived from Delay_Days"
      ]
     ],
     "note": "A Slightly Delayed order still arrived after the promised date. It is late, just not very late."
    },
    {
     "id": "e4",
     "rel": false,
     "t": "Gross Margin %",
     "sql": "SELECT (SUM(Revenue) - SUM(COGS)) / SUM(Revenue) * 100 FROM Fact_Orders;",
     "res": [
      [
       "Gross Margin %",
       "36.2%"
      ],
      [
       "target",
       "≥ 30%"
      ]
     ],
     "note": "Margin is healthy, but it has nothing to do with delivery timing."
    }
   ],
   "causes": [
    [
     "c1",
     "Carriers really improved delivery this year"
    ],
    [
     "c2",
     "The report filtered Delivery_Status = 'Delayed' and left out every Slightly Delayed order",
     true
    ],
    [
     "c3",
     "Orders without an Actual_Delivery_Date were removed"
    ],
    [
     "c4",
     "Fact_Orders has duplicate Order_IDs"
    ],
    [
     "c5",
     "2023 orders were filtered out of the report"
    ]
   ],
   "fixes": [
    [
     "f1",
     "Count late orders as Delivery_Status <> 'On-Time' → 4,076, and show the full On-Time / Slightly Delayed / Delayed mix next to it",
     true
    ],
    [
     "f2",
     "Relabel Slightly Delayed orders as On-Time"
    ],
    [
     "f3",
     "Count only orders that were late by more than a week"
    ],
    [
     "f4",
     "Report Fill Rate instead of late orders"
    ]
   ],
   "answer": "Root cause: the report used Delivery_Status = 'Delayed' and missed 2,239 Slightly Delayed orders, which also arrived after the promised date. Late orders = 2,239 + 1,837 = <b>4,076</b> of 12,000. Only 7,924 were on time, so OTD is 66.0% against the 90% target.",
   "tell": "“It isn't 1,837. 4,076 orders arrived late, because the report skipped the 2,239 'Slightly Delayed' ones. OTD is 66.0% against a 90% target, so I'd keep the carrier escalation.”"
  },
  {
   "id": "i2",
   "lvl": "Easy",
   "title": "“Our suppliers are under 2 days late”",
   "from": "Sunita Deshpande · Logistics Manager",
   "time": "Tue 11:20 AM",
   "msg": "The supplier tier scorecard shows an average delay of 1.12 days for Tier A and 1.49 days for Tier B. Both are inside our 2-day target. Can I skip the carrier review this month?",
   "metric": [
    [
     "Tier A avg delay",
     "1.12 days"
    ],
    [
     "Tier B avg delay",
     "1.49 days"
    ]
   ],
   "evidence": [
    {
     "id": "e1",
     "rel": true,
     "t": "The scorecard query",
     "sql": "SELECT s.Supplier_Tier, ROUND(AVG(o.Delay_Days), 2) AS avg_delay_days\nFROM Fact_Orders o\nJOIN Dim_Supplier s ON o.Supplier_ID = s.Supplier_ID\nGROUP BY s.Supplier_Tier;   -- no WHERE Delay_Days > 0",
     "res": [
      [
       "Tier A avg (median)",
       "1.12 (0)"
      ],
      [
       "Tier B avg (median)",
       "1.49 (0)"
      ],
      [
       "Tier C avg (median)",
       "2.03 (0)"
      ]
     ],
     "note": "The average runs over every order, and the median delay is 0 in every tier."
    },
    {
     "id": "e2",
     "rel": true,
     "t": "How many orders have zero delay",
     "sql": "SELECT Delivery_Status, COUNT(*) FROM Fact_Orders GROUP BY Delivery_Status;",
     "res": [
      [
       "On-Time (Delay_Days = 0)",
       "7,924"
      ],
      [
       "late (Delay_Days > 0)",
       "4,076"
      ],
      [
       "Total",
       "12,000"
      ]
     ],
     "note": "About two out of three rows carry a 0, which pulls any all-orders average toward zero."
    },
    {
     "id": "e3",
     "rel": true,
     "t": "KPI document: Avg Delay Days",
     "sql": "SELECT AVG(Delay_Days) FROM Fact_Orders WHERE Delay_Days > 0;",
     "res": [
      [
       "Avg Delay Days (late orders)",
       "4.29 days"
      ],
      [
       "target",
       "≤ 2 days"
      ]
     ],
     "note": "The KPI is the typical lateness of orders that actually ran late, and it is more than double the target."
    },
    {
     "id": "e4",
     "rel": false,
     "t": "Order Cycle Time",
     "sql": "SELECT AVG(DATEDIFF(Actual_Delivery_Date, Order_Date)) FROM Fact_Orders;",
     "res": [
      [
       "Order Cycle Time",
       "11.4 days"
      ],
      [
       "target",
       "≤ 10 days"
      ]
     ],
     "note": "A different KPI (order placed to delivered). It doesn't explain the delay average."
    }
   ],
   "causes": [
    [
     "c1",
     "Delay_Days has NULLs that AVG skipped"
    ],
    [
     "c2",
     "Carriers really fixed their delays"
    ],
    [
     "c3",
     "The average included on-time orders, whose Delay_Days is floored at 0 (early deliveries are 0 too), so the result was pulled down",
     true
    ],
    [
     "c4",
     "Delay_Days is stored in hours, not days"
    ],
    [
     "c5",
     "Tier C suppliers were left out of the scorecard"
    ]
   ],
   "fixes": [
    [
     "f1",
     "Average Delay_Days only WHERE Delay_Days > 0 → 4.29 days, show the late-order count (4,076) beside it, and label the tier column 'avg delay, all orders'",
     true
    ],
    [
     "f2",
     "Average the three tier averages to get one overall number"
    ],
    [
     "f3",
     "Report the median delay instead"
    ],
    [
     "f4",
     "Raise the target to fit the scorecard"
    ]
   ],
   "answer": "Root cause: Delay_Days is already max(0, Actual − Promised), so on-time and early deliveries are stored as 0. The scorecard averages all orders with no WHERE Delay_Days > 0, and 7,924 zeros pull it down (the median is 0 in every tier). Orders that are late run <b>4.29 days</b> late on average, more than double the 2-day target.",
   "tell": "“The 1.12 and 1.49 include every on-time order as zero delay. Orders that actually run late are 4.29 days late on average, more than double our 2-day target. We should keep the carrier review.”"
  },
  {
   "id": "i3",
   "lvl": "Medium",
   "title": "“Titan Corp is 96% reliable”",
   "from": "Rajesh Kulkarni · Head of Procurement",
   "time": "Wed 3:40 PM",
   "msg": "Titan Corp (SUP023) is a Tier A supplier with a Reliability_Score of 96. I want to move more volume to them next quarter. The supplier card on the dashboard agrees. Any reason not to?",
   "metric": [
    [
     "Reliability on the supplier card",
     "96"
    ],
    [
     "Supplier tier",
     "A"
    ]
   ],
   "evidence": [
    {
     "id": "e1",
     "rel": true,
     "t": "Actual on-time % by supplier tier",
     "sql": "SELECT s.Supplier_Tier,\n       ROUND(100.0 * SUM(CASE WHEN o.Delivery_Status = 'On-Time' THEN 1 ELSE 0 END) / COUNT(*), 1) AS otd_pct\nFROM Fact_Orders o\nJOIN Dim_Supplier s ON o.Supplier_ID = s.Supplier_ID\nGROUP BY s.Supplier_Tier;",
     "res": [
      [
       "Tier A (score ≈95)",
       "70.0%"
      ],
      [
       "Tier B (score ≈85)",
       "65.6%"
      ],
      [
       "Tier C (score ≈72)",
       "59.6%"
      ]
     ],
     "note": "Every tier delivers well below the score on file."
    },
    {
     "id": "e2",
     "rel": true,
     "t": "Titan Corp from order data",
     "sql": "-- same query, filtered to Supplier_ID = 'SUP023'",
     "res": [
      [
       "Reliability_Score (master)",
       "96"
      ],
      [
       "actual OTD",
       "54%"
      ],
      [
       "avg delay",
       "2.1 days"
      ]
     ],
     "note": "Titan Corp is the worst performer inside Tier A."
    },
    {
     "id": "e3",
     "rel": true,
     "t": "Score vs actual across suppliers",
     "sql": "-- correlation of Reliability_Score vs actual OTD %, suppliers with ≥ 20 orders",
     "res": [
      [
       "suppliers",
       "32"
      ],
      [
       "correlation",
       "0.60"
      ]
     ],
     "note": "The score points the right way, but it is not strong enough to manage suppliers with."
    },
    {
     "id": "e4",
     "rel": false,
     "t": "Revenue by tier",
     "sql": "SELECT s.Supplier_Tier, SUM(o.Revenue) FROM Fact_Orders o JOIN Dim_Supplier s ON o.Supplier_ID = s.Supplier_ID GROUP BY 1;",
     "res": [
      [
       "Tier A",
       "$52.0M"
      ],
      [
       "Tier B",
       "$101.8M"
      ],
      [
       "Tier C",
       "$40.2M"
      ]
     ],
     "note": "Shows where revenue sits, not how reliable anyone is."
    }
   ],
   "causes": [
    [
     "c1",
     "Titan Corp's orders were joined to the wrong supplier"
    ],
    [
     "c2",
     "Tier A suppliers only handle hard, long-distance lanes"
    ],
    [
     "c3",
     "The card showed Dim_Supplier.Reliability_Score, a static master field, instead of actual on-time % from Fact_Orders",
     true
    ],
    [
     "c4",
     "Delay_Days is wrong for Tier A orders"
    ],
    [
     "c5",
     "Titan Corp has too few orders to judge"
    ]
   ],
   "fixes": [
    [
     "f1",
     "Show Supplier Reliability (Actual) from Fact_Orders next to the score, add the Reliability Gap KPI, and override the score quarterly from real order data",
     true
    ],
    [
     "f2",
     "Move Titan Corp to Tier B and keep the score"
    ],
    [
     "f3",
     "Hide the Reliability_Score column"
    ],
    [
     "f4",
     "Average the score and the actual OTD"
    ]
   ],
   "answer": "Root cause: Reliability_Score is set once in Dim_Supplier and rarely updated. From real orders, Titan Corp's on-time rate is <b>54%</b>, and Tier A overall is 70.0%, not ≈95.",
   "tell": "“Titan Corp's score says 96, but its real on-time rate is 54%, the worst in Tier A. I wouldn't add volume until it improves. I've added actual OTD next to the score on every supplier card.”"
  },
  {
   "id": "i4",
   "lvl": "Advanced",
   "title": "“Revenue is several times higher in the new view”",
   "from": "Anil Bhatia · Finance Controller",
   "time": "Thu 6:15 PM",
   "msg": "The new 'Orders + Stock' view shows revenue several times higher than the $193.99M on the Executive Summary, and all 2023 months are blank. Which number goes to the CFO?",
   "metric": [
    [
     "Executive Summary revenue",
     "$193.99M"
    ],
    [
     "New 'Orders + Stock' view",
     "several times higher, 2023 blank"
    ]
   ],
   "evidence": [
    {
     "id": "e1",
     "rel": true,
     "t": "The new view's SQL",
     "sql": "SELECT SUM(o.Revenue)\nFROM Fact_Orders o\nJOIN Fact_Inventory i\n  ON i.Product_ID = o.Product_ID\n AND i.Warehouse_ID = o.Warehouse_ID;",
     "res": [
      [
       "joins",
       "fact table to fact table"
      ],
      [
       "join keys",
       "Product_ID + Warehouse_ID only"
      ]
     ],
     "note": "Fact_Inventory has one row per Product × Warehouse × month, so each order matches every monthly snapshot."
    },
    {
     "id": "e2",
     "rel": true,
     "t": "Grain of the two facts",
     "sql": "-- Data Dictionary",
     "res": [
      [
       "Fact_Orders",
       "1 row per order line (12,000)"
      ],
      [
       "Fact_Inventory",
       "1 row per product / warehouse / month-end (~6,200)"
      ],
      [
       "snapshots per product + warehouse",
       "up to 12 (2024)"
      ]
     ],
     "note": "One order line can be repeated up to 12 times, once per snapshot."
    },
    {
     "id": "e3",
     "rel": true,
     "t": "Date coverage",
     "sql": "SELECT MIN(Order_Date), MAX(Order_Date) FROM Fact_Orders;\nSELECT MIN(Snapshot_Date), MAX(Snapshot_Date) FROM Fact_Inventory;",
     "res": [
      [
       "Fact_Orders",
       "Jan 2023 – Dec 2024"
      ],
      [
       "Fact_Inventory",
       "2024 only"
      ]
     ],
     "note": "An inner join finds no snapshots for 2023 orders, so they drop out."
    },
    {
     "id": "e4",
     "rel": false,
     "t": "Stockout Rate",
     "sql": "SELECT SUM(Stockout_Flag) * 1.0 / COUNT(*) * 100 FROM Fact_Inventory;",
     "res": [
      [
       "Stockout Rate",
       "0.0%"
      ],
      [
       "rows with Stockout_Flag = 1",
       "none"
      ]
     ],
     "note": "A real finding (Stockout_Flag is 0 in every row). It doesn't affect revenue."
    }
   ],
   "causes": [
    [
     "c1",
     "Revenue was recalculated as Order_Quantity × Unit_Price"
    ],
    [
     "c2",
     "Two fact tables were joined directly: each order repeats once per inventory snapshot, and 2023 orders have no snapshot to match",
     true
    ],
    [
     "c3",
     "Fact_Orders has duplicate Order_IDs"
    ],
    [
     "c4",
     "Revenue was converted to another currency"
    ],
    [
     "c5",
     "Fact_Inventory has orphan Warehouse_IDs"
    ]
   ],
   "fixes": [
    [
     "f1",
     "Never join the facts directly: aggregate each fact on its own, then line them up through the shared Dim_Product / Dim_Warehouse (and month). Add a QA check that rows before = rows after any join",
     true
    ],
    [
     "f2",
     "Divide the view's revenue by 12"
    ],
    [
     "f3",
     "Use SUM(DISTINCT Revenue)"
    ],
    [
     "f4",
     "Delete 2023 orders so both facts cover the same year"
    ]
   ],
   "answer": "Root cause: fact-to-fact join fan-out. Each 2024 order line was repeated once per monthly snapshot, and 2023 orders vanished in the inner join. Revenue from Fact_Orders alone is <b>$193,992,801</b>.",
   "tell": "“Use $193.99M. The new view joined orders straight to monthly stock snapshots, so 2024 orders were counted many times and 2023 dropped out. Orders and stock now meet only through the shared product and warehouse dimensions, with a row-count check.”"
  }
 ],
 "broken": {
  "from": "COO",
  "brief": "“A junior analyst built this for tomorrow's leadership review. Something feels off. Flag every number you would NOT present, then submit.”",
  "title": "Supply Chain Analytics · Leadership Scorecard · Jan 2023 – Dec 2024",
  "tiles": [
   {
    "id": "t1",
    "label": "Total Revenue",
    "val": "$193.99M",
    "bad": false,
    "why": "Correct: SUM(Revenue) from Fact_Orders = $193,992,801."
   },
   {
    "id": "t2",
    "label": "Gross Margin %",
    "val": "36.2%",
    "bad": false,
    "why": "Correct: (SUM(Revenue) − SUM(COGS)) ÷ SUM(Revenue) × 100, above the 30% target."
   },
   {
    "id": "t3",
    "label": "On-Time Delivery",
    "val": "70.0%",
    "bad": true,
    "why": "The card still had the Supplier Tier = A filter on, so it shows Tier A only. Correct: all orders, 7,924 On-Time ÷ 12,000 = 66.0%."
   },
   {
    "id": "t4",
    "label": "Fill Rate",
    "val": "96.8%",
    "bad": false,
    "why": "Correct: SUM(Shipped_Quantity) ÷ SUM(Order_Quantity) × 100 (or AVERAGE(Fill_Rate_Pct)), above the 95% target."
   },
   {
    "id": "t5",
    "label": "Perfect Order Rate",
    "val": "96.8%",
    "bad": true,
    "why": "This is the Fill Rate copied over. Perfect Order needs Delivery_Status = 'On-Time' AND Fill_Rate_Pct = 100. Correct: 55.9%."
   },
   {
    "id": "t6",
    "label": "Delayed Orders",
    "val": "1,837",
    "bad": true,
    "why": "Counted only Delivery_Status = 'Delayed'. Every order that is not On-Time is late. Correct: 2,239 + 1,837 = 4,076."
   },
   {
    "id": "t7",
    "label": "Avg Delay Days",
    "val": "0 days",
    "bad": true,
    "why": "The tile used the median of Delay_Days across all orders. Most orders are on time with Delay_Days = 0, so the median is 0. Correct: AVERAGE(Delay_Days) WHERE Delay_Days > 0 = 4.29 days."
   },
   {
    "id": "t8",
    "label": "Stockout Rate",
    "val": "0.0%",
    "bad": false,
    "why": "Correct: Stockout_Flag is 0 in every Fact_Inventory row. A real finding, not a bug."
   },
   {
    "id": "t9",
    "label": "Inventory Turnover",
    "val": "2.2×",
    "bad": false,
    "why": "Correct: SUM(Units_Shipped, all 12 months) ÷ AVERAGE(monthly total Stock_On_Hand). Below the 6× target, but it is the right number."
   },
   {
    "id": "t10",
    "label": "Warehouse Utilization",
    "val": "4.2%",
    "bad": true,
    "why": "This is the single fullest warehouse (WH18 Mexico City), not the network. Correct: average Stock_On_Hand ÷ Capacity_Units across warehouses = 2.7%."
   }
  ],
  "chart": {
   "title": "Worst carriers by delivery performance",
   "bars": [
    [
     "DHL",
     "482",
     90
    ],
    [
     "FedEx",
     "465",
     87
    ],
    [
     "Local Courier",
     "450",
     84
    ],
    [
     "UPS Air",
     "441",
     82
    ],
    [
     "DB Cargo",
     "435",
     81
    ]
   ],
   "bad": true,
   "why": "These are raw counts of delayed orders. A carrier that handles more orders will have more late ones. Correct: to call a carrier 'worst', rank by On-Time Rate by Carrier (On-Time orders ÷ that carrier's orders)."
  }
 },
 "stakeholders": [
  {
   "id": "s1",
   "who": "Neha Kapoor · VP Operations",
   "ask": "I need a dashboard on delivery performance.",
   "qs": [
    [
     "What decision will this dashboard help you make?",
     "obj",
     18,
     "Which carriers and warehouses to fix first so we get closer to the 90% OTD target."
    ],
    [
     "Which measure matters most: OTD %, delay days or cycle time?",
     "metric",
     18,
     "OTD % first, then Avg Delay Days for late orders."
    ],
    [
     "Which period, and do you want a comparison?",
     "time",
     16,
     "2024 vs 2023, by month."
    ],
    [
     "How often should it refresh?",
     "time",
     6,
     "A daily refresh is fine. I review it weekly."
    ],
    [
     "Who will use it: you, the logistics managers or the board?",
     "scope",
     14,
     "Me and the logistics managers. The board gets a one-page summary."
    ],
    [
     "Should I break it down by carrier, warehouse and ship mode?",
     "scope",
     10,
     "Carrier and warehouse, yes. Ship mode as a filter."
    ],
    [
     "Does 'on time' mean only the On-Time status, or also Slightly Delayed?",
     "rules",
     14,
     "Only On-Time. Slightly late is still late."
    ],
    [
     "Should Avg Delay Days include orders that were not late?",
     "rules",
     12,
     "No. Only orders with Delay_Days above 0, as in the KPI document."
    ],
    [
     "Which colour theme do you like?",
     "bad",
     -8,
     "Whatever is readable. That's a question for later."
    ],
    [
     "Should I put every column of Fact_Orders on the dashboard?",
     "bad",
     -8,
     "No, only what supports the decision."
    ],
    [
     "Can I build it from the Excel export instead of SQL?",
     "bad",
     -6,
     "Use SQL, so QA can reconcile the numbers."
    ]
   ]
  },
  {
   "id": "s2",
   "who": "Karan Malhotra · Procurement Lead",
   "ask": "Which suppliers should we keep? I need an answer by Friday.",
   "qs": [
    [
     "What will you do with the answer: cut volume, renegotiate or exit?",
     "obj",
     18,
     "Cut volume from the weakest ones and renegotiate with the rest."
    ],
    [
     "Does 'good supplier' mean on-time delivery, cost, or both?",
     "metric",
     18,
     "On-time first. Cost second."
    ],
    [
     "Do you want spend (SUM of COGS) by supplier on the same page?",
     "metric",
     12,
     "Yes, so we know how much money is at stake."
    ],
    [
     "Which period should I use?",
     "time",
     16,
     "Both years, so we can see if anyone is getting worse."
    ],
    [
     "Should I compare suppliers inside each tier or across all 32?",
     "scope",
     14,
     "Inside each tier first, then the overall ranking."
    ],
    [
     "Should the list show the bottom suppliers per tier?",
     "scope",
     8,
     "Yes, the bottom 3 to 5 in each tier."
    ],
    [
     "Should I use the Reliability_Score on file or actual on-time % from orders?",
     "rules",
     14,
     "Actual from orders. Show the score beside it so we see the gap."
    ],
    [
     "Should I skip suppliers with very few orders?",
     "rules",
     10,
     "Yes, only suppliers with at least 20 orders."
    ],
    [
     "Can I add a map of supplier cities?",
     "bad",
     -8,
     "Not needed for this decision."
    ],
    [
     "Should I build it in Excel, Tableau and Power BI?",
     "bad",
     -6,
     "One tool is enough for this question."
    ],
    [
     "Do you want a 3D pie chart?",
     "bad",
     -8,
     "No."
    ]
   ]
  },
  {
   "id": "s3",
   "who": "Meera Joshi · Warehouse Operations Manager",
   "ask": "Tell me if our inventory is healthy.",
   "qs": [
    [
     "Is this for a stocking decision or for a monthly report?",
     "obj",
     18,
     "A decision: which warehouses and products to cut back or top up."
    ],
    [
     "Which measures define 'healthy': stockouts, days of supply, turnover or utilization?",
     "metric",
     18,
     "All four, with the targets from the KPI document."
    ],
    [
     "How should Inventory Turnover be calculated?",
     "metric",
     12,
     "Units shipped over all 12 months divided by the average monthly stock on hand."
    ],
    [
     "Should I use the latest month-end snapshot or the trend over 2024?",
     "time",
     16,
     "Latest snapshot for the cards, monthly trend below."
    ],
    [
     "Should I show it per warehouse, per product, or both?",
     "scope",
     14,
     "Per warehouse first, then drill to product."
    ],
    [
     "Should stock be added up across months?",
     "rules",
     14,
     "No. It is a snapshot, so never add months together."
    ],
    [
     "Should order data be joined straight onto the inventory table?",
     "rules",
     10,
     "No. Link them only through product and warehouse."
    ],
    [
     "Should all 20 warehouses be included?",
     "scope",
     10,
     "Yes, all 20."
    ],
    [
     "Can I round everything to thousands?",
     "bad",
     -4,
     "Keep exact units. The warehouses count in units."
    ],
    [
     "Should I add revenue to the stock chart?",
     "bad",
     -8,
     "No. Different grain, keep them on separate pages."
    ],
    [
     "Can I skip QA to deliver faster?",
     "bad",
     -10,
     "No. The numbers must reconcile with SQL."
    ]
   ]
  }
 ]
};
