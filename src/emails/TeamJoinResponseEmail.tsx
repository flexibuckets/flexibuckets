import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
  } from '@react-email/components';
  
  interface TeamJoinResponseEmailProps {
    teamName: string;
    status: string;
    loginLink: string;
  }
  
  export function TeamJoinResponseEmail({
    teamName,
    status,
    loginLink,
  }: TeamJoinResponseEmailProps) {
    const isAccepted = status.toLowerCase() === 'accepted';
  
    return (
      <Html>
        <Head />
        <Preview>
          Your request to join {teamName} has been {status}
        </Preview>
        <Body style={main}>
          <Container style={container}>
            <Heading style={h1}>Team Join Request {status}</Heading>
            <Text style={text}>
              {isAccepted
                ? `Great news! Your request to join ${teamName} has been accepted. You can now access the team's resources and collaborate with other members.`
                : `Your request to join ${teamName} has been declined. If you think this is a mistake, please contact the team administrator.`}
            </Text>
            {isAccepted && (
              <>
                <Text style={text}>
                  Log in to your account to start collaborating with your new team.
                </Text>
                <Section style={buttonContainer}>
                  <Button style={button} href={loginLink}>
                    Log In
                  </Button>
                </Section>
              </>
            )}
          </Container>
        </Body>
      </Html>
    );
  }
  
  
const main = {
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  };
  
  const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    maxWidth: '560px',
  };
  
  const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '40px 0',
    padding: '0',
  };
  
  const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '24px 0',
  };
  
  const buttonContainer = {
    margin: '24px 0',
  };
  
  const button = {
    backgroundColor: '#000',
    borderRadius: '3px',
    color: '#fff',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px',
  };
  