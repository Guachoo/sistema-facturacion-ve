import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Building, Building2, MapPin, ChevronDown, Settings, Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// FASE 8: Selector de empresa para multi-empresa
interface CompanyInfo {
  id: string;
  razonSocial: string;
  rif: string;
  tipo: 'principal' | 'sucursal';
  activa: boolean;
}

interface CompanySelectorProps {
  currentCompany: CompanyInfo | null;
  availableCompanies: CompanyInfo[];
  onCompanyChange: (companyId: string) => void;
  userPermissions?: Record<string, boolean>;
  className?: string;
}

export function CompanySelector({
  currentCompany,
  availableCompanies,
  onCompanyChange,
  userPermissions = {},
  className,
}: CompanySelectorProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!currentCompany) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const getCompanyIcon = (tipo: string) => {
    return tipo === 'principal' ? Building2 : MapPin;
  };

  const getCompanyTypeLabel = (tipo: string) => {
    return tipo === 'principal' ? 'Oficina Principal' : 'Sucursal';
  };

  const getCompanyTypeColor = (tipo: string) => {
    return tipo === 'principal' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Selector principal */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 h-10 px-3 min-w-[200px] justify-start"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {(() => {
                const Icon = getCompanyIcon(currentCompany.tipo);
                return (
                  <Icon className={cn(
                    'h-4 w-4 flex-shrink-0',
                    currentCompany.tipo === 'principal' ? 'text-blue-600' : 'text-green-600'
                  )} />
                );
              })()}
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium text-sm truncate">
                  {currentCompany.razonSocial}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentCompany.rif}
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="start">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Seleccionar Empresa
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {availableCompanies.map((company) => {
            const Icon = getCompanyIcon(company.tipo);
            const isSelected = company.id === currentCompany.id;

            return (
              <DropdownMenuItem
                key={company.id}
                className={cn(
                  'flex items-center gap-3 p-3 cursor-pointer',
                  isSelected && 'bg-accent'
                )}
                onClick={() => onCompanyChange(company.id)}
              >
                <Icon className={cn(
                  'h-5 w-5 flex-shrink-0',
                  company.tipo === 'principal' ? 'text-blue-600' : 'text-green-600'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {company.razonSocial}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {company.rif}
                  </div>
                  <div className="mt-1">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        getCompanyTypeColor(company.tipo)
                      )}
                    >
                      {getCompanyTypeLabel(company.tipo)}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}

          {availableCompanies.length === 0 && (
            <DropdownMenuItem disabled className="text-center py-6">
              No hay empresas disponibles
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogTrigger asChild>
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onSelect={(e) => e.preventDefault()}
              >
                <Settings className="h-4 w-4" />
                Ver Detalles y Permisos
              </DropdownMenuItem>
            </DialogTrigger>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de detalles */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Detalles de Empresa Actual
            </DialogTitle>
            <DialogDescription>
              Información detallada y permisos para {currentCompany.razonSocial}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información de la empresa */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información de la Empresa</h3>

              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Razón Social</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentCompany.razonSocial}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">RIF</Label>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    {currentCompany.rif}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tipo</Label>
                  <div className="mt-1">
                    <Badge className={getCompanyTypeColor(currentCompany.tipo)}>
                      {getCompanyTypeLabel(currentCompany.tipo)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Estado</Label>
                  <div className="mt-1">
                    <Badge variant={currentCompany.activa ? 'default' : 'destructive'}>
                      {currentCompany.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Permisos del usuario en esta empresa */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tus Permisos en esta Empresa</h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(userPermissions).map(([permission, hasAccess]) => {
                  const [module, action] = permission.split('_');
                  const actionLabel = action === 'read' ? 'Leer' : action === 'write' ? 'Escribir' : 'Eliminar';

                  return (
                    <div key={permission} className="flex items-center gap-2 p-2 border rounded">
                      <div className={cn(
                        'h-2 w-2 rounded-full',
                        hasAccess ? 'bg-green-500' : 'bg-gray-300'
                      )} />
                      <span className="text-xs">
                        <span className="font-medium capitalize">{module}</span>
                        <span className="text-muted-foreground"> - {actionLabel}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {Object.keys(userPermissions).length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No se han cargado los permisos específicos</p>
                </div>
              )}
            </div>

            {/* Lista de todas las empresas disponibles */}
            {availableCompanies.length > 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Otras Empresas Disponibles</h3>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableCompanies
                    .filter(company => company.id !== currentCompany.id)
                    .map((company) => {
                      const Icon = getCompanyIcon(company.tipo);
                      return (
                        <div
                          key={company.id}
                          className="flex items-center gap-3 p-2 border rounded hover:bg-accent cursor-pointer"
                          onClick={() => {
                            onCompanyChange(company.id);
                            setShowDetails(false);
                          }}
                        >
                          <Icon className={cn(
                            'h-4 w-4',
                            company.tipo === 'principal' ? 'text-blue-600' : 'text-green-600'
                          )} />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{company.razonSocial}</div>
                            <div className="text-xs text-muted-foreground">{company.rif}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Cambiar
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente simplificado para mostrar empresa actual
export function CurrentCompanyBadge({
  company,
  className,
}: {
  company: CompanyInfo | null;
  className?: string;
}) {
  if (!company) return null;

  const Icon = company.tipo === 'principal' ? Building2 : MapPin;

  return (
    <Badge
      variant="outline"
      className={cn('flex items-center gap-1 px-2 py-1', className)}
    >
      <Icon className="h-3 w-3" />
      <span className="truncate max-w-[120px]">
        {company.razonSocial}
      </span>
    </Badge>
  );
}

// Tipos auxiliares
function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export type { CompanyInfo, CompanySelectorProps };