// 'Blank' constants, usually you wouldn't want to change them.
const BLANK_METATILE_ID = 0;
const BLANK_TILE_ID = 0;

// Tile constants.
const START_TILE_ID_DUAL = 0;
const END_TILE_ID_DUAL = 7; // There are '8' tiles, but it's 0-indexed.

// Layer constants.
const NUM_TILES_IN_LAYER = 4;
const DUAL_BOTTOM_LAYER = 0;
const DUAL_TOP_LAYER = 1;

// This constant dictates at which Id you'd want the
// script to look at first for free metatiles.
// If you want it to only look in the second tileset,
// just set this to 0x1FF (assuming you have 512 tiles
// in your primary tileset, which you should).
const START_FREE_METATILE_SEARCH = BLANK_METATILE_ID;

let gMaxMetatiles = 0; // Max metatiles in the current tilesets.
let gFreeMetatilesIds = []; // 'Free' metatiles (that are entirely set to 0) in the current tilesets.
let gCoreMetatileIds = []; // Metatile Ids used to construct new ones, those will not get freed unless switching to a new map.

// Gets if a layer is empty or not for a block,
// this is useful if we want to check if we should make the
// specified drawn block a new block or not.
function IsBlockLayerEmpty(metatileId, layer) {
    const firstTile = layer * NUM_TILES_IN_LAYER;
    const lastTile = firstTile + NUM_TILES_IN_LAYER - 1;
    let tiles = map.getMetatileTiles(metatileId, firstTile, lastTile);

    for (let i = 0; i < tiles.length; i++)
        if (tiles[i].tileId != BLANK_TILE_ID)
            return false;
    return true;
}

// Gets the 4 tiles at a specific layer.
function GetTilesAtLayer(metatileId, layer) {
    const firstTile = layer * NUM_TILES_IN_LAYER;
    const lastTile = firstTile + NUM_TILES_IN_LAYER - 1;
    let tiles = map.getMetatileTiles(metatileId, firstTile, lastTile);

    return tiles;
}

// Merges two dual layer blocks into one.
function MergeBlocksAndReturnId(bottomBlock, topBlock) {
    let bottomTiles = GetTilesAtLayer(bottomBlock.metatileId, DUAL_BOTTOM_LAYER);
    let topTiles = GetTilesAtLayer(topBlock.metatileId, DUAL_TOP_LAYER);
    let newTiles = bottomTiles.concat(topTiles); // Basically, appends the tiles in topTiles to the ones in bottomTiles.
    let correctMetatileId = FindTilesInTileset(newTiles); // If the tiles actually exist, we don't need to create them again.

    if (correctMetatileId == -1) {
        let destMetatileId = GetNextFreeMetatileId();

        // No more "free" metatile in the Tileset.
        if (destMetatileId == -1)
            return -1;

        map.setMetatileTiles(destMetatileId, newTiles, 0, 7, false);
        return destMetatileId;
    }

    return correctMetatileId;
}

// Returns if the array of tiles exist already.
function FindTilesInTileset(toFind) {
    for (let i = 0; i < gMaxMetatiles; i++) {
        let tiles = map.getMetatileTiles(i, START_TILE_ID_DUAL, END_TILE_ID_DUAL);
        let exists = true;

        // Compares the two arrays.
        for (let j = 0; j < toFind.length; j++) {
            if (toFind[j].tileId == tiles[j].tileId)
                continue;

            exists = false;
            break;
        }

        // If eventually we found that the tiles
        // exist, we return the index.
        if (exists)
            return i;
    }

    return -1;
}

// Gets all the free metatiles Ids at once.
function GetFreeMetatilesIds() {
    gFreeMetatilesIds = []; // Make sure the array is empty, before we add values to it.

    // '0' is usually the empty block, and we don't wanna overwrite it.
    // Also, we do it in reverse because we pop() when finding the next
    // free metatile, which returns the last element.
    for (let i = gMaxMetatiles - 1; i > START_FREE_METATILE_SEARCH; i--)
        if (IsBlockEmpty(i))
            gFreeMetatilesIds.push(i);
}

