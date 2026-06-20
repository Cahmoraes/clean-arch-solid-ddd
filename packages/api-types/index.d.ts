export interface paths {
    "/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List all users
         * @description Retrieve paginated list of users. Requires authentication and admin role.
         */
        get: {
            parameters: {
                query: {
                    /** @description Number of users per page */
                    limit: number;
                    /** @description Page number */
                    page: number;
                    /** @description Search by name or email */
                    query?: string;
                    /** @description Filter by role */
                    role?: "MEMBER" | "ADMIN";
                    /** @description Filter by status */
                    status?: "active" | "inactive";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Users list retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description List of users */
                            users: {
                                /**
                                 * Format: uuid
                                 * @description User ID
                                 */
                                id: string;
                                /** @description User full name */
                                name: string;
                                /**
                                 * Format: email
                                 * @description User email
                                 */
                                email: string;
                                /**
                                 * @description User role
                                 * @enum {string}
                                 */
                                role: "ADMIN" | "MEMBER";
                                /**
                                 * @description User status
                                 * @enum {string}
                                 */
                                status: "activated" | "suspended" | "locked";
                                /** @description User creation date */
                                createdAt: string;
                                /** @description Whether the user is a super admin */
                                isSuperAdmin: boolean;
                            }[];
                            /** @description Pagination metadata */
                            pagination: {
                                /** @description Total number of users */
                                total: number;
                                /** @description Current page */
                                page: number;
                                /** @description Users per page */
                                limit: number;
                            };
                        };
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        put?: never;
        /**
         * Create a new user
         * @description Endpoint to create a new user with credentials.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description User full name
                         * @example John Doe
                         */
                        name: string;
                        /**
                         * Format: email
                         * @description User email address
                         * @example john@example.com
                         */
                        email: string;
                        /**
                         * @description User password (min 8 characters)
                         * @example secret123
                         */
                        password: string;
                    };
                };
            };
            responses: {
                /** @description User created successfully */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Success message
                             * @example User created
                             */
                            message: string;
                            /**
                             * @description Created user email
                             * @example john@example.com
                             */
                            email: string;
                        };
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Conflict - User already exists */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unprocessable Entity */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/users/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get user profile by ID
         * @description Retrieve a specific user profile by their ID.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description User ID */
                    userId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description User profile retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description User ID
                             * @example uuid-1234
                             */
                            id: string;
                            /**
                             * @description User name
                             * @example John Doe
                             */
                            name: string;
                            /**
                             * @description User email
                             * @example john@example.com
                             */
                            email: string;
                            /**
                             * @description User role
                             * @example MEMBER
                             */
                            role: string;
                            /**
                             * @description Whether the account has a local password
                             * @example true
                             */
                            hasPassword: boolean;
                            /**
                             * @description Enabled authentication methods
                             * @example [
                             *       "password",
                             *       "google"
                             *     ]
                             */
                            authMethods: string[];
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Delete a user
         * @description Soft-deletes a user by ID. Requires admin authentication. Cannot delete self or super admin.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description User ID to delete */
                    userId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description User deleted successfully */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update user profile
         * @description Update name and email of a specific user.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description User ID */
                    userId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description User name
                         * @example John Doe
                         */
                        name: string;
                        /**
                         * Format: email
                         * @description User email
                         * @example john@example.com
                         */
                        email: string;
                    };
                };
            };
            responses: {
                /** @description User profile updated successfully */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Success message
                             * @example User created
                             */
                            message: string;
                            /**
                             * @description Updated user email
                             * @example john@example.com
                             */
                            email: string;
                        };
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Unprocessable Entity */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/users/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get authenticated user profile
         * @description Get the profile of the currently authenticated user.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Successful response */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description User ID
                             * @example uuid-1234
                             */
                            id: string;
                            /**
                             * @description User name
                             * @example John Doe
                             */
                            name: string;
                            /**
                             * @description User email
                             * @example john@example.com
                             */
                            email: string;
                            /**
                             * @description User role
                             * @example MEMBER
                             */
                            role: string;
                            /**
                             * @description Whether the account has a local password
                             * @example false
                             */
                            hasPassword: boolean;
                            /**
                             * @description Enabled authentication methods
                             * @example [
                             *       "google"
                             *     ]
                             */
                            authMethods: string[];
                            /**
                             * @description Account creation date (ISO 8601)
                             * @example 2024-01-15T10:30:00.000Z
                             */
                            createdAt: string;
                            /**
                             * @description Account status
                             * @example activated
                             * @enum {string}
                             */
                            status: "activated" | "suspended" | "locked";
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update authenticated user name
         * @description Update the name of the currently authenticated user.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description User name
                         * @example John Doe
                         */
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Name updated successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Updated user name
                             * @example John Doe
                             */
                            name: string;
                        };
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unprocessable Entity */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/users/me/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get user metrics
         * @description Get metrics for the currently authenticated user.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description User metrics retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Total check-ins count
                             * @example 42
                             */
                            checkInsCount: number;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Refresh access token
         * @description Use the refresh token cookie to obtain a new access token and rotate the refresh token
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Token refreshed successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description New JWT access token
                             * @example eyJhbG...
                             */
                            message: string;
                        };
                    };
                };
                /** @description Missing cookie header */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Invalid or expired refresh token */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/users/me/change-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Change user password
         * @description Change the password of the currently authenticated user.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Current password
                         * @example oldpass123
                         */
                        currentRawPassword: string;
                        /**
                         * @description New password (min 8 characters)
                         * @example newpass123
                         */
                        newRawPassword: string;
                    };
                };
            };
            responses: {
                /** @description Password changed successfully */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/users/me/password/reauth": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create password reauthentication grant
         * @description Validate a recent external provider reauthentication and return a single-use grant for first password setup.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description External provider linked to the account
                         * @example google
                         * @enum {string}
                         */
                        provider: "google";
                        /**
                         * @description Fresh provider id token used for recent reauthentication
                         * @example eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
                         */
                        idToken: string;
                    };
                };
            };
            responses: {
                /** @description Reauthentication grant created successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Single-use reauthentication grant
                             * @example 1cb3a5d4-b6ec-4c15-b8d5-b76740626d03
                             */
                            reauthGrant: string;
                            /**
                             * @description Grant expiration time in seconds
                             * @example 300
                             */
                            expiresInSeconds: number;
                        };
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unprocessable Entity */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/users/me/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Define first local password
         * @description Consume a recent reauthentication grant to set the first local password for the authenticated user.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description External provider linked to the account
                         * @example google
                         * @enum {string}
                         */
                        provider: "google";
                        /**
                         * @description Single-use reauthentication grant
                         * @example 1cb3a5d4-b6ec-4c15-b8d5-b76740626d03
                         */
                        reauthGrant: string;
                        /**
                         * @description New local password
                         * @example Senha123!
                         */
                        newRawPassword: string;
                    };
                };
            };
            responses: {
                /** @description Password defined successfully */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unprocessable Entity */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error code */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/password/forgot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Request password reset
         * @description Accept a password reset request and always return a generic success message to avoid account enumeration.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * Format: email
                         * @description User email address
                         * @example john@example.com
                         */
                        email: string;
                    };
                };
            };
            responses: {
                /** @description Password reset request accepted */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Generic success message
                             * @example Se este e-mail estiver cadastrado, você receberá um link em breve.
                             */
                            message: string;
                        };
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/password/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reset password
         * @description Reset the user password using a valid password reset token.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Password reset token
                         * @example 12ab34cd56ef78gh90ij12kl34mn56op
                         */
                        token: string;
                        /**
                         * @description New password (min 8 characters)
                         * @example NewPass456!
                         */
                        newPassword: string;
                    };
                };
            };
            responses: {
                /** @description Password reset successfully */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unprocessable Entity */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/users/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get user statistics
         * @description Returns user counts by category. Requires authentication and admin role.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description User statistics retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Total de usuários */
                            total: number;
                            /** @description Total de membros */
                            members: number;
                            /** @description Total de administradores */
                            admins: number;
                            /** @description Total de usuários ativos */
                            active: number;
                            /** @description Total de usuários inativos */
                            inactive: number;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/users/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Activate a user
         * @description Activate a user account by ID. Requires authentication.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * Format: uuid
                         * @description User ID to activate
                         * @example 550e8400-e29b-41d4-a716-446655440000
                         */
                        userId: string;
                    };
                };
            };
            responses: {
                /** @description User activated successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Unprocessable Entity */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/users/suspend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Suspend a user
         * @description Suspend a user account by ID. Requires authentication and admin role.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * Format: uuid
                         * @description User ID to suspend
                         * @example 550e8400-e29b-41d4-a716-446655440000
                         */
                        userId: string;
                    };
                };
            };
            responses: {
                /** @description User suspended successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Unprocessable Entity */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/users/promote-admin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Promote a user to admin
         * @description Promotes an active member to admin role. Requires admin authentication.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * Format: uuid
                         * @description User ID to promote to admin
                         * @example 550e8400-e29b-41d4-a716-446655440000
                         */
                        userId: string;
                    };
                };
            };
            responses: {
                /** @description User promoted to admin successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Unprocessable Entity */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/users/demote-admin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Demote an admin to member
         * @description Removes admin privileges from a user. Requires admin authentication. Cannot demote self or super admin.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * Format: uuid
                         * @description User ID to demote from admin
                         * @example 550e8400-e29b-41d4-a716-446655440000
                         */
                        userId: string;
                    };
                };
            };
            responses: {
                /** @description Admin demoted successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Unprocessable Entity */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/gyms": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List all gyms
         * @description Returns a paginated list of all registered gyms
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page number for pagination */
                    page?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description List of gyms */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Gym ID
                             * @example 550e8400-e29b-41d4-a716-446655440000
                             */
                            id: string;
                            /**
                             * @description Gym name
                             * @example Iron Gym
                             */
                            title: string;
                            /** @description Gym description */
                            description: string | null;
                            /** @description Gym phone number */
                            phone: string | null;
                            /** @description Full gym address */
                            address: string | null;
                            /** @description Relative key of the gym image */
                            imageKey: string | null;
                            /**
                             * @description Latitude
                             * @example -23.5505
                             */
                            latitude: number;
                            /**
                             * @description Longitude
                             * @example -46.6333
                             */
                            longitude: number;
                        }[];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create a new gym
         * @description Create a new gym with address and location coordinates. Requires ADMIN role
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Gym CNPJ
                         * @example 12345678000100
                         */
                        cnpj: string;
                        /**
                         * @description Gym name
                         * @example Iron Gym
                         */
                        title: string;
                        /**
                         * @description Gym description
                         * @example A great gym
                         */
                        description?: string;
                        /**
                         * @description Gym phone number
                         * @example 11999999999
                         */
                        phone?: string;
                        /**
                         * @description Gym latitude
                         * @example -23.5505
                         */
                        latitude: number;
                        /**
                         * @description Gym longitude
                         * @example -46.6333
                         */
                        longitude: number;
                        /**
                         * @description Full gym address
                         * @example Rua das Flores, 123, São Paulo - SP
                         */
                        address: string;
                    };
                };
            };
            responses: {
                /** @description Gym created successfully */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Success message
                             * @example Gym created
                             */
                            message: string;
                            /**
                             * @description Created gym ID
                             * @example 550e8400-e29b-41d4-a716-446655440000
                             */
                            id: string;
                        };
                    };
                };
                /** @description Invalid request body */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Conflict - Gym already exists */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/gyms/{gymId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get gym by ID
         * @description Retrieve a specific gym by its ID
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Gym ID */
                    gymId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Gym retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Gym ID
                             * @example 550e8400-e29b-41d4-a716-446655440000
                             */
                            id: string;
                            /**
                             * @description Gym CNPJ
                             * @example 12345678000100
                             */
                            cnpj: string;
                            /**
                             * @description Gym name
                             * @example Iron Gym
                             */
                            title: string;
                            /** @description Gym description */
                            description: string | null;
                            /** @description Gym phone number */
                            phone: string | null;
                            /** @description Full gym address */
                            address: string | null;
                            /**
                             * @description Relative key of the gym image
                             * @example gyms/abc.webp
                             */
                            imageKey: string | null;
                            /**
                             * @description Latitude
                             * @example -23.5505
                             */
                            latitude: number;
                            /**
                             * @description Longitude
                             * @example -46.6333
                             */
                            longitude: number;
                        };
                    };
                };
                /** @description Invalid params */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Gym not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        /**
         * Update a gym
         * @description Update an existing gym's registration data. Requires ADMIN role
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Gym ID */
                    gymId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Gym CNPJ
                         * @example 12345678000100
                         */
                        cnpj: string;
                        /**
                         * @description Gym name
                         * @example Iron Gym
                         */
                        title: string;
                        /**
                         * @description Gym description
                         * @example A great gym
                         */
                        description?: string;
                        /**
                         * @description Gym phone number
                         * @example 11999999999
                         */
                        phone?: string;
                        /**
                         * @description Gym latitude
                         * @example -23.5505
                         */
                        latitude: number;
                        /**
                         * @description Gym longitude
                         * @example -46.6333
                         */
                        longitude: number;
                        /**
                         * @description Full gym address
                         * @example Rua das Flores, 123, São Paulo - SP
                         */
                        address: string;
                    };
                };
            };
            responses: {
                /** @description Gym updated successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @example Gym updated */
                            message: string;
                            /** @description Updated gym ID */
                            id: string;
                        };
                    };
                };
                /** @description Invalid request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message: string;
                        };
                    };
                };
                /** @description Gym not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message: string;
                        };
                    };
                };
                /** @description Conflict - CNPJ already used by another gym */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message: string;
                        };
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/gyms/search/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search gyms by name
         * @description Search for gyms by name with pagination support
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page number for pagination */
                    page?: number;
                };
                header?: never;
                path: {
                    /** @description Gym name to search */
                    name: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description List of gyms matching the search */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Gym ID
                             * @example 550e8400-e29b-41d4-a716-446655440000
                             */
                            id: string;
                            /**
                             * @description Gym name
                             * @example Iron Gym
                             */
                            title: string;
                            /** @description Gym description */
                            description: string | null;
                            /** @description Gym phone number */
                            phone: string | null;
                            /** @description Relative key of the gym image */
                            imageKey: string | null;
                            /**
                             * @description Latitude
                             * @example -23.5505
                             */
                            latitude: number;
                            /**
                             * @description Longitude
                             * @example -46.6333
                             */
                            longitude: number;
                        }[];
                    };
                };
                /** @description Invalid params */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description No gyms found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/gyms/{gymId}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload/replace a gym image
         * @description Uploads a gym image (multipart/form-data, field 'image'). Requires ADMIN role
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Gym ID */
                    gymId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Image stored */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @example gyms/abc.webp */
                            imageKey: string;
                            /** @example /uploads/gyms/abc.webp */
                            url: string;
                        };
                    };
                };
                /** @description Gym not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message: string;
                        };
                    };
                };
                /** @description File too large */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message: string;
                        };
                    };
                };
                /** @description Unsupported media type */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/check-ins": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List check-ins
         * @description List all check-ins with optional status filter. Requires ADMIN role
         */
        get: {
            parameters: {
                query: {
                    /** @description Page number */
                    page: number;
                    /** @description Filter by status */
                    status?: "pending" | "validated" | "rejected";
                    /** @description Filter by gym name (case-insensitive partial match) */
                    gymName?: string;
                    /** @description Sort order by createdAt */
                    sortOrder: "asc" | "desc";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Check-ins list retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            items: {
                                /** @description Check-in ID */
                                id: string;
                                /** @description User ID */
                                userId: string;
                                /** @description Gym ID */
                                gymId: string;
                                /** @description Gym name or null if not found */
                                gymTitle: string | null;
                                /** @description Creation date (ISO) */
                                createdAt: string;
                                /** @description Validation date (ISO) or null */
                                validatedAt: string | null;
                                /** @description Rejection date (ISO) or null */
                                rejectedAt: string | null;
                                /**
                                 * @description Computed check-in status
                                 * @enum {string}
                                 */
                                status: "pending" | "validated" | "rejected";
                                /** @description Latitude */
                                latitude: number;
                                /** @description Longitude */
                                longitude: number;
                            }[];
                            /** @description Current page */
                            page: number;
                            /** @description Total items */
                            total: number;
                        };
                    };
                };
                /** @description Invalid query params */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        put?: never;
        /**
         * Create a check-in
         * @description Create a check-in for a user at a gym. Validates proximity to gym.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Gym ID for check-in
                         * @example 660e8400-e29b-41d4-a716-446655440000
                         */
                        gymId: string;
                        /**
                         * @description User current latitude
                         * @example -23.5505
                         */
                        userLatitude: number;
                        /**
                         * @description User current longitude
                         * @example -46.6333
                         */
                        userLongitude: number;
                    };
                };
            };
            responses: {
                /** @description Check-in created successfully */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Success message
                             * @example Check-in created
                             */
                            message: string;
                            /**
                             * @description Check-in ID
                             * @example 550e8400-e29b-41d4-a716-446655440000
                             */
                            id: string;
                            /**
                             * @description Check-in date
                             * @example 2024-01-01T10:00:00Z
                             */
                            date: string;
                        };
                    };
                };
                /** @description Invalid request body */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Conflict - Already checked in or too far from gym */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/check-ins/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Validate a check-in
         * @description Validate (confirm) an existing check-in. Requires ADMIN role
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Check-in ID to validate
                         * @example 550e8400-e29b-41d4-a716-446655440000
                         */
                        checkInId: string;
                    };
                };
            };
            responses: {
                /** @description Check-in validated successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * Format: date-time
                             * @description ISO timestamp of when the check-in was validated
                             * @example 2025-01-15T12:34:56.000Z
                             */
                            validatedAt: string;
                        };
                    };
                };
                /** @description Invalid request body */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Conflict - Check-in already validated or expired */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Validate a check-in
         * @description Validate (confirm) an existing check-in. Requires ADMIN role
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Check-in ID to validate
                         * @example 550e8400-e29b-41d4-a716-446655440000
                         */
                        checkInId: string;
                    };
                };
            };
            responses: {
                /** @description Check-in validated successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * Format: date-time
                             * @description ISO timestamp of when the check-in was validated
                             * @example 2025-01-15T12:34:56.000Z
                             */
                            validatedAt: string;
                        };
                    };
                };
                /** @description Invalid request body */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Conflict - Check-in already validated or expired */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/check-ins/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Reject a check-in
         * @description Reject (cancel) an existing check-in. Requires ADMIN role
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Check-in ID to reject
                         * @example 550e8400-e29b-41d4-a716-446655440000
                         */
                        checkInId: string;
                    };
                };
            };
            responses: {
                /** @description Check-in rejected successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * Format: date-time
                             * @description ISO timestamp of when the check-in was rejected
                             * @example 2025-01-15T12:34:56.000Z
                             */
                            rejectedAt: string;
                        };
                    };
                };
                /** @description Invalid request body */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Check-in not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/check-ins/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List my check-ins
         * @description List the authenticated user's own check-in history.
         */
        get: {
            parameters: {
                query: {
                    /** @description Page number */
                    page: number;
                    /** @description Filter by status */
                    status?: "pending" | "validated" | "rejected";
                    /** @description Filter by gym name (case-insensitive partial match) */
                    gymName?: string;
                    /** @description Sort order by createdAt */
                    sortOrder: "asc" | "desc";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Check-ins list retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            items: {
                                /** @description Check-in ID */
                                id: string;
                                /** @description User ID */
                                userId: string;
                                /** @description Gym ID */
                                gymId: string;
                                /** @description Gym name or null if not found */
                                gymTitle: string | null;
                                /** @description Creation date (ISO) */
                                createdAt: string;
                                /** @description Validation date (ISO) or null */
                                validatedAt: string | null;
                                /** @description Rejection date (ISO) or null */
                                rejectedAt: string | null;
                                /**
                                 * @description Computed check-in status
                                 * @enum {string}
                                 */
                                status: "pending" | "validated" | "rejected";
                                /** @description Latitude */
                                latitude: number;
                                /** @description Longitude */
                                longitude: number;
                            }[];
                            /** @description Current page */
                            page: number;
                            /** @description Total items */
                            total: number;
                        };
                    };
                };
                /** @description Invalid query params */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/check-ins/metrics/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get user check-in metrics
         * @description Get check-in metrics (total count) for a specific user
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description User ID to get metrics for */
                    userId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description User metrics retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Total number of check-ins
                             * @example 42
                             */
                            checkInsCount: number;
                        };
                    };
                };
                /** @description Invalid params */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Forbidden — user can only access their own metrics */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/check-ins/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get check-in stats
         * @description Get aggregated check-in statistics (total, pending, validated, rejected). Requires ADMIN role.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Check-in stats retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Total number of check-ins
                             * @example 100
                             */
                            total: number;
                            /**
                             * @description Number of pending check-ins
                             * @example 40
                             */
                            pending: number;
                            /**
                             * @description Number of validated check-ins
                             * @example 50
                             */
                            validated: number;
                            /**
                             * @description Number of rejected check-ins
                             * @example 10
                             */
                            rejected: number;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/check-ins/me/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get my check-in stats
         * @description Get aggregated check-in statistics for the authenticated user (total, pending, validated, rejected).
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Check-in stats retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Total number of check-ins
                             * @example 10
                             */
                            total: number;
                            /**
                             * @description Number of pending check-ins
                             * @example 2
                             */
                            pending: number;
                            /**
                             * @description Number of validated check-ins
                             * @example 7
                             */
                            validated: number;
                            /**
                             * @description Number of rejected check-ins
                             * @example 1
                             */
                            rejected: number;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Authenticate user
         * @description Authenticate with email and password to obtain JWT token and refresh token cookie
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * Format: email
                         * @description User email address
                         * @example john@example.com
                         */
                        email: string;
                        /**
                         * @description User password
                         * @example secret123
                         */
                        password: string;
                    };
                };
            };
            responses: {
                /** @description Authentication successful */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description JWT access token
                             * @example eyJhbG...
                             */
                            token: string;
                            /**
                             * @description Refresh token
                             * @example eyJhbG...
                             */
                            refreshToken: string;
                        };
                    };
                };
                /** @description Invalid request body */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Authentication error */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/google": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Authenticate user with Google
         * @description Authenticate with a Google ID token to obtain JWT token and refresh token cookie
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Google ID token
                         * @example eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
                         */
                        idToken: string;
                    };
                };
            };
            responses: {
                /** @description Authentication successful */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description JWT access token
                             * @example eyJhbG...
                             */
                            token: string;
                            /**
                             * @description Refresh token
                             * @example eyJhbG...
                             */
                            refreshToken: string;
                        };
                    };
                };
                /** @description Invalid request body */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Invalid Google token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Authentication conflict for Google external account */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Machine-readable conflict code
                             * @example external_account_link_required
                             */
                            code?: string;
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Google email is not verified */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Logout user
         * @description Logout user, revoke session and clear refresh token cookie
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Logout successful */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Session already revoked or unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health-check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health check
         * @description Check if the API is healthy and responding
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description API is healthy */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            status: string;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/subscriptions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a Stripe subscription for the authenticated user
         * @description Creates a Stripe subscription using a Payment Method tokenized on the frontend.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Stripe Price ID
                         * @example price_1abc123
                         */
                        priceId: string;
                        /**
                         * @description Stripe Payment Method ID
                         * @example pm_1xyz789
                         */
                        paymentMethodId: string;
                    };
                };
            };
            responses: {
                /** @description Subscription created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Created subscription ID
                             * @example sub_1abc123
                             */
                            subscriptionId: string;
                            /**
                             * @description Subscription status
                             * @example active
                             */
                            status: string;
                        };
                    };
                };
                /** @description Invalid body */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Billing customer not provisioned */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/webhook/stripe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Stripe webhook endpoint
         * @description Receives Stripe webhook events. The raw body is verified using the stripe-signature header.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Webhook event processed successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Invalid Stripe signature */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message: string;
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/plans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Default Response */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List notifications
         * @description List notifications for the authenticated user.
         */
        get: {
            parameters: {
                query: {
                    /** @description Page number */
                    page: number;
                    /** @description Filter only unread notifications */
                    unreadOnly: boolean;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Notifications retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Notifications list */
                            notifications: {
                                /**
                                 * Format: uuid
                                 * @description Notification ID
                                 */
                                id: string;
                                /**
                                 * @description Notification type
                                 * @enum {string}
                                 */
                                type: "CHECK_IN_APPROVED" | "CHECK_IN_REJECTED" | "SECURITY_ALERT" | "PROMOTION";
                                /** @description Notification title */
                                title: string;
                                /** @description Notification message */
                                message: string;
                                /** @description Gym name */
                                gymName: string | null;
                                /** @description Notification reason */
                                reason: string | null;
                                /** @description ISO timestamp when notification was read */
                                readAt: string | null;
                                /**
                                 * Format: date-time
                                 * @description ISO timestamp when notification was created
                                 */
                                createdAt: string;
                            }[];
                            /** @description Total notifications found */
                            total: number;
                        };
                    };
                };
                /** @description Invalid query params */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications/unread-count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get unread notifications count
         * @description Get the unread notifications count for the authenticated user.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Unread notifications count retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Unread notifications count */
                            count: number;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications/{id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Mark notification as read
         * @description Mark a notification as read for the authenticated user.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Notification ID */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Notification marked as read successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * Format: date-time
                             * @description ISO timestamp when notification was marked as read
                             */
                            readAt: string;
                        };
                    };
                };
                /** @description Invalid params */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Notification not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Error message */
                            message: string;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/notifications/read-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Mark all notifications as read
         * @description Mark all unread notifications as read for the authenticated user.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Notifications marked as read successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Number of notifications marked as read */
                            markedCount: number;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/notifications/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Stream notifications
         * @description Open a Server-Sent Events stream with realtime notifications for the authenticated user.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description SSE stream connected */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            [key: string]: unknown;
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/analytics/checkins": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fetch check-in analytics
         * @description Returns check-in totals, daily series and hourly distribution for the given period.
         */
        get: {
            parameters: {
                query: {
                    period: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Check-in analytics retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Total check-ins in period */
                            totalCheckIns: number;
                            /** @description Daily check-in counts */
                            dailySeries: {
                                /** @description Date (YYYY-MM-DD) */
                                date: string;
                                /** @description Count for this period */
                                count: number;
                            }[];
                            /** @description Check-in counts per hour of day */
                            hourlyDistribution: {
                                /** @description Hour of day (0-23) */
                                hour: number;
                                /** @description Check-in count for this hour */
                                count: number;
                            }[];
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/analytics/retention": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fetch retention analytics
         * @description Returns active/inactive member counts, churn rate and at-risk members list.
         */
        get: {
            parameters: {
                query: {
                    period: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Retention analytics retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Members active in last 30 days */
                            activeCount: number;
                            /** @description Members inactive for 30+ days */
                            inactiveCount: number;
                            /** @description Churn rate percentage (0-100) */
                            churnRate: number;
                            /** @description Members with no check-in in the last 14 days */
                            atRiskMembers: {
                                /** @description User ID */
                                id: string;
                                /** @description User name */
                                name: string;
                                /** @description Days since last check-in */
                                daysSinceLastCheckIn: number;
                            }[];
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/analytics/growth": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fetch growth analytics
         * @description Returns total members, new members count, period series and active members trend.
         */
        get: {
            parameters: {
                query: {
                    period: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Growth analytics retrieved successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @description Total members up to period end */
                            totalMembers: number;
                            /** @description New members in period */
                            newMembersCount: number;
                            /** @description New members grouped by day or week */
                            newMembersPerPeriod: {
                                /** @description Date (YYYY-MM-DD) */
                                date: string;
                                /** @description Count for this period */
                                count: number;
                            }[];
                            /** @description Active members trend grouped by day or week */
                            activeMembersTrend: {
                                /** @description Date (YYYY-MM-DD) */
                                date: string;
                                /** @description Count for this period */
                                count: number;
                            }[];
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/contact": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Default Response */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
