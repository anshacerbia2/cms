import { useState } from "react";
import { Landmark } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountsTab } from "../components/AccountsTab";
import { BanksTab } from "../components/BanksTab";
import { FiscalPeriodsTab } from "../components/FiscalPeriodsTab";

export default function BanksPage() {
  const [activeTab, setActiveTab] = useState("accounts");
  
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2 sm:gap-3">
             <Landmark className="text-secondary shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
             Accounts & Banks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Manage corporate banking entities and internal account registries.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1.5 border border-primary/5 rounded-xl h-auto w-full md:w-fit justify-start gap-2 backdrop-blur-sm">
          <TabsTrigger value="accounts" className="flex-1 md:flex-initial rounded-xl px-6 py-2.5 font-extrabold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all cursor-pointer">
            Account
          </TabsTrigger>
          <TabsTrigger value="banks" className="flex-1 md:flex-initial rounded-xl px-6 py-2.5 font-extrabold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all cursor-pointer">
            Bank Refs
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="flex-1 md:flex-initial rounded-xl px-6 py-2.5 font-extrabold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all cursor-pointer">
            Fiscal Periods
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-0 outline-none focus-visible:ring-0">
          {activeTab === "accounts" && <AccountsTab />}
        </TabsContent>

        <TabsContent value="banks" className="mt-0 outline-none focus-visible:ring-0">
          {activeTab === "banks" && <BanksTab />}
        </TabsContent>

        <TabsContent value="fiscal" className="mt-0 outline-none focus-visible:ring-0">
          {activeTab === "fiscal" && <FiscalPeriodsTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
