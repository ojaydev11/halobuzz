#!/bin/bash

# Fix all route files to use proper Fastify patterns
cd backend/src/routes

for file in *.ts; do
    echo "Fixing $file..."
    
    # Replace .json( with .send(
    sed -i 's/\.json(/\.send(/g' "$file"
    
    # Replace reply.status(XXX).json( with reply.status(XXX).send(
    sed -i 's/reply\.status([0-9]\+)\.json(/reply.status(\1).send(/g' "$file"
    
    # Replace fastify.authenticate with authenticate
    sed -i 's/fastify\.authenticate/authenticate/g' "$file"
    
    # Replace fastify.requireAdmin with requireAdmin
    sed -i 's/fastify\.requireAdmin/requireAdmin/g' "$file"
done

echo "All route files fixed!"
