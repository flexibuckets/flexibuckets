import { Metadata } from "next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";

export const metadata: Metadata = {
  title: "Refund Policy - FlexiBuckets",
  description: "Refund policy and cancellation terms for FlexiBuckets",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://flexibuckets.com",
    siteName: "FlexiBuckets",
  },
};

export default function RefundPage() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4 max-w-4xl flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold mb-6">
              Refund Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-6">
              <div className="space-y-6">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    1. Subscription Cancellations
                  </h2>
                  <p className="text-muted-foreground">
                    You can cancel your subscription at any time. Your
                    subscription will remain active until the end of your
                    current billing period. We do not provide partial refunds
                    for unused periods.
                  </p>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    2. Refund Eligibility
                  </h2>
                  <p className="text-muted-foreground">
                    We may provide refunds in the following circumstances:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-muted-foreground">
                    <li>Technical issues preventing service usage</li>
                    <li>Incorrect charges or billing errors</li>
                    <li>Service unavailability exceeding 24 hours</li>
                    <li>
                      Special circumstances evaluated on a case-by-case basis
                    </li>
                  </ul>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    3. Refund Process
                  </h2>
                  <p className="text-muted-foreground">To request a refund:</p>
                  <ul className="list-disc pl-6 mt-2 text-muted-foreground">
                    <li>
                      Contact our support team within 14 days of the charge
                    </li>
                    <li>
                      Provide your account information and reason for refund
                    </li>
                    <li>Allow up to 5-10 business days for processing</li>
                    <li>
                      Refunds will be issued to the original payment method
                    </li>
                  </ul>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    4. Non-Refundable Items
                  </h2>
                  <p className="text-muted-foreground">
                    The following are not eligible for refunds:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-muted-foreground">
                    <li>Partial months of service</li>
                    <li>Add-on features or services</li>
                    <li>Administrative fees</li>
                    <li>Charges older than 30 days</li>
                  </ul>
                </section>

                <Separator className="my-6" />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
                  <p className="text-muted-foreground">
                    If you have questions about our refund policy or need to
                    request a refund, please contact our support team at
                    support@flexibuckets.cloud.
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
