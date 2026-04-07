const { Webhook, enqueueWebhookDelivery } = require("@urbackend/common");

/**
 * Dispatch webhooks for a data operation
 * Fire-and-forget: does not block the API response
 *
 * @param {Object} options
 * @param {string} options.projectId - The project ID
 * @param {string} options.collection - The collection name
 * @param {string} options.action - The action: 'insert', 'update', or 'delete'
 * @param {Object} options.document - The document data (after insert/update, or before delete)
 * @param {string} options.documentId - The document _id
 */
async function dispatchWebhooks({ projectId, collection, action, document, documentId }) {
  try {
    // Find all enabled webhooks for this project that listen to this event
    const webhooks = await Webhook.find({
      projectId,
      enabled: true,
    });

    if (!webhooks.length) return;

    const event = `${collection}.${action}`;
    const timestamp = new Date().toISOString();

    for (const webhook of webhooks) {
      // Check if this webhook listens to this collection+action
      const collectionEvents = webhook.events?.get(collection);
      if (!collectionEvents || !collectionEvents[action]) {
        continue;
      }

      const payload = {
        event,
        timestamp,
        projectId: projectId.toString(),
        collection,
        action,
        documentId: documentId?.toString() || document?._id?.toString(),
        data: document,
      };

      // Enqueue delivery (fire-and-forget)
      enqueueWebhookDelivery({
        webhookId: webhook._id,
        projectId,
        event,
        payload,
      }).catch((err) => {
        console.error(`[Webhook Dispatch] Failed to enqueue: ${err.message}`);
      });
    }
  } catch (err) {
    // Log but don't throw - webhooks should never block the main operation
    console.error(`[Webhook Dispatch] Error: ${err.message}`);
  }
}

module.exports = { dispatchWebhooks };
