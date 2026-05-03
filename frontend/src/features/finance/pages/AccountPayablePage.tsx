import { ArrowDownRight, LayoutDashboard, ReceiptText, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApSummaryTab } from "../components/ApSummaryTab";
import { ApPpnWapuTab } from "../components/ApPpnWapuTab";
import { ApPpnNonWapuTab } from "../components/ApPpnNonWapuTab";
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from "@/components/common/PageContainer";

export default function AccountPayablePage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Account Payable"
        description="Modular management and tracking for payables and PPN ledgers."
        icon={ArrowDownRight}
      />
      <Tabs defaultValue="summary" className="w-full space-y-6">
        <TabsList>
          <TabsTrigger value="summary" className="gap-2">
            <LayoutDashboard size={14} className="text-secondary" />
            AP Summary
          </TabsTrigger>
          <TabsTrigger value="wapu" className="gap-2">
            <ShieldCheck size={14} className="text-secondary" />
            PPN WAPU
          </TabsTrigger>
          <TabsTrigger value="non-wapu" className="gap-2">
            <ReceiptText size={14} className="text-secondary" />
            PPN Non-WAPU
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ApSummaryTab />
        </TabsContent>
        
        <TabsContent value="wapu" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ApPpnWapuTab />
        </TabsContent>

        <TabsContent value="non-wapu" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ApPpnNonWapuTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
