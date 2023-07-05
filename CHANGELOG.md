## [1.8.1](https://gitlab.coko.foundation/ketida/server/compare/v1.8.0...v1.8.1) (2023-07-05)


### Bug Fixes

* passing authors consistently for the case of epub ([9b996cf](https://gitlab.coko.foundation/ketida/server/commit/9b996cf818879b3455938bd6ad91ead71657c6bb))

# [1.8.0](https://gitlab.coko.foundation/ketida/server/compare/v1.7.0...v1.8.0) (2023-07-04)


### Bug Fixes

* **api/graphql:** do not wrap user data inside user key ([0ca958d](https://gitlab.coko.foundation/ketida/server/commit/0ca958dd47e54163c1c1feb703c50dde5ff559da))
* **api/graphql:** pass correct variables to updateTeamMemberStatus ([9bba135](https://gitlab.coko.foundation/ketida/server/commit/9bba1357c7664286e0cab35414c5bc2cc7a22ccd))
* **api/graphql:** pass the correct params in exporter ([bc00a85](https://gitlab.coko.foundation/ketida/server/commit/bc00a856e5ad3c5542b9e2dd4d9d6157c42642c4))
* **api/graphql:** remove subscription addTeamMembers ([1975ef3](https://gitlab.coko.foundation/ketida/server/commit/1975ef316fd0479c233a6e2bab4d9864e1710d37))
* **api/graphql:** return correct object for subscription ([e9361c4](https://gitlab.coko.foundation/ketida/server/commit/e9361c46ec213d0c8aedad471aff16380390099d))
* **api/graphql:** team update subscriptions ([42fcb82](https://gitlab.coko.foundation/ketida/server/commit/42fcb827af769453d2e9bfd61bd3e719f194f79a))
* **controllers:** correct serch logic implemented ([0b97db1](https://gitlab.coko.foundation/ketida/server/commit/0b97db1f8dd228004262843812a8905fdcb571ef))
* **controllers:** fix image handler for xsweet and linting error ([8f6a187](https://gitlab.coko.foundation/ketida/server/commit/8f6a18719b0422a09f381e0acb257dcba855b9fc))
* **controllers:** minor fixes in export and htmlGenerator ([f2be61c](https://gitlab.coko.foundation/ketida/server/commit/f2be61cd0d6cba13d1308f368cdade51c7adfc38))


### Features

* added copyrights-page to book division ([92741a8](https://gitlab.coko.foundation/ketida/server/commit/92741a87a596df6064808b0d2d7c6e8b8edd69c5))
* added status property to team members ([0be3c07](https://gitlab.coko.foundation/ketida/server/commit/0be3c0701e0680426dadbf31ce7a0d4c533791a9))
* added title-page to book division ([04d2158](https://gitlab.coko.foundation/ketida/server/commit/04d2158878972bf5df49dfefbb28b21643338f38))
* additional export options added ([a5aed8e](https://gitlab.coko.foundation/ketida/server/commit/a5aed8e8174c341d5976e4bf5c83da4914951cf6))
* **api/graphql:** exporter functionality added, templates creation corrected ([c301067](https://gitlab.coko.foundation/ketida/server/commit/c3010670585bcc3b170c5d6e7a35205b3fb666a3))
* **api/graphql:** mutation to add team members ([ae197a9](https://gitlab.coko.foundation/ketida/server/commit/ae197a974c85c9a71c0c675363a7926b01ad6c62))
* **Book:** Add status property to Book model ([3fb0145](https://gitlab.coko.foundation/ketida/server/commit/3fb014596f360431257a486b75658a1d25d07c19))
* **controllers:** auto copyrights page added ([c8c3cae](https://gitlab.coko.foundation/ketida/server/commit/c8c3cae99cfa2674701bd4ef6ea0d5f5e71d6e09))
* for POD client auto generate copyright page ([5b66beb](https://gitlab.coko.foundation/ketida/server/commit/5b66bebe2b0a0d800ac626d0d4892318fafa6b25))
* for POD client auto generate copyright page ([f68fcf5](https://gitlab.coko.foundation/ketida/server/commit/f68fcf5be8c726f07c9d94968a1733adea98682c))
* for POD client auto generate title page ([dd41139](https://gitlab.coko.foundation/ketida/server/commit/dd4113917f732df2a8f59e95d0dd8fec74c0995a))
* implement code review feedbacks ([edb1a8a](https://gitlab.coko.foundation/ketida/server/commit/edb1a8a16414080edc141034a26db33f15229d25))
* modified searchUser method, added exactMatch for POD usecase ([64cbf35](https://gitlab.coko.foundation/ketida/server/commit/64cbf3532d0c91cf97f49eb0a57adef09bdad437))
* pod query for templates and graphql schema additions ([b1c9709](https://gitlab.coko.foundation/ketida/server/commit/b1c9709db6c2d9dea5f1dcfebf38def296edc60c))
* removed extra check for exactMatch ([9cd3b76](https://gitlab.coko.foundation/ketida/server/commit/9cd3b767b78fbc890387e23d13618455847c858d))
* removed unused variable ([4c7116b](https://gitlab.coko.foundation/ketida/server/commit/4c7116b3c2948c2cb5572094b1de5abc3807d66a))
* use config to fetch pod enabled state and other feedbacks ([3cf7dcf](https://gitlab.coko.foundation/ketida/server/commit/3cf7dcf5afcc59c9070c629be5a1a57887b76146))

# [1.7.0](https://gitlab.coko.foundation/ketida/server/compare/v1.6.0...v1.7.0) (2023-05-24)


### Bug Fixes

* fixes for permissions and getBooks ([e21f96a](https://gitlab.coko.foundation/ketida/server/commit/e21f96aeac28245db2cbfcea85cd9dabc19208ed))
* fixes for the testing env ([3eaa148](https://gitlab.coko.foundation/ketida/server/commit/3eaa1480a8bb2c3abc861abd8b9ea2036fd9b62a))
* fixes needed for pod client interactions ([cfa133a](https://gitlab.coko.foundation/ketida/server/commit/cfa133a1221fbbefcb3c717fb027297097206ddc))

# [1.6.0](https://gitlab.coko.foundation/ketida/server/compare/v1.5.0...v1.6.0) (2023-05-16)


### Bug Fixes

* clean slashes in templates config ([d55ad69](https://gitlab.coko.foundation/ketida/server/commit/d55ad69e8ddfbd0691fefcf75d41463828349067))
* fixes in templates configuration and cleanups ([db1fff1](https://gitlab.coko.foundation/ketida/server/commit/db1fff1cd6b69cfcf04a4beed9e497ea0e53bbb4))
* **models:** getbooks query fix ([02f35a1](https://gitlab.coko.foundation/ketida/server/commit/02f35a16f6ca102f6a3c74434f950629205d97a8))


### Features

* added new teams and permissions for lulu ([fbdfddb](https://gitlab.coko.foundation/ketida/server/commit/fbdfddb62a3b9715ba1268e07affc1c0b77fc7d6))
* added pagination support ([0fa76f0](https://gitlab.coko.foundation/ketida/server/commit/0fa76f06a3a5dd9b69bf474faa99d86577b4c5e6))
* added pagination support ([51074a2](https://gitlab.coko.foundation/ketida/server/commit/51074a237dc97d551a7a0b5a64dad9ba5dd10c4a))
* make collectionId optional for books ([0dd7241](https://gitlab.coko.foundation/ketida/server/commit/0dd72414b21b031e9cdfdcaa5f07e0341fd441fd))
* removed unwanted changes ([346b0b7](https://gitlab.coko.foundation/ketida/server/commit/346b0b740ef4179c7844c9cd674cd1a7e40ce372))
* removed unwanted changes ([c75feb5](https://gitlab.coko.foundation/ketida/server/commit/c75feb52ad28852fb279ac13ca0d4f3ae7342770))
* updated getBooks query and made collectionId optional ([c0cc050](https://gitlab.coko.foundation/ketida/server/commit/c0cc05033eb0e52375cf7e912f0722f1fa883e4f))
* updated getBooks query and made collectionId optional ([07a6b1d](https://gitlab.coko.foundation/ketida/server/commit/07a6b1dae162e8c83de8a1318cb6c80e017cffab))
* updates to lulu permissions based on feedback ([cf36167](https://gitlab.coko.foundation/ketida/server/commit/cf36167910746bdf6abf96f456bc1bb6dacdfde6))

# [1.5.0](https://gitlab.coko.foundation/ketida/server/compare/v1.4.1...v1.5.0) (2023-05-03)

## [1.4.1](https://gitlab.coko.foundation/ketida/server/compare/v1.4.0...v1.4.1) (2023-04-11)


### Bug Fixes

* **controllers:** improve epub accessibility ([5363d82](https://gitlab.coko.foundation/ketida/server/commit/5363d82d16af01f72863c2d8ad21dec5b448ced6))
* **controllers:** more accessibility improvements ([df051bd](https://gitlab.coko.foundation/ketida/server/commit/df051bd82e58dcf1a456039c8551941cd0e2d5c7))
* fix for corrupted svg files ([e8aedbd](https://gitlab.coko.foundation/ketida/server/commit/e8aedbd247b189e4b6d05c2eaff6a3a1486c2589))

# [1.4.0](https://gitlab.coko.foundation/ketida/server/compare/v1.3.3...v1.4.0) (2023-04-04)


### Features

* **controllers:** support of nested headings in toc ([4803076](https://gitlab.coko.foundation/ketida/server/commit/48030760af15cc82b8f8d8dd085264bf64c53c38))

## [1.3.3](https://gitlab.coko.foundation/ketida/server/compare/v1.3.2...v1.3.3) (2023-04-04)


### Bug Fixes

* fixes in permissions ([1e9b9ce](https://gitlab.coko.foundation/ketida/server/commit/1e9b9cefc4d40060971bf11d80500732a27056fb))

## [1.3.2](https://gitlab.coko.foundation/ketida/server/compare/v1.3.1...v1.3.2) (2023-03-29)


### Bug Fixes

* **controllers:** handle orphan files inside getContent ([0cb7865](https://gitlab.coko.foundation/ketida/server/commit/0cb7865d1d8b0ab7f225e9570de8b7fd1d93e604))
* **controllers:** handle orphan images on export and in content ([b312787](https://gitlab.coko.foundation/ketida/server/commit/b3127873e7cf2620aeee990812afc93673526aa1))

## [1.3.1](https://gitlab.coko.foundation/ketida/server/compare/v1.3.0...v1.3.1) (2023-03-29)


### Bug Fixes

* **controllers:** ensure unique image declartion for epub opf ([6409f35](https://gitlab.coko.foundation/ketida/server/commit/6409f35605c79c6f65d5f425bc8d075867f15865))

# [1.3.0](https://gitlab.coko.foundation/ketida/server/compare/v1.2.3...v1.3.0) (2023-03-29)


### Features

* add chatgpt support ([715b13d](https://gitlab.coko.foundation/ketida/server/commit/715b13ddbf1d16ac9c731d48d1e7135f880e6ccb))
