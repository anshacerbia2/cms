import { ArrowUpRight } from 'lucide-react';
import { ApSummaryTab } from "../components/ApSummaryTab";
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from "@/components/common/PageContainer";

export default function AccountPayablePage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Account Payable"
        description="Modular management and tracking for payables."
        icon={ArrowUpRight}
      />
      <div className="w-full mt-6">
        <ApSummaryTab />
      </div>
    </PageContainer>
  );
}
