# Uptime Monitor

The **Uptime Monitor** is a simple and efficient tool for monitoring the uptime of websites. This project is built entirely using **native Node.js** with no external dependencies, making it lightweight and performance-focused. Additionally, it features **user and session management** with token-based authentication, all built from scratch without relying on external libraries.

## Features

- **Pure Node.js**: No external libraries or dependencies, keeping the bundle size small and performance optimized.
- **Uptime Monitoring**: Monitor multiple URLs and track their status.
- **User Management**: Secure user authentication with token-based sessions.
- **Session Handling**: Manage user sessions using native Node.js capabilities without any third-party libraries.
- **Custom SSL Certificate**: Built-in support for SSL with the use of self-signed certificates.
- **Minimalistic and Fast**: Designed with simplicity and performance in mind.

## Why Pure Node.js?

This project is a demonstration of my skills in using native Node.js functionalities, including handling HTTP requests, file systems, authentication, and session management without external dependencies. This approach ensures the project remains lightweight and optimized for performance.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

Make sure you have the following installed on your system:

- **Node.js** (v12+)
- **OpenSSL** (for generating PEM files)

### Installation

1. **Clone the repository**:

  ```bash
   git clone https://github.com/darwin-luque/uptime-monitor.git  
   cd uptime-monitor
  ```

2. **Generate the PEM files**:

   This project uses self-signed certificates for SSL. Run the following commands to generate the required `.pem` files:

   openssl genpkey -algorithm RSA -out key.pem -aes256  
   openssl genpkey -algorithm RSA -out key.pem  
   openssl req -new -key key.pem -out request.csr  
   openssl req -new -x509 -key key.pem -out cert.pem -days 365  

   These commands will generate the following files:
   - `key.pem`: The private key for SSL.
   - `cert.pem`: The self-signed certificate for SSL.
   - `request.csr`: Certificate signing request (can be ignored).

3. **Start the project**:

   Run the project using the following command:

  ```bash
   node index.js
  ```

4. **Access the Uptime Monitor**:

   Once the server is running, you can access the uptime monitor at `https://localhost:3000` (or the port specified in your configuration).

## How It Works

1. **Uptime Monitoring**: 
   The app will periodically check the status of specified URLs to ensure they are online and responding. If a website goes down, it will be logged in the system.
   
2. **User Authentication**:
   Users can sign up and log in using the native authentication system. A token-based system manages user sessions, with tokens generated and validated without external libraries like JWT.

3. **Session Management**:
   User sessions are handled using tokens, and each request from a user is validated to ensure the token is active.

## Project Structure

The project follows a simple and clean structure to keep the codebase easy to manage and understand:

```bash
uptime-monitor/  
│  
├── key.pem          # SSL Private Key (Generated)  
├── cert.pem         # SSL Certificate (Generated)  
├── index.js         # Main application entry point  
├── lib/             # Contains the core logic for uptime monitoring, user management, etc.  
├── users/           # Directory for managing user data (no external database)  
└── tokens/          # Directory for managing user session tokens  
```

## Dockerizing the Uptime Monitor

To make setup and deployment easier across different environments, the Uptime Monitor can be run inside a Docker container. Docker ensures the application runs consistently, regardless of where it’s deployed.

Prerequisites
Make sure you have Docker installed on your system. You can download it here.

Docker Setup
Clone the repository:

```bash
git clone https://github.com/darwin-luque/uptime-monitor.git
cd uptime-monitor
```

Create the PEM files (if not already generated):

```bash
openssl genpkey -algorithm RSA -out key.pem -aes256
openssl genpkey -algorithm RSA -out key.pem
openssl req -new -key key.pem -out request.csr
openssl req -new -x509 -key key.pem -out cert.pem -days 365
```

Build the Docker image:

```bash
docker build -t uptime-monitor .
```

Run the Docker container:

```bash
docker run -p 3000:3000 uptime-monitor
```

The application will now be accessible at [https://localhost:3000](https://localhost:3000).

### Docker Compose (Optional)

If you plan to expand the project or run additional services (like databases), you can set up a docker-compose.yml file to manage multiple containers. Docker Compose will allow you to run all services in a single command.

### Why Docker?

Consistent Environment: Run the project in the same environment, no matter where you deploy it.
Easy Setup: No need to worry about dependencies or system configurations—everything is contained in the Docker image.
Portability: Deploy the project anywhere Docker is supported (cloud, local, or remote servers).

## Future Improvements

- **Notifications**: Implementing a notification system (via email or SMS) when a website goes down.
- **Reporting**: Adding reporting functionality to track uptime/downtime over time.
- **Improved Security**: Enhancing token security and expiration policies.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your proposed changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

If you have any questions or suggestions, feel free to reach out:

- GitHub: [darwin-luque](https://github.com/darwin-luque)
- LinkedIn: [Darwin Luque](https://www.linkedin.com/in/darwin-luque/)
