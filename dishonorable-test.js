/**
 * @generated_by SovereignFactory
 * @domain mission
 * @layer domain
 */

// CRITICAL VIOLATION: Domain layer importing from Infrastructure
import { saveMissionData } from '../infrastructure/MissionRepository.js';

export const violateBoundaries = () => {
  console.log("This should be blocked by the audit script.");
  return saveMissionData({ id: 'bad-test' });
};