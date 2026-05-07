"use client";
import { DEFAULT_LIMITS, InstanceLimits } from "@/config/limits";
import { createContext, ReactNode, useContext } from "react";

type SubscriptionContext = {
  instanceLimits: InstanceLimits;
};

export const subscriptionContext = createContext<SubscriptionContext>({
  instanceLimits: DEFAULT_LIMITS,
});

export const SubscriptionContextProvider = ({
  children,
  instanceLimits,
}: {
  children: ReactNode;
  instanceLimits: InstanceLimits;
}) => {
  return (
    <subscriptionContext.Provider value={{ instanceLimits }}>
      {children}
    </subscriptionContext.Provider>
  );
};

export const useInstanceLimits = () => {
  const { instanceLimits } = useContext(subscriptionContext);
  return instanceLimits;
};