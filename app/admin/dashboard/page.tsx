"use client"

import { useEffect, useMemo, useState } from "react"
import { apiAdminGetDashboard, apiAdminSearchOrders, apiAdminGetUser, type AdminDashboardMetrics } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts"
import { TrendingUp, Package, ShoppingCart, Users } from "lucide-react"
import { useCurrency } from "@/lib/currency-context"

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const { formatPrice } = useCurrency()
  const [trendMode, setTrendMode] = useState<'DATE'|'MONTH'|'YEAR'>("MONTH")
  const [dailyTrend, setDailyTrend] = useState<Array<{ label: string; total: number }>>([])
  const [userMap, setUserMap] = useState<Record<string, { name?: string; email?: string }>>({})

  useEffect(() => { (async () => { try { setMetrics(await apiAdminGetDashboard()) } catch { setMetrics(null) } finally { setLoading(false) } })() }, [])

  // Hydrate names/emails for user orders so Recent Orders never shows a raw ID
  useEffect(() => {
    (async () => {
      const ids = new Set<string>()
      for (const o of (metrics?.recentOrders || [])) {
        const uid = (o as any)?.userId as string | undefined
        if (uid && !userMap[uid]) ids.add(uid)
      }
      if (ids.size === 0) return
      const entries: Array<[string, { name?: string; email?: string }]> = []
      await Promise.all(Array.from(ids).map(async (id) => {
        try { const u = await apiAdminGetUser(id); entries.push([id, { name: u?.name, email: (u as any)?.email }]) } catch {}
      }))
      if (entries.length) setUserMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
    })()
  }, [metrics?.recentOrders])

  // Load a basic daily trend from recent delivered orders when DATE mode is selected
  useEffect(() => {
    (async () => {
      if (trendMode !== 'DATE') return
      try {
        const res = await apiAdminSearchOrders({ status: 'DELIVERED', size: 200, sort: 'createdAt,DESC' })
        const map = new Map<string, number>()
        for (const o of (res.items || [])) {
          const d = o.createdAt ? new Date(o.createdAt) : null
          if (!d || isNaN(d.getTime())) continue
          const key = d.toISOString().slice(0,10)
          map.set(key, (map.get(key) || 0) + (o.total || 0))
        }
        const arr = Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([k,v]) => ({ label: k, total: v }))
        setDailyTrend(arr)
      } catch { setDailyTrend([]) }
    })()
  }, [trendMode])

  const totalRevenue = metrics?.totalRevenue || 0
  const totalOrders = metrics?.totalOrders || 0
  const totalCustomers = metrics?.totalCustomers || 0
  const totalProducts = metrics?.totalProducts || 0

  const stats = [
    { label: "Total Revenue", value: formatPrice(totalRevenue), icon: TrendingUp, color: "bg-blue-500" },
    { label: "Total Orders", value: totalOrders, icon: ShoppingCart, color: "bg-purple-500" },
    { label: "Total Customers", value: totalCustomers, icon: Users, color: "bg-green-500" },
    { label: "Total Products", value: totalProducts, icon: Package, color: "bg-orange-500" },
  ]

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your business overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx} className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600 font-medium">{stat.label}</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base md:text-lg font-semibold">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80 flex items-center justify-center">
              {metrics?.statusDistribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'PENDING', value: metrics.statusDistribution.PENDING, fill: '#f59e0b' },
                        { name: 'CONFIRMED', value: metrics.statusDistribution.CONFIRMED, fill: '#3b82f6' },
                        { name: 'IN_PROCESS', value: metrics.statusDistribution.IN_PROCESS, fill: '#6366f1' },
                        { name: 'DELIVERED', value: metrics.statusDistribution.DELIVERED, fill: '#10b981' },
                        { name: 'CANCELLED', value: metrics.statusDistribution.CANCELLED, fill: '#ef4444' },
                      ].filter(x=>x.value>0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={60}
                      dataKey="value"
                    >
                      <Cell key='p' fill={'#f59e0b'} />
                      <Cell key='c' fill={'#3b82f6'} />
                      <Cell key='ip' fill={'#6366f1'} />
                      <Cell key='d' fill={'#10b981'} />
                      <Cell key='x' fill={'#ef4444'} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500">No orders yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base md:text-lg font-semibold">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <button className={`px-2 py-1 rounded text-xs border ${trendMode==='DATE' ? 'bg-primary text-white' : 'bg-background'}`} onClick={()=>setTrendMode('DATE')}>By Date</button>
              <button className={`px-2 py-1 rounded text-xs border ${trendMode==='MONTH' ? 'bg-primary text-white' : 'bg-background'}`} onClick={()=>setTrendMode('MONTH')}>By Month</button>
              <button className={`px-2 py-1 rounded text-xs border ${trendMode==='YEAR' ? 'bg-primary text-white' : 'bg-background'}`} onClick={()=>setTrendMode('YEAR')}>By Year</button>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={
                trendMode==='DATE'
                  ? dailyTrend.map(d=>({ label: d.label, revenue: d.total }))
                  : trendMode==='YEAR'
                    ? (()=>{
                        const map = new Map<string, number>()
                        for (const r of (metrics?.revenueTrend || [])) {
                          const key = String(r.year)
                          map.set(key, (map.get(key) || 0) + (r.total || 0))
                        }
                        return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>({ label: k, revenue: v }))
                      })()
                    : (metrics?.revenueTrend || []).map((r)=>({ label: r.label, revenue: r.total }))
              }>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base md:text-lg font-semibold">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600 text-sm">Completed Orders</span>
              <span className="font-bold text-green-600">{metrics?.quickStats?.completedOrders || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600 text-sm">Pending Orders</span>
              <span className="font-bold text-yellow-600">{metrics?.quickStats?.pendingOrders || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600 text-sm">Active Coupons</span>
              <span className="font-bold text-blue-600">{metrics?.quickStats?.activeCoupons || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Low Stock Products</span>
              <span className="font-bold text-red-600">{metrics?.quickStats?.lowStockProducts || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base md:text-lg font-semibold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {(loading ? [] : (metrics?.recentOrders || [])).map((order: any) => {
                const uid = String(order.userId || '')
                const cached = uid ? userMap[uid] : undefined
                // Prefer submitted checkout contact for ALL orders (guest or auth)
                const displayName = order.guestName || cached?.name || order.userName || order.userEmail || order.guestEmail || (order.userId ? 'User' : 'Guest')
                const displayEmail = order.guestEmail || cached?.email || order.userEmail || ''
                return (
                  <div key={order.id} className="flex justify-between items-center pb-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{displayName}</p>
                      <p className="text-xs text-gray-500">
                        {displayEmail ? `${displayEmail} • ` : ''}
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatPrice(order.total || 0)}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${String(order.status).toUpperCase() === 'DELIVERED' ? 'bg-green-100 text-green-800' : ['PENDING','CONFIRMED','IN_PROCESS'].includes(String(order.status).toUpperCase()) ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {String(order.status).replace('_',' ')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
