/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

interface PermissoesEditorProps {
  permissions: Record<string, string>;
  onChange: (permissions: Record<string, string>) => void;
  disabled?: boolean;
}

interface SystemFeature {
  id: number;
  name: string;
  description: string;
  category: string;
}

const DEFAULT_FEATURES: SystemFeature[] = [
  { id: 1, name: 'ImÃ³veis', description: 'GestÃ£o de propriedades', category: 'imoveis' },
  { id: 2, name: 'Proximidades', description: 'Pontos de interesse prÃ³ximos', category: 'proximidades' },
  { id: 3, name: 'Amenidades', description: 'Comodidades e facilidades', category: 'amenidades' },
  { id: 4, name: 'Categorias de Amenidades', description: 'ClassificaÃ§Ã£o de comodidades', category: 'categorias-amenidades' },
  { id: 5, name: 'Categorias de Proximidades', description: 'ClassificaÃ§Ã£o de proximidades', category: 'categorias-proximidades' },
  { id: 6, name: 'UsuÃ¡rios', description: 'GestÃ£o de usuÃ¡rios do sistema', category: 'usuarios' },
  { id: 7, name: 'RelatÃ³rios', description: 'GeraÃ§Ã£o de relatÃ³rios', category: 'relatorios' },
  { id: 8, name: 'Sistema', description: 'ConfiguraÃ§Ãµes do sistema', category: 'sistema' },
];

const PERMISSION_LEVELS = [
  { value: 'NONE', label: 'Nenhum', color: 'bg-gray-100 text-gray-600' },
  { value: 'READ', label: 'Leitura', color: 'bg-blue-100 text-blue-700' },
  { value: 'WRITE', label: 'Escrita', color: 'bg-green-100 text-green-700' },
  { value: 'DELETE', label: 'ExclusÃ£o', color: 'bg-red-100 text-red-700' },
];

export default function PermissoesEditor({ permissions, onChange, disabled = false }: PermissoesEditorProps) {
  const [localPermissions, setLocalPermissions] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize with default permissions if none provided
    const initialPermissions: Record<string, string> = {};
    DEFAULT_FEATURES.forEach(feature => {
      initialPermissions[feature.category] = permissions[feature.category] || 'NONE';
    });
    setLocalPermissions(initialPermissions);
  }, [permissions]);

  const handlePermissionChange = (category: string, permission: string) => {
    const newPermissions = {
      ...localPermissions,
      [category]: permission
    };
    setLocalPermissions(newPermissions);
    onChange(newPermissions);
  };

  const getPermissionColor = (permission: string) => {
    const level = PERMISSION_LEVELS.find(p => p.value === permission);
    return level ? level.color : 'bg-gray-100 text-gray-600';
  };

  const getPermissionLabel = (permission: string) => {
    const level = PERMISSION_LEVELS.find(p => p.value === permission);
    return level ? level.label : 'Nenhum';
  };

  const getPermissionDescription = (permission: string) => {
    switch (permission) {
      case 'NONE':
        return 'Sem acesso a esta funcionalidade';
      case 'READ':
        return 'Pode visualizar, mas nÃ£o modificar';
      case 'WRITE':
        return 'Pode visualizar, criar e modificar';
      case 'DELETE':
        return 'Acesso total (incluindo exclusÃ£o)';
      default:
        return 'PermissÃ£o nÃ£o definida';
    }
  };

  return (
    <div className="space-y-6">
      {/* Permission Levels Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-gray-700 mb-3">NÃ­veis de PermissÃ£o:</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PERMISSION_LEVELS.map((level) => (
            <div key={level.value} className="flex items-center space-x-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${level.color}`}>
                {level.label}
              </div>
              <span className="text-xs text-gray-500">
                {getPermissionDescription(level.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {DEFAULT_FEATURES.map((feature) => (
          <div key={feature.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-900 mb-1">
                {feature.name}
              </h4>
              <p className="text-sm text-gray-600">
                {feature.description}
              </p>
            </div>

            {/* Current Permission Display */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">PermissÃ£o atual:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPermissionColor(localPermissions[feature.category])}`}>
                  {getPermissionLabel(localPermissions[feature.category])}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {getPermissionDescription(localPermissions[feature.category])}
              </p>
            </div>

            {/* Permission Selection */}
            <div className="space-y-2">
              {PERMISSION_LEVELS.map((level) => (
                <label key={level.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`permission-${feature.category}`}
                    value={level.value}
                    checked={localPermissions[feature.category] === level.value}
                    onChange={(e) => handlePermissionChange(feature.category, e.target.value)}
                    disabled={disabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="flex items-center space-x-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${level.color}`}>
                      {level.label}
                    </div>
                    <span className="text-sm text-gray-700">
                      {getPermissionDescription(level.value)}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="text-sm font-medium text-blue-800 mb-2">Resumo das PermissÃµes:</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {PERMISSION_LEVELS.map((level) => {
            const count = Object.values(localPermissions).filter(p => p === level.value).length;
            return (
              <div key={level.value} className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full font-medium ${level.color}`}>
                  {level.label}
                </span>
                <span className="text-blue-700 font-medium">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}









