-- Registra qual e-mail foi de fato usado para convidar o cliente (attendee no Google
-- Calendar + destinatário do e-mail de confirmação) em cada agendamento — nunca confundir
-- com google_event_id_usuario/empresa (esses são o evento em si; este é o alvo do convite).
-- NULL = nenhum convite foi enviado ao cliente nesse agendamento (sem e-mail disponível, ou
-- o atendente optou por não convidar).
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS email_convite_destino VARCHAR(255);
