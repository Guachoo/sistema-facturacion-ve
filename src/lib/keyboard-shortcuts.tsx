import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if no input is focused and no modifiers except specified ones
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' || 
                            activeElement?.contentEditable === 'true';

      if (isInputFocused) return;

      // Nueva factura: N
      if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        navigate('/facturas/nueva');
      }

      // Dashboard: D
      if (event.key.toLowerCase() === 'd' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        navigate('/dashboard');
      }

      // Clientes: C
      if (event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        navigate('/clientes');
      }

      // Facturas: F
      if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        navigate('/facturas');
      }

      // Items/Productos: I
      if (event.key.toLowerCase() === 'i' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        navigate('/items');
      }

      // Reportes: R
      if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        navigate('/reportes/libro-ventas');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
};

export const KeyboardShortcutsHelp = () => {
  return (
    <div className="space-y-2 text-sm">
      <h4 className="font-medium">Atajos de Teclado</h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <kbd className="kbd">N</kbd>
          <span>Nueva Factura</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="kbd">D</kbd>
          <span>Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="kbd">C</kbd>
          <span>Clientes</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="kbd">F</kbd>
          <span>Facturas</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="kbd">I</kbd>
          <span>Items</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="kbd">R</kbd>
          <span>Reportes</span>
        </div>
      </div>
    </div>
  );
};