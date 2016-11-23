# Haystack Marketing


## Installation
1. Install node
2. Install ruby, including rubygems
3. `gem install`
4. `bundle install`


## Developing locally
- Run `jekyll serve`


## Build procedure

### Development
    set JEKYLL_ENV=development
    jekyll build

### Production
    set JEKYLL_ENV=production
    jekyll build

## Deployment
1. `_site` folder is the build
2. Contents of the `assets` and `metadata` go on the CDN
3. Everything else goes on the Haystack server

All asset filenames (including css, js) are hashed, so all new asset files should be uploaded before updating HTML files on the server, or things will be missing.


