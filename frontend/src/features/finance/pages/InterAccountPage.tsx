import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from "@/components/common/PageContainer";
import { InterAccountTable } from '../components/InterAccountTable';

export default function InterAccountPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Inter Account"
        description="Inter Account Ledger Summary"
        icon={Wallet}
      />
      <div className="w-full">
        <InterAccountTable />
      </div>
    </PageContainer>
  );
}
