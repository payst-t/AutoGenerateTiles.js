# About
This is a Porymap script that you can load, in `Options -> Custom Scripts...` to automatically generate metatiles for you, it simulates a "layer" system, in a way.

# How it works
The script guesses if it has to act after a block has changed on a map; it checks if the previous block had a top layer, if yes, then nothing occurs, otherwise it then checks if the new block has a bottom layer, if it doesn't, it can "merge" the two blocks, add the newly created block into the tileset and finally place it properly on the map.

# Bugs
Sometimes, I don't know why, but the `gFreeMetatilesIds` array isn't correctly set, which leads to the program outputting the error about there not being free space for metatiles anymore. This is easily fixed though, you just have to reload the project; I *will* investigate further once I find the time and the motivation to.
