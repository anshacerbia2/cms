import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
import { Calculator, PieChart, FileBarChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { PlPerProjectTab } from "../components/PlPerProjectTab";
import { ProfitLossTab } from "../components/ProfitLossTab";
import { BalanceSheetTab } from "../components/BalanceSheetTab";

// Modular Tabs

export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "pl");

  // Sync state when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        <PageHeader 
          title="Financial Reports" 
          description="Comprehensive financial statements and internal account reconciliation."
          icon={FileBarChart}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
          <TabsList>
            <TabsTrigger value="pl" className="gap-2">
              <Calculator size={14} className="text-secondary" />
              Profit & Loss
            </TabsTrigger>
            {/* <TabsTrigger value="project" className="gap-2">
              <Layers size={14} className="text-secondary" />
              PL Per Project
            </TabsTrigger> */}
            <TabsTrigger value="balance" className="gap-2">
              <PieChart size={14} className="text-secondary" />
              Balance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pl" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProfitLossTab />
          </TabsContent>

          {/* <TabsContent value="project" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PlPerProjectTab />
          </TabsContent> */}

          <TabsContent value="balance" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BalanceSheetTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
