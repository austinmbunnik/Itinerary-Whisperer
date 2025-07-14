# Itinerary Whisperer

A voice-to-text meeting recorder web application designed for group travel planning conversations. Record discussions and automatically generate text transcripts to facilitate collaborative trip planning.

## 🎯 Project Overview

Itinerary Whisperer enables users to:
- Record group conversations about travel planning
- Automatically transcribe audio to text using OpenAI Whisper
- Generate structured meeting transcripts
- Email transcripts to participants
- Store transcripts for future reference

The application operates from a single landing page with no authentication required, making it easy for groups to quickly start recording their travel planning sessions.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js 18.0.0 or higher** - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download Git](https://git-scm.com/)

### Verify Installation

Check your Node.js and npm versions:

```bash
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 8.0.0 or higher
```

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/itinerary-whisperer.git
   cd itinerary-whisperer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your API keys and configuration:
   ```env
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key_here
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_API_KEY=your_firebase_api_key
   BREVO_API_KEY=your_brevo_api_key
   FROM_EMAIL=noreply@yourapp.com
   ```

## 🛠️ Development Setup

1. **Start the development server**
   ```bash
   npm run dev
   ```
   This will start the server with nodemon for automatic restarts on file changes.

2. **Open your browser**
   Navigate to `http://localhost:3000` to view the application.

3. **Development workflow**
   - Make changes to files in the `src/` directory
   - The server will automatically restart when you save changes
   - Refresh your browser to see updates

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the production server |
| `npm run dev` | Start the development server with nodemon |
| `npm test` | Run the test suite (to be implemented) |

### Script Details

- **`npm start`**: Runs the application in production mode
- **`npm run dev`**: Runs the application in development mode with automatic restarts
- **`npm test`**: Placeholder for running tests (implementation pending)

## 📁 Project Structure

```
itinerary-whisperer/
├── public/                 # Static frontend files
│   └── index.html         # Frontend placeholder
├── src/                   # Backend source code
│   └── index.js          # Express.js server entry point
├── config/                # Configuration files
│   └── index.js          # Environment-based configuration
├── References/            # Project documentation and prototypes
│   ├── PRD.md            # Product Requirements Document
│   └── Web design/       # React frontend prototype
├── .env                   # Environment variables (create from .env.example)
├── .gitignore            # Git ignore rules
├── package.json          # Project dependencies and scripts
└── README.md             # This file
```

### Key Directories

- **`public/`**: Contains static files served by the Express server
- **`src/`**: Main backend application code (Express.js, API routes, business logic)
- **`config/`**: Configuration files for different environments
- **`References/`**: Documentation and design prototypes

## 🔧 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **OpenAI Whisper API** - Speech-to-text transcription
- **Firebase Firestore** - Database for transcript storage
- **Brevo (Sendinblue)** - Email service for transcript delivery

### Frontend (Planned Integration)
- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## 🌟 Getting Started for New Developers

1. **Read the documentation**
   - Review the [Product Requirements Document](References/PRD.md)
   - Explore the [frontend prototype](References/Web%20design/)

2. **Set up your development environment**
   - Follow the installation and setup steps above
   - Ensure all prerequisites are installed

3. **Start with small changes**
   - Make a simple change to `src/index.js`
   - Test that the development server restarts automatically
   - Verify your changes appear in the browser

4. **Explore the codebase**
   - Start with `src/index.js` to understand the server setup
   - Review `config/index.js` to understand configuration structure
   - Look at the existing frontend prototype in `References/Web design/`

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test your changes locally
4. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Need Help?

- Check the [CLAUDE.md](CLAUDE.md) file for detailed development guidance
- Review existing issues in the GitHub repository
- Create a new issue if you encounter problems

---

**Happy coding! 🚀**
