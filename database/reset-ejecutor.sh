#!/bin/bash
# =====================================================
# SCRIPT EJECUTOR - RESET AMBIENTE DE PRUEBAS
# =====================================================
# Coordina todo el proceso de reset de forma segura
# =====================================================

# Configuración
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-facturacion_test}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para verificar prerequisitos
check_prerequisites() {
    log "Verificando prerequisitos..."

    # Verificar que psql está disponible
    if ! command -v psql &> /dev/null; then
        error "psql no está disponible. Instalar PostgreSQL client."
        exit 1
    fi

    # Verificar archivos necesarios
    required_files=(
        "$SCRIPT_DIR/backup-before-reset.sql"
        "$SCRIPT_DIR/reset-test-environment.sql"
        "$SCRIPT_DIR/CHECKLIST-RESET-AMBIENTE-PRUEBAS.md"
    )

    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Archivo requerido no encontrado: $file"
            exit 1
        fi
    done

    log "Prerequisitos verificados ✅"
}

# Función para confirmar ambiente
confirm_environment() {
    echo ""
    echo -e "${RED}⚠️  ADVERTENCIA CRÍTICA ⚠️${NC}"
    echo "Este script eliminará TODOS los datos operacionales:"
    echo "- Facturas, clientes, productos/servicios"
    echo "- Números de control y numeraciones"
    echo "- Cualquier dato de facturación existente"
    echo ""
    echo "Base de datos objetivo: $DB_NAME"
    echo "Host: $DB_HOST"
    echo "Usuario: $DB_USER"
    echo ""

    # Verificar nombre de BD
    if [[ ! "$DB_NAME" =~ (test|prueba|dev|desarrollo) ]]; then
        warning "El nombre de la BD no parece ser de pruebas: $DB_NAME"
        echo "¿Está seguro que es un ambiente de pruebas? [y/N]"
        read -r confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            error "Reset cancelado por seguridad"
            exit 1
        fi
    fi

    echo "¿Está completamente seguro de continuar? (escriba 'CONFIRMO')"
    read -r confirmation
    if [[ "$confirmation" != "CONFIRMO" ]]; then
        log "Reset cancelado por el usuario"
        exit 0
    fi
}

# Función para probar conexión
test_connection() {
    log "Probando conexión a la base de datos..."
    if ! psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
        error "No se pudo conectar a la base de datos"
        echo "Verifique:"
        echo "- Host: $DB_HOST"
        echo "- Usuario: $DB_USER"
        echo "- Base de datos: $DB_NAME"
        echo "- Credenciales y permisos"
        exit 1
    fi
    log "Conexión exitosa ✅"
}

# Función para ejecutar backup
run_backup() {
    log "Iniciando backup de configuraciones..."

    backup_file="$SCRIPT_DIR/backup-before-reset.sql"
    backup_log="$SCRIPT_DIR/logs/backup_${TIMESTAMP}.log"

    # Crear directorio de logs
    mkdir -p "$SCRIPT_DIR/logs"

    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$backup_file" > "$backup_log" 2>&1; then
        log "Backup completado ✅"
        log "Log: $backup_log"

        # Verificar que el backup tiene datos
        backup_check=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM backup_temp_reset.users_backup;" 2>/dev/null | tr -d ' ')
        if [[ "$backup_check" -gt 0 ]]; then
            log "Backup verificado: $backup_check usuarios respaldados ✅"
        else
            warning "Backup parece estar vacío. Revisar logs."
        fi
    else
        error "Error en backup. Ver log: $backup_log"
        exit 1
    fi
}

# Función para ejecutar reset
run_reset() {
    log "Iniciando reset del ambiente..."

    reset_file="$SCRIPT_DIR/reset-test-environment.sql"
    reset_log="$SCRIPT_DIR/logs/reset_${TIMESTAMP}.log"

    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$reset_file" > "$reset_log" 2>&1; then
        log "Reset completado ✅"
        log "Log: $reset_log"

        # Verificar que el reset fue exitoso
        invoice_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM invoices;" 2>/dev/null | tr -d ' ')
        if [[ "$invoice_count" -eq 0 ]]; then
            log "Reset verificado: facturas eliminadas ✅"
        else
            warning "Reset incompleto: aún existen $invoice_count facturas"
        fi
    else
        error "Error en reset. Ver log: $reset_log"
        exit 1
    fi
}

