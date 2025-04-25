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
} from '@react-email/components';
import * as styles from "./styles/shared";

interface TeamMemberRemovedEmailProps {
  teamName: string;
}

export function TeamMemberRemovedEmail({
  teamName,
}: TeamMemberRemovedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You have been removed from {teamName}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <Img
              src="https://example.com/flexibuckets-logo.png"
              width={120}
              height={40}
              alt="FlexiBuckets"
              style={styles.logo}
            />
            <Heading style={styles.heading}>Team Membership Update</Heading>
            <Text style={styles.text}>
              You are no longer a member of the team {teamName}.
            </Text>
            <Text style={styles.text}>
              If you believe this was done in error, please contact the team administrator.
            </Text>
            <Text style={styles.text}>
              Thank you for your participation in the team.
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

export default TeamMemberRemovedEmail;

