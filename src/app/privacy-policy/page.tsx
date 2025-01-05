import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | FlexiBuckets",
  description:
    "Privacy Policy for FlexiBuckets - Learn how we protect your data and respect your privacy.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>
            Welcome to FlexiBuckets (&quot;we&quot;, &quot;our&quot;, or
            &quot;us&quot;). We are committed to protecting your personal
            information and your right to privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when
            you use our service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            2. Information We Collect
          </h2>
          <p>
            We collect personal information that you provide to us such as name,
            email address, and data related to your use of our service. We also
            automatically collect certain information when you visit, use, or
            navigate our platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            3. How We Use Your Information
          </h2>
          <p>
            We use personal information collected via our service for various
            purposes, including to:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Provide and maintain our service</li>
            <li>Notify you about changes to our service</li>
            <li>
              Allow you to participate in interactive features of our service
              when you choose to do so
            </li>
            <li>Provide customer support</li>
            <li>
              Gather analysis or valuable information so that we can improve our
              service
            </li>
            <li>Monitor the usage of our service</li>
            <li>Detect, prevent and address technical issues</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            4. Sharing Your Information
          </h2>
          <p>
            We may share your information with third-party service providers to
            facilitate our service, to provide the service on our behalf, to
            perform service-related tasks, or to assist us in analyzing how our
            service is used.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            5. Security of Your Information
          </h2>
          <p>
            We use administrative, technical, and physical security measures to
            help protect your personal information. While we have taken
            reasonable steps to secure the personal information you provide to
            us, please be aware that despite our efforts, no security measures
            are perfect or impenetrable, and no method of data transmission can
            be guaranteed against any interception or other type of misuse.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            6. Your Data Protection Rights
          </h2>
          <p>
            Depending on your location, you may have certain rights regarding
            your personal information, such as the right to access, correct, or
            delete your personal information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            7. Changes to This Privacy Policy
          </h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the &quot;Last updated&quot; date at the top of this
            Privacy Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact
            us:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>By email: privacy@flexibuckets.com</li>
            <li>
              By visiting this page on our website:{" "}
              <Link href="/contact" className="text-blue-600 hover:underline">
                Contact Us
              </Link>
            </li>
          </ul>
        </section>
      </div>
      <Footer />
    </>
  );
}
