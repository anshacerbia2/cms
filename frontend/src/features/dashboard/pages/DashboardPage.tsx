import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuthStore } from "@/store/authStore"
import { Users, Briefcase, FileText, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const { user } = useAuthStore()

  const metrics = [
    {
      title: "Total Customers",
      value: "1,284",
      change: "+12.5%",
      trend: "up",
      description: "from last month",
      icon: Users,
    },
    {
      title: "Active Projects",
      value: "42",
      change: "+4.1%",
      trend: "up",
      description: "from last month",
      icon: Briefcase,
    },
    {
      title: "Pending Invoices",
      value: "18",
      change: "-2.3%",
      trend: "down",
      description: "from last month",
      icon: FileText,
    },
    {
      title: "Revenue (MTD)",
      value: "Rp 2.4B",
      change: "+18.2%",
      trend: "up",
      description: "from last month",
      icon: TrendingUp,
    },
  ]

  const recentActivities = [
    { id: "INV-2024-0421", customer: "PT. Solusi Maju", amount: "Rp 45,800,000", status: "Paid", date: "Today, 14:32" },
    { id: "INV-2024-0420", customer: "CV. Karya Mandiri", amount: "Rp 12,500,000", status: "Pending", date: "Today, 11:08" },
    { id: "RV-2024-0089", customer: "PT. Abadi Sentosa", amount: "Rp 28,000,000", status: "Received", date: "Yesterday" },
    { id: "INV-2024-0419", customer: "PT. Global Teknik", amount: "Rp 67,200,000", status: "Overdue", date: "Apr 10" },
    { id: "PV-2024-0032", customer: "UD. Berkah Jaya", amount: "Rp 8,400,000", status: "Processed", date: "Apr 10" },
  ]

  const statusColor: Record<string, string> = {
    Paid: "bg-emerald-50 text-emerald-700",
    Pending: "bg-amber-50 text-amber-700",
    Received: "bg-blue-50 text-blue-700",
    Overdue: "bg-red-50 text-red-700",
    Processed: "bg-slate-100 text-slate-700",
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {user?.name}. Here's what's happening today.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center gap-1 mt-1">
                {metric.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-xs font-medium ${metric.trend === "up" ? "text-emerald-600" : "text-red-600"}`}>
                  {metric.change}
                </span>
                <span className="text-xs text-muted-foreground">{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Transactions Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest invoices and voucher activity.</CardDescription>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Invoice</th>
                    <th className="pb-3 font-medium text-muted-foreground">Customer</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Amount</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-3 font-medium">{activity.id}</td>
                      <td className="py-3 text-muted-foreground">{activity.customer}</td>
                      <td className="py-3 text-right font-medium tabular-nums">{activity.amount}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[activity.status]}`}>
                          {activity.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">{activity.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions + Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start h-10">
                <FileText className="mr-2 h-4 w-4" /> New Invoice
              </Button>
              <Button variant="outline" className="justify-start h-10">
                <Users className="mr-2 h-4 w-4" /> Add Customer
              </Button>
              <Button variant="outline" className="justify-start h-10">
                <Briefcase className="mr-2 h-4 w-4" /> Create Project
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { text: "Invoice INV-0421 marked as paid", time: "2 hours ago" },
                  { text: "New customer PT. Abadi added", time: "5 hours ago" },
                  { text: "Project ENG-2024-005 updated", time: "Yesterday" },
                  { text: "RV-0089 received from bank", time: "Yesterday" },
                ].map((event, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="relative mt-1.5">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      {i < 3 && <div className="absolute left-[3px] top-3 h-full w-px bg-border" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm leading-snug">{event.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
