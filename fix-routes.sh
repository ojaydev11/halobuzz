#!/bin/bash

# Fix all route files to use proper Fastify patterns
cd backend/src/routes

for file in *.ts; do
    echo "Fixing $file..."
    
    # Add imports and middleware functions if they don't exist
    if ! grep -q "import jwt from 'jsonwebtoken';" "$file"; then
        sed -i '1a import jwt from '\''jsonwebtoken'\'';' "$file"
    fi
    
    # Add middleware functions if they don't exist
    if ! grep -q "const authenticate = async" "$file"; then
        sed -i '/import jwt from/a\
\
// Simple authentication middleware for Fastify\
const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {\
  const token = request.headers.authorization?.replace('\''Bearer '\'', '\''\'');\
  if (!token) {\
    return reply.status(401).send({ error: '\''Unauthorized'\'' });\
  }\
  try {\
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);\
    (request as any).user = decoded;\
  } catch (error) {\
    return reply.status(401).send({ error: '\''Invalid token'\'' });\
  }\
};\
\
// Simple admin middleware for Fastify\
const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {\
  const user = (request as any).user;\
  if (!user || user.role !== '\''admin'\'') {\
    return reply.status(403).send({ error: '\''Admin access required'\'' });\
  }\
};' "$file"
    fi
    
    # Replace fastify.authenticate with authenticate
    sed -i 's/fastify\.authenticate/authenticate/g' "$file"
    
    # Replace fastify.requireAdmin with requireAdmin
    sed -i 's/fastify\.requireAdmin/requireAdmin/g' "$file"
    
    # Replace .json( with .send(
    sed -i 's/\.json(/\.send(/g' "$file"
done

echo "All route files fixed!"
