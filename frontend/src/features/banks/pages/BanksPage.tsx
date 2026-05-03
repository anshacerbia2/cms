import { useState } from "react";
import { Landmark } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountsTab } from "../components/AccountsTab";
import { BanksTab } from "../components/BanksTab";
import { FiscalPeriodsTab } from "../components/FiscalPeriodsTab";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";

export default function BanksPage() {
  const [activeTab, setActiveTab] = useState("accounts");
  
  return (
    <PageContainer>
      <PageHeader 
        title="Accounts & Banks"
        description="Manage corporate banking entities and internal account registries."
        icon={Landmark}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList>
          <TabsTrigger value="accounts">Account</TabsTrigger>
          <TabsTrigger value="banks">Bank Refs</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal Periods</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          {activeTab === "accounts" && <AccountsTab />}
        </TabsContent>

        <TabsContent value="banks">
          {activeTab === "banks" && <BanksTab />}
        </TabsContent>

        <TabsContent value="fiscal">
          {activeTab === "fiscal" && <FiscalPeriodsTab />}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
