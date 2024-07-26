import { bucket } from "../assessment/bucketData";

export class TreeNode {
    value: number | bucket;
    left: TreeNode | null;
    right: TreeNode | null;

    constructor(value: number) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

/** Generates a random binary search tree from a
 - If the start and end indices are the same, the function returns null
 - If the middle index is even, the function uses the exact middle point
 - Otherwise, the function randomly adds 0 or 1 to the middle index
 - Returns the root node of the generated binary search tree which contains the bucketIds if called properly
 - ex: let rootOfIds = sortedArrayToBST(this.buckets, this.buckets[0].bucketID - 1, this.buckets[this.buckets.length - 1].bucketID, usedIndices);
 */
export function sortedArrayToIDsBST(start, end, usedIndices) {
    if (start > end) return null;

    // Randomize middle point within unused indices
    let mid;

    if ((start + end) % 2 === 0 && usedIndices.size !== 1) {
        mid = Math.floor((start + end) / 2); // Use the exact middle point
        if (mid === 0) return null;
    } else {
        do {
            mid = Math.floor((start + end) / 2);
            mid += Math.floor(Math.random() * 2); // Randomly add 0 or 1 to mid
        } while (mid > end || usedIndices.has(mid));
    }

    usedIndices.add(mid);
    
    let node = new TreeNode(mid);

    node.left = sortedArrayToIDsBST(start, mid - 1, usedIndices);
    node.right = sortedArrayToIDsBST(mid + 1, end, usedIndices);

    return node;
}
