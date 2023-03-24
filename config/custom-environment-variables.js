module.exports = {
  featureBookStructure: 'FEATURE_BOOK_STRUCTURE',
  featureUploadDOCXFiles: 'FEATURE_UPLOAD_DOCX_FILES',
  tempDirectoryCleanUp: 'TEMP_DIRECTORY_CLEAN_UP',
  tempDirectoryCRONJobSchedule: 'TEMP_DIRECTORY_CRON_JOB_SCHEDULE',
  tempDirectoryCRONJobOffset: 'TEMP_DIRECTORY_CRON_JOB_OFFSET',
  serverIdentifier: 'SERVER_IDENTIFIER',
  flavour: 'KETIDA_FLAVOUR',
  'pubsweet-server': {
    admin: {
      username: 'ADMIN_USERNAME',
      password: 'ADMIN_PASSWORD',
      givenNames: 'ADMIN_GIVEN_NAME',
      surname: 'ADMIN_SURNAME',
      email: 'ADMIN_EMAIL',
    },
    port: 'SERVER_PORT',
    protocol: 'SERVER_PROTOCOL',
    host: 'SERVER_HOST',
    secret: 'PUBSWEET_SECRET',
    serveClient: 'SERVER_SERVE_CLIENT',
    serverUrl: 'SERVER_URL',
    WSServerPort: 'WS_SERVER_PORT',
    wsHeartbeatInterval: 'WS_HEARTBEAT_INTERVAL',
    failSafeUnlockingInterval: 'FAIL_SAFE_UNLOCKING_INTERVAL',
    db: {
      user: 'POSTGRES_USER',
      password: 'POSTGRES_PASSWORD',
      host: 'POSTGRES_HOST',
      database: 'POSTGRES_DB',
      port: 'POSTGRES_PORT',
    },
  },
  clientUrl: 'CLIENT_URL',
  services: {
    epubChecker: {
      clientId: 'SERVICE_EPUB_CHECKER_CLIENT_ID',
      clientSecret: 'SERVICE_EPUB_CHECKER_SECRET',
      url: 'SERVICE_EPUB_CHECKER_URL',
    },
    icml: {
      clientId: 'SERVICE_ICML_CLIENT_ID',
      clientSecret: 'SERVICE_ICML_SECRET',
      url: 'SERVICE_ICML_URL',
    },
    pagedjs: {
      clientId: 'SERVICE_PAGEDJS_CLIENT_ID',
      clientSecret: 'SERVICE_PAGEDJS_SECRET',
      url: 'SERVICE_PAGEDJS_URL',
    },
    xsweet: {
      clientId: 'SERVICE_XSWEET_CLIENT_ID',
      clientSecret: 'SERVICE_XSWEET_SECRET',
      url: 'SERVICE_XSWEET_URL',
    },
  },
  fileStorage: {
    accessKeyId: 'S3_ACCESS_KEY_ID_USER',
    secretAccessKey: 'S3_SECRET_ACCESS_KEY_USER',
    bucket: 'S3_BUCKET',
    protocol: 'S3_PROTOCOL',
    host: 'S3_HOST',
    port: 'S3_PORT',
    minioConsolePort: 'MINIO_CONSOLE_PORT',
    maximumWidthForSmallImages: 'MAXIMUM_WIDTH_FOR_SMALL_IMAGES',
    maximumWidthForMediumImages: 'MAXIMUM_WIDTH_FOR_MEDIUM_IMAGES',
  },
  'password-reset': {
    pathToPage: 'PASSWORD_RESET_PATH_TO_PAGE',
  },
  mailer: {
    from: 'MAILER_SENDER',
    transport: {
      host: 'MAILER_HOSTNAME',
      auth: {
        user: 'MAILER_USER',
        pass: 'MAILER_PASSWORD',
      },
    },
  },
  chatGPT: {
    key: 'CHAT_GPT_KEY',
  },
}
