import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/get-api-user';

/**
 * A simple test endpoint for API key authentication
 * You can also test team access by providing teamId as a query parameter
 */
export async function GET(request: NextRequest) {
  // Get the teamId from the query parameters if provided
  const url = new URL(request.url);
  const teamId = url.searchParams.get('teamId');
  
  // Get the authenticated user, passing teamId if available
  const user = await getApiUser(request, teamId || undefined);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - No valid API key or session' },
      { status: 401 }
    );
  }
  
  // Create the response object
  const response: any = {
    success: true,
    message: 'API key authentication successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  };
  
  // Add team access info if user was authenticated with an API key
  if ('apiKey' in user) {
    response.apiKey = {
      id: user.apiKey.id,
      hasTeamAccess: user.apiKey.hasTeamAccess,
    };
    
    if (teamId) {
      response.team = {
        id: teamId,
        hasAccess: true, // If we got here, the API key has access to this team
      };
    }
  }
  
  return NextResponse.json(response);
} 