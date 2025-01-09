# Contributing to FlexiBuckets

Thank you for your interest in contributing to FlexiBuckets! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- bun package manager
- PostgreSQL
- Git

### Local Development Setup

1. **Fork and Clone the Repository**:
   - First, fork the repository by clicking the 'Fork' button at the top right of the GitHub repository page
   - Then clone your forked repository:
```bash
git clone https://github.com/your-github-username/flexibuckets.git
cd flexibuckets
```

2. **Set Up Upstream Remote**:
```bash
git remote add upstream https://github.com/original-org/flexibuckets.git
```

3. **Keep Your Fork Updated**:
```bash
git fetch upstream
git merge upstream/main
```

4. **Install Dependencies**:
```bash
bun install
```

5. **Set Up Environment**:
```bash
cp .env.example .env
```

Configure the following variables:
```plaintext
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flexibuckets
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

6. **Start Development Server**:
```bash
bun run dev
```

### Project Structure
```
flexibuckets/
├── app/              # Next.js app router pages
│   ├── api/         # API routes
│   └── (routes)/    # App routes
├── components/       # React components
│   └── ui/          # shadcn/ui components
├── lib/             # Utility functions and services
├── hooks/           # Custom React hooks
├── prisma/          # Database schema and migrations
└── public/          # Static assets
```

## Making Contributions

### Code Style Guidelines

1. **TypeScript**:
   - Use TypeScript for all new code
   - Maintain strict type safety
   - Avoid using `any` type

2. **React and Components**:
   - Use shadcn/ui components when possible
   - Follow component naming conventions
   - Use Tailwind CSS for styling
   - Only use Tailwind's core utility classes (avoid arbitrary values)

3. **Data Fetching**:
   - Use TanStack Query (React Query) for data fetching
   - Implement proper error handling
   - Use loading states appropriately

### Git Workflow

1. **Create a Feature Branch**:
```bash
git checkout -b feature/your-feature-name
```

2. **Commit Messages**:
- Use conventional commits format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `chore:` for maintenance tasks
  - `refactor:` for code refactoring
  - `test:` for adding tests

Example:
```bash
git commit -m "feat: add file upload progress indicator

- Add progress bar component
- Implement upload progress tracking
- Add cancel upload functionality

Closes #123"
```

3. **Before Submitting PR**:
```bash
bun run lint
bun run build
```

### Working with Database

1. **Making Schema Changes**:
```bash
bunx prisma generate
bunx prisma migrate dev --name your-migration-name
```

2. **Testing Migrations**:
```bash
bunx prisma migrate reset
```

### Testing Guidelines

- Write tests for new features
- Use React Testing Library for component tests
- Keep test files alongside components
- Run the full test suite before submitting PR

## Additional Resources

### UI Components

- Use the shadcn/ui component library
- Available components can be found in `components/ui/`
- Follow the shadcn/ui installation process for new components

### Data Fetching Example

```typescript
import { useQuery } from '@tanstack/react-query';

export function useFiles() {
  return useQuery({
    queryKey: ['files'],
    queryFn: async () => {
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json();
    }
  });
}
```

### Component Example

```typescript
import { Button } from "@/components/ui/button"
import { useFiles } from "@/hooks/use-files"

export function FileList() {
  const { data, isLoading } = useFiles();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="space-y-4">
      {data?.files.map((file) => (
        <div key={file.id} className="flex items-center gap-2">
          <span>{file.name}</span>
          <Button variant="ghost" size="sm">
            Download
          </Button>
        </div>
      ))}
    </div>
  );
}
```


## Need Help?

- Check existing issues and discussions
- Join our Discord community
- Read our documentation
- Create a new discussion for questions

## License

By contributing to FlexiBuckets, you agree that your contributions will be licensed under the FlexiBuckets License.