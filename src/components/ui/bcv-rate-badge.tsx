import { Badge } from '@/components/ui/badge';
import { useBcvRate } from '@/api/rates';
import { formatNumber, formatDateVE } from '@/lib/formatters';
import { Loader2 } from 'lucide-react';

interface BcvRateBadgeProps {
  date?: string;
}

export function BcvRateBadge({ date }: BcvRateBadgeProps) {
  const { data: rate, isLoading, error } = useBcvRate(date);

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Cargando tasa BCV...
      </Badge>
    );
  }

  if (error || !rate) {
    return (
      <Badge variant="destructive">
        Error al cargar tasa BCV
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="font-mono">
      Tasa BCV: {formatNumber(rate.rate)} — {formatDateVE(new Date(rate.date))}
    </Badge>
  );
}