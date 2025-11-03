# Admin Dashboard API

Base URL: `http://localhost:8080`
Auth: `ROLE_ADMIN` required (all endpoints under `/api/admin/**`).
Envelope: `{ data, meta, error }`.

## Overview Metrics
- GET `/api/admin/dashboard`
- Query: `lowStockThreshold` (optional, default: 5)
- Returns
```
{
  totalRevenue: number,            // sum of totals for DELIVERED orders
  totalOrders: number,             // all orders
  totalCustomers: number,          // user count
  totalProducts: number,           // product count
  statusDistribution: {            // counts per status across all orders
    PENDING: number,
    CONFIRMED: number,
    IN_PROCESS: number,
    DELIVERED: number,
    CANCELLED: number
  },
  revenueTrend: [                  // monthly totals for DELIVERED orders
    { year: 2025, month: 1, label: "JANUARY", total: 4000.00 },
    ...
  ],
  quickStats: {
    completedOrders: number,       // DELIVERED count
    pendingOrders: number,         // PENDING count
    activeCoupons: number,         // active + not expired
    lowStockProducts: number       // products with stock <= lowStockThreshold
  },
  recentOrders: [                  // last 10 orders by createdAt desc
    { id, orderNumber, orderNumberFormatted, createdAt, status, total, customer }
  ]
}
```

## Frontend Mapping (per UI)

- Top tiles
  - Total Revenue → `data.totalRevenue`
  - Total Orders → `data.totalOrders`
  - Total Customers → `data.totalCustomers`
  - Total Products → `data.totalProducts`

- Order Status Distribution
  - Use `data.statusDistribution` to build a chart or legend.

- Revenue Trend (line chart)
  - Use `data.revenueTrend[*].label` for X-axis labels and `total` for Y values.
  - Optionally filter to last N months on the client.

- Quick Stats
  - Completed Orders → `data.quickStats.completedOrders`
  - Pending Orders → `data.quickStats.pendingOrders`
  - Active Coupons → `data.quickStats.activeCoupons`
  - Low Stock Products → `data.quickStats.lowStockProducts` (pass `lowStockThreshold` if you need a different limit)

- Recent Orders list
  - Render rows with:
    - `orderNumberFormatted`, `createdAt`, `status`, `total`, `customer`
  - Click-through to admin order details using `/admin/orders/{id}` in your app.

## Notes
- All metrics are computed server-side in one request for fast dashboard loads.
- Revenue is based on `DELIVERED` orders only.
- Coupon “active” means `active = true` and `expiryDate` is null or in the future.
