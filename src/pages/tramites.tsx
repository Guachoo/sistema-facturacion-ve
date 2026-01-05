import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Anchor, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';

export function TramitesPage() {
  const [search, setSearch] = useState('');

  // Datos de ejemplo - luego conectarás con la base de datos
  const tramites = [
    {
      id: '1',
      numero: 'TR-2024-001',
      tipo: 'Importación',
      cliente: 'Comercial Los Andes C.A.',
      estado: 'En Proceso',
      fechaCreacion: '2024-01-15',
      descripcion: 'Importación de maquinaria pesada',
    },
    {
      id: '2',
      numero: 'TR-2024-002',
      tipo: 'Exportación',
      cliente: 'Industrias Nacional S.A.',
      estado: 'Completado',
      fechaCreacion: '2024-01-10',
      descripcion: 'Exportación de productos químicos',
    },
  ];

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'En Proceso':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="mr-1 h-3 w-3" />En Proceso</Badge>;
      case 'Completado':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" />Completado</Badge>;
      case 'Cancelado':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="mr-1 h-3 w-3" />Cancelado</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Anchor className="h-8 w-8 text-blue-600" />
            Gestión de Trámites
          </h1>
          <p className="text-muted-foreground">
            Administra y controla todos los trámites internos
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Trámite
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Trámites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trámites</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tramites List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Trámites</CardTitle>
          <CardDescription>
            Todos los trámites registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tramites.map((tramite) => (
              <Card key={tramite.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{tramite.numero}</h3>
                        {getEstadoBadge(tramite.estado)}
                      </div>
                      <p className="text-sm text-muted-foreground">{tramite.descripcion}</p>
                      <div className="flex gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {tramite.tipo}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {tramite.fechaCreacion}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{tramite.cliente}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
