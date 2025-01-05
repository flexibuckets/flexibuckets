/*
import Stripe from "stripe";
import { prisma } from "./prisma";
import { auth } from "@/auth";
import { PLANS } from "@/config/stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! ?? "", {
  apiVersion: "2024-10-28.acacia", // Use the latest API version
  typescript: true,
});

export async function getUserSubscriptionPlan() {
  const sessison = await auth();
  const userId = sessison?.user.id;
  if (!userId) {
    return {
      ...PLANS[0],
      subscriptionEndDate: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      isSubscribed: false,
      isCanceled: false,
    };
  }
  const dbUser = await prisma.user.findFirst({
    where: {
      id: userId,
    },
  });
  if (!dbUser) {
    return {
      ...PLANS[0],
      subscriptionEndDate: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      isSubscribed: false,
      isCanceled: false,
    };
  }
  const isSubscribed = Boolean(
    dbUser.subscriptionStatus === "active" &&
      dbUser.subscriptionEndDate &&
      dbUser.subscriptionEndDate.getTime() + 86_400_000 > Date.now()
  );
  const plan =
    PLANS.find((plan) => plan.slug === dbUser.subscriptionTier) || PLANS[0];

  let isCanceled = false;
  if (isSubscribed && dbUser.stripeSubscriptionId) {
    const stripePlan = await stripe.subscriptions.retrieve(
      dbUser.stripeSubscriptionId
    );
    isCanceled = stripePlan.cancel_at_period_end;
  }
  return {
    ...plan,
    subscriptionEndDate: dbUser.subscriptionEndDate,
    stripeCustomerId: dbUser.stripeCustomerId,
    stripeSubscriptionId: dbUser.stripeSubscriptionId,
    isSubscribed,
    isCanceled,
  };
}

*/
