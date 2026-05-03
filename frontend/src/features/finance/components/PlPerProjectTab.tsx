import { useState } from "react";
import { FinanceRevenueTab } from "./FinanceRevenueTab";
import { FinanceExpenseTab } from "./FinanceExpenseTab";

export function PlPerProjectTab() {
  const [view, setView] = useState("revenue");

  return (
    <div className="animate-in fade-in duration-500">
      {view === 'revenue' ? (
        <FinanceRevenueTab onViewChange={setView} currentView={view} />
      ) : (
        <FinanceExpenseTab onViewChange={setView} currentView={view} />
      )}
    </div>
  );
}
