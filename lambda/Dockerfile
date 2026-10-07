ARG FUNCTION_DIR="/var/task"

FROM node:lts-trixie AS build-image
SHELL ["bash", "-c"]

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    ca-certificates g++ make cmake unzip libcurl4-openssl-dev

ARG FUNCTION_DIR
WORKDIR ${FUNCTION_DIR}

COPY --chmod=go+rX package.json package.json
RUN npm config set fetch-timeout 300000 && npm i aws-lambda-ric \
 && npm i --omit=dev

FROM node:lts-trixie-slim
SHELL ["bash", "-c"]

ARG FUNCTION_DIR
WORKDIR ${FUNCTION_DIR}

COPY --from=build-image ${FUNCTION_DIR} .
COPY --chmod=go+rX app app
COPY --chmod=go+rX index.js .
COPY --chmod=go+rX lambda.js .

ENV NPM_CONFIG_CACHE=/tmp/.npm
ENTRYPOINT ["npx", "aws-lambda-ric"]
CMD ["lambda.handler"]
