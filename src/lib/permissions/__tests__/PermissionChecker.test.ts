/**
 * ============================================================
 * TESTES: PermissionChecker
 * ============================================================
 */

import { checkUserPermission, getUserPermissionsMap, hasPermissionSync } from '../PermissionChecker'
import type { UserPermissionsMap } from '../PermissionTypes'

describe('PermissionChecker', () => {
  // User IDs de teste (devem existir no banco)
  const SUPER_ADMIN_ID = '4d456e42-4031-46ba-9b5c-912bec1d28b5' // Ajustar conforme seu banco
  const CORRETOR_ID = '4d456e42-4031-46ba-9b5c-912bec1d28b5' // Ajustar conforme seu banco
  
  describe('checkUserPermission', () => {
    test('Super Admin deve ter permissão READ em qualquer funcionalidade', async () => {
      const result = await checkUserPermission(SUPER_ADMIN_ID, 'clientes', 'READ')
      expect(result).toBe(true)
    })
    
    test('Super Admin deve ter permissão WRITE em qualquer funcionalidade', async () => {
      const result = await checkUserPermission(SUPER_ADMIN_ID, 'imoveis', 'WRITE')
      expect(result).toBe(true)
    })
    
    test('Super Admin deve ter permissão DELETE em qualquer funcionalidade', async () => {
      const result = await checkUserPermission(SUPER_ADMIN_ID, 'usuarios', 'DELETE')
      expect(result).toBe(true)
    })
    
    test('Usuário sem permissão deve retornar false', async () => {
      const result = await checkUserPermission('user-invalido', 'usuarios', 'ADMIN')
      expect(result).toBe(false)
    })
    
    test('Feature inexistente deve retornar false', async () => {
      const result = await checkUserPermission(SUPER_ADMIN_ID, 'feature-inexistente', 'READ')
      expect(result).toBe(false)
    })
  })
  
  describe('getUserPermissionsMap', () => {
    test('Super Admin deve ter mapa completo de permissões', async () => {
      const map = await getUserPermissionsMap(SUPER_ADMIN_ID)
      
      expect(map).toBeDefined()
      expect(Object.keys(map).length).toBeGreaterThan(0)
      expect(map['clientes']).toBeDefined()
    })
    
    test('Usuário sem permissões deve retornar mapa vazio', async () => {
      const map = await getUserPermissionsMap('user-sem-permissions')
      expect(map).toEqual({})
    })
  })
  
  describe('hasPermissionSync', () => {
    test('Deve permitir READ quando usuário tem WRITE', () => {
      const map: UserPermissionsMap = { imoveis: 'WRITE' }
      const result = hasPermissionSync(map, 'imoveis', 'READ')
      expect(result).toBe(true)
    })
    
    test('Não deve permitir WRITE quando usuário tem apenas READ', () => {
      const map: UserPermissionsMap = { imoveis: 'READ' }
      const result = hasPermissionSync(map, 'imoveis', 'WRITE')
      expect(result).toBe(false)
    })
    
    test('Não deve permitir acesso a feature sem permissão', () => {
      const map: UserPermissionsMap = { imoveis: 'READ' }
      const result = hasPermissionSync(map, 'usuarios', 'READ')
      expect(result).toBe(false)
    })
  })
})



