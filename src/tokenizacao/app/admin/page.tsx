/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import { AdminUser } from '@/lib/types/admin'

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Dashboard Administrativo
        </h1>
        <p className="text-gray-600">
          Bem-vindo ao sistema de gestÃ£o da Net ImobiliÃ¡ria
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card de ImÃ³veis */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <span className="text-2xl">ðŸ </span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de ImÃ³veis</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>

        {/* Card de UsuÃ¡rios */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <span className="text-2xl">ðŸ‘¥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">UsuÃ¡rios Ativos</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>

        {/* Card de Proximidades */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <span className="text-2xl">ðŸ“</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Proximidades</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>

        {/* Card de Amenidades */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <span className="text-2xl">â­</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Amenidades</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">AÃ§Ãµes RÃ¡pidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <span className="mr-2">âž•</span>
            Novo ImÃ³vel
          </button>
          <button className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
            <span className="mr-2">ðŸ‘¤</span>
            Novo UsuÃ¡rio
          </button>
          <button className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
            <span className="mr-2">ðŸ“Š</span>
            RelatÃ³rios
          </button>
        </div>
      </div>
    </div>
  )
}







