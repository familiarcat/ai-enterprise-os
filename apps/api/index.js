/**
 * @generated_by SovereignFactory
 * @domain kernel
 * @layer infrastructure
 */

const { eventBus } = require('../core/memory.js');

/**
 * Returns the shared Event Bus for asynchronous cross-domain communication.
 */
function getEventBus() {
  return eventBus;
}

module.exports = {
  getEventBus
};