import { useAuthStore } from "@/store/authStore"
import { 
  Users, 
  Landmark, 
  PieChart, 
  BarChart3, 
  Truck,
  ArrowRight
} from "lucide-react"


import { Link } from "react-router-dom"
import { useFinance } from "@/features/finance/hooks/useFinance"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { 
    getPLSummary, 
    getBalanceSheet,
    getDashboardActivities
  } = useFinance()

  // Kartu berlabel FY / YTD tahun berjalan, jadi laporannya diminta untuk tahun
  // itu. Tanpa tahun, backend menggabungkan semua tahun: AR, AP, dan aset tetap
  // yang sudah membawa saldo tahun lalu terhitung dua kali.
  const reportYear = String(new Date().getFullYear());

  // Data fetching for highlights
  const { data: plSummary } = getPLSummary(reportYear)
  const { data: bsData } = getBalanceSheet(reportYear)
  const { data: recentActivitiesData } = getDashboardActivities()

  // Aggregation logic
  const totalAssets = Number(bsData?.summary?.totalAssets) || 0;

  const netProfit = Number((plSummary as any[])?.find((s: any) => s.label === 'PROFIT AFTER TAX')?.total) || 0;
  const totalAR = Number(bsData?.assets?.categories?.find((c: any) => c.name === 'Account Receivable')?.total) || 0;
  const totalAP = Number(bsData?.liabilities?.categories?.find((c: any) => c.name === 'Account Payable')?.total) || 0;

  const currentYear = new Date().getFullYear();

  const recentActivities = Array.isArray(recentActivitiesData) && recentActivitiesData.length > 0 
    ? recentActivitiesData 
    : [
        { id: "No Activity", customer: "-", amount: "-", date: "-" }
      ];

  return (
    <div className="space-y-10 pb-20">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black tracking-tighter uppercase text-primary">Financial Overview <span className="text-secondary">Dashboard</span></h1>
        <p className="text-muted-foreground font-medium">
          Welcome back, {user?.name}. Your enterprise health at a glance.
        </p>
      </div>

      {/* PREMIUM HIGHLIGHT BOXES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Box 1: Total Assets */}
        <div className="bg-[#1e2330] rounded-[2.5rem] p-8 text-white shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Landmark size={80} />
          </div>
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Total Assets</span>
              <Badge className="bg-white/10 text-white text-[8px] border-none">FY {currentYear}</Badge>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter leading-tight">{formatCurrency(totalAssets)}</span>
              <span className="text-white/40 text-[10px] font-bold mt-1 uppercase tracking-wider">Net Book Value</span>
            </div>
          </div>
        </div>

        {/* Box 2: Net Profit */}
        <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] p-8 border border-primary/5 shadow-premium hover:scale-[1.02] transition-all duration-500">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Net Profit</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 text-[8px] font-black border-none uppercase tracking-widest">YTD</Badge>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-primary leading-tight">{formatCurrency(netProfit)}</span>
              <span className="text-muted-foreground/60 text-[10px] font-bold mt-1 uppercase tracking-wider">Profit After Tax</span>
            </div>
          </div>
        </div>

        {/* Box 3: Total AR */}
        <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] p-8 border border-primary/5 shadow-premium hover:scale-[1.02] transition-all duration-500">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Receivables</span>
              <Badge className="bg-amber-500/10 text-amber-600 text-[8px] font-black border-none uppercase tracking-widest">Outstanding</Badge>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-amber-600 leading-tight">{formatCurrency(totalAR)}</span>
              <span className="text-muted-foreground/60 text-[10px] font-bold mt-1 uppercase tracking-wider">Account Receivable</span>
            </div>
          </div>
        </div>

        {/* Box 4: Total AP */}
        <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] p-8 border border-primary/5 shadow-premium hover:scale-[1.02] transition-all duration-500">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Payables</span>
              <Badge className="bg-rose-500/10 text-rose-600 text-[8px] font-black border-none uppercase tracking-widest">Outstanding</Badge>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-rose-600 leading-tight">{formatCurrency(totalAP)}</span>
              <span className="text-muted-foreground/60 text-[10px] font-bold mt-1 uppercase tracking-wider">Account Payable</span>
            </div>
          </div>
        </div>
      </div>


      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/40">Recent Activity</h3>
            <Link to="/bank-mutation" className="text-[10px] font-black text-secondary uppercase tracking-widest hover:underline">View All Ledger</Link>
          </div>
          <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] p-8 border border-primary/5 shadow-premium">
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary/5 text-left uppercase tracking-tighter font-black text-[10px] text-muted-foreground">
                    <th className="pb-4">Reference</th>
                    <th className="pb-4">Entity</th>
                    <th className="pb-4 text-right">Amount</th>
                    <th className="pb-4 text-right pr-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {recentActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="py-4 font-black text-primary uppercase text-[12px]">{activity.id}</td>
                      <td className="py-4 text-muted-foreground font-medium">{activity.customer}</td>
                      <td className="py-4 text-right font-mono font-bold text-[13px]">{activity.amount !== '-' ? formatCurrency(activity.amount) : '-'}</td>
                      <td className="py-4 text-right text-muted-foreground text-[11px] font-mono pr-2">{activity.date !== '-' ? new Date(activity.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>


        {/* Finance Reports Sidebar */}
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/40 px-2">Quick Navigation</h3>
          <div className="grid gap-3">
            {[
              { id: "pl", title: "Profit & Loss", icon: BarChart3, color: "bg-primary/5", link: "/finance-reports?tab=pl" },
              { id: "bs", title: "Balance Sheet", icon: PieChart, color: "bg-secondary/5", link: "/finance-reports?tab=balance" },
              { id: "ap", title: "Payables", icon: Truck, color: "bg-rose-500/5", link: "/account-payable" },
              { id: "ar", title: "Receivables", icon: Users, color: "bg-emerald-500/5", link: "/account-receivable" },
            ].map((report) => (
              <Link
                key={report.id}
                to={report.link}
                className="group bg-white/70 backdrop-blur-md rounded-3xl p-5 border border-primary/5 shadow-sm hover:shadow-premium hover:bg-white transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${report.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <report.icon className="text-primary" size={20} />
                  </div>
                  <span className="text-sm font-black uppercase tracking-tight text-primary">{report.title}</span>
                </div>
                <ArrowRight size={18} className="text-primary/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

