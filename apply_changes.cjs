const fs = require('fs');
const path = 'src/pages/quotations.tsx';
const nl = '\r\n';
let content = fs.readFileSync(path, 'latin1');

function join(lines) {
  return lines.join(nl);
}

function replaceBlock(oldLines, newLines) {
  const oldBlock = join(oldLines);
  if (!content.includes(oldBlock)) {
    throw new Error('Block not found: ' + oldLines[0]);
  }
  const newBlock = join(newLines);
  content = content.replace(oldBlock, newBlock);
}

function replaceLine(oldLine, newLine) {
  if (!content.includes(oldLine)) {
    throw new Error('Line not found: ' + oldLine);
  }
  content = content.replace(oldLine, newLine);
}

// Insert buildDefaultSearchState and update helpers
replaceBlock([
  '  // Funciones para búsqueda de productos',
  '  const getSearchState = (itemId: string) => {',
  "    return searchStates[itemId] || { isOpen: false, searchTerm: '' };",
  '  };',
  '',
  '  const updateSearchState = (itemId: string, updates: Partial<{isOpen: boolean; searchTerm: string}>) => {',
  '    setSearchStates(prev => ({',
  '      ...prev,',
  '      [itemId]: { ...getSearchState(itemId), ...updates }',
  '    }));',
  '  };'
], [
  '  // Funciones para búsqueda de productos',
  '  const buildDefaultSearchState = (itemId: string) => {',
  '    const item = quotationItems.find(q => q.id === itemId);',
  '    if (item?.item_id) {',
  '      const product = items.find(p => p.id === item.item_id);',
  '      if (product) {',
  '        return {',
  '          isOpen: false,',
  '          searchTerm: ${product.codigo} - ',
  '        };',
  '      }',
  '      if (item.descripcion) {',
  '        return { isOpen: false, searchTerm: item.descripcion };',
  '      }',
  '    }',
  "    return { isOpen: false, searchTerm: '' };",
  '  };',
  '',
  '  const getSearchState = (itemId: string) => {',
  '    return searchStates[itemId] || buildDefaultSearchState(itemId);',
  '  };',
  '',
  '  const updateSearchState = (itemId: string, updates: Partial<{isOpen: boolean; searchTerm: string}>) => {',
  '    setSearchStates(prev => {',
  '      const baseState = prev[itemId] || buildDefaultSearchState(itemId);',
  '      const merged = { ...baseState, ...updates };',
  "      if (!merged.isOpen && merged.searchTerm === '') {",
  '        const { [itemId]: _removed, ...rest } = prev;',
  '        return rest;',
  '      }',
  '      return {',
  '        ...prev,',
  '        [itemId]: merged',
  '      };',
  '    });',
  '  };'
]);

// Update selectProduct closing behaviour
replaceLine(
  "    updateSearchState(quotationItems[itemIndex].id, { isOpen: false, searchTerm: '' });",
  '    updateSearchState(quotationItems[itemIndex].id, { isOpen: false, searchTerm: ${product.codigo} -  });'
);
replaceLine(
  '    // Cerrar búsqueda',
  '    // Cerrar búsqueda mostrando el item seleccionado'
);

// Update search input focus handler
replaceLine(
  '                        onFocus={() => updateSearchState(item.id, { isOpen: true })}',
  '                        onFocus={(event) => { updateSearchState(item.id, { isOpen: true }); event.target.select(); }}'
);

