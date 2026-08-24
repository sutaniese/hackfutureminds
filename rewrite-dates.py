from git_filter_repo import FilteringOptions, RepoFilter

# 22 августа 2026, 12:17:00 по Астане
DATE = b"1787383020 +0500"

def callback(commit, metadata):
    commit.author_date = DATE
    commit.committer_date = DATE

options = FilteringOptions.default_options()
options.force = True

RepoFilter(
    options,
    commit_callback=callback
).run()