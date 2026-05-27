'use client'

import { MasterProvisioningHub } from '@/components/admin/MasterProvisioning/MasterProvisioningHub'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { SparklesIcon } from '@heroicons/react/24/outline'

export default function MasterProvisioningPage() {
  return (
    /* <PermissionGuard resource="master-provisioning-hub" action="ADMIN"> */
      <div className="p-8 space-y-8">
        {/* Header Master */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
              Hub de Provisionamento Master
              <SparklesIcon className="h-6 w-6 ml-3 text-blue-500 animate-pulse" />
            </h1>
            <p className="text-gray-400 font-medium mt-1">Gestão centralizada de atuacão, contratos e ativos funcionais</p>
          </div>
          
          <div className="flex space-x-3">
             <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100 italic">
                Iron Hierarchy Active
             </div>
          </div>
        </div>

        {/* Hub UI */}
        <MasterProvisioningHub />
      </div>
    /* </PermissionGuard> */
  )
}
