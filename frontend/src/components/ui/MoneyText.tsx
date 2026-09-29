const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const MoneyText = ({ value }: { value: number }) => <>{currencyFormatter.format(Number(value))}</>;

export const formatMoney = (value: number) => currencyFormatter.format(Number(value));
