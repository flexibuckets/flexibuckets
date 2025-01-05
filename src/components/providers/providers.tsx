import { PlanConfig } from "@/config/dodo";
import { ClientProviders } from "./client-wrapper";


interface ProvidersProps {
  children: React.ReactNode;
  subscriptionPlan: PlanConfig;
}

function Providers({ children, subscriptionPlan }: ProvidersProps) {
  
  return <ClientProviders subscriptionPlan={subscriptionPlan}>{children}</ClientProviders>;
}

export default Providers;