# Función para validación post-reset
validate_reset() {
    log "Ejecutando validaciones post-reset..."

    validation_log="$SCRIPT_DIR/logs/validation_${TIMESTAMP}.log"

    # Script de validación
    validation_sql="
    SELECT 'Facturas' as tabla, COUNT(*) as registros FROM invoices
    UNION ALL
    SELECT 'Clientes' as tabla, COUNT(*) as registros FROM customers
    UNION ALL
    SELECT 'Items' as tabla, COUNT(*) as registros FROM items
    UNION ALL
    SELECT 'Usuarios' as tabla, COUNT(*) as registros FROM users
    UNION ALL
    SELECT 'Configuracion' as tabla, COUNT(*) as registros FROM company_settings;
    "

    echo "=== VALIDACIÓN POST-RESET ===" > "$validation_log"
    echo "Timestamp: $(date)" >> "$validation_log"
    echo "" >> "$validation_log"

    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "$validation_sql" >> "$validation_log" 2>&1

    # Mostrar resumen
    echo ""
    log "=== RESUMEN FINAL ==="
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "$validation_sql"

    log "Validaciones completadas. Ver: $validation_log"
}

# Función para generar reporte
generate_report() {
    local report_file="$SCRIPT_DIR/logs/reset_report_${TIMESTAMP}.md"

    cat > "$report_file" << EOF
# Reporte de Reset - Ambiente de Pruebas

**Fecha/Hora:** $(date)
**Ejecutado por:** $USER
**Base de datos:** $DB_NAME
**Host:** $DB_HOST

## Archivos generados:
- Backup log: logs/backup_${TIMESTAMP}.log
- Reset log: logs/reset_${TIMESTAMP}.log
- Validation log: logs/validation_${TIMESTAMP}.log

## Estado final:
$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 'Facturas: ' || COUNT(*) FROM invoices
UNION ALL
SELECT 'Clientes: ' || COUNT(*) FROM customers
UNION ALL
SELECT 'Items: ' || COUNT(*) FROM items
UNION ALL
SELECT 'Usuarios: ' || COUNT(*) FROM users;
" -t)

## Reset completado: ✅ SÍ

EOF

    log "Reporte generado: $report_file"
}

# Función principal
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "    RESET AMBIENTE DE PRUEBAS - FACTURACIÓN"
    echo "=================================================="
    echo -e "${NC}"

    check_prerequisites
    confirm_environment
    test_connection

    echo ""
    log "Iniciando proceso de reset..."

    # Ejecutar pasos
    run_backup
    run_reset
    validate_reset
    generate_report

    echo ""
    echo -e "${GREEN}=================================================="
    echo "           RESET COMPLETADO EXITOSAMENTE"
    echo "==================================================${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Revisar el checklist: CHECKLIST-RESET-AMBIENTE-PRUEBAS.md"
    echo "2. Ejecutar pruebas funcionales básicas"
    echo "3. Notificar al equipo que el ambiente está listo"
    echo ""
    echo "Logs generados en: $SCRIPT_DIR/logs/"
    echo ""
}

# Verificar argumentos
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Uso: $0"
    echo ""
    echo "Variables de ambiente:"
    echo "  DB_HOST     - Host de PostgreSQL (default: localhost)"
    echo "  DB_USER     - Usuario de PostgreSQL (default: postgres)"
    echo "  DB_NAME     - Nombre de la BD (default: facturacion_test)"
    echo ""
    echo "Ejemplo:"
    echo "  export DB_HOST=localhost"
    echo "  export DB_USER=postgres"
    echo "  export DB_NAME=facturacion_test"
    echo "  $0"
    exit 0
fi

# Ejecutar función principal
main