# Haystack Marketing


## Installation
1. Install node
2. Install ruby
    - https://rubyinstaller.org/downloads/
    - Tested version: Ruby+Devkit 2.5.3-1 (x64)
    - Must be a full installation, Ruby+Devkit, including rubygems
3. `gem install jekyll bundler`
4. `bundle install`


## Developing locally
    set JEKYLL_ENV=development
    bundle exec jekyll serve


## Build procedure
    set JEKYLL_ENV=production
    bundle exec jekyll build


## Dev deployment
    set JEKYLL_ENV=production
    bundle exec jekyll build
    firebase deploy -P dev

## Staging deployment
    set JEKYLL_ENV=production
    bundle exec jekyll build
    firebase deploy -P staging

## Production deployment
    set JEKYLL_ENV=production
    bundle exec jekyll build
    firebase deploy -P production




