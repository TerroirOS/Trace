// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BatchRegistry {
    struct BatchAnchor {
        bytes32 rootHash;
        bytes32 metadataHash;
        address issuer;
        uint256 createdAt;
        bool exists;
    }

    mapping(bytes32 => BatchAnchor) private batchAnchors;

    event BatchAnchored(
        bytes32 indexed batchId,
        bytes32 rootHash,
        bytes32 metadataHash,
        address indexed issuer,
        uint256 timestamp
    );

    error BatchAlreadyExists(bytes32 batchId);
    error BatchMissing(bytes32 batchId);

    function anchorBatch(bytes32 batchId, bytes32 rootHash, bytes32 metadataHash) external {
        if (batchAnchors[batchId].exists) revert BatchAlreadyExists(batchId);
        batchAnchors[batchId] = BatchAnchor({
            rootHash: rootHash,
            metadataHash: metadataHash,
            issuer: msg.sender,
            createdAt: block.timestamp,
            exists: true
        });
        emit BatchAnchored(batchId, rootHash, metadataHash, msg.sender, block.timestamp);
    }

    function getBatch(bytes32 batchId) external view returns (BatchAnchor memory) {
        if (!batchAnchors[batchId].exists) revert BatchMissing(batchId);
        return batchAnchors[batchId];
    }
}
