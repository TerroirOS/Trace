// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AttestationRegistry {
    struct AttestationRecord {
        bytes32 eventId;
        bytes32 batchId;
        bytes32 attestationHash;
        address issuer;
        uint256 timestamp;
    }

    mapping(bytes32 => AttestationRecord) private attestations;

    event AttestationRecorded(
        bytes32 indexed eventId,
        bytes32 indexed batchId,
        bytes32 attestationHash,
        address indexed issuer,
        uint256 timestamp
    );

    error DuplicateEvent(bytes32 eventId);
    error MissingEvent(bytes32 eventId);

    function recordAttestation(bytes32 eventId, bytes32 batchId, bytes32 attestationHash) external {
        if (attestations[eventId].timestamp != 0) revert DuplicateEvent(eventId);
        attestations[eventId] = AttestationRecord({
            eventId: eventId,
            batchId: batchId,
            attestationHash: attestationHash,
            issuer: msg.sender,
            timestamp: block.timestamp
        });
        emit AttestationRecorded(eventId, batchId, attestationHash, msg.sender, block.timestamp);
    }

    function getAttestation(bytes32 eventId) external view returns (AttestationRecord memory) {
        if (attestations[eventId].timestamp == 0) revert MissingEvent(eventId);
        return attestations[eventId];
    }
}
