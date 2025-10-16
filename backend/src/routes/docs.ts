/**
 * OpenAPI/Swagger Documentation Configuration
 * Comprehensive API documentation for HaloBuzz Backend
 */

import { Router } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HaloBuzz Backend API',
      version: '1.0.0',
      description: 'Production-ready Node.js backend for the HaloBuzz platform',
      contact: {
        name: 'HaloBuzz Development Team',
        email: 'dev@halobuzz.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.halobuzz.com/api/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'ObjectId',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Unique username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            displayName: {
              type: 'string',
              description: 'Display name'
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'Avatar URL'
            },
            country: {
              type: 'string',
              description: 'Country code'
            },
            language: {
              type: 'string',
              description: 'Language preference'
            },
            isVerified: {
              type: 'boolean',
              description: 'Account verification status'
            },
            role: {
              type: 'string',
              enum: ['user', 'moderator', 'admin', 'super_admin'],
              description: 'User role'
            },
            coins: {
              type: 'object',
              properties: {
                balance: {
                  type: 'number',
                  description: 'Current coin balance'
                },
                bonusBalance: {
                  type: 'number',
                  description: 'Bonus coin balance'
                },
                totalEarned: {
                  type: 'number',
                  description: 'Total coins earned'
                },
                totalSpent: {
                  type: 'number',
                  description: 'Total coins spent'
                }
              }
            },
            trust: {
              type: 'object',
              properties: {
                score: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: 'Trust score'
                },
                level: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'verified'],
                  description: 'Trust level'
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date'
            },
            lastActiveAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last activity date'
            }
          }
        },
        Gift: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'ObjectId',
              description: 'Gift ID'
            },
            senderId: {
              type: 'string',
              format: 'ObjectId',
              description: 'Sender user ID'
            },
            recipientId: {
              type: 'string',
              format: 'ObjectId',
              description: 'Recipient user ID'
            },
            senderUsername: {
              type: 'string',
              description: 'Sender username'
            },
            recipientUsername: {
              type: 'string',
              description: 'Recipient username'
            },
            amount: {
              type: 'number',
              minimum: 1,
              description: 'Gift amount'
            },
            type: {
              type: 'string',
              enum: ['coin', 'diamond', 'rose', 'heart', 'star', 'crown', 'trophy', 'medal'],
              description: 'Gift type'
            },
            message: {
              type: 'string',
              description: 'Gift message'
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'cancelled'],
              description: 'Gift status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Gift creation date'
            }
          }
        },
        LiveStream: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'ObjectId',
              description: 'Stream ID'
            },
            userId: {
              type: 'string',
              format: 'ObjectId',
              description: 'Streamer user ID'
            },
            title: {
              type: 'string',
              description: 'Stream title'
            },
            description: {
              type: 'string',
              description: 'Stream description'
            },
            status: {
              type: 'string',
              enum: ['live', 'scheduled', 'completed', 'cancelled'],
              description: 'Stream status'
            },
            category: {
              type: 'string',
              description: 'Stream category'
            },
            viewerCount: {
              type: 'number',
              description: 'Current viewer count'
            },
            maxViewers: {
              type: 'number',
              description: 'Maximum viewers reached'
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              description: 'Stream start time'
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              description: 'Stream end time'
            }
          }
        },
        GameSession: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'ObjectId',
              description: 'Session ID'
            },
            sessionId: {
              type: 'string',
              description: 'Unique session identifier'
            },
            gameId: {
              type: 'string',
              description: 'Game identifier'
            },
            userId: {
              type: 'string',
              format: 'ObjectId',
              description: 'Player user ID'
            },
            entryFee: {
              type: 'number',
              description: 'Entry fee paid'
            },
            reward: {
              type: 'number',
              description: 'Reward earned'
            },
            score: {
              type: 'number',
              description: 'Game score achieved'
            },
            rank: {
              type: 'number',
              description: 'Player ranking'
            },
            status: {
              type: 'string',
              enum: ['playing', 'completed', 'abandoned', 'disqualified'],
              description: 'Session status'
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              description: 'Session start time'
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              description: 'Session end time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            },
            statusCode: {
              type: 'number',
              description: 'HTTP status code'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            },
            requestId: {
              type: 'string',
              description: 'Request identifier'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            message: {
              type: 'string',
              description: 'Success message'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Access denied. No token provided.',
                statusCode: 401
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Insufficient permissions',
                statusCode: 403
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Resource not found',
                statusCode: 404
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Validation failed',
                statusCode: 400,
                errors: [
                  {
                    field: 'email',
                    message: 'Invalid email format',
                    value: 'invalid-email'
                  }
                ]
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Internal server error',
                statusCode: 500
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User management and profiles'
      },
      {
        name: 'Gifts',
        description: 'Gift economy and transactions'
      },
      {
        name: 'Streams',
        description: 'Live streaming functionality'
      },
      {
        name: 'Games',
        description: 'Gaming platform and sessions'
      },
      {
        name: 'Admin',
        description: 'Administrative functions (admin only)'
      },
      {
        name: 'Monitoring',
        description: 'System monitoring and health checks'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/admin/*.ts',
    './src/routes/admin/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

const router = Router();

// Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'HaloBuzz API Documentation'
}));

// JSON spec endpoint
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

export default router;
