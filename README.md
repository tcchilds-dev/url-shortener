## URL-Shortener API

A simple API service for creating short links with analytics from long URLs.

I'm currently learning, so any feedback is welcome!

## Features

- **Authenticated User Accounts**: Users can register, create their own short links, and have exclusive access to the analytics of their short links.
- **Click Analytics**: Tracks the number of clicks, last clicked at time for links. Each click records referrer, geographical and device information.
- **Fast Redirects**: Uses [Redis](https://redis.io/) to cache URLs for ultra-fast redirection. [BullMQ](https://bullmq.io/) is used to offload analytics processing to a background worker, ensuring the user's redirect is never blocked by database writes.
- **Rate Limiting**: Implements request limits to prevent abuse.

## Technologies Used

- **Backend**:
  - **Framework**: Node.js ([Express](https://expressjs.com/))
  - **Language**: TypeScript
  - **Package Manager**: [`pnpm`](https://pnpm.io/cli/update)
  - **Authorization**: [`jsonwebtoken`](https://www.npmjs.com/package/jsonwebtoken)
  - **Validation**: [Zod](https://zod.dev/)
  - **Queue/Async**: [BullMQ](https://bullmq.io/)
  - **Testing**: [Vitest](https://vitest.dev/)
- **Data Storage**:
  - **Primary Database**: [PostgreSQL](https://www.postgresql.org/)
  - **ORM**: [`drizzle-orm`](https://orm.drizzle.team/)
  - **Caching Layer**: [Redis](https://redis.io/)
- **Containerization**: [Docker](https://www.docker.com/)
- **Documentation**: OpenAPI specification with [Scalar UI](https://scalar.com/)

## Getting Started

These instructions will get a copy of the project up and running on your local machine for development and testing purposes.

#### Prerequisites

- **Node.js**
- **pnpm**
- **Docker**
  - **PostgreSQL**
  - **Redis**

#### Installation

Follow these steps to set up your development environment:

###### 1. Clone the Repository

Open your terminal and clone the project:

```Bash
git clone https://github.com/tcchilds-dev/url-shortener
cd url-shortener
```

###### 2. Install Dependencies

Note: We need to install dependencies locally to run the database migration tools, even though the application will run in Docker.

```Bash
pnpm install
```

###### 3. Database Setup

- **Environment Variables**: I've included example `.env` files. Make your own `.env` files from the examples.
- **Docker Compose**:

```Bash
docker compose -f docker-compose-dev.yml up -d --build
```

###### 4. Run Database Migrations

```Bash
pnpx drizzle-kit migrate
```

###### 5. Running The Server

After the initial set up you should have the API running in docker containers.

To stop the containers:

```bash
docker compose -f docker-compose-dev.yml down
```

To start them again:

```bash
docker compose -f docker-compose-dev.yml up -d
```

The API should now be running at `http://localhost:[Your API Port]`.
For the interactive API reference go to `http://localhost:[Your API Port]/docs`.

## API Endpoints

If you have the project running locally, you can find the Scalar UI Interactive API Reference at `http://localhost:[Your API Port]/docs`.

#### Authentication

| **Method** | **Path**    | **Summary**                   | **Description**                                                          | **Security** |
| ---------- | ----------- | ----------------------------- | ------------------------------------------------------------------------ | ------------ |
| `POST`     | `/register` | Register a new user           | Creates a new user account with email and password.                      | None         |
| `POST`     | `/login`    | Log in to an existing account | Authenticates a user with email and password, returning a **JWT token**. | None         |

###### Responses

`POST /register`

- `201` - Successfully registered new user
- `400` - Account already exists with that email or invalid input

`POST /login`

- `201` - Successfully authenticated user
- `400` - Bad request - Invalid password
- `404` - User not found - No account exists with that email

**Note**: Authenticated endpoints require a **Bearer Token** (JWT) in the `Authorization` header.

#### URL Shortening & Redirect

| **Method** | **Path**       | **Summary**               | **Description**                                                        | **Security** |
| ---------- | -------------- | ------------------------- | ---------------------------------------------------------------------- | ------------ |
| `POST`     | `/shorten`     | Shorten a URL             | Receive a long URL and create a shortened URL for an authorized user.  | Bearer Auth  |
| `GET`      | `/{shortCode}` | Redirect using short code | Look up the entry, record analytics, and redirect to the original URL. | None         |

###### Responses

`POST /shorten`

- `201` - URL created successfully
- `400` - Validation Error

`GET /{shortCode}`

- `302` - Redirects to the original URL
- `400` - Validation Error
- `404` - URL not found

#### Analytics

| **Method** | **Path**             | **Summary**                | **Description**                                                                | **Security** |
| ---------- | -------------------- | -------------------------- | ------------------------------------------------------------------------------ | ------------ |
| `GET`      | `/home`              | Get user URL analytics     | Retrieves analytics data for **all URLs** belonging to the authenticated user. | Bearer Auth  |
| `GET`      | `/{shortCode}/stats` | Get specific URL analytics | Retrieves analytics data for a **specific URL** by its short code.             | Bearer Auth  |

###### Responses

`GET /home`

- `200` - Return stats for all URLs (Array of URL/Analytics objects)
- `401` - Unauthorized - Invalid or missing authentication token

`GET /{shortCode}/stats`

- `200` - Returns stats (Single URL/Analytics object)
- `400` - Validation Error
- `401` - That URL does not belong to this user
- `404` - URL not found

## Authentication

This API uses **JSON Web Tokens (JWTs)** for secure, stateless authentication after the initial login.

#### 1. Obtaining a Token (Login)

To get a JWT, a client must successfully authenticate against the `/login` or `/register` endpoints.

- Send a `POST` request to either `/login` or `/register` with the user's email and password in the request body.
- Upon successfully authentication, the API will return a `201` status code and a response body containing the user details and the **JWT token**:

```JSON
{
  "user": {
    "id": "019b0300-7bf3-706b-b74c-169c627be7bb",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- **Token Expiration**: The token is valid for **7 days**. Clients are responsible for storing this token securely and requesting a new one once it expires.

#### 2. Using the Token (Authorization)

For all authenticated endpoints (e.g., `/shorten`, `/home`, `/{shortCode}/stats`), the client must include the JWT in the request headers.

The token must be passed in the `Authorization` header using the `Bearer` scheme.

| Header Name     | Value Format              |
| --------------- | ------------------------- |
| `Authorization` | `Bearer <your_jwt_token>` |

**Example**:
To access the `/shorten` endpoint, the request header must look like this:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. Handling Errors

If the token is missing, expired, or invalid when accessing a protected route, the API will respond with a `401` status code. The client should the prompt the user to log in again to obtain a new token.

## License

MIT License

Copyright (c) 2025 tcchilds-dev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contact

GitHub: https://github.com/tcchilds-dev
Email: thomas.c.childs@gmail.com
