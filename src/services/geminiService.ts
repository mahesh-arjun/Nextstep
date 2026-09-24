import { AIAnalysisResult, Incident, NormalizedEvent } from '../types';

export async function requestIncidentAnalysis(
  incident: Incident,
  relatedEvents: NormalizedEvent[],
  topologyContext: any
): Promise<{ success: boolean; data: AIAnalysisResult; source: string }> {
  try {
    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        incident,
        relatedEvents,
        topologyContext,
      }),
    });

    if (!response.ok) {
      throw new Error(`API response error: ${response.statusText}`);
    }

    const json = await response.json();
    return json;
  } catch (error: any) {
    console.error('Failed to fetch AI incident analysis:', error);
    throw error;
  }
}
