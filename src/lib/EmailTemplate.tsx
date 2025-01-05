import * as React from "react";
import {
  Html,
  Body,
  Head,
  Heading,
  Hr,
  Container,
  Preview,
  Section,
  Text,
  Button,
  Img,
} from "@react-email/components";
import * as styles from "@/emails/styles/shared";

interface EmailTemplateProps {
  url: string;
  host: string;
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
  url,
  host,
}) => (
  <Html>
    <Head />
    <Preview>Sign in to {host}</Preview>
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
          <Heading style={styles.heading}>Sign in to {host}</Heading>
          <Text style={styles.text}>
            Click the button below to sign in to your account:
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button style={styles.button} href={url}>
              Sign in
            </Button>
          </Section>
          <Text style={styles.text}>
            If you didn&apos;t request this email, you can safely ignore it.
          </Text>
          <Hr style={{ borderColor: styles.colors.lightText, margin: "32px 0" }} />
          <Text style={styles.footer}>
            This link will expire in 24 hours and can only be used once.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default EmailTemplate;

