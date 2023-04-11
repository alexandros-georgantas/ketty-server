# Ketida Server

## Quick Start

If you want to check Ketida Platform you should check the quick start guide of `vanilla-client` found [here](https://gitlab.coko.foundation/ketida/vanilla-client/-/blob/main/)

## Prerequisites

The following components should be up and running before Ketida Server:

- Ketida Server database
- EPUBchecker Service server
- EPUBchecker Service database
- PagedJS Service server
- PagedJS Service database
- XSweet Service server
- XSweet Service database
- ICML Service server
- ICML Service database
- Min:io server or configured S3 object store

## Process

To deploy Ketida Server in production, the following steps should be followed:

- Create a postgres database with a user

```
CREATE DATABASE <ketida_db_name>;
CREATE USER <ketida_db_user> WITH ENCRYPTED PASSWORD <ketida_db_user_password>;
GRANT ALL PRIVILEGES ON DATABASE <ketida_db_name> TO <ketida_db_user>;
```

- Alter the permissions of the created user

`ALTER ROLE <ketida_db_user> SUPERUSER;`

As the service is using `pgboss` (job queue manager), a specific extension is needed for the database (you can read more [here](https://github.com/timgit/pg-boss/blob/master/docs/usage.md#database-install)).

In order to add the extension you should execute `CREATE EXTENSION IF NOT EXISTS pgcrypto;`

Create a compose file and use Ketida's server pre-built image that you can find it [here](https://hub.docker.com/r/cokoapps/ketida-server)
e.g. example docker compose file [here](https://gitlab.coko.foundation/ketida/server/-/blob/main/docker-compose.production.ymld)

The server requires the following environment variables to be passed to its context:

```
SERVER_IDENTIFIER
KETIDA_FLAVOUR
PUBSWEET_SECRET
SERVER_URL
CLIENT_URL
POSTGRES_HOST
POSTGRES_PORT
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
ADMIN_USERNAME
ADMIN_PASSWORD
ADMIN_GIVEN_NAME
ADMIN_SURNAME
ADMIN_EMAIL
SERVER_PORT
WS_SERVER_PORT
WS_HEARTBEAT_INTERVAL
FAIL_SAFE_UNLOCKING_INTERVAL
MAILER_USER
MAILER_PASSWORD
MAILER_SENDER
MAILER_HOSTNAME
PASSWORD_RESET_PATH_TO_PAGE
S3_PROTOCOL
S3_HOST
S3_PORT
S3_ACCESS_KEY_ID_USER
S3_SECRET_ACCESS_KEY_USER
S3_BUCKET
SERVICE_EPUB_CHECKER_CLIENT_ID
SERVICE_EPUB_CHECKER_SECRET
SERVICE_EPUB_CHECKER_URL
SERVICE_ICML_CLIENT_ID
SERVICE_ICML_SECRET
SERVICE_ICML_URL
SERVICE_PAGEDJS_CLIENT_ID
SERVICE_PAGEDJS_SECRET
SERVICE_PAGEDJS_URL
SERVICE_XSWEET_CLIENT_ID
SERVICE_XSWEET_SECRET
SERVICE_XSWEET_URL
FEATURE_UPLOAD_DOCX_FILES
FEATURE_BOOK_STRUCTURE
TEMP_DIRECTORY_CRON_JOB_SCHEDULE
TEMP_DIRECTORY_CRON_JOB_OFFSET
TEMP_DIRECTORY_CLEAN_UP
```

- **SERVER_IDENTIFIER:** a string which will uniqlly identify the specific server instance
- **KETIDA_FLAVOUR:** the value of this variable should be `VANILLA`
- **PUBSWEET_SECRET:** a string which will be used for hashing
- **SERVER_URL:** the public `URL` of the server where it will be accessible for the outside world e.g. editoria.organization.com
- **CLIENT_URL:** the public `URL` of the client web app where it will be accessible for the outside world e.g. editoria.organization.com
- **POSTGRES_HOST:** the url of db's host
- **POSTGRES_PORT:** the port where the db is listening
- **POSTGRES_DB:** the name of the db you have created
- **POSTGRES_USER:** the user name of the db user you have created
- **POSTGRES_PASSWORD:** the password of the db user you have created
- **ADMIN_USERNAME:** the preferred username for the admin user who will be created automatically when the platform boots for the first time
- **ADMIN_PASSWORD:** the preferred password for the admin user who will be created automatically when the platform boots for the first time
- **ADMIN_GIVEN_NAME:** the given name of the admin user who will be created automatically when the platform boots for the first time
- **ADMIN_SURNAME:** the surname of the admin user who will be created automatically when the platform boots for the first time
- **ADMIN_EMAIL:** the email of the admin user who will be created automatically when the platform boots for the first time
- **SERVER_PORT:** the server's port
- **WS_SERVER_PORT:** the websocket server port
- **WS_HEARTBEAT_INTERVAL:** the interval between `ping-pong` action needed for broken connections detection (integer in milliseconds, default value 10000)
- **FAIL_SAFE_UNLOCKING_INTERVAL:** the interval for checking of orphan or idle chapter locks (integer in milliseconds, default value 12000)
- **MAILER_USER:** username of your mailing server
- **MAILER_PASSWORD:** password of your mailing server
- **MAILER_SENDER:** sender's email account displayed in the reset password email
- **MAILER_HOSTNAME:** URL of your smtp server
- **PASSWORD_RESET_PATH_TO_PAGE:** this value should be `/password-reset`
- **S3_PROTOCOL:** `http` or `https` based on your setup of the file server
- **S3_HOST:** the domain of your file server
- **S3_PORT:** the server port of your file server if exists e.g. if your file server is behind a reverse proxy then this variable is not needed
- **S3_ACCESS_KEY_ID_USER:** the username of the editoria user created during the configuration of your file server
- **S3_SECRET_ACCESS_KEY_USER:** the password of the editoria user created during the configuration of your file server
- **S3_BUCKET:** this value should be `uploads`
- **SERVICE_EPUB_CHECKER_CLIENT_ID:** the client id produced when you configured EPUBChecker service
- **SERVICE_EPUB_CHECKER_SECRET:** the client secret produced when you configured EPUBChecker service
- **SERVICE_EPUB_CHECKER_URL:** the public `URL` of the EPUBChecker microservice
- **SERVICE_ICML_CLIENT_ID:** the client id produced when you configured ICML service
- **SERVICE_ICML_SECRET:** the client secret produced when you configured ICML service
- **SERVICE_ICML_URL:** the public `URL` of the ICML microservice
- **SERVICE_PAGEDJS_CLIENT_ID:** the client id produced when you configured PagedJS service
- **SERVICE_PAGEDJS_SECRET:** the client secret produced when you configured PagedJS service
- **SERVICE_PAGEDJS_URL:** the public `URL` of the PagedJS microservice
- **SERVICE_XSWEET_CLIENT_ID:** the client id produced when you configured XSweet service
- **SERVICE_XSWEET_SECRET:** the client secret produced when you configured XSweet service
- **SERVICE_XSWEET_URL:** the public `URL` of the XSweet microservice
- **FEATURE_UPLOAD_DOCX_FILES:** true/false flag which enables/disables the ingest docx files feature
- **FEATURE_BOOK_STRUCTURE:** true/false flag which enables/disables the book planner feature
- **TEMP_DIRECTORY_CRON_JOB_SCHEDULE:** string which represents when the clean-up of tmp folder should trigger (cron format, defaults to `0 * * * *`)
- **TEMP_DIRECTORY_CRON_JOB_OFFSET:** integer which represents the max amount of passed minutes after the creation of a tmp file where it should be picked up and removed by the clean-up process (value in milliseconds, defaults to 30 minutes)
- **TEMP_DIRECTORY_CLEAN_UP:** true/false flag which enables/disables the clean-up of tmp files created during export to various formats
