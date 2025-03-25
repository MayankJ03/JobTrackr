# JobTrackr

A comprehensive job search and application management platform built with React and Firebase.

## Features

- 🔐 User Authentication (Email/Password & Google)
- 🔍 Job Search with location-based filtering
- 📝 AI-Powered Resume Tailoring
- 📊 Application Tracking System
- 💾 Save Jobs for Later
- 📱 Responsive Design

## Tech Stack

- React.js
- Vite
- Tailwind CSS
- Firebase (Authentication & Firestore)
- Google Gemini AI
- React Router
- React Hot Toast

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/MayankJ03/JobTrackr.git
cd JobTrackr
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

4. Start the development server
```bash
npm run dev
```

## Environment Variables

To run this project, you need to set up the following environment variables:

1. Create a Firebase project and get your configuration
2. Get a Gemini AI API key from Google AI Studio
3. Add these to your `.env` file

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
