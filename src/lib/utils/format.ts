/**
 * 숫자를 한국어 금액 표기로 변환
 * @example formatKoreanCurrency(150000) → "15만원"
 * @example formatKoreanCurrency(125000) → "12만 5,000원"
 */
export function formatKoreanCurrency(price: number): string {
  if (!price) return '';

  const unit = 10000;

  if (price < unit) {
    return `${price.toLocaleString()}원`;
  }

  const man = Math.floor(price / unit);
  const remainder = price % unit;

  return remainder > 0
    ? `${man.toLocaleString()}만 ${remainder.toLocaleString()}원`
    : `${man.toLocaleString()}만원`;
}
