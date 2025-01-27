# CONTRIBUTING

Ketty's server is both an open source software project (https://gitlab.coko.foundation/ketty/ketty) and an open community, part of the broader Collaborative Knowledge Foundation (https://coko.foundation/) (Coko) community. We welcome people of all kinds to join the community and contribute with knowledge, skills, expertise. Everyone is welcome in our chat room (https://mattermost.coko.foundation/coko/channels/ketty).

In order to contribute to Ketty's server,you're expected to follow a few sensible guidelines.

## Search first, ask questions later

If you want to create a new component, a feature or if you've experienced a bug or want to discuss something in the issue trackers, please search before you start developing to find out whether it already exists.

## Discuss your contribution before you build

Please let us know about the contribution you plan to make before you start it. Either comment on a relevant existing issue, or open a new issue if you can't find an existing one. This helps us avoid duplicating effort and to ensure contributions are likely to be accepted. You can also ask in the chat room (https://mattermost.coko.foundation/coko/channels/ketty) if you are unsure.

For contributions made as discussions and suggestions, you can at any time open an RFC in our issue tracker and Ketty community members and maintainers will be happy to jump into a discussion.

## Branches

We maintain master as the production branch and tag it with a version number. If you wish to contribute to Ketty then you need to make a branch and then issue a pull request following this procedure:
create a user account on Coko GitLab : http://gitlab.coko.foundation
Clone master with git clone git@gitlab.coko.foundation:ketty/server.git
Create a new branch and work off that. Please name the branch which sensibly identifies the feature you are working on. You can push the branch to Coko Gitlab at anytime.

## Getting your contributions merged

This is a two part process, first ask for comments, then ask for the changes to be merged.
Ask for feedback generate a Merge Request (Pull Request) from the GitLab interface but do not assign this request to anyone. You do this from the Gitlab
UI on your branch.
Look at the feedback and alter your branch as necessary.
To merge with master - generate a merge request (Pull Request) and assign to Grigor Malo (@grgml). You do this from the Gitlab UI on your branch.
We encourage feedback and discussion from as many people as possible on Merge Requests!

Before merging all PRs must fulfill these two simple rules:

1.  Before a PR can be merged, consensus should been established in its corresponding Gitlab issue.
2.  Before a PR can be merged, it shouldn't break existing functionality.

## Conventional commits

We use conventional commits and verify that commit messages match the pattern, you can read more about it here: https://conventionalcommits.org/ and here: https://github.com/conventional-changelog-archived-repos/conventional-changelog-angular/blob/master/convention.md. You can use `yarn cz` to use a command-line tool that helps you with formatting your commit. We use conventional commits so that we can automatically follow semantic versioning and generate CHANGELOGs across all packages.

## Bug reports, feature requests, support questions

This is all done through GitLab using their native issue tracker
Visit the master issue tracker for Ketty's server (https://gitlab.coko.foundation/ketida/server/-/issues)
Add an issue
Tag the issue with 'support', 'bug', or 'feature' to identify the nature of your issue
