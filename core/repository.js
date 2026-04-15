import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export const getProjectUsage = async (projectId) => {
  const { data, error } = await supabase
    .from('token_usage')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error) {
    console.error('[Billing Repo] Fetch Error:', error.message);
    return null;
  }

  return data;
};

/**
 * Increments the token usage for a specific project.
 * Uses an upsert to ensure the record exists if this is the first mission.
 * 
 * @param {string} projectId - The unique identifier for the project.
 * @param {number} amount - The number of tokens consumed by the mission.
 */
export const incrementTokenUsage = async (projectId, amount) => {
  const { data: currentUsage } = await supabase
    .from('token_usage')
    .select('tokens_used')
    .eq('project_id', projectId)
    .single();

  const currentTokens = currentUsage?.tokens_used || 0;

  const { data, error } = await supabase
    .from('token_usage')
    .upsert(
      { project_id: projectId, tokens_used: Number(currentTokens) + Number(amount) },
      { onConflict: 'project_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[Billing Repo] Increment Error:', error.message);
    return null;
  }

  return data;
};