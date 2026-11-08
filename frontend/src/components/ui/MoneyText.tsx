import { formatMoney } from '../../utils/formatMoney';

export const MoneyText = ({ value }: { value: number }) => <>{formatMoney(value)}</>;
