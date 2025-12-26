'use client';

import React from 'react';
import { useTripStore } from '@/stores/tripStore';
import { getBudgetCategoryIcon } from '@/lib/utils/iconHelpers';

export default function BudgetTab() {
  const { budgetData } = useTripStore();

  return (
    <div className="animate-fadeInUp space-y-6">
      {/* 총 예산 카드 */}
      <div className="bg-black text-white rounded-3xl p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
        <p className="text-white/60 text-sm mb-1 font-medium">총 예산 (1인 기준)</p>
        <h2 className="text-4xl font-bold tracking-tight">₩{budgetData.total.toLocaleString()}</h2>
      </div>

      {/* 카테고리별 예산 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetData.breakdown.map((item, i) => {
          const IconComponent = getBudgetCategoryIcon(item.category);

          return (
            <div
              key={i}
              className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 text-black shadow-sm">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{item.category}</p>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <p className="text-xl font-bold text-slate-900">₩{item.amount.toLocaleString()}</p>
                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-black rounded-full"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

