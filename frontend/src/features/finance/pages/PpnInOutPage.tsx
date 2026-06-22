import { ArrowDownUp } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from "@/components/common/PageContainer";
import { PpnInOutTable } from '../components/PpnInOutTable';

export default function PpnInOutPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="PPN In/out"
        description="Modular management and tracking for PPN ledgers."
        icon={ArrowDownUp}
      />
      <div className="w-full">
        <PpnInOutTable />
      </div>
    </PageContainer>
  );
}
