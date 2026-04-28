import { TrendingDown } from 'lucide-react';

export default function DepreciationPage() {
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2 sm:gap-3">
              <TrendingDown className="text-secondary shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
              Depreciation
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Manage and track asset depreciation schedules.</p>
        </div>
      </div>

      {/* Blank State / Coming Soon */}
      <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-primary/5 flex flex-col items-center justify-center min-h-[400px] text-center">
        <TrendingDown className="w-16 h-16 text-primary/20 mb-4" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Depreciation Module</h2>
        <p className="text-slate-500 max-w-md">The Depreciation tracking dashboard is currently under construction. Please check back later.</p>
      </div>
    </div>
  );
}
