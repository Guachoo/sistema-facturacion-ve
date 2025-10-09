import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBcvRate } from '@/api/rates';
import { formatNumber, formatDateVE } from '@/lib/formatters';
import { Loader2, RefreshCw, DollarSign, Clock } from 'lucide-react';

interface BcvRateBadgeProps {
  date?: string;
}

export function BcvRateBadge({ date }: BcvRateBadgeProps) {
  const { data: rate, isLoading, error, refetch, isFetching } = useBcvRate(date);

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
      <Badge variant="destructive" className="gap-2">
        <DollarSign className="h-3 w-3" />
        Error BCV
      </Badge>
    );
  }

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return formatDateVE(new Date(rate.date));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge variant="secondary" className="gap-2 cursor-pointer hover:bg-secondary/80">
          <DollarSign className="h-3 w-3" />
          <span className="font-mono">{formatNumber(rate.rate)} VES</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Tasa Oficial BCV</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tasa:</span>
              <span className="font-mono font-bold">{formatNumber(rate.rate)} VES/USD</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Fuente:</span>
              <span className="text-sm">{rate.source}</span>
            </div>

            {rate.lastUpdate && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Actualizado:
                </span>
                <span className="text-xs text-right">{formatDateTime(rate.lastUpdate)}</span>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground border-t pt-2">
            Tasa oficial del Banco Central de Venezuela actualizada automáticamente cada hora.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}