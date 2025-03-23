# FlexiBuckets without Traefik

This directory contains configurations for running FlexiBuckets without Traefik, suitable for:

- Kubernetes deployments
- Coolify deployments
- Dokploy deployments
- Any environment where you want to handle SSL termination and routing separately

## Files

- `docker-compose.no-traefik.yml` - Docker Compose configuration without Traefik
- `install-no-traefik.sh` - Installation script for Linux environments

## Using with Docker Compose

```bash
# Copy the file
cp docker-compose.no-traefik.yml docker-compose.yml

# Start the services
docker compose up -d
```

## Using with Kubernetes

The Docker Compose file can be converted to Kubernetes manifests using tools like Kompose:

```bash
kompose convert -f docker-compose.no-traefik.yml
```

## Using with Coolify/Dokploy

Upload the `docker-compose.no-traefik.yml` file as your Docker Compose configuration.

## Environment Variables

Make sure to set these environment variables:

- `SERVER_IP` - Public IP or hostname of your server
- `DOMAIN` - Domain name to use (same as SERVER_IP if you don't have a domain)
- `NEXTAUTH_SECRET` - Secret for NextAuth authentication
- `POSTGRES_PASSWORD` - Password for PostgreSQL database
- `APP_UID` - User ID for the application (usually 1000)
- `DOCKER_GID` - Docker group ID (usually 998 or 999)

## Notes

- The application will run on port 3000
- No SSL termination is configured - use an ingress controller or proxy
- Database data is persisted using a volume named `flexibuckets_postgres_data` 