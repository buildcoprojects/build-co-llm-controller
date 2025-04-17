This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Build Co LLM Controller - Signal Execution Shell

A central execution hub that allows Build Co to:
1. Intake high-value buyer interactions (manual or Stripe-triggered)
2. Dispatch signal artefacts (PDFs, YAMLs, Git-linked payloads)
3. Log downstream actions or responses (click, open, payment, mirror)
4. Allow GPT-based orchestration to run in background via webhook/API
5. Route requests to Git, Stripe, Email, and back into structured state

## Features

- Signal form for data intake
- Admin panel for viewing and managing signals
- Light/dark mode support
- Responsive design

## Getting Started

### Prerequisites

- Node.js 16+ or Bun
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/buildcoprojects/buildco-llm-signal-hub.git
cd buildco-llm-signal-hub

# Install dependencies
bun install

# Run the development server
bun run dev
```

### Building for Production

```bash
# Build and export as static HTML
bun run export
```

### Deployment

This project is configured for easy deployment on Netlify.

## Technology Stack

- Next.js
- React
- TypeScript
- Shadcn UI
- Tailwind CSS

## Project Structure

- `/src/app`: Next.js app router pages
- `/src/components`: React components
- `/src/lib`: Utility functions and types
- `/netlify/functions`: Serverless functions for Netlify deployment

## License

Private - Copyright © 2025 Build Co Projects
