# General Requirements

Ketida server is the core reusable component of our publishing platform build on top of [Coko Server](https://gitlab.coko.foundation/cokoapps/server). The technologies used for the development of the server are:

- [Node.js](https://nodejs.org/en/) v16.x (backend)
- [Postgres](https://www.postgresql.org/) v14 (persistance layer)
- [GraphQL](https://www.apollographql.com/)

We provide a pre-built image of Ketida's server for easier deployment and you can find it [here](https://hub.docker.com/r/cokoapps/ketty-server)

## Docker

The server is fully dockerized and plays nicely with Docker version 20.10.23 and Compose 2.15.1

- [Installing docker](https://docs.docker.com/engine/install)
- [Docker without sudo](https://docs.docker.com/engine/install/linux-postinstall/)
- [Installing Docker Compose](https://docs.docker.com/compose/install/)

## Postgres

Our choice for database is Postgres. You can find more about this db solution [here](https://www.postgresql.org/docs/12/index.html).

## Object Storage

Ketida server requires a file sever (object storage) in order to provide its functionality. Our preferred solution is [min.io](https://min.io/), however Amazon's [S3](https://aws.amazon.com/s3/) could be used interchangeably.

## Services

Ketida server is based on a microservices approach to ensure scalability. This means that it is heavily relying on the following services:

### XSweet Service

XSweet Service is a wrapper on top of XSweet library, which allows users of Ketida platform to upload docx files and convert them into HTML (which is the format the Ketida's editor, [Wax](https://gitlab.coko.foundation/wax/wax-prosemirror), understands). More info about Xsweet can be found [here](https://xsweet.org/).

_XSweet service is a requirement in order Ketida platform to function properly. It should be up and running before someone tries to deploy the actual Ketida platform._

[XSweet microservice pre-built image](https://hub.docker.com/r/cokoapps/xsweet)

### EPUBchecker Service

EPUBchecker service is a wrapper on top of [epubcheck](https://github.com/w3c/epubcheck) validator provided by IDPF. This service ensures that all of the EPUBs produced by Ketida platform are valid [EPUBv3](https://www.w3.org/TR/epub-overview-33/) and accessible based on WCAG 2.0 A standard.

_EPUBchecker service is a requirement in order Ketida platform to function properly. It should be up and running before someone tries to deploy the actual Ketida platform._

[EPUBChecker microservice pre-built image](https://hub.docker.com/r/cokoapps/epubchecker)

### PagedJS Service

PagedJS service allows Ketida platform to export books to PDF format as well as facilitate the visual design process. This is possible due to the use of Coko's [PagedJS](https://www.pagedjs.org/) library.

_PagedJS service is a requirement in order Ketida platform to function properly. It should be up and running before someone tries to deploy the actual Ketida platform._

[PagedJS microservice pre-built image](https://hub.docker.com/r/cokoapps/pagedjs)

### ICML Service

This service allows Ketida platform to export its books to ICML format via the use of [Pandoc](https://pandoc.org/) library

_ICML service is a requirement in order Ketida platform to function properly. It should be up and running before someone tries to deploy the actual Ketida platform._

[ICML microservice pre-built image](https://hub.docker.com/r/cokoapps/icml)
