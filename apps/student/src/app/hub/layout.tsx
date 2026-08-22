import { HubProviders } from '@/portal/components/HubProviders'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <HubProviders>{children}</HubProviders>
}
