import { Container, Text, Heading, Link, Html, Head, Preview, Body, Section, Button, Img } from "@react-email/components";
import * as styles from "./styles/shared";

interface PaymentIssueEmailProps {
  name: string;
  billingPeriod: string;
  productName: string;
}

const PaymentIssueEmail = ({
  name,
  billingPeriod,
  productName,
}: PaymentIssueEmailProps) => (
  <Html>
    <Head />
    <Preview>Important: Payment Issue for Your {productName} Subscription</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.card}>
        <Img
              src={styles.logoLink}
              width={500}
              height={200}
              alt="FlexiBuckets"
              style={styles.logo}
            />
          <Heading style={styles.heading}>Payment Issue Notice</Heading>
          <Text style={styles.text}>Dear {name},</Text>
          <Text style={styles.text}>
            We hope you're doing well. We wanted to give you a heads-up that there was an issue processing the
            automatic payment for your {billingPeriod} subscription to {productName}.
          </Text>
          <Text style={styles.text}>
            We know that payment hiccups happen, so no worries—we're here to help get things back on track.
          </Text>
          <Text style={styles.text}>
            When you have a moment, please check that your card details on file are up-to-date. 
            Once updated, you can restart the payment process through your account dashboard.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button style={styles.button} href="https://app.flexibuckets.com/stats">
              Update Payment Details
            </Button>
          </Section>
          <Text style={styles.text}>
            If you have any questions or need assistance, don't hesitate to reach out to our support team at{" "}
            <Link href="mailto:support@flexibuckets.com" style={{ color: styles.colors.primary }}>
              support@flexibuckets.com
            </Link>
            . We're always happy to help!
          </Text>
          <Text style={styles.footer}>
            Thank you for your attention to this matter.
            <br /><br />
            Best regards,
            <br />
            The FlexiBuckets Team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default PaymentIssueEmail;
