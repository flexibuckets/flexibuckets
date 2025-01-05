"use client";
import { DEFAULT_CONFIG } from "@/config/dodo";
import { createContext, ReactNode, useContext } from "react";

type SubscriptionContext = {
  subscriptionPlan: typeof DEFAULT_CONFIG;
};

export const subscriptionContext = createContext<SubscriptionContext>({
  subscriptionPlan: DEFAULT_CONFIG,
});

export const SubscriptionContextProvider = ({
  children,
  subscriptionPlan,
}: {
  children: ReactNode;
  subscriptionPlan: typeof DEFAULT_CONFIG;
}) => {
  return (
    <subscriptionContext.Provider value={{ subscriptionPlan }}>
      {children}
    </subscriptionContext.Provider>
  );
};

export const useSubscriptionPlan = () => {
  const { subscriptionPlan } = useContext(subscriptionContext);
  return subscriptionPlan;
};