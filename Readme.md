# Dating app (unforgateable gateway) Server

## Overview
Dating app (unforgateable gateway) Server is a Node.js and TypeScript-based backend application designed to handle API requests efficiently. This project follows best practices in backend development, ensuring scalability, security, and maintainability.

## Features
- Built with **Node.js** and **TypeScript**
- Uses **Express.js** for handling API requests
- **MongoDB / PostgreSQL** database integration
- **JWT authentication** for secure access
- **RESTful API** structure
- **ESLint & Prettier** for code quality and formatting
- **Swagger documentation** (Planned)

## Installation
### Prerequisites
Ensure you have the following installed:
- Node.js (>= 16.x)
- npm or yarn
- MongoDB / PostgreSQL (if applicable)

### Setup & Run
1. Clone the repository:
   ```sh
   git clone https://github.com/jahid-hasan-babu/Dating-app-backend.git
   cd dating-app-server
   ```

2. Install dependencies:
   ```sh
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and configure the necessary variables:
   ```env
   PORT=5003
   DB_URI=mongodb://127.0.0.1:27017/Task-type?replicaSet=rs0 
   JWT_SECRET=your_secret_key
   ```

4. Run the development server:
   ```sh
   npm run dev
   # or
   yarn dev
   ```

## Scripts
| Command          | Description                          |
|-----------------|----------------------------------|
| `npm run dev`   | Start development server         |
| `npm run build` | Build the project for production |
| `npm start`     | Run the built application        |
| `npm run lint`  | Check code formatting            |
| `npm test`      | Run tests                        |

## Folder Structure
```
📂 dating-app-server
├── 📂 src
│   ├── 📂 controllers
│   ├── 📂 models
│   ├── 📂 routes
│   ├── 📂 middlewares
│   ├── 📂 services
│   ├── 📂 utils
│   ├── app.ts
│   ├── server.ts
├── 📂 tests
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
```

## API Documentation
🚧 https://documenter.getpostman.com/view/39952026/2sAYQWJYN2


## Contributing
1. Fork the repository
2. Create a new branch: `git checkout -b feature-branch`
3. Make your changes and commit: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature-branch`
5. Submit a pull request

## License
This project is licensed under the **MIT License**.

