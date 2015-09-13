find ./ -name ".DS_Store" -print0 | xargs -0 rm -rf
find ./ -name "._*" -print0 | xargs -0 rm -rf
