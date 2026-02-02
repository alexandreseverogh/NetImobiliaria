/**
 * Guardian Module - Lead Routing Business Rules Enforcement
 * 
 * This module provides centralized, strict enforcement of lead routing rules.
 * All lead routing decisions MUST go through the LeadGuardian class.
 */

export { LeadGuardian, default } from './LeadGuardian';
export type {
    GuardianConfig,
    Assignment,
    AssignmentHistory,
    AssignmentMotivo,
    AssignmentStatus,
    Prospect,
    Broker,
    BrokerTier,
    TierDecision,
    ExpirationResult,
    RoutingDecision
} from './types';
