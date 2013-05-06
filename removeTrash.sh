find ./builds -name ".DS_Store" -print0 | xargs -0 rm -rf
find ./builds -name "._*" -print0 | xargs -0 rm -rf
