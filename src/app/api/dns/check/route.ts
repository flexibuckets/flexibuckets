import { NextResponse } from "next/server";
import dns from "dns";
import { promisify } from "util";

const resolve4 = promisify(dns.resolve4);
const resolveCname = promisify(dns.resolveCname);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  const serverIp = process.env.SERVER_IP;
  if (!serverIp) {
    return NextResponse.json({
      isValid: false,
      error: "Configuration error",
      message: "Server IP not configured. Please check your installation.",
      serverIp: null
    }, { status: 500 });
  }

  try {
    // Check both A and CNAME records
    let addresses: string[] = [];
    
    try {
      addresses = await resolve4(domain);
    } catch {
      // If A record lookup fails, try CNAME
      const cnames = await resolveCname(domain);
      for (const cname of cnames) {
        try {
          const cnameAddresses = await resolve4(cname);
          addresses = [...addresses, ...cnameAddresses];
        } catch {
          continue;
        }
      }
    }

    if (addresses.length === 0) {
      return NextResponse.json({
        isValid: false,
        serverIp,
        domainIp: null,
        message: "No DNS records found. Please add an A record for your domain."
      });
    }

    const isValid = addresses.includes(serverIp);
    return NextResponse.json({
      isValid,
      serverIp,
      domainIp: addresses[0],
      allIps: addresses,
      message: isValid 
        ? "DNS is correctly configured"
        : `DNS is not pointing to the correct IP address. Please add an A record pointing to ${serverIp}`
    });

  } catch (dnsError) {
    console.error('DNS lookup error:', dnsError);
    return NextResponse.json({
      isValid: false,
      serverIp,
      domainIp: null,
      message: "Failed to lookup DNS records. Please ensure your domain is valid."
    });
  }
}