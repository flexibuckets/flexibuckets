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

interface TeamJoinRequestEmailProps {
  requesterName: string;
  teamName: string;
  requestLink: string;
}

export function TeamJoinRequestEmail({
  requesterName,
  teamName,
  requestLink,
}: TeamJoinRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New join request for {teamName}</Preview>
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
            <Heading style={styles.heading}>Team Join Request</Heading>
            <Text style={styles.text}>
              {requesterName} has requested to join your team {teamName}.
            </Text>
            <Text style={styles.text}>
              You can review this request and other pending requests in your team management dashboard.
            </Text>
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button style={styles.button} href={requestLink}>
                Review Request
              </Button>
            </Section>
            <Text style={styles.footer}>
              If you have any questions, please contact our support team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default TeamJoinRequestEmail;

