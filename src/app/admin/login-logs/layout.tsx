'use client';

import LogsTabsWrapper from '@/components/admin/LogsTabsWrapper';

export default function LoginLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LogsTabsWrapper>{children}</LogsTabsWrapper>;
}
