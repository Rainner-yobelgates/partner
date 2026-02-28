export const normalizeUserId = (currentUser: any): bigint | null => {
    const rawId = currentUser?.userId ?? currentUser?.id;

    if (typeof rawId === 'bigint') {
        return rawId;
    }
    if (typeof rawId === 'number' && Number.isFinite(rawId)) {
        return BigInt(Math.trunc(rawId));
    }
    if (typeof rawId === 'string') {
        const sanitized = rawId.trim();
        if (/^\d+$/.test(sanitized)) {
        try {
            return BigInt(sanitized);
        } catch (error) {
            return null;
        }
        }
    }

    return null;
};