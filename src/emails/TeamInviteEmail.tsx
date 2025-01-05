import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as styles from "./styles/shared";

interface TeamInviteEmailProps {
  teamName: string;
  inviterName: string;
  inviteLink: string;
}

export function TeamInviteEmail({
  teamName,
  inviterName,
  inviteLink,
}: TeamInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Join {teamName} on FlexiBuckets</Preview>
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
            <Heading style={styles.heading}>Team Invitation</Heading>
            <Text style={styles.text}>
              {inviterName} has invited you to join their team {teamName} on FlexiBuckets.
            </Text>
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button style={styles.button} href={inviteLink}>
                Join Team
              </Button>
            </Section>
            <Text style={styles.text}>
              If you don&apos;t want to join this team, you can ignore this email.
            </Text>
            <Text style={styles.footer}>
              If you have any questions, please contact our support team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default TeamInviteEmail;

