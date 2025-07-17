const { webhookToSubscribe } = require('../common');
const { parseShopifyError, shopifyClient } = require('../config/shopify');

const subscribeToShopifyWebhook = async () => {
    const responses = [];
    for (const webhookInput of webhookToSubscribe) {
        const response = await createSubscriptions(webhookInput);
        console.log('response', response);
        responses.push(response);
    }
    return responses;
}

const createSubscriptions = async (subscription) => {
    try {
        console.log('Creating subscription for:', subscription.input.topic);
        
        const shopifyWrapper = await shopifyClient.post('', {
            query: `
                mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
                    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
                        webhookSubscription {
                            id
                            topic
                            endpoint {
                                __typename
                                ... on WebhookHttpEndpoint {
                                    callbackUrl
                                }
                            }
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `,
            variables: {
                topic: subscription.input.topic,
                webhookSubscription: subscription.input.webhookSubscription
            }
        });
        
        if (shopifyWrapper?.data?.errors && shopifyWrapper?.data?.errors?.length > 0) {
            const parsedError = parseShopifyError({
                response: {
                    status: 422,
                    data: { errors: shopifyWrapper.data.errors }
                }
            });
            return {
                errors: [parsedError],
                data: null,
                status: parsedError.status,
                success: false
            };
        }
        
        // Check for user errors in the response
        if (shopifyWrapper?.data?.data?.webhookSubscriptionCreate?.userErrors?.length > 0) {
            const userError = shopifyWrapper.data.data.webhookSubscriptionCreate.userErrors[0];
            return {
                errors: [{
                    type: 'WEBHOOK_CREATION_ERROR',
                    message: userError.message,
                    userMessage: `Webhook creation failed: ${userError.message}`,
                    status: 422,
                    originalError: userError
                }],
                data: null,
                status: 422,
                success: false
            };
        }
        
        return {
            data: shopifyWrapper?.data?.data?.webhookSubscriptionCreate,
            status: shopifyWrapper?.status,
            success: true
        };
    } catch (error) {
        console.log('error', error?.message);
        const parsedError = parseShopifyError(error);
        return {
            errors: [parsedError],
            data: null,
            status: parsedError.status,
            success: false
        };
    }
}

module.exports = {
    subscribeToShopifyWebhook
}