import { Metadata } from "next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";

// Shared metadata config
const sharedMetadata = {
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://flexibuckets.com",
    siteName: "FlexiBuckets",
  },
};

// Terms of Service Page
export const metadata: Metadata = {
  title: "Terms of Service - FlexiBuckets",
  description: "Terms of service and usage conditions for FlexiBuckets",
  ...sharedMetadata,
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4 max-w-4xl flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold mb-6">
              Terms of Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-6">
              <div className="space-y-6">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    1. Acceptance of Terms
                  </h2>
                  <p className="text-muted-foreground">
                    By accessing and using FlexiBuckets ("Service"), you agree
                    to be bound by these Terms of Service ("Terms"). If you
                    disagree with any part of the terms, you do not have
                    permission to access the Service.
                  </p>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    2. Description of Service
                  </h2>
                  <p className="text-muted-foreground">
                    FlexiBuckets provides cloud storage management and file
                    sharing services. We offer various subscription tiers with
                    different features and storage limits.
                  </p>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    3. User Accounts
                  </h2>
                  <p className="text-muted-foreground">
                    You must register for an account to use our services. You
                    are responsible for maintaining the security of your account
                    and for all activities that occur under your account.
                  </p>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    4. Subscription and Payments
                  </h2>
                  <p className="text-muted-foreground">
                    Subscription fees are billed in advance on a monthly or
                    yearly basis. All fees are non-refundable except as required
                    by law or as explicitly stated in our refund policy.
                  </p>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    5. Acceptable Use
                  </h2>
                  <p className="text-muted-foreground">
                    You agree not to use the Service for any illegal purposes or
                    to violate any laws in your jurisdiction. You may not use
                    the Service to store or share malicious software or
                    inappropriate content.
                  </p>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    6. Data Privacy
                  </h2>
                  <p className="text-muted-foreground">
                    Your use of the Service is also governed by our Privacy
                    Policy. Please review our Privacy Policy to understand how
                    we collect and use your information.
                  </p>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    7. Termination
                  </h2>
                  <p className="text-muted-foreground">
                    We may terminate or suspend your account at any time for
                    violations of these Terms. You may terminate your account at
                    any time by contacting support.
                  </p>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    8. Changes to Terms
                  </h2>
                  <p className="text-muted-foreground">
                    We reserve the right to modify these terms at any time. We
                    will notify users of any material changes via email or
                    through the Service.
                  </p>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
}
