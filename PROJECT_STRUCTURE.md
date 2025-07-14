# Project Structure

This document outlines the folder structure and organization of the Itinerary-Whisperer project.

## Root Directory

```
Itinerary-Whisperer/
├── .github/                    # GitHub configuration and workflows
│   └── workflows/
│       ├── claude-code-review.yml    # Claude Code Review automation
│       └── claude.yml                # Claude PR Assistant workflow
├── References/                 # Documentation and planning materials
│   ├── Web design/            # React frontend prototype
│   ├── Brainstorming doc.md   # Initial project brainstorming
│   ├── Jira Epics and Tickets for Claude.md    # Project tickets
│   ├── PRD.md                 # Product Requirements Document
│   └── Technical Spike doc.md # Technical exploration document
├── CLAUDE.md                  # Claude Code assistant instructions
├── PROJECT_STRUCTURE.md       # This file - project structure documentation
└── README.md                  # Project overview and setup instructions
```

## References Directory

The `References/` directory contains all planning documentation and the frontend prototype:

### Web Design Prototype (`References/Web design/`)

Complete React TypeScript application built with Vite and Tailwind CSS:

```
Web design/
├── src/
│   ├── components/            # React components
│   │   ├── Header.tsx         # Navigation header component
│   │   ├── QuestionsSection.tsx    # Discussion prompts component
│   │   ├── RecordingSection.tsx    # Audio recording controls
│   │   ├── TranscriptSection.tsx   # Transcript display component
│   │   └── WaitlistForm.tsx        # Email capture form
│   ├── App.tsx               # Main application component
│   ├── index.css             # Global styles and Tailwind imports
│   └── index.tsx             # Application entry point
├── index.html                # HTML template
├── package.json              # Dependencies and scripts
├── postcss.config.js         # PostCSS configuration
├── README_webdesign.md       # Web design specific documentation
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── tsconfig.node.json        # Node-specific TypeScript config
└── vite.config.ts            # Vite build tool configuration
```

### Documentation Files

- **Brainstorming doc.md**: Initial project ideation and concept development
- **Jira Epics and Tickets for Claude.md**: Structured development tasks and requirements
- **PRD.md**: Comprehensive Product Requirements Document
- **Technical Spike doc.md**: Technical research and architecture decisions

## GitHub Configuration

The `.github/workflows/` directory contains automated workflows:

- **claude-code-review.yml**: Automated code review using Claude AI
- **claude.yml**: Pull request assistant workflow

## Project Configuration Files

- **CLAUDE.md**: Instructions and context for Claude Code assistant
- **README.md**: Main project documentation and setup guide
- **PROJECT_STRUCTURE.md**: This documentation file

## Development Structure

### Current Status
- **Frontend**: Complete React prototype in `References/Web design/`
- **Backend**: Not yet implemented (planned Node.js/Express.js)
- **Documentation**: Comprehensive planning materials in `References/`

### Planned Backend Structure
The backend implementation will likely be added at the root level or in a dedicated `backend/` directory with:
- Express.js server files
- API route handlers
- Database models and configurations
- Integration with OpenAI Whisper API
- Email service integration

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend** (planned): Node.js, Express.js, Firebase Firestore
- **APIs** (planned): OpenAI Whisper, Brevo Email Service
- **Build Tools**: Vite, PostCSS, TypeScript compiler