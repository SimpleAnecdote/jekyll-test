# Haystack Marketing


## Installation
1. Install node
2. Install ruby, including rubygems
3. `gem install`
4. `bundle install`


## Developing locally
    set JEKYLL_ENV=development
    jekyll serve


## Build procedure
    set JEKYLL_ENV=production
    jekyll build


## Dev deployment
    set JEKYLL_ENV=production
    jekyll build
    firebase deploy -P dev

## Staging deployment
    set JEKYLL_ENV=production
    jekyll build
    firebase deploy -P staging

## Production deployment
    set JEKYLL_ENV=production
    jekyll build
    firebase deploy -P production




