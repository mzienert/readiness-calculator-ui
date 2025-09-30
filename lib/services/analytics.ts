/**
 * Analytics Service
 * Handles anonymized data collection for assessment insights
 */

interface SaveSnapshotParams {
  sessionId: string;
  agentType: 'qualifier' | 'assessor' | 'analyzer';
  snapshotData: Record<string, any>;
}

export const analyticsApi = {
  /**
   * Save an anonymized assessment snapshot
   */
  async saveSnapshot(params: SaveSnapshotParams): Promise<{ success: boolean; id?: string }> {
    try {
      const response = await fetch('/api/analytics/snapshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save snapshot');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ [Analytics Service] Failed to save snapshot:', error);
      // Don't throw - we don't want analytics failures to break the user experience
      return { success: false };
    }
  },
};