// Update Cantidades y Precios block
replaceBlock([
  '                {/* Cantidades y Precios */}',
  '                <div className="bg-gray-50 p-4 rounded-lg border">',
  '                  <Label className="text-sm font-semibold text-gray-700 mb-4 block">Cantidades y Precios</Label>',
  '                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">',
  '                    <div className="space-y-3">',
  '                      <Label className="text-sm font-semibold text-gray-700">Cantidad</Label>',
  '                      <Input',
  '                        type="number"',
  '                        min="1"',
  '                        step="0.01"',
  '                        value={item.cantidad}',
  "                        onChange={(e) => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}",
  '                        className="text-center h-11"',
  '                      />',
  '                    </div>',
  '',
  '                    <div className="space-y-3">',
  '                      <Label className="text-sm font-semibold text-gray-700">Precio Unitario</Label>',
  '                      <Input',
  '                        type="number"',
  '                        min="0"',
  '                        step="0.01"',
  '                        value={item.precio_unitario}',
  "                        onChange={(e) => updateItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}",
  '                        className="text-right h-11"',
  '                      />',
  '                    </div>',
  '',
  '                    <div className="space-y-3">',
  '                      <Label className="text-sm font-semibold text-gray-700">Descuento %</Label>',
  '                      <Input',
  '                        type="number"',
  '                        min="0"',
  '                        max="100"',
  '                        step="0.01"',
  '                        value={item.descuento}',
  "                        onChange={(e) => updateItem(index, 'descuento', parseFloat(e.target.value) || 0)}",
  '                        className="text-center h-11"',
  '                      />',
  '                    </div>',
  '',
  '                    <div className="space-y-3">',
  '                      <Label className="text-sm font-semibold text-gray-700">Total</Label>',
  '                      <Input',
  '                        value={formatVES(item.total)}',
  '                        readOnly',
  '                        className="bg-green-50 border-green-200 text-green-800 font-semibold text-right h-11"',
  '                      />',
  '                    </div>',
  '                  </div>',
  '                </div>'
], [
  '                {/* Cantidades y Precios */}',
  '                <div className="bg-gray-50 p-6 rounded-xl border shadow-sm">',
  '                  <Label className="text-lg font-semibold text-gray-800 mb-5 block">Cantidades y Precios</Label>',
  '                  <div className="grid grid-cols-1 gap-6">',
  '                    <div className="flex flex-col gap-2">',
  '                      <span className="text-sm font-semibold text-gray-600">Cantidad</span>',
  '                      <Input',
  '                        type="number"',
  '                        min="1"',
  '                        step="0.01"',
  '                        value={item.cantidad}',
  "                        onChange={(e) => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}",
  '                        className="h-12 text-lg font-semibold text-center px-5 tabular-nums tracking-wide"',
  '                      />',
  '                    </div>',
  '',
  '                    <div className="flex flex-col gap-2">',
  '                      <span className="text-sm font-semibold text-gray-600">Precio Unitario</span>',
  '                      <Input',
  '                        type="text"',
  '                        inputMode="decimal"',
  '                        value={formatVES(item.precio_unitario || 0)}',
  '                        readOnly',
  '                        className="h-12 text-lg font-semibold text-right px-6 tabular-nums tracking-wide bg-white"',
  '                      />',
  '                    </div>',
  '',
  '                    <div className="flex flex-col gap-2">',
  '                      <span className="text-sm font-semibold text-gray-600">Descuento %</span>',
  '                      <Input',
  '                        type="number"',
  '                        min="0"',
  '                        max="100"',
  '                        step="0.01"',
  '                        value={item.descuento}',
  "                        onChange={(e) => updateItem(index, 'descuento', parseFloat(e.target.value) || 0)}",
  '                        className="h-12 text-lg font-semibold text-center px-5 tabular-nums tracking-wide"',
  '                      />',
  '                    </div>',
  '',
  '                    <div className="flex flex-col gap-2">',
  '                      <span className="text-sm font-semibold text-gray-600">Total</span>',
  '                      <Input',
  '                        value={formatVES(item.total)}',
  '                        readOnly',
  '                        className="h-12 text-lg font-semibold text-right bg-green-50 border-green-200 text-green-800 px-6 tabular-nums tracking-wide"',
  '                      />',
  '                    </div>',
  '                  </div>',
  '                </div>'
]);

fs.writeFileSync(path, content, 'latin1');
