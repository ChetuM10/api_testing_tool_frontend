# API Testing Tool - Frontend

## Summary

This is the frontend interface of the API Testing Tool, designed to offer a fast, modern, and user-friendly way to test HTTP APIs, organize requests, view response data, and manage collections securely. Authentication and persistence are powered by Supabase.

## Features

- Authenticated user login/registration (Supabase)
- Send requests to any HTTP API (GET, POST, PUT, DELETE, etc.)
- Visual response preview (JSON, HTML)
- Request history and saved collections with quick recall/loading
- Collapsible sidebar for History and Collections
- Per-user data isolation (history/collections tied to logged-in user)
- Theme toggle (Light/Dark mode) and custom scrollbars
- Live environment variable support for dynamic URLs
- Clear History and single-history-item delete actions
- Modern, responsive design (React, Tailwind)

## Tech stack

- React 18
- Tailwind CSS
- Axios
- Supabase JS SDK
- Lucide Icons
- Ace Editor

## Screenshots

![API Tester - Dark Mode](screenshots/dark-mode.png)
![Collections Sidebar](screenshots/collections.png)
_(add your screenshots to a `/screenshots` folder and update the links above)_

## Installation

Clone the repository
git clone https://github.com/your-username/api-testing-tool.git
cd api-testing-tool/frontend

Install dependencies
npm install

Set up environment variables
cp .env.example .env

Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
Start development server
npm run dev

text

_Note:_ Requires the backend proxy to be running on port 5000 for full functionality.
