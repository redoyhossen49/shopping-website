# NovaShop — Full-Stack E-Commerce Platform

A modern, responsive e-commerce platform built with React, Vite, Tailwind CSS, Node.js, Express, and PostgreSQL. NovaShop provides a shopping experience with product discovery, cart management, checkout, customer accounts, order tracking, and an administrative dashboard.

<p align="center">
  <strong>Modern UI · REST API · PostgreSQL · Admin Dashboard</strong>
</p>

---

## Overview

NovaShop is a full-stack shopping website designed to bring storefront functionality, customer account management, order processing, and administrative tools into one application.

The project includes a React-based frontend, a REST API powered by Express, and PostgreSQL for persistent data storage.

## Features

### Storefront
- Responsive homepage and product listing pages
- Product search, category filtering, sorting, and pagination
- Individual product detail pages
- Shopping cart and order summary
- Checkout flow and order result pages
- Product availability and stock-related functionality

### Authentication & Customer Accounts
- User registration and login
- Protected customer routes
- Customer profile management
- Saved address management
- Order history and order details
- Order tracking and return-related pages

### Admin Dashboard
- Administrative login and protected routes
- Product and category management
- Order and customer management
- Inventory management
- Analytics dashboard
- Return management
- Store settings

### Backend & API
- RESTful API built with Express
- PostgreSQL database integration
- Database migrations
- Authentication and authorization middleware
- Request validation and centralized error handling
- Pagination and query utilities
- Rate limiting and origin verification
- Demo-mode support

### Checkout & Payments
- Checkout and order processing
- Cash on Delivery support
- SSLCOMMERZ integration for supported online payment methods
- Payment result and return-related workflows

> Online payments require valid merchant credentials and appropriate provider configuration. Payment availability depends on the environment and merchant setup.

---

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Styling | Tailwind CSS, CSS |
| Routing | React Router |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| API | REST API |
| Authentication | JWT-based authentication and protected routes |
| Payments | SSLCOMMERZ integration |
| Testing | Node.js test suite |
| Version Control | Git and GitHub |

---

## Project Structure

```text
shopping-website/
├── backend/
│   ├── database/
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── services/
│   │   └── utils/
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── public/
├── src/
│   ├── admin/
│   ├── api/
│   ├── components/
│   ├── config/
│   ├── context/
│   ├── layout/
│   ├── pages/
│   └── utils/
│
├── .env.example
├── package.json
├── vite.config.js
└── README.md
```

---

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js (a current LTS release is recommended)
- npm
- PostgreSQL
- Git

### 1. Clone the Repository


git clone https://github.com/redoyhossen49/shopping-website.git
cd shopping-website


### 2. Install Frontend Dependencies


npm install


### 3. Configure the Frontend

Create a local environment file from the example:

**Windows PowerShell**

Copy-Item .env.example .env.local


Review `.env.local` and configure the API URL if needed. In local development, the Vite proxy is configured to forward `/api` requests to the backend.

### 4. Install Backend Dependencies

Open a terminal at the project root and run:


cd backend
npm install


### 5. Configure the Backend

From the `backend` directory, create your local environment file:


Copy-Item .env.example .env


Update `backend/.env` with your local PostgreSQL database credentials and a strong, unique JWT secret.

Configure the relevant variables, including:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `CLIENT_ORIGIN`
- `FRONTEND_URL`
- `API_PUBLIC_URL`

Keep real credentials and secrets out of Git.

### 6. Prepare the Database

Create the PostgreSQL database specified by `DB_NAME`.

Run the database migration script using the command defined in `backend/package.json`. Review the migration files in `backend/database/migrations/` and the instructions in the backend scripts before running migrations.

If you are migrating an existing product catalog, back up the data first and import existing products before switching the storefront to the new backend.

### 7. Start the Backend

From the `backend` directory, use the development script defined in `backend/package.json`.

For example, if the package defines a `dev` script:


npm run dev


### 8. Start the Frontend

Open another terminal at the project root:


npm run dev


Open the local URL displayed by Vite in your terminal.

---

## Environment Variables

The frontend and backend use separate environment files.

| File | Purpose |
|---|---|
| `.env.local` | Local frontend configuration |
| `backend/.env` | Backend, database, authentication, and payment configuration |
| `.env.example` | Frontend environment template |
| `backend/.env.example` | Backend environment template |

Never commit real credentials, production secrets, or private payment credentials.

For online payments, configure the SSLCOMMERZ variables in the backend environment using credentials appropriate for the selected environment. Keep sandbox and production credentials separate.

---

## Testing

The backend includes a test suite under `backend/tests/`.

From the `backend` directory, check `package.json` for the configured test script and run it. For example, if the script is named `test`:


npm test


Run the frontend build and verify the main shopping, authentication, checkout, and admin workflows before deploying.

---

## Deployment

The frontend includes a `vercel.json` configuration for deployment planning. The backend requires a Node.js-compatible hosting environment, and PostgreSQL must be available to the deployed API.

Before production deployment:

1. Configure the production database and credentials.
2. Set a strong, unique JWT secret.
3. Configure frontend and backend URLs.
4. Configure allowed client origins.
5. Add payment-provider credentials only through secure environment settings.
6. Apply database migrations.
7. Test authentication, checkout, payment callbacks, and order workflows.
8. Disable demo mode when using real customer or order data.

Deployment settings depend on the hosting provider and its environment configuration.

---

## Security Notes

- Do not commit `.env` files or real credentials.
- Use strong, unique secrets in production.
- Do not enable demo reset functionality against a database containing real customer data.
- Restrict administrative access and validate incoming requests.
- Use HTTPS in production.
- Keep dependencies updated and test security-sensitive changes.

---

## Roadmap

Potential future improvements include:

- Automated end-to-end testing
- Enhanced product recommendations
- Improved reporting and analytics
- Additional payment and shipping integrations
- Production monitoring and performance optimization

---

## Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make and test your changes.
4. Submit a pull request describing the changes.

---

## License

No license has been specified yet. Add a `LICENSE` file before distributing the project under an open-source license.

---

## Author

**Md. Redoy Hossain**

GitHub: [@redoyhossen49](https://github.com/redoyhossen49)

Project Repository: [shopping-website](https://github.com/redoyhossen49/shopping-website)
