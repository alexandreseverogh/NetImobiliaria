-- Migration 2026-06-24: Adiciona numero_whatsapp à tabela tenants.
-- Campo direto no tenant para o número do admin que recebe alertas do agente.
-- Precede e eventualmente substitui WhatsAppConfig.phoneNumber (que continua como fallback).

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS numero_whatsapp VARCHAR(20) NULL;

COMMENT ON COLUMN public.tenants.numero_whatsapp IS
  'Número WhatsApp do administrador do tenant para receber alertas do agente. '
  'Formato: DDI+DDD+número sem espaços (ex: 5581999999999). '
  'Se preenchido, tem prioridade sobre WhatsAppConfig.phoneNumber.';
