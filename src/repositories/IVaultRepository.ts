export interface VaultRecord {
    id: string;
    owner_hash: string;
    encrypted_blob: string; // The FULL re-assembled blob
    iv: string;
}

export interface IVaultRepository {
    /**
     * Saves a record using Dual-Key Sharding (Part A -> Neon, Part B -> Redis)
     */
    save(id: string, ownerHash: string, encryptedBlob: string, iv: string): Promise<void>;

    /**
     * Fetches all records for an owner, automatically re-assembling shards.
     */
    fetchByOwner(ownerHash: string): Promise<VaultRecord[]>;

    /**
     * Deletes both shards for a given record.
     */
    delete(id: string): Promise<void>;

    /**
     * Wipes all data for a user (Optional/Advanced)
     */
    wipeByOwner(ownerHash: string): Promise<void>;

    /**
     * Reorders a batch of items.
     * @param items List of objects containing { id, order }.
     */
    reorder(items: { id: string; order: number }[], ownerHash: string): Promise<void>;
}
