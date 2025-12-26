import {
  Plane,
  Hotel,
  Utensils,
  ShoppingBag,
  Ticket,
  CreditCard,
  Map,
  LucideIcon,
} from 'lucide-react';

// 예산 카테고리별 아이콘 매핑
const BUDGET_CATEGORY_ICONS: Record<string, LucideIcon> = {
  항공: Plane,
  숙소: Hotel,
  식비: Utensils,
  쇼핑: ShoppingBag,
  관광: Ticket,
  기타: CreditCard,
};

/**
 * 예산 카테고리에 해당하는 아이콘 컴포넌트 반환
 */
export function getBudgetCategoryIcon(category: string): LucideIcon {
  return BUDGET_CATEGORY_ICONS[category] || Map;
}
