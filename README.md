# MovieMaster PRO

MovieMaster PRO is a cinematic movie management platform built using the MERN stack (MongoDB, Express, React, Node.js). It provides a centralized interface for users to discover, filter, and manage movie collections with a focus on real-time interactivity and secure data handling.

## Project Description
This application allows movie enthusiasts to browse a global database of films, view detailed information, and manage a personal watchlist. The platform emphasizes a professional user experience through instant search capabilities and advanced filtering logic, ensuring users can find specific content based on genres and ratings without page refreshes.

## Core Features

### 1. Instant Search and Advanced Filtering
The navigation bar includes a debounced search system that queries the backend as the user types.
- Live Search: Displays results in a modal dropdown for immediate navigation.
- Genre Filtering: Supports multi-genre selection using the MongoDB $in operator.
- Rating Thresholds: Allows users to filter movies based on a minimum rating scale.

### 2. Authentication and Authorization
Integrated with Firebase Authentication to provide secure user sessions.
- Private Routing: Access to adding movies, viewing personal collections, and managing watchlists is restricted to authenticated users.
- User Management: Supports Email/Password registration and Google Social Login.

### 3. Personal Collection Management
Users have full CRUD (Create, Read, Update, Delete) capabilities over the movies they contribute to the platform.
- Add Movie: A validated form for contributing new movie data.
- Update/Delete: Tools for users to modify or remove their own contributions.

### 4. Real-time Watchlist System
A personalized storage area for movies the user intends to watch.
- Dynamic Badge: The navbar features a real-time count badge that updates via custom event listeners.
- Persistence: All watchlist data is stored in MongoDB and linked to the unique Firebase User ID.

## Technology Stack

### Frontend
- React: Component-based UI development.
- Tailwind CSS: Utility-first styling and responsive layout.
- Framer Motion: Sidebar and modal animations.
- React Router: Single-page application navigation.

### Backend
- Node.js & Express: RESTful API architecture.
- MongoDB: NoSQL database for movie and user data storage.
- Firebase Auth: Secure authentication and session persistence.

### Utilities
- Axios: Asynchronous HTTP requests.
- SweetAlert2: Standardized user feedback and confirmation dialogs.

## API Endpoints

### Movie Endpoints
- GET /movies: Retrieve all movies.
- GET /movies/search: Filtered search by title/genre/rating.
- GET /movie/:id: Specific movie details.
- POST /movies/add: Add a new movie (Private).

### Watchlist Endpoints
- GET /watchlist: Retrieve user watchlist.
- POST /watchlist/add: Add movie to watchlist.
- DELETE /watchlist/:id: Remove movie from watchlist.

## Installation and Configuration

### Setup Steps
1. Clone the repository: git clone [repository-url]
2. Install dependencies: npm install
3. Create a .env file and add:
   - VITE_FIREBASE_API_KEY=[your-key]
   - VITE_API_URL=[your-backend-url]
4. Start the development server: npm run dev

## Challenges Resolved
- Efficient Search: Implemented a 300ms debounce timer to prevent excessive API calls.
- State Synchronization: Used a custom window event dispatch system to sync the watchlist count across disconnected components.
- Secure Data Access: Utilized private route wrappers to protect sensitive user data.