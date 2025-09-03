const axios = require("axios");
const config = require("./config");

// Get the current configuration
const currentConfig = config;

// AirTable error codes mapping
const AIRTABLE_ERROR_CODES = {
  400: {
    type: "BAD_REQUEST",
    message:
      "The request encoding is invalid; the request cannot be parsed as valid JSON.",
    userMessage:
      "Invalid request format. Please check your data and try again.",
  },
  401: {
    type: "UNAUTHORIZED",
    message:
      "Accessing a protected resource without authorization or with invalid credentials.",
    userMessage: "Authentication failed. Please check your API key.",
  },
  402: {
    type: "PAYMENT_REQUIRED",
    message: "The account associated with the API key has hit a quota limit.",
    userMessage: "API quota exceeded. Please upgrade your AirTable plan.",
  },
  403: {
    type: "FORBIDDEN",
    message:
      "Accessing a protected resource with API credentials that do not have access.",
    userMessage: "Access denied. Check your API key permissions.",
  },
  404: {
    type: "NOT_FOUND",
    message: "Route or resource is not found.",
    userMessage: "The requested resource was not found.",
  },
  413: {
    type: "REQUEST_ENTITY_TOO_LARGE",
    message: "The request exceeded the maximum allowed payload size.",
    userMessage: "Request data is too large. Please reduce the payload size.",
  },
  422: {
    type: "INVALID_REQUEST",
    message: "The request data is invalid.",
    userMessage: "Invalid request data. Please check your input.",
  },
  429: {
    type: "RATE_LIMIT_EXCEEDED",
    message: "Rate limit exceeded. Please try again later.",
    userMessage: "Too many requests. Please wait 30 seconds and try again.",
  },
  500: {
    type: "INTERNAL_SERVER_ERROR",
    message: "The server encountered an unexpected condition.",
    userMessage: "Server error occurred. Please try again later.",
  },
  502: {
    type: "BAD_GATEWAY",
    message:
      "AirTable servers are restarting or an unexpected outage is in progress.",
    userMessage: "Service temporarily unavailable. Please try again.",
  },
  503: {
    type: "SERVICE_UNAVAILABLE",
    message: "The server could not process your request in time.",
    userMessage: "Service is temporarily unavailable. Please try again.",
  },
};

// Create base axios instance
const baseAxios = axios.create({
  baseURL: `https://api.airtable.com/v0/${currentConfig.airTable.baseId}`,
  headers: {
    Authorization: `Bearer ${currentConfig.airTable.apiKeyAccessToken}`,
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout
});

// Parse AirTable error response
const parseAirTableError = (error) => {
  const status = error.response?.status || 0;
  const airtableError = error.response?.data?.error;

  // If AirTable returns a specific error structure (like your example)
  if (airtableError) {
    return {
      type: airtableError.type || "UNKNOWN_ERROR",
      message: airtableError.message || "Unknown error occurred",
      userMessage:
        airtableError.message ||
        "An error occurred while processing your request.",
      status,
      originalError: airtableError,
    };
  }

  // Handle standard HTTP error codes
  if (AIRTABLE_ERROR_CODES[status]) {
    return {
      type: AIRTABLE_ERROR_CODES[status].type,
      message: AIRTABLE_ERROR_CODES[status].message,
      userMessage: AIRTABLE_ERROR_CODES[status].userMessage,
      status,
      originalError: error.response?.data || error.message,
    };
  }

  // Handle network errors
  if (error.code === "ECONNABORTED") {
    return {
      type: "TIMEOUT",
      message: "Request timeout",
      userMessage: "Request timed out. Please try again.",
      status: 0,
      originalError: error.message,
    };
  }

  if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
    return {
      type: "NETWORK_ERROR",
      message: "Network connection error",
      userMessage:
        "Unable to connect to AirTable. Please check your internet connection.",
      status: 0,
      originalError: error.message,
    };
  }

  // Default error
  return {
    type: "UNKNOWN_ERROR",
    message: error.message || "Unknown error occurred",
    userMessage: "An unexpected error occurred. Please try again.",
    status: status || 0,
    originalError: error,
  };
};

// Create wrapper with error handling
const airTableWrapper = {
  // GET request
  async get(endpoint, params = {}) {
    try {
      const response = await baseAxios.get(endpoint, { params });
      console.log("config.airTable.baseId", currentConfig.airTable);
      console.log("config.airTable.apiKeyAccessToken", currentConfig.airTable);
      return {
        errors: [],
        data: response.data,
        status: response.status,
        success: true,
      };
    } catch (error) {
      console.log(error);
      const parsedError = parseAirTableError(error);
      return {
        errors: [parsedError],
        data: null,
        status: parsedError.status,
        success: false,
      };
    }
  },

  // POST request
  async post(endpoint, data = {}) {
    try {
      const response = await baseAxios.post(endpoint, data);
      return {
        errors: [],
        data: response.data,
        status: response.status,
        success: true,
      };
    } catch (error) {
      const parsedError = parseAirTableError(error);
      return {
        errors: [parsedError],
        data: null,
        status: parsedError.status,
        success: false,
      };
    }
  },

  // PUT request
  async put(endpoint, data = {}) {
    try {
      const response = await baseAxios.put(endpoint, data);
      return {
        errors: [],
        data: response.data,
        status: response.status,
        success: true,
      };
    } catch (error) {
      const parsedError = parseAirTableError(error);
      return {
        errors: [parsedError],
        data: null,
        status: parsedError.status,
        success: false,
      };
    }
  },

  // PATCH request
  async patch(endpoint, data = {}) {
    try {
      const response = await baseAxios.patch(endpoint, data);
      return {
        errors: [],
        data: response.data,
        status: response.status,
        success: true,
      };
    } catch (error) {
      const parsedError = parseAirTableError(error);
      return {
        errors: [parsedError],
        data: null,
        status: parsedError.status,
        success: false,
      };
    }
  },

  // DELETE request
  async delete(endpoint, params = {}) {
    try {
      const response = await baseAxios.delete(endpoint, { params });
      return {
        errors: [],
        data: response.data,
        status: response.status,
        success: true,
      };
    } catch (error) {
      const parsedError = parseAirTableError(error);
      return {
        errors: [parsedError],
        data: null,
        status: parsedError.status,
        success: false,
      };
    }
  },
};

module.exports = airTableWrapper;