// Gets if the specified block, i.e.
// metatile, is empty.
function IsBlockEmpty(metatileId) {
    return IsBlockLayerEmpty(metatileId, DUAL_BOTTOM_LAYER) && IsBlockLayerEmpty(metatileId, DUAL_TOP_LAYER);
}

// Finds the next free metatile.
function GetNextFreeMetatileId() {
    if (gFreeMetatilesIds.length == 0)
        return -1;
    else
        return gFreeMetatilesIds.pop();
}

// Gets all the unused metatiles on the current map.
function GetUnusedTiles() {
    let unusedIds = []

    for (let i = 0; i < gMaxMetatiles; i++) {
        let isUsed = false;

        // Looping through the whole map, to see if a metatile is
        // used or not.
        for (let h = 0; h < map.getHeight(); h++) {
            for (let w = 0; w < map.getWidth(); w++) {
                if (map.getBlock(h, w).metatileId != i)
                    continue;

                isUsed = true;
                break;
            }

            if (isUsed)
                break;
        }

        if (!isUsed)
            unusedIds.push(i);
    }

    return unusedIds;
}

// Called when a block is changed on the map. For example, this is called when a user paints a new tile or changes the collision property of a block.
export function onBlockChanged(x, y, prevBlock, newBlock) {
    if (!IsBlockLayerEmpty(prevBlock, DUAL_BOTTOM_LAYER) || !IsBlockLayerEmpty(newBlock, DUAL_TOP_LAYER) || // The need to be "overlap"-able.
        prevBlock.metatileId == BLANK_METATILE_ID || newBlock.metatileId == BLANK_METATILE_ID || // If the user is just adding/replacing blank tiles, there's no point.
        prevBlock.metatileId == newBlock.metatileId) {
        return;
    }
    // correctMetatileId will be the new metatileId replacing the current block.
    let correctMetatileId = MergeBlocksAndReturnId(prevBlock, newBlock);

    if (correctMetatileId == -1) {
        utility.showError("No more free metatiles found.",
            "There isn't any free metatile within the search range for a new one.",
            "Consider freeing unused sprites, or increasing the number of metatiles in both the primary and secondary tilesets.")
        return;
    }

    // Now, we also need to set the correct metatile in the map, in case it gets lost.
    map.setBlock(x, y, correctMetatileId, newBlock.collision, newBlock.elevation, false, false);

    if (gCoreMetatileIds.indexOf(prevBlock.metatileId) == -1)
        gCoreMetatileIds.push(prevBlock.metatileId);
    if (gCoreMetatileIds.indexOf(newBlock.metatileId) == -1)
        gCoreMetatileIds.push(newBlock.metatileId);

    // To actually reflect the changes in the map.
    map.redraw();
    map.commit();
}

// Called when the currently loaded tileset is changed by switching to a new one or by saving changes to it in the Tileset Editor.
export function onTilesetUpdated(tilesetName) {
    gCoreMetatileIds = [];
    gMaxMetatiles = map.getNumPrimaryTilesetMetatiles() + map.getNumSecondaryTilesetMetatiles();
    GetFreeMetatilesIds();
}

// When the "Free unused metatiles" button is pressed.
export function onFreeTilesetPressed() {
    let unusedIds = GetUnusedTiles();

    for (let i = 0; i < unusedIds.length; i++)
        if (gCoreMetatileIds.indexOf(unusedIds) == -1)
            map.setMetatileTiles(unusedIds[i], BLANK_TILE_ID, START_TILE_ID_DUAL, END_TILE_ID_DUAL, false);

    map.redraw();
    map.commit();
}

// When a new project is loaded (or reloaded), then we
// add the action.
export function onProjectOpened(projectPath) {
    utility.registerAction("onFreeTilesetPressed", "Free unused metatiles");
}
