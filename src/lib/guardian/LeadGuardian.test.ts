/**
 * LeadGuardian Unit Tests
 * 
 * Comprehensive test suite ensuring 100% coverage of business rules
 * defined in docs/REGRAS_DE_NEGOCIO_TRANSBORDO_LEADS.md
 */

// Use dynamic import for ES modules
async function runAllTests() {
    const { LeadGuardian } = await import('./LeadGuardian.js');

    type GuardianConfig = {
        proximos_corretores_recebem_leads: number;
        sla_minutos_aceite_lead: number;
        proximos_corretores_recebem_leads_internos: number;
        sla_minutos_aceite_lead_interno: number;
    };

    type AssignmentStatus = 'atribuido' | 'aceito' | 'expirado' | 'rejeitado';

    type Assignment = {
        id: number;
        prospect_id: number;
        corretor_fk: string;
        status: AssignmentStatus;
        motivo: any;
        expira_em: Date | null;
        data_aceite: Date | null;
        created_at: Date;
        updated_at: Date;
    };

    type AssignmentHistory = {
        corretor_fk: string;
        tipo_corretor: 'Externo' | 'Interno' | null;
        motivo_type: string;
        status: AssignmentStatus;
        created_at: Date;
    };

    type Prospect = {
        id: number;
        id_imovel: number;
        id_cliente: string;
        estado_fk: string;
        cidade_fk: string;
        corretor_fk?: string | null;
        created_at: Date;
    };

    type Broker = {
        id: string;
        nome: string;
        email: string;
        tipo_corretor: 'Externo' | 'Interno' | null;
        is_plantonista: boolean;
        ativo: boolean;
    };

    type BrokerTier = 'External' | 'Internal' | 'Plantonista';

    // Test configuration matching database defaults
    const TEST_CONFIG: GuardianConfig = {
        proximos_corretores_recebem_leads: 3,
        sla_minutos_aceite_lead: 5,
        proximos_corretores_recebem_leads_internos: 3,
        sla_minutos_aceite_lead_interno: 15
    };

    // Helper function to create test assignments
    function createAssignment(overrides: Partial<Assignment> = {}): Assignment {
        return {
            id: 1,
            prospect_id: 100,
            corretor_fk: 'broker-uuid-1',
            status: 'atribuido',
            motivo: { type: 'area_match' },
            expira_em: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
            data_aceite: null,
            created_at: new Date(),
            updated_at: new Date(),
            ...overrides
        };
    }

    // Helper function to create test brokers
    function createBroker(overrides: Partial<Broker> = {}): Broker {
        return {
            id: 'broker-uuid-1',
            nome: 'Test Broker',
            email: 'broker@test.com',
            tipo_corretor: 'Externo',
            is_plantonista: false,
            ativo: true,
            ...overrides
        };
    }

    // Helper function to create test prospects
    function createProspect(overrides: Partial<Prospect> = {}): Prospect {
        return {
            id: 100,
            id_imovel: 50,
            id_cliente: 'client-uuid-1',
            estado_fk: 'SP',
            cidade_fk: 'São Paulo',
            corretor_fk: null,
            created_at: new Date(),
            ...overrides
        };
    }

    // Test Suite
    console.log('🧪 Starting LeadGuardian Unit Tests...\n');
    let passed = 0;
    let failed = 0;

    function test(name: string, fn: () => void) {
        try {
            fn();
            console.log(`✅ PASS: ${name}`);
            passed++;
        } catch (error) {
            console.log(`❌ FAIL: ${name}`);
            console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
            failed++;
        }
    }

    function assert(condition: boolean, message: string) {
        if (!condition) {
            throw new Error(message);
        }
    }

    function assertEqual<T>(actual: T, expected: T, message?: string) {
        if (actual !== expected) {
            throw new Error(
                message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
            );
        }
    }

    const guardian = new LeadGuardian(TEST_CONFIG);

    // ============================================================================
    // TEST GROUP 1: shouldExpire() - SLA Expiration Logic
    // ============================================================================
    console.log('📋 Test Group 1: SLA Expiration Logic\n');

    test('Should NOT expire assignment with NULL expira_em (auto-accept)', () => {
        const assignment = createAssignment({ expira_em: null });
        const result = guardian.shouldExpire(assignment);
        assert(!result.shouldExpire, 'Assignment should not expire');
        assert(result.reason.includes('auto-accept') || result.reason.includes('NULL'), 'Reason should mention auto-accept');
    });

    test('Should NOT expire owner assignment (imovel_corretor_fk)', () => {
        const assignment = createAssignment({
            motivo: { type: 'imovel_corretor_fk' },
            expira_em: new Date(Date.now() - 1000) // Past date
        });
        const result = guardian.shouldExpire(assignment);
        assert(!result.shouldExpire, 'Owner assignment should never expire');
        assert(result.reason.includes('Owner') || result.reason.includes('imovel_corretor_fk'), 'Reason should mention owner');
    });

    test('Should expire assignment when expira_em is in the past', () => {
        const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
        const assignment = createAssignment({ expira_em: pastDate });
        const result = guardian.shouldExpire(assignment);
        assert(result.shouldExpire, 'Assignment should expire');
        assert(result.slaMinutes === 5, 'SLA should be 5 minutes for external');
    });

    test('Should NOT expire assignment when expira_em is in the future', () => {
        const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        const assignment = createAssignment({ expira_em: futureDate });
        const result = guardian.shouldExpire(assignment);
        assert(!result.shouldExpire, 'Assignment should not expire yet');
    });

    test('Should use correct SLA for Internal broker', () => {
        const assignment = createAssignment({
            motivo: { type: 'area_match_internal' },
            expira_em: new Date(Date.now() - 1000)
        });
        const result = guardian.shouldExpire(assignment);
        assert(result.slaMinutes === 15, 'SLA should be 15 minutes for internal');
    });

    // ============================================================================
    // TEST GROUP 2: getNextTier() - Tier Transition Logic
    // ============================================================================
    console.log('\n📋 Test Group 2: Tier Transition Logic\n');

    test('Should return External tier when no attempts made', () => {
        const history: AssignmentHistory[] = [];
        const decision = guardian.getNextTier(history);
        assertEqual(decision.tier, 'External', 'First attempt should be External');
        assert(decision.externalAttempts === 0, 'Should have 0 external attempts');
    });

    test('Should continue External tier until limit reached', () => {
        const history: AssignmentHistory[] = [
            {
                corretor_fk: 'broker-1',
                tipo_corretor: 'Externo',
                motivo_type: 'area_match',
                status: 'expirado',
                created_at: new Date()
            },
            {
                corretor_fk: 'broker-2',
                tipo_corretor: 'Externo',
                motivo_type: 'area_match',
                status: 'expirado',
                created_at: new Date()
            }
        ];
        const decision = guardian.getNextTier(history);
        assertEqual(decision.tier, 'External', 'Should still be External (2/3)');
        assert(decision.externalAttempts === 2, 'Should have 2 external attempts');
    });

    test('Should transition to Internal tier after External limit reached', () => {
        const history: AssignmentHistory[] = [
            {
                corretor_fk: 'broker-1',
                tipo_corretor: 'Externo',
                motivo_type: 'area_match',
                status: 'expirado',
                created_at: new Date()
            },
            {
                corretor_fk: 'broker-2',
                tipo_corretor: 'Externo',
                motivo_type: 'area_match',
                status: 'expirado',
                created_at: new Date()
            },
            {
                corretor_fk: 'broker-3',
                tipo_corretor: 'Externo',
                motivo_type: 'area_match',
                status: 'expirado',
                created_at: new Date()
            }
        ];
        const decision = guardian.getNextTier(history);
        assertEqual(decision.tier, 'Internal', 'Should transition to Internal after 3 external');
        assert(decision.externalAttempts === 3, 'Should have 3 external attempts');
        assert(decision.internalAttempts === 0, 'Should have 0 internal attempts');
    });

    test('Should transition to Plantonista after all limits exhausted', () => {
        const history: AssignmentHistory[] = [
            // 3 External attempts
            { corretor_fk: 'ext-1', tipo_corretor: 'Externo', motivo_type: 'area_match', status: 'expirado', created_at: new Date() },
            { corretor_fk: 'ext-2', tipo_corretor: 'Externo', motivo_type: 'area_match', status: 'expirado', created_at: new Date() },
            { corretor_fk: 'ext-3', tipo_corretor: 'Externo', motivo_type: 'area_match', status: 'expirado', created_at: new Date() },
            // 3 Internal attempts
            { corretor_fk: 'int-1', tipo_corretor: 'Interno', motivo_type: 'area_match_internal', status: 'expirado', created_at: new Date() },
            { corretor_fk: 'int-2', tipo_corretor: 'Interno', motivo_type: 'area_match_internal', status: 'expirado', created_at: new Date() },
            { corretor_fk: 'int-3', tipo_corretor: 'Interno', motivo_type: 'area_match_internal', status: 'expirado', created_at: new Date() }
        ];
        const decision = guardian.getNextTier(history);
        assertEqual(decision.tier, 'Plantonista', 'Should fallback to Plantonista');
        assert(decision.externalAttempts === 3, 'Should have 3 external attempts');
        assert(decision.internalAttempts === 3, 'Should have 3 internal attempts');
    });

    // ============================================================================
    // TEST GROUP 3: validateAssignment() - Assignment Validation
    // ============================================================================
    console.log('\n📋 Test Group 3: Assignment Validation\n');

    test('Should validate assignment for active broker', () => {
        const prospect = createProspect();
        const broker = createBroker({ ativo: true });
        const history: AssignmentHistory[] = [];
        const result = guardian.validateAssignment(prospect, broker, history);
        assert(result.valid, 'Should be valid for active broker');
    });

    test('Should reject assignment for inactive broker', () => {
        const prospect = createProspect();
        const broker = createBroker({ ativo: false });
        const history: AssignmentHistory[] = [];
        const result = guardian.validateAssignment(prospect, broker, history);
        assert(!result.valid, 'Should be invalid for inactive broker');
        assert(result.reason.includes('not active'), 'Reason should mention inactive');
    });

    test('Should reject assignment if broker already received lead', () => {
        const prospect = createProspect();
        const broker = createBroker({ id: 'broker-1' });
        const history: AssignmentHistory[] = [
            { corretor_fk: 'broker-1', tipo_corretor: 'Externo', motivo_type: 'area_match', status: 'expirado', created_at: new Date() }
        ];
        const result = guardian.validateAssignment(prospect, broker, history);
        assert(!result.valid, 'Should be invalid if already assigned');
        assert(result.reason.includes('already received'), 'Reason should mention duplicate');
    });

    // ============================================================================
    // TEST GROUP 4: calculateExpirationTime() - Expiration Calculation
    // ============================================================================
    console.log('\n📋 Test Group 4: Expiration Time Calculation\n');

    test('Should return NULL for owner assignment', () => {
        const result = guardian.calculateExpirationTime('External', true);
        assert(result === null, 'Owner assignment should have NULL expiration');
    });

    test('Should return NULL for Plantonista assignment', () => {
        const result = guardian.calculateExpirationTime('Plantonista', false);
        assert(result === null, 'Plantonista assignment should have NULL expiration');
    });

    test('Should calculate correct expiration for External broker', () => {
        const before = Date.now();
        const result = guardian.calculateExpirationTime('External', false);
        const after = Date.now();

        assert(result !== null, 'Should have expiration time');
        const expirationTime = result!.getTime();
        const expectedMin = before + (5 * 60 * 1000); // 5 minutes
        const expectedMax = after + (5 * 60 * 1000);

        assert(expirationTime >= expectedMin && expirationTime <= expectedMax,
            'Expiration should be ~5 minutes from now');
    });

    // ============================================================================
    // TEST GROUP 5: determineAssignmentStatus() - Status Determination
    // ============================================================================
    console.log('\n📋 Test Group 5: Assignment Status Determination\n');

    test('Should return "aceito" for owner assignment', () => {
        const status = guardian.determineAssignmentStatus('External', true);
        assertEqual(status, 'aceito', 'Owner assignment should be auto-accepted');
    });

    test('Should return "aceito" for Plantonista assignment', () => {
        const status = guardian.determineAssignmentStatus('Plantonista', false);
        assertEqual(status, 'aceito', 'Plantonista assignment should be auto-accepted');
    });

    test('Should return "atribuido" for External broker', () => {
        const status = guardian.determineAssignmentStatus('External', false);
        assertEqual(status, 'atribuido', 'External assignment should require acceptance');
    });

    // ============================================================================
    // TEST SUMMARY
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total:  ${passed + failed}`);
    console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (failed === 0) {
        console.log('\n🎉 All tests passed! Guardian Rules are working correctly.\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Please review the failures above.\n');
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(err => {
    console.error('Fatal error running tests:', err);
    process.exit(1);
});
