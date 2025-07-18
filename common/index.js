const config = require('../config/config');

const airTableHeaders = [
    "Order Number",
    "Fulfillment Team Remarks",
    "Phone",
    "Email",
    "Payment Status",
    "Customer Name",
    "Order Age - In Days",
    "Tracking Number",
    "Fulfillment Status",
    "Link To Order ",
    "Order Stage",
    "Transit At - In Days"
];

const getOrderAgeInDays = (order) => {
    const orderDate = new Date(order.createdAt);
    const today = new Date();
    const diffTime = Math.abs(today - orderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

const getOrderNumber = (order) => {
    return order?.name + "-" + order?.legacyResourceId;
}

const getTransitAtInDays = (fulfillments) => {
    if (!fulfillments) return null;
    const inTransitionsDates = fulfillments.map(x => x?.inTransitAt);

    const diffDays = inTransitionsDates
        .filter(x => x !== null && x !== undefined) // Filter out null/undefined values
        .map(x => {
            const transitDate = new Date(x);
            const today = new Date();
            const diffTime = Math.abs(today - transitDate);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        })
        .filter(day => !isNaN(day) && isFinite(day)); // Filter out invalid numbers
    if (!diffDays || diffDays.length === 0) return null;
    const days = Math.max(...diffDays);
    return days;
}

const getDeliveredAtInDays = (fulfillments) => {
    if (!fulfillments) return null;
    const deliveredAt = fulfillments.map(x => x?.deliveredAt);
    let diffDays = deliveredAt.map(x => {
        if(!x) return null;
        const deliveredDate = new Date(x);
        const today = new Date();
        const diffTime = Math.abs(today - deliveredDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    });
    diffDays = diffDays.filter(x => x !== null);
    if (!diffDays || diffDays.length === 0) return null;
    const days = Math.max(...diffDays);
    return days;
}

const checkIfOrderDeliveryIsFailed = (fulfillments) => {
    const possibleStatus = ['FAILED', 'FAILURE'];
    const failedCount = 0;
    fulfillments?.forEach(x => {
        const events = x?.events?.nodes;
        const lastIndexOfArray = events?.length - 1;
        if(possibleStatus.includes(events[lastIndexOfArray]?.status)) {
            failedCount++;
        }
    });
    if (failedCount === 0) return null;
    if (failedCount === 1) return 'Failed';
    if (failedCount > 1) return 'Partially Failed';
}

const getOrderStage = (fulfillments) => {
    if(!fulfillments) return null;

    let orderStage = null;
    fulfillments?.forEach(x => {
        const events = x?.events?.nodes;
        if(events?.length > 0) {
            const lastIndexOfArray = events?.length - 1;
            orderStage = events[lastIndexOfArray]?.status;
        }
    });
    return orderStage ? orderStage : null;
}

const transformedDbOrderToCreateAirTableOrder = (order) => {
    return {
        fields: {
            "Order Number": getOrderNumber(order),
            "Fulfillment Team Remarks": order?.fulfillments?.flatMap(x => x?.events?.nodes?.map(y => y?.message))?.join(", ") || "",
            "Phone": order?.customer?.defaultPhoneNumber?.phoneNumber,
            "Email": order?.customer?.defaultEmailAddress?.emailAddress,
            "Payment Status": order.displayFinancialStatus,
            "Customer Name": order.customer?.displayName,
            "Order Age - In Days": getOrderAgeInDays(order),
            "Tracking Number": order?.fulfillments?.flatMap(x => x?.trackingInfo?.map(y => y?.number))?.join(", "),
            "Fulfillment Status": order?.displayFulfillmentStatus,
            "Link To Order ": order?.statusPageUrl,
            "Transit At - In Days": getTransitAtInDays(order?.fulfillments),
            "Delivered At - In Days": getDeliveredAtInDays(order?.fulfillments),
            "Delivery Failed Status": checkIfOrderDeliveryIsFailed(order?.fulfillments),
            "Order Stage": getOrderStage(order?.fulfillments)
        }
    }
}
const transformedDbOrderToUpdateAirTableOrder = (order) => {
    return {
        id: order.airTableRecordId,
        ...transformedDbOrderToCreateAirTableOrder(order)
    }
}

const webhookToSubscribe = [
    {
        input: {
            topic: "DRAFT_ORDERS_CREATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "DRAFT_ORDERS_UPDATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_HOLDS_ADDED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_CANCELLATION_REQUEST_ACCEPTED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_CANCELLATION_REQUEST_REJECTED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_CANCELLATION_REQUEST_SUBMITTED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_FULFILLMENT_REQUEST_ACCEPTED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_FULFILLMENT_REQUEST_REJECTED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_FULFILLMENT_REQUEST_SUBMITTED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_FULFILLMENT_SERVICE_FAILED_TO_COMPLETE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_HOLD_RELEASED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_LINE_ITEMS_PREPARED_FOR_LOCAL_DELIVERY",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_MERGED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "ULFILLMENT_ORDERS_MOVED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_ORDER_ROUTING_COMPLETE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_PLACED_ON_HOLD",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_RESCHEDULED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_SCHEDULED_FULFILLMENT_ORDER_READY",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENT_ORDERS_SPLIT",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENTS_CREATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "FULFILLMENTS_UPDATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "ORDER_TRANSACTIONS_CREATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "ORDER_TRANSACTIONS_UPDATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "ORDERS_CREATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "ORDERS_DELETE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "ORDERS_FULFILLED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "ORDERS_PAID",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "ORDERS_UPDATED",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "PRODUCTS_CREATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "PRODUCTS_DELETE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "PRODUCTS_UPDATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "REFUNDS_CREATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "SHOP_UPDATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "THEMES_CREATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "THEMES_DELETE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "THEMES_PUBLISH",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    },
    {
        input: {
            topic: "THEMES_UPDATE",
            webhookSubscription: {
                callbackUrl: `${config.shopify.SHOPIFY_WEBHOOK_URL}`,
                format: "JSON",
            }
        }
    }
];

const extractNumberAfterDash = (inputString) => {
    // Split the string by the dash and return the part after the dash
    const parts = inputString.split('-');
    if (parts.length > 1) {
        return parts[1];
    } else {
        return null;  // If no dash is found, return null
    }
}

module.exports = {
    airTableHeaders,
    transformedDbOrderToCreateAirTableOrder,
    transformedDbOrderToUpdateAirTableOrder,
    getOrderNumber,
    webhookToSubscribe,
    extractNumberAfterDash
}