import { ClientProviders } from "./client-wrapper";


interface ProvidersProps {
  children: React.ReactNode;
}

function Providers({ children }: ProvidersProps) {
  
  return <ClientProviders>{children}</ClientProviders>;
}

export default Providers;