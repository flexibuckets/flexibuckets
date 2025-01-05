import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as styles from "@/emails/styles/shared"

interface PolicyWarningEmailProps {
  name: string;
  reason: string;
  warningType: string;
}

export const PolicyWarningEmail = ({
  name,
  reason,
  warningType,
}: PolicyWarningEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Policy Violation Warning</Preview>
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
            <Heading style={styles.heading}>Policy Violation Warning</Heading>
            <Text style={styles.text}>Dear {name},</Text>
            <Text style={styles.text}>
              This is a warning regarding a violation of our platform policies.
            </Text>
            <Text style={styles.text}>Type of violation: {warningType}</Text>
            <Text style={styles.text}>Details:</Text>
            <Text style={{ ...styles.text, backgroundColor: styles.colors.background, padding: "12px", borderRadius: "4px" }}>
              {reason}
            </Text>
            <Text style={styles.text}>
              Please take immediate action to address this issue to avoid account termination.
            </Text>
            <Text style={styles.footer}>
              If you have any questions, please contact our support team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PolicyWarningEmail;

