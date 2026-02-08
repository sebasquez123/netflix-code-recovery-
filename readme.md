# phit-api

This is the NestJS backend webserver for the PHIT health and fitness platform.

# Local Development

Pre-requisites:

- Node 22.19.x
- (optional) Docker Desktop (and `docker` command line tool)

``` bash
# install dependencies
npm install

# set up local environment
cp .env.example .env
```

# Docker

### 1. Crear archivo .env con las variables de producción

cp .env.production.example .env

### Editar .env con los valores reales

### 2. Construir y ejecutar

docker compose build
docker compose up -d

### 3. Ver logs

docker compose logs -f api


# Local development 

docker compose -f docker-compose.dev.yml up --build