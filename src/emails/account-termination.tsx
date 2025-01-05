import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Button,
  Hr,
  Img,
} from "@react-email/components";
import * as React from "react";
import * as styles from "./styles/shared";

interface AccountTerminationEmailProps {
  name: string;
  reason: string;
}

export const AccountTerminationEmail = ({
  name,
  reason,
}: AccountTerminationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your FlexiBuckets Account Has Been Terminated</Preview>
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
            <Heading style={{ ...styles.heading, color: styles.colors.error }}>Account Termination Notice</Heading>
            <Text style={styles.text}>Dear {name},</Text>
            <Text style={styles.text}>
              We regret to inform you that your FlexiBuckets account has been terminated.
            </Text>
            <Section style={{
              backgroundColor: styles.colors.background,
              borderLeft: `4px solid ${styles.colors.error}`,
              padding: "16px",
              margin: "24px 0",
              borderRadius: "4px",
            }}>
              <Text style={{ ...styles.text, margin: 0 }}>
                <strong>Reason for termination:</strong>
                <br />
                {reason}
              </Text>
            </Section>
            <Text style={styles.text}>
              All your data and files have been permanently deleted from our systems
              in accordance with our data retention policies.
            </Text>
            <Text style={styles.text}>
              If you believe this action was taken in error or would like to appeal
              this decision, please contact our support team.
            </Text>
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button
                href="mailto:support@flexibuckets.com"
                style={styles.button}
              >
                Contact Support
              </Button>
            </Section>
            <Hr style={{ borderColor: styles.colors.lightText, margin: "32px 0" }} />
            <Text style={styles.footer}>
              Best regards,
              <br />
              The FlexiBuckets Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AccountTerminationEmail;
